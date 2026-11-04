const ErrorResponse = require("../utils/ErrorResponse");

/**
 * Middleware de validação das requisições de Matricula.
 *
 * A matrícula precisa da modalidade; o aluno vem do token.
 */
module.exports = class MatriculaMiddleware {

    /**
     * Corpo esperado:
     * {
     *   "matricula": {
     *     "modalidade": "Muay Thai",
     *     "dataInicio": "2026-11-03",     // opcional: hoje
     *     "duracaoMeses": 3,              // opcional: 3
     *     "status": "ativa"               // opcional
     *   }
     * }
     */
    validateBody = (request, response, next) => {
        console.log("🔷 MatriculaMiddleware.validateBody()");
        const matricula = request.body?.matricula;

        if (!matricula) {
            throw new ErrorResponse(400, "Erro na validação de dados", {
                message: "O campo 'matricula' é obrigatório!"
            });
        }

        if (!matricula.modalidade || String(matricula.modalidade).trim() === "") {
            throw new ErrorResponse(400, "Erro na validação de dados", {
                message: "O campo 'modalidade' é obrigatório!"
            });
        }

        next();
    };

    /** Valida o parâmetro de rota :idMatricula */
    validateIdParam = (request, response, next) => {
        console.log("🔷 MatriculaMiddleware.validateIdParam()");
        const { idMatricula } = request.params;

        if (!idMatricula) {
            throw new ErrorResponse(400, "Erro na validação de dados", {
                message: "O parâmetro 'idMatricula' é obrigatório!"
            });
        }

        next();
    };
};
