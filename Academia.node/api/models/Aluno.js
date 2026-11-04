/**
 * Entidade Aluno (contexto: academia).
 *
 * É a entidade que possui e-mail e senha, portanto é ela que autentica
 * no sistema (a senha é gravada com bcrypt pelo DAO).
 */
module.exports = class Aluno {
    #idAluno;
    #nomeAluno;
    #email;
    #senha;
    #ativo;

    get idAluno() {
        return this.#idAluno;
    }

    set idAluno(valor) {
        const parsed = Number(valor);
        if (!Number.isInteger(parsed)) {
            throw new Error("idAluno deve ser um número inteiro.");
        }
        if (parsed <= 0) {
            throw new Error("idAluno deve ser maior que zero.");
        }
        this.#idAluno = parsed;
    }

    get nomeAluno() {
        return this.#nomeAluno;
    }

    /**
     * @param {string} valor - entre 3 e 128 caracteres
     */
    set nomeAluno(valor) {
        if (typeof valor !== "string") {
            throw new Error("nomeAluno deve ser uma string.");
        }
        const nome = valor.trim();
        if (nome.length < 3) {
            throw new Error("nomeAluno deve ter pelo menos 3 caracteres.");
        }
        if (nome.length > 128) {
            throw new Error("nomeAluno deve ter no máximo 128 caracteres.");
        }
        this.#nomeAluno = nome;
    }

    get email() {
        return this.#email;
    }

    /**
     * @param {string} valor - formato nome@dominio.com
     */
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

    get ativo() {
        return this.#ativo;
    }

    /**
     * @param {number} valor - 0 (inativo) ou 1 (ativo)
     */
    set ativo(valor) {
        const parsed = Number(valor);
        if (![0, 1].includes(parsed)) {
            throw new Error("ativo deve ser 0 ou 1.");
        }
        this.#ativo = parsed;
    }
};
