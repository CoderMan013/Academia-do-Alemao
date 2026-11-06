const Aluno = require("../models/Aluno");
const Matricula = require("../models/Matricula");
const ErrorResponse = require("../utils/ErrorResponse");
const validar = require("../utils/Validar");
const { valorMensalidade } = require("../domain/Treinos");

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
    #pagamentoDAO;

    constructor(matriculaDAODependency, alunoDAODependency, pagamentoDAODependency) {
        console.log("⬆️  MatriculaService.constructor()");
        this.#matriculaDAO = matriculaDAODependency;
        this.#alunoDAO = alunoDAODependency;
        this.#pagamentoDAO = pagamentoDAODependency;
    }

    /** Data de hoje no formato YYYY-MM-DD. */
    static hoje() {
        const agora = new Date();
        const local = new Date(agora.getTime() - agora.getTimezoneOffset() * 60000);
        return local.toISOString().slice(0, 10);
    }

    /**
     * Gera uma mensalidade por mês, do início até o último vencimento
     * que não ultrapasse a data final do plano.
     * @param {string} dataInicio
     * @param {string} dataFim
     * @returns {string[]}
     */
    static gerarVencimentos(dataInicio, dataFim) {
        const [anoInicio, mesInicio, diaInicio] = dataInicio.split("-").map(Number);
        const limite = Date.parse(`${dataFim}T00:00:00Z`);
        const vencimentos = [];

        for (let deslocamento = 0; ; deslocamento += 1) {
            const indiceMes = mesInicio - 1 + deslocamento;
            const ano = anoInicio + Math.floor(indiceMes / 12);
            const mes = (indiceMes % 12) + 1;
            const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
            const dia = Math.min(diaInicio, ultimoDia);
            const data = new Date(Date.UTC(ano, mes - 1, dia));

            if (data.getTime() > limite) break;

            vencimentos.push(data.toISOString().slice(0, 10));
        }

        return vencimentos;
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
     * - o aluno não pode ter outra matrícula ativa no MESMO treino
     *   (pode ter vários treinos diferentes);
     * - dataInicio pode ser omitida; dataFim deve ser informada.
     *
     * @param {object} matriculaJson
     * @param {object} usuario - usuário autenticado (vem do token)
     * @returns {Promise<object>}
     */
    createMatricula = async (matriculaJson, usuario) => {
        console.log("🟣 MatriculaService.createMatricula()");

        const idAluno = this.#idAlunoDoToken(usuario);

        const matricula = new Matricula();

        validar(() => {
            matricula.treino = matriculaJson.treino;
            matricula.status = matriculaJson.status ?? "ativa";
            matricula.dataInicio = matriculaJson.dataInicio ?? MatriculaService.hoje();
            matricula.dataFim = matriculaJson.dataFim;
        });

        const alunoDB = await this.#validarAluno(idAluno);

        validar(() => {
            const aluno = new Aluno();
            aluno.idAluno = alunoDB.idAluno;
            matricula.aluno = aluno;
        });

        if (matricula.status === "ativa") {
            const ativas = await this.#matriculaDAO.countByAlunoTreino(
                idAluno,
                matricula.treino,
                "ativa"
            );

            if (ativas > 0) {
                throw new ErrorResponse(400, "Matrícula duplicada", {
                    message: `O aluno ${alunoDB.nomeAluno} já possui uma matrícula ativa no treino ${matricula.treino}`
                });
            }
        }

        const novoId = await this.#matriculaDAO.create(matricula);

        try {
            if (matricula.status === "ativa") {
                const vencimentos = MatriculaService.gerarVencimentos(
                    matricula.dataInicio,
                    matricula.dataFim
                );
                await this.#pagamentoDAO.createMensalidades(
                    vencimentos.map((dataVencimento) => ({
                        valor: valorMensalidade(matricula.treino),
                        dataVencimento,
                        matriculaId: novoId
                    }))
                );
            }
        } catch (error) {
            const criada = new Matricula();
            validar(() => { criada.idMatricula = novoId; });

            try {
                const removida = await this.#matriculaDAO.delete(criada);
                if (!removida) {
                    throw new Error("A matrícula incompleta não foi removida");
                }
            } catch (rollbackError) {
                throw new AggregateError(
                    [error, rollbackError],
                    "Falha ao gerar mensalidades e remover a matrícula incompleta"
                );
            }

            throw error;
        }

        return {
            idMatricula: novoId,
            treino: matricula.treino,
            dataInicio: matricula.dataInicio,
            dataFim: matricula.dataFim,
            status: matricula.status,
            aluno: alunoDB
        };
    };

    /** @returns {Promise<Array>} */
    findAll = async (usuario) => {
        console.log("🟣 MatriculaService.findAll()");
        return await this.#matriculaDAO.findByAluno(this.#idAlunoDoToken(usuario));
    };

    /** @param {number} idAluno @returns {Promise<Array>} */
    findMinhas = async (idAluno) => {
        console.log("🟣 MatriculaService.findMinhas()");
        return await this.#matriculaDAO.findByAluno(idAluno);
    };

    /** @param {number} idMatricula @returns {Promise<object|null>} */
    findById = async (idMatricula, usuario) => {
        console.log("🟣 MatriculaService.findById()");

        const matricula = new Matricula();
        validar(() => { matricula.idMatricula = idMatricula; });

        const encontrada = await this.#matriculaDAO.findById(matricula.idMatricula);
        if (encontrada) {
            this.#autorizar(encontrada, usuario);
        }
        return encontrada;
    };

    /**
     * Confere se o aluno do token é o dono da matrícula.
     * @param {object} matricula
     * @param {object} usuario
     */
    #autorizar = (matricula, usuario) => {
        const idAluno = this.#idAlunoDoToken(usuario);
        if (idAluno !== Number(matricula.aluno.idAluno)) {
            throw new ErrorResponse(403, "Acesso negado", {
                message: "Você só pode alterar as suas próprias matrículas"
            });
        }
    };

    /**
     * Atualiza treino, datas e status da matrícula.
     * @param {number} idMatricula
     * @param {object} matriculaJson
     * @param {object} usuario
     * @returns {Promise<object|null>}
     */
    updateMatricula = async (idMatricula, matriculaJson, usuario) => {
        console.log("🟣 MatriculaService.updateMatricula()");

        const atual = await this.findById(idMatricula, usuario);
        if (!atual) {
            return null;
        }

        const matricula = new Matricula();
        validar(() => {
            matricula.idMatricula = idMatricula;
            matricula.treino = matriculaJson.treino ?? atual.treino;
            matricula.status = matriculaJson.status ?? atual.status;
            matricula.dataInicio = matriculaJson.dataInicio ?? atual.dataInicio;
            matricula.dataFim = matriculaJson.dataFim ?? atual.dataFim;
        });

        const alunoDB = await this.#validarAluno(atual.aluno.idAluno);

        validar(() => {
            const aluno = new Aluno();
            aluno.idAluno = alunoDB.idAluno;
            matricula.aluno = aluno;
        });

        if (matricula.status === "ativa") {
            const ativas = await this.#matriculaDAO.countByAlunoTreino(
                alunoDB.idAluno,
                matricula.treino,
                "ativa",
                idMatricula
            );

            if (ativas > 0) {
                throw new ErrorResponse(400, "Matrícula duplicada", {
                    message: `O aluno ${alunoDB.nomeAluno} já possui uma matrícula ativa no treino ${matricula.treino}`
                });
            }
        }

        const atualizou = await this.#matriculaDAO.update(matricula);
        return atualizou ? await this.findById(idMatricula, usuario) : null;
    };

    /**
     * Exclui a matrícula (o aluno sai da turma).
     * @param {number} idMatricula
     * @param {object} usuario
     * @returns {Promise<boolean>}
     */
    deleteMatricula = async (idMatricula, usuario) => {
        console.log("🟣 MatriculaService.deleteMatricula()");

        const atual = await this.findById(idMatricula, usuario);
        if (!atual) {
            return false;
        }

        const matricula = new Matricula();
        validar(() => { matricula.idMatricula = idMatricula; });

        return await this.#matriculaDAO.delete(matricula);
    };
};
