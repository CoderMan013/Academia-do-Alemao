const jwt = require("jsonwebtoken");
const crypto = require("crypto");

/**
 * Gera e valida os tokens JWT da aplicação.
 *
 * Claims personalizados: email, role, name e idAluno.
 * Chave, algoritmo e validade são atributos privados com getters/setters.
 */
module.exports = class MeuTokenJWT {
    #key;
    #alg;
    #type;
    #iss;
    #aud;
    #sub;
    #duracaoToken;
    #payload;

    constructor() {
        this.#key = process.env.JWT_KEY ?? "x9S4q0v+V0IjvHkG20uAxaHx1ijj+q1HWjHKv+ohxp/oK+77qyXkVj/l4QYHHTF3";
        this.#alg = "HS256";
        this.#type = "JWT";
        this.#iss = "http://localhost";
        this.#aud = "http://localhost";
        this.#sub = "acesso_sistema";
        this.#duracaoToken = 3600 * 8; // 8 horas
        this.#payload = null;
    }

    /**
     * Gera o token assinado com os claims informados.
     * @param {{email: string, role: string, name: string, idUsuario: number, idAluno: number}} claims
     * @returns {string} token JWT
     */
    gerarToken = (claims) => {
        const headers = { alg: this.#alg, typ: this.#type };
        const agora = Math.floor(Date.now() / 1000);

        const payload = {
            iss: this.#iss,
            aud: this.#aud,
            sub: this.#sub,
            iat: agora,
            exp: agora + this.#duracaoToken,
            nbf: agora,
            jti: crypto.randomBytes(16).toString("hex"),

            email: claims.email,
            role: claims.role,
            name: claims.name,
            idUsuario: claims.idUsuario ?? claims.idAluno ?? null,
            idAluno: claims.idAluno ?? null
        };

        return jwt.sign(payload, this.#key, {
            algorithm: this.#alg,
            header: headers
        });
    };

    /**
     * Valida o token recebido (aceita o prefixo "Bearer ").
     * @param {string} stringToken
     * @returns {boolean}
     */
    validarToken = (stringToken) => {
        if (!stringToken || stringToken.trim() === "") {
            console.error("Token não fornecido");
            return false;
        }

        const token = stringToken.replace("Bearer ", "").trim();

        try {
            const decoded = jwt.verify(token, this.#key, {
                algorithms: [this.#alg],
                audience: this.#aud,
                issuer: this.#iss
            });
            this.#payload = decoded;
            return true;
        } catch (erro) {
            if (erro instanceof jwt.TokenExpiredError) {
                console.error("Token expirado");
            } else if (erro instanceof jwt.JsonWebTokenError) {
                console.error("Token inválido");
            } else {
                console.error("Erro ao validar token", erro);
            }
            return false;
        }
    };

    get key() { return this.#key; }
    set key(value) { this.#key = value; }

    get alg() { return this.#alg; }
    set alg(value) { this.#alg = value; }

    get type() { return this.#type; }
    set type(value) { this.#type = value; }

    get iss() { return this.#iss; }
    set iss(value) { this.#iss = value; }

    get aud() { return this.#aud; }
    set aud(value) { this.#aud = value; }

    get sub() { return this.#sub; }
    set sub(value) { this.#sub = value; }

    get duracaoToken() { return this.#duracaoToken; }
    set duracaoToken(value) { this.#duracaoToken = value; }

    get payload() { return this.#payload; }
    set payload(value) { this.#payload = value; }
};
