const ErrorResponse = require("./ErrorResponse");

/**
 * Executa as validações dos setters dos models.
 *
 * Os setters lançam Error (regra de domínio). Aqui esse erro é convertido
 * em ErrorResponse 400, para que o cliente receba "erro de validação"
 * em vez de 500.
 *
 * @param {Function} validacao
 */
module.exports = function validar(validacao) {
    try {
        validacao();
    } catch (erro) {
        throw new ErrorResponse(400, "Erro na validação de dados", { message: erro.message });
    }
};
