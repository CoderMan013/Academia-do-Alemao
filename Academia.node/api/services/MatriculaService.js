const Aluno = require("../models/Aluno");
const Professor = require("../models/Professor");
const Matricula = require("../models/Matricula");
const ErrorResponse = require("../utils/ErrorResponse");
const validar = require("../utils/Validar");
const { validarDuracao } = require("../domain/Modalidades");

/**
 * Regras de negócio de Matricula.
 *
 * Recebe três DAOs por injeção de dependência:
 * - MatriculaDAO: CRUD da matrícula;
 * - AlunoDAO: valida se o aluno existe;
 * - ProfessorDAO: valida se o professor existe e se leciona a modalidade.
 */
module.exports = class MatriculaService {
    #matriculaDAO;
    #alunoDAO;
    #professorDAO;

    constructor(matriculaDAODependency, alunoDAODependency, professorDAODependency) {
        console.log("⬆️  MatriculaService.constructor()");
        this.#matriculaDAO = matriculaDAODependency;
        this.#alunoDAO = alunoDAODependency;
        this.#professorDAO = professorDAODependency;
    }

    /** Data de hoje no formato YYYY-MM-DD. */
    static hoje() {
        const agora = new Date();
        const local = new Date(agora.getTime() - agora.getTimezoneOffset() * 60000);
        return local.toISOString().slice(0, 10);
    }

    /**
     * Soma meses a uma data YYYY-MM-DD (retorna YYYY-MM-DD).
     * @param {string} dataInicio
     * @param {number} meses
     * @returns {string}
     */
    static somarMeses(dataInicio, meses) {
        const [ano, mes, dia] = dataInicio.split("-").map(Number);
        const data = new Date(Date.UTC(ano, mes - 1 + Number(meses), dia));
        return data.toISOString().slice(0, 10);
    }

    /**
     * O aluno matriculado vem do token quando quem chama é aluno
     * (ninguém matricula outra pessoa). Funcionário/professor informa o id.
     * @param {object} matriculaJson
     * @param {object} usuario
     * @returns {number}
     */
    #idAlunoDoBody = (matriculaJson, usuario) => {
        if (usuario?.role === "aluno") {
            return Number(usuario.idAluno);
        }

        const idAluno = Number(matriculaJson?.aluno?.idAluno);
        if (!Number.isInteger(idAluno) || idAluno <= 0) {
            throw new ErrorResponse(400, "Erro na validação de dados", {
                message: "O campo 'aluno.idAluno' é obrigatório!"
            });
        }
        return idAluno;
    };

    /**
     * Carrega aluno e professor e valida a modalidade do professor.
     * @returns {Promise<{alunoDB: object, professorDB: object}>}
     */
    #validarVinculos = async (idAluno, idProfessor, modalidade) => {
        const alunoDB = await this.#alunoDAO.findById(idAluno);
        if (!alunoDB) {
            throw new ErrorResponse(404, "Aluno não encontrado", {
                message: `Não existe aluno com id ${idAluno}`
            });
        }

        const professorDB = await this.#professorDAO.findById(idProfessor);
        if (!professorDB) {
            throw new ErrorResponse(404, "Professor não encontrado", {
                message: `Não existe professor com id ${idProfessor}`
            });
        }

        if (!professorDB.modalidades.includes(modalidade)) {
            throw new ErrorResponse(400, "Professor não leciona essa modalidade", {
                message: `${professorDB.nomeProfessor} não leciona ${modalidade}`
            });
        }

        return { alunoDB, professorDB };
    };

    /**
     * Cria uma matrícula.
     *
     * Regras:
     * - o aluno precisa existir;
     * - o professor precisa existir e lecionar a modalidade;
     * - o aluno não pode ter outra matrícula ativa na MESMA modalidade
     *   (pode ter várias modalidades diferentes);
     * - se dataFim não for informada, é calculada com duracaoMeses (padrão 3).
     *
     * @param {object} matriculaJson
     * @param {object} usuario - usuário autenticado (vem do token)
     * @returns {Promise<object>}
     */
    createMatricula = async (matriculaJson, usuario) => {
        console.log("🟣 MatriculaService.createMatricula()");

        const idAluno = this.#idAlunoDoBody(matriculaJson, usuario);
        const idProfessor = Number(matriculaJson?.professor?.idProfessor);

        if (!Number.isInteger(idProfessor) || idProfessor <= 0) {
            throw new ErrorResponse(400, "Erro na validação de dados", {
                message: "O campo 'professor.idProfessor' é obrigatório!"
            });
        }

        const matricula = new Matricula();
        let duracaoMeses = 3;

        validar(() => {
            matricula.modalidade = matriculaJson.modalidade;
            matricula.status = matriculaJson.status ?? "ativa";
            matricula.dataInicio = matriculaJson.dataInicio ?? MatriculaService.hoje();
            duracaoMeses = validarDuracao(matriculaJson.duracaoMeses);
            matricula.dataFim = matriculaJson.dataFim
                ?? MatriculaService.somarMeses(matricula.dataInicio, duracaoMeses);
        });

        const { alunoDB, professorDB } = await this.#validarVinculos(
            idAluno,
            idProfessor,
            matricula.modalidade
        );

        // Os models exigem instâncias completas: monta a partir dos dados do banco.
        validar(() => {
            const aluno = new Aluno();
            aluno.idAluno = alunoDB.idAluno;

            const professor = new Professor();
            professor.idProfessor = professorDB.idProfessor;

            matricula.aluno = aluno;
            matricula.professor = professor;
        });

        if (matricula.status === "ativa") {
            const ativas = await this.#matriculaDAO.countByAlunoModalidade(
                idAluno,
                matricula.modalidade,
                "ativa"
            );

            if (ativas > 0) {
                throw new ErrorResponse(400, "Matrícula duplicada", {
                    message: `O aluno ${alunoDB.nomeAluno} já possui uma matrícula ativa em ${matricula.modalidade}`
                });
            }
        }

        const novoId = await this.#matriculaDAO.create(matricula);

        return {
            idMatricula: novoId,
            dataInicio: matricula.dataInicio,
            dataFim: matricula.dataFim,
            status: matricula.status,
            modalidade: matricula.modalidade,
            aluno: alunoDB,
            professor: professorDB,
            duracaoMeses
        };
    };

    /** @returns {Promise<Array>} */
    findAll = async () => {
        console.log("🟣 MatriculaService.findAll()");
        return await this.#matriculaDAO.findAll();
    };

    /** @param {number} idAluno @returns {Promise<Array>} */
    findMinhas = async (idAluno) => {
        console.log("🟣 MatriculaService.findMinhas()");
        return await this.#matriculaDAO.findByAluno(idAluno);
    };

    /** @param {number} idProfessor @returns {Promise<Array>} */
    findMeusAlunos = async (idProfessor) => {
        console.log("🟣 MatriculaService.findMeusAlunos()");
        return await this.#matriculaDAO.findByProfessor(idProfessor);
    };

    /** @param {number} idMatricula @returns {Promise<object|null>} */
    findById = async (idMatricula) => {
        console.log("🟣 MatriculaService.findById()");

        const matricula = new Matricula();
        validar(() => { matricula.idMatricula = idMatricula; });

        return await this.#matriculaDAO.findById(matricula.idMatricula);
    };

    /**
     * Confere se o usuário do token pode mexer nessa matrícula.
     * @param {object} matricula
     * @param {object} usuario
     */
    #autorizar = (matricula, usuario) => {
        if (usuario?.role === "aluno" && Number(usuario.idAluno) !== Number(matricula.aluno.idAluno)) {
            throw new ErrorResponse(403, "Acesso negado", {
                message: "Você só pode alterar as suas próprias matrículas"
            });
        }

        if (usuario?.role === "professor" && Number(usuario.idProfessor) !== Number(matricula.professor.idProfessor)) {
            throw new ErrorResponse(403, "Acesso negado", {
                message: "Você só pode alterar as matrículas das suas turmas"
            });
        }
    };

    /**
     * Atualiza datas, status, modalidade e professor da matrícula.
     * @param {number} idMatricula
     * @param {object} matriculaJson
     * @param {object} usuario
     * @returns {Promise<boolean>}
     */
    updateMatricula = async (idMatricula, matriculaJson, usuario) => {
        console.log("🟣 MatriculaService.updateMatricula()");

        const atual = await this.findById(idMatricula);
        if (!atual) {
            return false;
        }

        this.#autorizar(atual, usuario);

        const idAluno = this.#idAlunoDoBody(matriculaJson, usuario);
        const idProfessor = Number(matriculaJson?.professor?.idProfessor);

        if (!Number.isInteger(idProfessor) || idProfessor <= 0) {
            throw new ErrorResponse(400, "Erro na validação de dados", {
                message: "O campo 'professor.idProfessor' é obrigatório!"
            });
        }

        const matricula = new Matricula();
        validar(() => {
            matricula.idMatricula = idMatricula;
            matricula.modalidade = matriculaJson.modalidade;
            matricula.status = matriculaJson.status ?? atual.status;
            matricula.dataInicio = matriculaJson.dataInicio ?? atual.dataInicio;
            matricula.dataFim = matriculaJson.dataFim ?? MatriculaService.somarMeses(
                matricula.dataInicio,
                validarDuracao(matriculaJson.duracaoMeses)
            );
        });

        const { alunoDB, professorDB } = await this.#validarVinculos(
            idAluno,
            idProfessor,
            matricula.modalidade
        );

        validar(() => {
            const aluno = new Aluno();
            aluno.idAluno = alunoDB.idAluno;

            const professor = new Professor();
            professor.idProfessor = professorDB.idProfessor;

            matricula.aluno = aluno;
            matricula.professor = professor;
        });

        if (matricula.status === "ativa") {
            const ativas = await this.#matriculaDAO.countByAlunoModalidade(
                idAluno,
                matricula.modalidade,
                "ativa",
                idMatricula
            );

            if (ativas > 0) {
                throw new ErrorResponse(400, "Matrícula duplicada", {
                    message: `O aluno ${alunoDB.nomeAluno} já possui uma matrícula ativa em ${matricula.modalidade}`
                });
            }
        }

        return await this.#matriculaDAO.update(matricula);
    };

    /**
     * Exclui a matrícula (o aluno sai da turma).
     * @param {number} idMatricula
     * @param {object} usuario
     * @returns {Promise<boolean>}
     */
    deleteMatricula = async (idMatricula, usuario) => {
        console.log("🟣 MatriculaService.deleteMatricula()");

        const atual = await this.findById(idMatricula);
        if (!atual) {
            return false;
        }

        this.#autorizar(atual, usuario);

        const matricula = new Matricula();
        validar(() => { matricula.idMatricula = idMatricula; });

        return await this.#matriculaDAO.delete(matricula);
    };
};
