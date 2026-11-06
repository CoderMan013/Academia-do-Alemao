const Pagamento = require("../models/Pagamento");
const ErrorResponse = require("../utils/ErrorResponse");
const validar = require("../utils/Validar");
const { valorMensalidade } = require("../domain/Treinos");

/**
 * Regras de negócio de Pagamento.
 *
 * O aluno registra as mensalidades das próprias matrículas e só pode
 * alterar/excluir o que é dele. Um pagamento nasce "pendente" e, quando
 * marcado como "pago" sem data, recebe a data de hoje.
 */
module.exports = class PagamentoService {
    #pagamentoDAO;
    #matriculaDAO;

    constructor(pagamentoDAODependency, matriculaDAODependency) {
        console.log("⬆️  PagamentoService.constructor()");
        this.#pagamentoDAO = pagamentoDAODependency;
        this.#matriculaDAO = matriculaDAODependency;
    }

    /** Data de hoje no formato YYYY-MM-DD. */
    static hoje() {
        const agora = new Date();
        const local = new Date(agora.getTime() - agora.getTimezoneOffset() * 60000);
        return local.toISOString().slice(0, 10);
    }

    /** @param {object} usuario @returns {number} */
    #idAlunoDoToken = (usuario) => {
        const idAluno = Number(usuario?.idAluno);
        if (!Number.isInteger(idAluno) || idAluno <= 0) {
            throw new ErrorResponse(401, "Sessão inválida", {
                message: "O token não identifica um aluno"
            });
        }
        return idAluno;
    };

    /**
     * Carrega a matrícula e confere se ela é do aluno logado.
     * @param {number} idMatricula
     * @param {object} usuario
     */
    #matriculaDoAluno = async (idMatricula, usuario) => {
        const idAluno = this.#idAlunoDoToken(usuario);

        const matricula = await this.#matriculaDAO.findById(idMatricula);
        if (!matricula) {
            throw new ErrorResponse(404, "Matrícula não encontrada", {
                message: `Não existe matrícula com id ${idMatricula}`
            });
        }

        if (Number(matricula.aluno.idAluno) !== idAluno) {
            throw new ErrorResponse(403, "Acesso negado", {
                message: "A matrícula informada não é sua"
            });
        }

        return matricula;
    };

    /**
     * Cria um pagamento para uma matrícula do aluno logado.
     *
     * @param {object} pagamentoJson
     * @param {object} usuario
     * @returns {Promise<object>}
     */
    createPagamento = async (pagamentoJson, usuario) => {
        console.log("🟣 PagamentoService.createPagamento()");

        const pagamento = new Pagamento();
        validar(() => {
            pagamento.matriculaId = pagamentoJson?.matricula?.idMatricula;
            pagamento.dataVencimento = pagamentoJson.dataVencimento
                ?? PagamentoService.hoje();
            pagamento.metodo = pagamentoJson.metodo ?? "";
            pagamento.status = pagamentoJson.status ?? "pendente";
            pagamento.dataPagamento = pagamentoJson.dataPagamento ?? null;
        });

        const matricula = await this.#matriculaDoAluno(pagamento.matriculaId, usuario);
        validar(() => {
            pagamento.valor = valorMensalidade(matricula.treino);
        });

        if (pagamento.status === "pago" && !pagamento.metodo) {
            throw new ErrorResponse(400, "Erro na validação de dados", {
                message: "Informe a forma de pagamento para registrar a mensalidade como paga"
            });
        }

        // Marcar como pago sem informar a data significa "pago agora".
        if (pagamento.status === "pago" && !pagamento.dataPagamento) {
            pagamento.dataPagamento = PagamentoService.hoje();
        }

        const novoId = await this.#pagamentoDAO.create(pagamento);
        return await this.#pagamentoDAO.findById(novoId);
    };

    /** @returns {Promise<Array>} */
    findAll = async (usuario) => {
        console.log("🟣 PagamentoService.findAll()");
        return await this.#pagamentoDAO.findByAluno(this.#idAlunoDoToken(usuario));
    };

    /** @param {number} idAluno @returns {Promise<Array>} */
    findMinhas = async (idAluno) => {
        console.log("🟣 PagamentoService.findMinhas()");
        return await this.#pagamentoDAO.findByAluno(idAluno);
    };

    /** @param {number} idMatricula @param {object} usuario @returns {Promise<Array>} */
    findByMatricula = async (idMatricula, usuario) => {
        console.log("🟣 PagamentoService.findByMatricula()");
        await this.#matriculaDoAluno(idMatricula, usuario);
        return await this.#pagamentoDAO.findByMatricula(idMatricula);
    };

    /** @param {number} idPagamento @returns {Promise<object|null>} */
    findById = async (idPagamento, usuario) => {
        console.log("🟣 PagamentoService.findById()");

        const pagamento = new Pagamento();
        validar(() => { pagamento.idPagamento = idPagamento; });

        const encontrado = await this.#pagamentoDAO.findById(pagamento.idPagamento);
        if (encontrado) {
            this.#autorizar(encontrado, usuario);
        }
        return encontrado;
    };

    /** Confere se o pagamento pertence a uma matrícula do aluno do token. */
    #autorizar = (pagamento, usuario) => {
        const idAluno = this.#idAlunoDoToken(usuario);
        if (Number(pagamento.matricula.aluno.idAluno) !== idAluno) {
            throw new ErrorResponse(403, "Acesso negado", {
                message: "Você só pode alterar os seus próprios pagamentos"
            });
        }
    };

    /**
     * Atualiza valor, vencimento, pagamento, método e status.
     *
     * @param {number} idPagamento
     * @param {object} pagamentoJson
     * @param {object} usuario
     * @returns {Promise<object|null>}
     */
    updatePagamento = async (idPagamento, pagamentoJson, usuario) => {
        console.log("🟣 PagamentoService.updatePagamento()");

        const atual = await this.findById(idPagamento, usuario);
        if (!atual) {
            return null;
        }

        const pagamento = new Pagamento();
        validar(() => {
            pagamento.idPagamento = idPagamento;
            pagamento.valor = valorMensalidade(atual.matricula.treino);
            pagamento.dataVencimento = pagamentoJson.dataVencimento ?? atual.dataVencimento;
            pagamento.status = pagamentoJson.status ?? atual.status;
            pagamento.metodo = pagamentoJson.metodo ?? atual.metodo ?? "";
            pagamento.dataPagamento = pagamentoJson.dataPagamento !== undefined
                ? pagamentoJson.dataPagamento
                : atual.dataPagamento;
            pagamento.matriculaId = atual.matricula.idMatricula;
        });

        if (pagamento.status === "pago" && !pagamento.metodo) {
            throw new ErrorResponse(400, "Erro na validação de dados", {
                message: "Informe a forma de pagamento para registrar a mensalidade como paga"
            });
        }

        if (pagamento.status === "pago" && !pagamento.dataPagamento) {
            pagamento.dataPagamento = PagamentoService.hoje();
        }

        if (pagamento.status !== "pago") {
            pagamento.dataPagamento = null;
            pagamento.metodo = "";
        }

        const atualizou = await this.#pagamentoDAO.update(pagamento);
        return atualizou ? await this.findById(idPagamento, usuario) : null;
    };

    /**
     * Exclui um pagamento do aluno.
     * @param {number} idPagamento
     * @param {object} usuario
     * @returns {Promise<boolean>}
     */
    deletePagamento = async (idPagamento, usuario) => {
        console.log("🟣 PagamentoService.deletePagamento()");

        const atual = await this.findById(idPagamento, usuario);
        if (!atual) {
            return false;
        }

        const pagamento = new Pagamento();
        validar(() => { pagamento.idPagamento = idPagamento; });

        return await this.#pagamentoDAO.delete(pagamento);
    };
};
