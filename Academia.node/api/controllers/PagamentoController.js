const ErrorResponse = require("../utils/ErrorResponse");

/**
 * Controller (camada HTTP) da entidade Pagamento.
 */
module.exports = class PagamentoController {
    #pagamentoService;

    constructor(pagamentoServiceDependency) {
        console.log("⬆️  PagamentoController.constructor()");
        this.#pagamentoService = pagamentoServiceDependency;
    }

    /** GET /api/v1/pagamentos/minhas */
    minhas = async (request, response, next) => {
        console.log("🔵 PagamentoController.minhas()");
        try {
            const idAluno = request.usuarioAutenticado?.idAluno;
            const pagamentos = await this.#pagamentoService.findMinhas(idAluno);

            return response.status(200).send({
                success: true,
                message: "Busca realizada com sucesso",
                data: { pagamentos }
            });
        } catch (error) {
            next(error);
        }
    };

    /** GET /api/v1/pagamentos/matricula/:idMatricula */
    porMatricula = async (request, response, next) => {
        console.log("🔵 PagamentoController.porMatricula()");
        try {
            const pagamentos = await this.#pagamentoService.findByMatricula(
                request.params.idMatricula,
                request.usuarioAutenticado
            );

            return response.status(200).send({
                success: true,
                message: "Busca realizada com sucesso",
                data: { pagamentos }
            });
        } catch (error) {
            next(error);
        }
    };

    /** POST /api/v1/pagamentos */
    store = async (request, response, next) => {
        console.log("🔵 PagamentoController.store()");
        try {
            const pagamento = await this.#pagamentoService.createPagamento(
                request.body.pagamento,
                request.usuarioAutenticado
            );

            return response.status(201).send({
                success: true,
                message: "Pagamento registrado com sucesso",
                data: { pagamentos: [pagamento] }
            });
        } catch (error) {
            next(error);
        }
    };

    /** GET /api/v1/pagamentos */
    index = async (request, response, next) => {
        console.log("🔵 PagamentoController.index()");
        try {
            const pagamentos = await this.#pagamentoService.findAll(request.usuarioAutenticado);

            return response.status(200).send({
                success: true,
                message: "Busca realizada com sucesso",
                data: { pagamentos }
            });
        } catch (error) {
            next(error);
        }
    };

    /** GET /api/v1/pagamentos/:idPagamento */
    show = async (request, response, next) => {
        console.log("🔵 PagamentoController.show()");
        try {
            const idPagamento = request.params.idPagamento;
            const pagamento = await this.#pagamentoService.findById(
                idPagamento,
                request.usuarioAutenticado
            );

            if (!pagamento) {
                throw new ErrorResponse(404, "Pagamento não encontrado", {
                    message: `Não existe pagamento com id ${idPagamento}`
                });
            }

            return response.status(200).send({
                success: true,
                message: "Executado com sucesso",
                data: { pagamentos: [pagamento] }
            });
        } catch (error) {
            next(error);
        }
    };

    /** PUT /api/v1/pagamentos/:idPagamento */
    update = async (request, response, next) => {
        console.log("🔵 PagamentoController.update()");
        try {
            const idPagamento = request.params.idPagamento;
            const pagamento = await this.#pagamentoService.updatePagamento(
                idPagamento,
                request.body.pagamento,
                request.usuarioAutenticado
            );

            if (!pagamento) {
                throw new ErrorResponse(404, "Pagamento não encontrado", {
                    message: `Não existe pagamento com id ${idPagamento} para atualização`
                });
            }

            return response.status(200).send({
                success: true,
                message: "Atualizado com sucesso",
                data: { pagamentos: [pagamento] }
            });
        } catch (error) {
            next(error);
        }
    };

    /** DELETE /api/v1/pagamentos/:idPagamento */
    destroy = async (request, response, next) => {
        console.log("🔵 PagamentoController.destroy()");
        try {
            const idPagamento = request.params.idPagamento;
            const excluiu = await this.#pagamentoService.deletePagamento(
                idPagamento,
                request.usuarioAutenticado
            );

            if (!excluiu) {
                throw new ErrorResponse(404, "Pagamento não encontrado", {
                    message: `Não existe pagamento com id ${idPagamento} para exclusão`
                });
            }

            return response.status(204).send();
        } catch (error) {
            next(error);
        }
    };
};
