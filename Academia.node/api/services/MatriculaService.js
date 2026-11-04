const Aluno = require("../models/Aluno");
const Matricula = require("../models/Matricula");
const ErrorResponse = require("../utils/ErrorResponse");
const validar = require("../utils/Validar");
const { validarDuracao } = require("../domain/Modalidades");

/**
 * Regras de negócio de Matricula.
 *
 * Recebe MatriculaDAO (CRUD) e AlunoDAO (valida se o aluno existe).
 * Como o sistema tem um único papel logado (aluno), o dono da matrícula
 * vem sempre do token.
 */
module.exports = class MatriculaService {
    #matriculaDAO;
    #alunoDAO;

    constructor(matriculaDAODependency, alunoDAODependency) {
        console.log("⬆️  MatriculaService.constructor()");
        this.#matriculaDAO = matriculaDAODependency;
        this.#alunoDAO = alunoDAODependency;
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
     * O aluno matriculado vem do token (ninguém matricula outra pessoa).
     * @param {object} usuario
     * @returns {number}
     */
    #idAlunoDoToken = (usuario) => {
        const idAluno = Number(usuario?.idAluno);
        if (!Number.isInteger(idAluno) || idAluno <= 0) {
            throw new ErrorResponse(401, "Sessão inválida", {
                message: "O token não identifica um aluno"
            });
        }
        return idAluno;
    };

    /** @param {number} idAluno */
    #validarAluno = async (idAluno) => {
        const alunoDB = await this.#alunoDAO.findById(idAluno);
        if (!alunoDB) {
            throw new ErrorResponse(404, "Aluno não encontrado", {
                message: `Não existe aluno com id ${idAluno}`
            });
        }
        return alunoDB;
    };

    /**
     * Cria uma matrícula.
     *
     * Regras:
     * - o aluno precisa existir;
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

        const idAluno = this.#idAlunoDoToken(usuario);

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

        const alunoDB = await this.#validarAluno(idAluno);

        validar(() => {
            const aluno = new Aluno();
            aluno.idAluno = alunoDB.idAluno;
            matricula.aluno = aluno;
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
            modalidade: matricula.modalidade,
            dataInicio: matricula.dataInicio,
            dataFim: matricula.dataFim,
            status: matricula.status,
            aluno: alunoDB,
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

    /** @param {number} idMatricula @returns {Promise<object|null>} */
    findById = async (idMatricula) => {
        console.log("🟣 MatriculaService.findById()");

        const matricula = new Matricula();
        validar(() => { matricula.idMatricula = idMatricula; });

        return await this.#matriculaDAO.findById(matricula.idMatricula);
    };

    /**
     * Confere se o aluno do token é o dono da matrícula.
     * @param {object} matricula
     * @param {object} usuario
     */
    #autorizar = (matricula, usuario) => {
        if (Number(usuario?.idAluno) !== Number(matricula.aluno.idAluno)) {
            throw new ErrorResponse(403, "Acesso negado", {
                message: "Você só pode alterar as suas próprias matrículas"
            });
        }
    };

    /**
     * Atualiza modalidade, datas e status da matrícula.
     * @param {number} idMatricula
     * @param {object} matriculaJson
     * @param {object} usuario
     * @returns {Promise<object|null>}
     */
    updateMatricula = async (idMatricula, matriculaJson, usuario) => {
        console.log("🟣 MatriculaService.updateMatricula()");

        const atual = await this.findById(idMatricula);
        if (!atual) {
            return null;
        }

        this.#autorizar(atual, usuario);

        const matricula = new Matricula();
        validar(() => {
            matricula.idMatricula = idMatricula;
            matricula.modalidade = matriculaJson.modalidade ?? atual.modalidade;
            matricula.status = matriculaJson.status ?? atual.status;
            matricula.dataInicio = matriculaJson.dataInicio ?? atual.dataInicio;
            matricula.dataFim = matriculaJson.dataFim ?? MatriculaService.somarMeses(
                matricula.dataInicio,
                validarDuracao(matriculaJson.duracaoMeses)
            );
        });

        const alunoDB = await this.#validarAluno(atual.aluno.idAluno);

        validar(() => {
            const aluno = new Aluno();
            aluno.idAluno = alunoDB.idAluno;
            matricula.aluno = aluno;
        });

        if (matricula.status === "ativa") {
            const ativas = await this.#matriculaDAO.countByAlunoModalidade(
                alunoDB.idAluno,
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

        const atualizou = await this.#matriculaDAO.update(matricula);
        return atualizou ? await this.findById(idMatricula) : null;
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
