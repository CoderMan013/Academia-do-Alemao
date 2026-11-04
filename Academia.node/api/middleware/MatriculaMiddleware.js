const ErrorResponse = require("../utils/ErrorResponse");

/**
 * Middleware de validação das requisições de Matricula.
 *
 * A matrícula precisa da modalidade e do professor; o aluno vem do token
 * quando quem está logado é aluno.
 */
module.exports = class MatriculaMiddleware {

    /**
     * Corpo esperado:
     * {
     *   "matricula": {
     *     "modalidade": "Muay Thai",
     *     "dataInicio": "2026-11-03",     // opcional: hoje
     *     "duracaoMeses": 3,              // opcional: 3
     *     "status": "ativa",              // opcional
     *     "aluno": { "idAluno": 1 },      // opcional para aluno logado
     *     "professor": { "idProfessor": 1 }
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

        if (!matricula.professor || !matricula.professor.idProfessor) {
            throw new ErrorResponse(400, "Erro na validação de dados", {
                message: "O campo 'professor.idProfessor' é obrigatório!"
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
