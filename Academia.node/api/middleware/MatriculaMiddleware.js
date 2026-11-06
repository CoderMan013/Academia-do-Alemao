const ErrorResponse = require("../utils/ErrorResponse");

/**
 * Middleware de validação das requisições de Matricula.
 *
 * A matrícula precisa do treino; o aluno vem do token.
 */
module.exports = class MatriculaMiddleware {

    /**
     * Corpo esperado:
     * {
     *   "matricula": {
     *     "treino": "Muay Thai",
     *     "dataInicio": "2026-11-03",     // opcional: hoje
     *     "dataFim": "2027-02-03",
     *     "status": "ativa"               // opcional
     *   }
     * }
     */
    validateCreateBody = (request, response, next) => {
        console.log("🔷 MatriculaMiddleware.validateCreateBody()");
        const matricula = request.body?.matricula;

        if (!matricula?.dataFim || String(matricula.dataFim).trim() === "") {
            throw new ErrorResponse(400, "Erro na validação de dados", {
                message: "O campo 'dataFim' é obrigatório!"
            });
        }

        next();
    };

    validateBody = (request, response, next) => {
        console.log("🔷 MatriculaMiddleware.validateBody()");
        const matricula = request.body?.matricula;

        if (!matricula) {
            throw new ErrorResponse(400, "Erro na validação de dados", {
                message: "O campo 'matricula' é obrigatório!"
            });
        }

        if (!matricula.treino || String(matricula.treino).trim() === "") {
            throw new ErrorResponse(400, "Erro na validação de dados", {
                message: "O campo 'treino' é obrigatório!"
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
