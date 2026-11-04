/**
 * Entidade Pagamento: cada mensalidade de uma matrícula.
 *
 * Relaciona-se com Matricula (N:1) e é o objeto de CRUD do aluno:
 * registrar, listar, alterar e excluir os próprios pagamentos.
 */
const METODOS = ["Pix", "Cartão", "Dinheiro"];
const STATUS = ["pendente", "pago", "atrasado"];

/** Remove acentos e normaliza para comparar "Cartao" com "Cartão". */
const semAcento = (valor) =>
    String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();

module.exports = class Pagamento {
    #idPagamento;
    #valor;
    #dataVencimento;
    #dataPagamento;
    #metodo;
    #status;
    #matriculaId;

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

    /** @returns {Array<string>} métodos aceitos */
    static get METODOS() {
        return [...METODOS];
    }

    /** @returns {Array<string>} status aceitos */
    static get STATUS() {
        return [...STATUS];
    }

    get idPagamento() {
        return this.#idPagamento;
    }

    set idPagamento(valor) {
        const parsed = Number(valor);
        if (!Number.isInteger(parsed)) {
            throw new Error("idPagamento deve ser um número inteiro.");
        }
        if (parsed <= 0) {
            throw new Error("idPagamento deve ser maior que zero.");
        }
        this.#idPagamento = parsed;
    }

    get valor() {
        return this.#valor;
    }

    /** @param {number} valor - maior que zero, com até 2 casas decimais */
    set valor(valor) {
        const parsed = Number(valor);
        if (!Number.isFinite(parsed)) {
            throw new Error("valor deve ser um número.");
        }
        if (parsed <= 0) {
            throw new Error("valor deve ser maior que zero.");
        }
        if (parsed > 100000) {
            throw new Error("valor deve ser no máximo 100000.");
        }
        this.#valor = Math.round(parsed * 100) / 100;
    }

    get dataVencimento() {
        return this.#dataVencimento;
    }

    set dataVencimento(valor) {
        this.#dataVencimento = Pagamento.normalizarData(valor);
    }

    get dataPagamento() {
        return this.#dataPagamento;
    }

    /** @param {string|Date|null} valor - nulo enquanto não for pago */
    set dataPagamento(valor) {
        if (valor === null || valor === undefined || String(valor).trim() === "") {
            this.#dataPagamento = null;
            return;
        }
        this.#dataPagamento = Pagamento.normalizarData(valor);
    }

    get metodo() {
        return this.#metodo;
    }

    /** @param {string} valor - Pix | Cartão | Dinheiro */
    set metodo(valor) {
        const nome = METODOS.find((item) => semAcento(item) === semAcento(valor));
        if (!nome) {
            throw new Error(`metodo inválido. Use um destes: ${METODOS.join(", ")}.`);
        }
        this.#metodo = nome;
    }

    get status() {
        return this.#status;
    }

    /** @param {string} valor - pendente | pago | atrasado */
    set status(valor) {
        const nome = STATUS.find((item) => semAcento(item) === semAcento(valor));
        if (!nome) {
            throw new Error(`status inválido. Use um destes: ${STATUS.join(", ")}.`);
        }
        this.#status = nome;
    }

    get matriculaId() {
        return this.#matriculaId;
    }

    /** @param {number} valor - id da matrícula dona do pagamento */
    set matriculaId(valor) {
        const parsed = Number(valor);
        if (!Number.isInteger(parsed) || parsed <= 0) {
            throw new Error("matriculaId deve ser um número inteiro maior que zero.");
        }
        this.#matriculaId = parsed;
    }
};
