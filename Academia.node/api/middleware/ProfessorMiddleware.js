const ErrorResponse = require("../utils/ErrorResponse");

/**
 * Middleware de validação das requisições de Professor.
 */
module.exports = class ProfessorMiddleware {

    /**
     * Corpo esperado:
     * {
     *   "professor": {
     *     "nomeProfessor": "...",
     *     "email": "...",
     *     "senha": "...",
     *     "modalidades": ["Boxe", "Muay Thai"],
     *     "ativo": 1
     *   }
     * }
     */
    validateBody = (request, response, next) => {
        console.log("🔷 ProfessorMiddleware.validateBody()");
        const professor = request.body?.professor;

        if (!professor) {
            throw new ErrorResponse(400, "Erro na validação de dados", {
                message: "O campo 'professor' é obrigatório!"
            });
        }

        if (!professor.nomeProfessor || String(professor.nomeProfessor).trim() === "") {
            throw new ErrorResponse(400, "Erro na validação de dados", {
                message: "O campo 'nomeProfessor' é obrigatório!"
            });
        }

        if (!professor.email || String(professor.email).trim() === "") {
            throw new ErrorResponse(400, "Erro na validação de dados", {
                message: "O campo 'email' é obrigatório!"
            });
        }

        if (!professor.senha || String(professor.senha).trim() === "") {
            throw new ErrorResponse(400, "Erro na validação de dados", {
                message: "O campo 'senha' é obrigatório!"
            });
        }

        next();
    };

    /** Corpo do PUT: igual ao de cadastro, mas a senha é opcional. */
    validateUpdateBody = (request, response, next) => {
        console.log("🔷 ProfessorMiddleware.validateUpdateBody()");
        const professor = request.body?.professor;

        if (!professor) {
            throw new ErrorResponse(400, "Erro na validação de dados", {
                message: "O campo 'professor' é obrigatório!"
            });
        }

        if (!professor.nomeProfessor || String(professor.nomeProfessor).trim() === "") {
            throw new ErrorResponse(400, "Erro na validação de dados", {
                message: "O campo 'nomeProfessor' é obrigatório!"
            });
        }

        if (!professor.email || String(professor.email).trim() === "") {
            throw new ErrorResponse(400, "Erro na validação de dados", {
                message: "O campo 'email' é obrigatório!"
            });
        }

        next();
    };

    /** Corpo esperado: { "modalidades": ["Boxe", "Karatê"] } */
    validateModalidadesBody = (request, response, next) => {
        console.log("🔷 ProfessorMiddleware.validateModalidadesBody()");

        if (!request.body || !Array.isArray(request.body.modalidades)) {
            throw new ErrorResponse(400, "Erro na validação de dados", {
                message: "O campo 'modalidades' deve ser uma lista!"
            });
        }

        next();
    };

    /** Valida o parâmetro de rota :idProfessor */
    validateIdParam = (request, response, next) => {
        console.log("🔷 ProfessorMiddleware.validateIdParam()");
        const { idProfessor } = request.params;

        if (!idProfessor) {
            throw new ErrorResponse(400, "Erro na validação de dados", {
                message: "O parâmetro 'idProfessor' é obrigatório!"
            });
        }

        next();
    };
};
