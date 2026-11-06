const express = require("express");

/**
 * Rotas públicas da entidade Treino.
 */
module.exports = class TreinoRouter {
    #treinoController;

    constructor(treinoControllerDependency) {
        console.log("⬆️  TreinoRouter.constructor()");
        this.#treinoController = treinoControllerDependency;
    }

    /**
     * @returns {express.Router}
     *
     * GET /api/v1/treinos
     */
    createRoutes = () => {
        console.log("⬆️  TreinoRouter.createRoutes()");
        const router = express.Router();

        router.get("/", this.#treinoController.index);

        return router;
    };
};
