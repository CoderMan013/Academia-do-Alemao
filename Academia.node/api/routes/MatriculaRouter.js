const express = require("express");

/**
 * Rotas da entidade Matricula (todas autenticadas por JWT).
 *
 * As rotas /minhas e /meus-alunos são específicas de cada papel; o CRUD
 * completo continua disponível para consulta e manutenção.
 */
module.exports = class MatriculaRouter {
    #jwtMiddleware;
    #roleMiddleware;
    #matriculaMiddleware;
    #matriculaController;

    constructor(jwtMiddlewareDependency, roleMiddlewareDependency, matriculaMiddlewareDependency, matriculaControllerDependency) {
        console.log("⬆️  MatriculaRouter.constructor()");
        this.#jwtMiddleware = jwtMiddlewareDependency;
        this.#roleMiddleware = roleMiddlewareDependency;
        this.#matriculaMiddleware = matriculaMiddlewareDependency;
        this.#matriculaController = matriculaControllerDependency;
    }

    /**
     * @returns {express.Router}
     *
     * GET    /api/v1/matriculas/minhas        (aluno)
     * GET    /api/v1/matriculas/meus-alunos   (professor)
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
            this.#roleMiddleware.requireRole("aluno"),
            this.#matriculaController.minhas
        );

        router.get("/meus-alunos",
            this.#jwtMiddleware.validateToken,
            this.#roleMiddleware.requireRole("professor"),
            this.#matriculaController.meusAlunos
        );

        router.post("/",
            this.#jwtMiddleware.validateToken,
            this.#matriculaMiddleware.validateBody,
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
