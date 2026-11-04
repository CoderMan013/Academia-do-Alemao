const express = require("express");

/**
 * Rotas da entidade Professor.
 *
 * /me e /me/alunos usam o id do token: o professor só vê os próprios dados.
 */
module.exports = class ProfessorRouter {
    #jwtMiddleware;
    #roleMiddleware;
    #professorMiddleware;
    #professorController;

    constructor(jwtMiddlewareDependency, roleMiddlewareDependency, professorMiddlewareDependency, professorControllerDependency) {
        console.log("⬆️  ProfessorRouter.constructor()");
        this.#jwtMiddleware = jwtMiddlewareDependency;
        this.#roleMiddleware = roleMiddlewareDependency;
        this.#professorMiddleware = professorMiddlewareDependency;
        this.#professorController = professorControllerDependency;
    }

    /**
     * @returns {express.Router}
     *
     * GET    /api/v1/professores/me              (professor)
     * GET    /api/v1/professores/me/alunos       (professor)
     * PUT    /api/v1/professores/me/modalidades  (professor)
     * GET    /api/v1/professores
     * POST   /api/v1/professores
     * GET    /api/v1/professores/:idProfessor
     * PUT    /api/v1/professores/:idProfessor
     * DELETE /api/v1/professores/:idProfessor
     */
    createRoutes = () => {
        console.log("⬆️  ProfessorRouter.createRoutes()");
        const router = express.Router();

        // Rotas do próprio professor (antes das rotas com :id)
        router.get("/me",
            this.#jwtMiddleware.validateToken,
            this.#roleMiddleware.requireRole("professor"),
            this.#professorController.me
        );

        router.get("/me/alunos",
            this.#jwtMiddleware.validateToken,
            this.#roleMiddleware.requireRole("professor"),
            this.#professorController.meusAlunos
        );

        router.put("/me/modalidades",
            this.#jwtMiddleware.validateToken,
            this.#roleMiddleware.requireRole("professor"),
            this.#professorMiddleware.validateModalidadesBody,
            this.#professorController.atualizarModalidades
        );

        router.get("/",
            this.#jwtMiddleware.validateToken,
            this.#professorController.index
        );

        router.post("/",
            this.#jwtMiddleware.validateToken,
            this.#professorMiddleware.validateBody,
            this.#professorController.store
        );

        router.get("/:idProfessor",
            this.#jwtMiddleware.validateToken,
            this.#professorMiddleware.validateIdParam,
            this.#professorController.show
        );

        router.put("/:idProfessor",
            this.#jwtMiddleware.validateToken,
            this.#professorMiddleware.validateIdParam,
            this.#professorMiddleware.validateUpdateBody,
            this.#professorController.update
        );

        router.delete("/:idProfessor",
            this.#jwtMiddleware.validateToken,
            this.#professorMiddleware.validateIdParam,
            this.#professorController.destroy
        );

        return router;
    };
};
