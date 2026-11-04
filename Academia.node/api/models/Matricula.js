const Aluno = require("./Aluno");
const { validarModalidade } = require("../domain/Modalidades");

/**
 * Entidade Matricula: a tabela do meio do projeto.
 *
 * Relaciona o Aluno à modalidade cursada e guarda o período do plano.
 * Cada matrícula pode ter vários pagamentos (mensalidades).
 */
module.exports = class Matricula {
    #idMatricula;
    #dataInicio;
    #dataFim;
    #status;
    #modalidade;
    #aluno;

    /** Converte Date/string para o formato YYYY-MM-DD. */
    static normalizarData(valor) {
        if (valor instanceof Date) {
            return valor.toISOString().slice(0, 10);
        }
        if (typeof valor === "string") {
            const texto = valor.trim();
            const data = new Date(`${texto}T00:00:00`);
            if (Number.isNaN(data.getTime())) {
                throw new Error("data inválida, use o formato YYYY-MM-DD.");
            }
            return texto.slice(0, 10);
        }
        throw new Error("data deve ser uma string no formato YYYY-MM-DD.");
    }

    get idMatricula() {
        return this.#idMatricula;
    }

    set idMatricula(valor) {
        const parsed = Number(valor);
        if (!Number.isInteger(parsed)) {
            throw new Error("idMatricula deve ser um número inteiro.");
        }
        if (parsed <= 0) {
            throw new Error("idMatricula deve ser maior que zero.");
        }
        this.#idMatricula = parsed;
    }

    get dataInicio() {
        return this.#dataInicio;
    }

    set dataInicio(valor) {
        this.#dataInicio = Matricula.normalizarData(valor);
    }

    get dataFim() {
        return this.#dataFim;
    }

    /** Regra de domínio: a data final não pode ser anterior à inicial. */
    set dataFim(valor) {
        const data = Matricula.normalizarData(valor);
        if (this.#dataInicio && data < this.#dataInicio) {
            throw new Error("dataFim não pode ser anterior a dataInicio.");
        }
        this.#dataFim = data;
    }

    get status() {
        return this.#status;
    }

    /** @param {string} valor - ativa | cancelada | concluida */
    set status(valor) {
        if (typeof valor !== "string") {
            throw new Error("status deve ser uma string.");
        }
        const status = valor.trim().toLowerCase();
        const permitidos = ["ativa", "cancelada", "concluida"];
        if (!permitidos.includes(status)) {
            throw new Error(`status deve ser um destes valores: ${permitidos.join(", ")}.`);
        }
        this.#status = status;
    }

    get modalidade() {
        return this.#modalidade;
    }

    /** @param {string} valor - Musculação | Cross Fit | Muay Thai | Karatê | Boxe */
    set modalidade(valor) {
        if (typeof valor !== "string") {
            throw new Error("modalidade deve ser uma string.");
        }
        this.#modalidade = validarModalidade(valor);
    }

    get aluno() {
        return this.#aluno;
    }

    /** @param {Aluno} valor */
    set aluno(valor) {
        if (!(valor instanceof Aluno)) {
            throw new Error("aluno deve ser uma instância válida de Aluno.");
        }
        this.#aluno = valor;
    }
};
