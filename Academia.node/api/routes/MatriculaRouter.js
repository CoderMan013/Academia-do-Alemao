const express = require("express");

/**
 * Rotas da entidade Matricula (todas autenticadas por JWT).
 */
module.exports = class MatriculaRouter {
    #jwtMiddleware;
    #matriculaMiddleware;
    #matriculaController;

    constructor(jwtMiddlewareDependency, matriculaMiddlewareDependency, matriculaControllerDependency) {
        console.log("⬆️  MatriculaRouter.constructor()");
        this.#jwtMiddleware = jwtMiddlewareDependency;
        this.#matriculaMiddleware = matriculaMiddlewareDependency;
        this.#matriculaController = matriculaControllerDependency;
    }

    /**
     * @returns {express.Router}
     *
     * GET    /api/v1/matriculas/minhas
     * POST   /api/v1/matriculas
     * GET    /api/v1/matriculas
     * GET    /api/v1/matriculas/:idMatricula
     * PUT    /api/v1/matriculas/:idMatricula
     * DELETE /api/v1/matriculas/:idMatricula
     */
    createRoutes = () => {
        console.log("⬆️  MatriculaRouter.createRoutes()");
        const router = express.Router();

        router.get("/minhas",
            this.#jwtMiddleware.validateToken,
            this.#matriculaController.minhas
        );

        router.post("/",
            this.#jwtMiddleware.validateToken,
            this.#matriculaMiddleware.validateBody,
            this.#matriculaMiddleware.validateCreateBody,
            this.#matriculaController.store
        );

        router.get("/",
            this.#jwtMiddleware.validateToken,
            this.#matriculaController.index
        );

        router.get("/:idMatricula",
            this.#jwtMiddleware.validateToken,
            this.#matriculaMiddleware.validateIdParam,
            this.#matriculaController.show
        );

        router.put("/:idMatricula",
            this.#jwtMiddleware.validateToken,
            this.#matriculaMiddleware.validateIdParam,
            this.#matriculaMiddleware.validateBody,
            this.#matriculaController.update
        );

        router.delete("/:idMatricula",
            this.#jwtMiddleware.validateToken,
            this.#matriculaMiddleware.validateIdParam,
            this.#matriculaController.destroy
        );

        return router;
    };
};
