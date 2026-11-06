const Aluno = require("./Aluno");
const { validarTreino } = require("../domain/Treinos");

/**
 * Entidade Matricula: a tabela do meio do projeto.
 *
 * Relaciona o aluno ao treino escolhido e guarda o período do plano.
 * Cada matrícula pode ter vários pagamentos (mensalidades).
 */
module.exports = class Matricula {
    #idMatricula;
    #dataInicio;
    #dataFim;
    #status;
    #treino;
    #aluno;

    /** Converte Date/string para o formato YYYY-MM-DD. */
    static normalizarData(valor) {
        if (valor instanceof Date) {
            if (Number.isNaN(valor.getTime())) {
                throw new Error("data inválida, use o formato YYYY-MM-DD.");
            }
            return valor.toISOString().slice(0, 10);
        }
        if (typeof valor === "string") {
            const texto = valor.trim();
            const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
            if (!partes) {
                throw new Error("data inválida, use o formato YYYY-MM-DD.");
            }
            const [, anoTexto, mesTexto, diaTexto] = partes;
            const ano = Number(anoTexto);
            const mes = Number(mesTexto);
            const dia = Number(diaTexto);
            const data = new Date(Date.UTC(ano, mes - 1, dia));
            if (
                ano < 1000 ||
                ano > 9999 ||
                data.getUTCFullYear() !== ano ||
                data.getUTCMonth() !== mes - 1 ||
                data.getUTCDate() !== dia
            ) {
                throw new Error("data inválida, use o formato YYYY-MM-DD.");
            }
            return texto;
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

    get treino() {
        return this.#treino;
    }

    /** @param {string} valor - Musculação | Cross Fit | Muay Thai | Karatê | Boxe */
    set treino(valor) {
        if (typeof valor !== "string") {
            throw new Error("treino deve ser uma string.");
        }
        this.#treino = validarTreino(valor);
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
