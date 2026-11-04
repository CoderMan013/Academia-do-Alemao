const ErrorResponse = require("../utils/ErrorResponse");

/**
 * Middleware de validação das requisições de autenticação.
 */
module.exports = class AuthMiddleware {

    /** Corpo esperado: { "email": "...", "senha": "..." } */
    validateLoginBody = (request, response, next) => {
        console.log("🔷 AuthMiddleware.validateLoginBody()");

        if (!request.body?.email || !request.body?.senha) {
            throw new ErrorResponse(400, "Erro na validação de dados", {
                message: "Informe 'email' e 'senha' para efetuar o login!"
            });
        }

        next();
    };

    /**
     * Corpo esperado (2ª tela do cadastro):
     * { "tipo": "aluno"|"professor", "nome": "...", "email": "...", "senha": "..." }
     */
    validateRegistrarBody = (request, response, next) => {
        console.log("🔷 AuthMiddleware.validateRegistrarBody()");
        const body = request.body;

        if (!body?.tipo) {
            throw new ErrorResponse(400, "Erro na validação de dados", {
                message: "Escolha se o cadastro é de 'aluno' ou 'professor'!"
            });
        }

        if (!body?.nome || String(body.nome).trim() === "") {
            throw new ErrorResponse(400, "Erro na validação de dados", {
                message: "O campo 'nome' é obrigatório!"
            });
        }

        if (!body?.email || String(body.email).trim() === "") {
            throw new ErrorResponse(400, "Erro na validação de dados", {
                message: "O campo 'email' é obrigatório!"
            });
        }

        if (!body?.senha || String(body.senha).trim() === "") {
            throw new ErrorResponse(400, "Erro na validação de dados", {
                message: "O campo 'senha' é obrigatório!"
            });
        }

        next();
    };
};
