const { normalizarLista } = require("../domain/Modalidades");

/**
 * Entidade Professor (contexto: academia).
 *
 * Assim como o Aluno, possui e-mail e senha e autentica no sistema.
 * A diferença é que o professor leciona uma ou mais modalidades
 * (Musculação, Cross Fit, Muay Thai, Karatê, Boxe).
 */
module.exports = class Professor {
    #idProfessor;
    #nomeProfessor;
    #email;
    #senha;
    #modalidades;
    #ativo;

    get idProfessor() {
        return this.#idProfessor;
    }

    set idProfessor(valor) {
        const parsed = Number(valor);
        if (!Number.isInteger(parsed)) {
            throw new Error("idProfessor deve ser um número inteiro.");
        }
        if (parsed <= 0) {
            throw new Error("idProfessor deve ser maior que zero.");
        }
        this.#idProfessor = parsed;
    }

    get nomeProfessor() {
        return this.#nomeProfessor;
    }

    /** @param {string} valor - entre 3 e 128 caracteres */
    set nomeProfessor(valor) {
        if (typeof valor !== "string") {
            throw new Error("nomeProfessor deve ser uma string.");
        }
        const nome = valor.trim();
        if (nome.length < 3) {
            throw new Error("nomeProfessor deve ter pelo menos 3 caracteres.");
        }
        if (nome.length > 128) {
            throw new Error("nomeProfessor deve ter no máximo 128 caracteres.");
        }
        this.#nomeProfessor = nome;
    }

    get email() {
        return this.#email;
    }

    /** @param {string} valor - formato nome@dominio.com */
    set email(valor) {
        if (typeof valor !== "string") {
            throw new Error("email deve ser uma string.");
        }
        const email = valor.trim().toLowerCase();
        if (email === "") {
            throw new Error("email não pode ser vazio.");
        }
        if (email.length > 64) {
            throw new Error("email deve ter no máximo 64 caracteres.");
        }
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!regex.test(email)) {
            throw new Error("email em formato inválido.");
        }
        this.#email = email;
    }

    get senha() {
        return this.#senha;
    }

    /**
     * Regra de domínio: mínimo 6 caracteres, 1 maiúscula, 1 número e 1 especial.
     * @param {string} valor
     */
    set senha(valor) {
        if (typeof valor !== "string") {
            throw new Error("senha deve ser uma string.");
        }
        const senha = valor.trim();
        if (senha === "") {
            throw new Error("senha não pode ser vazia.");
        }
        if (senha.length < 6) {
            throw new Error("senha deve ter pelo menos 6 caracteres.");
        }
        if (!/[A-Z]/.test(senha)) {
            throw new Error("senha deve conter pelo menos uma letra maiúscula.");
        }
        if (!/[0-9]/.test(senha)) {
            throw new Error("senha deve conter pelo menos um número.");
        }
        if (!/[!@#$%^&*(),.?":{}|<>_\-+]/.test(senha)) {
            throw new Error("senha deve conter pelo menos um caractere especial.");
        }
        this.#senha = senha;
    }

    get modalidades() {
        return [...(this.#modalidades ?? [])];
    }

    /**
     * Lista de modalidades que o professor leciona.
     * Aceita array ou texto separado por vírgula; só aceita as 5 do sistema.
     * @param {Array<string>|string} valor
     */
    set modalidades(valor) {
        this.#modalidades = normalizarLista(valor);
    }

    get ativo() {
        return this.#ativo;
    }

    /** @param {number} valor - 0 (inativo) ou 1 (ativo) */
    set ativo(valor) {
        const parsed = Number(valor);
        if (![0, 1].includes(parsed)) {
            throw new Error("ativo deve ser 0 ou 1.");
        }
        this.#ativo = parsed;
    }
};
