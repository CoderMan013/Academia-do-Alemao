const ErrorResponse = require("../utils/ErrorResponse");

/**
 * Middleware de validação das requisições de Pagamento.
 */
module.exports = class PagamentoMiddleware {

    /**
     * Corpo esperado:
     * {
     *   "pagamento": {
     *     "dataVencimento": "2026-12-05",
     *     "dataPagamento": null,
     *     "metodo": "Pix",
     *     "status": "pendente",
     *     "matricula": { "idMatricula": 1 }
     *   }
     * }
     */
    validateBody = (request, response, next) => {
        console.log("🔷 PagamentoMiddleware.validateBody()");
        const pagamento = request.body?.pagamento;

        if (!pagamento) {
            throw new ErrorResponse(400, "Erro na validação de dados", {
                message: "O campo 'pagamento' é obrigatório!"
            });
        }

        if (!pagamento.dataVencimento) {
            throw new ErrorResponse(400, "Erro na validação de dados", {
                message: "O campo 'dataVencimento' é obrigatório!"
            });
        }

        if (!pagamento.matricula || !pagamento.matricula.idMatricula) {
            throw new ErrorResponse(400, "Erro na validação de dados", {
                message: "O campo 'matricula.idMatricula' é obrigatório!"
            });
        }

        next();
    };

    /** PUT: exige dados de atualização, sem permitir alterar o valor fixo. */
    validateUpdateBody = (request, response, next) => {
        console.log("🔷 PagamentoMiddleware.validateUpdateBody()");
        const pagamento = request.body?.pagamento;

        if (!pagamento) {
            throw new ErrorResponse(400, "Erro na validação de dados", {
                message: "O campo 'pagamento' é obrigatório!"
            });
        }

        if (
            pagamento.dataVencimento === undefined &&
            pagamento.dataPagamento === undefined &&
            pagamento.metodo === undefined &&
            pagamento.status === undefined
        ) {
            throw new ErrorResponse(400, "Erro na validação de dados", {
                message: "Informe ao menos um campo da mensalidade para atualizar!"
            });
        }

        next();
    };

    /** Valida o parâmetro de rota :idPagamento */
    validateIdParam = (request, response, next) => {
        console.log("🔷 PagamentoMiddleware.validateIdParam()");
        const { idPagamento } = request.params;

        if (!idPagamento) {
            throw new ErrorResponse(400, "Erro na validação de dados", {
                message: "O parâmetro 'idPagamento' é obrigatório!"
            });
        }

        next();
    };

    /** Valida o parâmetro de rota :idMatricula */
    validateIdMatricula = (request, response, next) => {
        console.log("🔷 PagamentoMiddleware.validateIdMatricula()");
        const { idMatricula } = request.params;

        if (!idMatricula) {
            throw new ErrorResponse(400, "Erro na validação de dados", {
                message: "O parâmetro 'idMatricula' é obrigatório!"
            });
        }

        next();
    };
};
