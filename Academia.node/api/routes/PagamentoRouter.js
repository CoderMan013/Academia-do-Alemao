const express = require("express");

/**
 * Rotas da entidade Pagamento (todas autenticadas por JWT).
 */
module.exports = class PagamentoRouter {
    #jwtMiddleware;
    #pagamentoMiddleware;
    #pagamentoController;

    constructor(jwtMiddlewareDependency, pagamentoMiddlewareDependency, pagamentoControllerDependency) {
        console.log("⬆️  PagamentoRouter.constructor()");
        this.#jwtMiddleware = jwtMiddlewareDependency;
        this.#pagamentoMiddleware = pagamentoMiddlewareDependency;
        this.#pagamentoController = pagamentoControllerDependency;
    }

    /**
     * @returns {express.Router}
     *
     * GET    /api/v1/pagamentos/minhas
     * GET    /api/v1/pagamentos/matricula/:idMatricula
     * POST   /api/v1/pagamentos
     * GET    /api/v1/pagamentos
     * GET    /api/v1/pagamentos/:idPagamento
     * PUT    /api/v1/pagamentos/:idPagamento
     * DELETE /api/v1/pagamentos/:idPagamento
     */
    createRoutes = () => {
        console.log("⬆️  PagamentoRouter.createRoutes()");
        const router = express.Router();

        router.get("/minhas",
            this.#jwtMiddleware.validateToken,
            this.#pagamentoController.minhas
        );

        router.get("/matricula/:idMatricula",
            this.#jwtMiddleware.validateToken,
            this.#pagamentoMiddleware.validateIdMatricula,
            this.#pagamentoController.porMatricula
        );

        router.post("/",
            this.#jwtMiddleware.validateToken,
            this.#pagamentoMiddleware.validateBody,
            this.#pagamentoController.store
        );

        router.get("/",
            this.#jwtMiddleware.validateToken,
            this.#pagamentoController.index
        );

        router.get("/:idPagamento",
            this.#jwtMiddleware.validateToken,
            this.#pagamentoMiddleware.validateIdParam,
            this.#pagamentoController.show
        );

        router.put("/:idPagamento",
            this.#jwtMiddleware.validateToken,
            this.#pagamentoMiddleware.validateIdParam,
            this.#pagamentoMiddleware.validateUpdateBody,
            this.#pagamentoController.update
        );

        router.delete("/:idPagamento",
            this.#jwtMiddleware.validateToken,
            this.#pagamentoMiddleware.validateIdParam,
            this.#pagamentoController.destroy
        );

        return router;
    };
};
