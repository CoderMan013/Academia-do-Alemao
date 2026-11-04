const ErrorResponse = require("../utils/ErrorResponse");

/**
 * Middleware de validação das requisições de Aluno.
 */
module.exports = class AlunoMiddleware {

    /**
     * Corpo esperado:
     * { "aluno": { "nomeAluno": "...", "email": "...", "senha": "...", "ativo": 1 } }
     */
    validateBody = (request, response, next) => {
        console.log("🔷 AlunoMiddleware.validateBody()");
        const body = request.body;

        if (!body || !body.aluno) {
            throw new ErrorResponse(400, "Erro na validação de dados", {
                message: "O campo 'aluno' é obrigatório!"
            });
        }

        const aluno = body.aluno;

        if (!aluno.nomeAluno || String(aluno.nomeAluno).trim() === "") {
            throw new ErrorResponse(400, "Erro na validação de dados", {
                message: "O campo 'nomeAluno' é obrigatório!"
            });
        }

        if (!aluno.email || String(aluno.email).trim() === "") {
            throw new ErrorResponse(400, "Erro na validação de dados", {
                message: "O campo 'email' é obrigatório!"
            });
        }

        if (!aluno.senha || String(aluno.senha).trim() === "") {
            throw new ErrorResponse(400, "Erro na validação de dados", {
                message: "O campo 'senha' é obrigatório!"
            });
        }

        next();
    }

    /**
     * Corpo do PUT: igual ao de cadastro, mas a senha é opcional
     * (se não vier, a senha atual é mantida).
     */
    validateUpdateBody = (request, response, next) => {
        console.log("🔷 AlunoMiddleware.validateUpdateBody()");
        const body = request.body;

        if (!body || !body.aluno) {
            throw new ErrorResponse(400, "Erro na validação de dados", {
                message: "O campo 'aluno' é obrigatório!"
            });
        }

        const aluno = body.aluno;

        if (!aluno.nomeAluno || String(aluno.nomeAluno).trim() === "") {
            throw new ErrorResponse(400, "Erro na validação de dados", {
                message: "O campo 'nomeAluno' é obrigatório!"
            });
        }

        if (!aluno.email || String(aluno.email).trim() === "") {
            throw new ErrorResponse(400, "Erro na validação de dados", {
                message: "O campo 'email' é obrigatório!"
            });
        }

        next();
    }

    /** Valida o parâmetro de rota :idAluno */
    validateIdParam = (request, response, next) => {
        console.log("🔷 AlunoMiddleware.validateIdParam()");
        const { idAluno } = request.params;

        if (!idAluno) {
            throw new ErrorResponse(400, "Erro na validação de dados", {
                message: "O parâmetro 'idAluno' é obrigatório!"
            });
        }

        next();
    }
}
