/**
 * Erro de aplicação com código HTTP.
 *
 * Usado pelos middlewares/services para devolver uma resposta padronizada
 * sem "sujar" o controller com try/catch de validação.
 */
module.exports = class ErrorResponse extends Error {
    /**
     * @param {number} httpCode - Código HTTP (400, 401, 404...)
     * @param {string} message - Mensagem principal
     * @param {object} error - Detalhes do erro
     */
    constructor(httpCode, message, error = null) {
        super(message);
        this.name = "ErrorResponse";
        this.httpCode = httpCode;
        this.error = error;
    }
};
