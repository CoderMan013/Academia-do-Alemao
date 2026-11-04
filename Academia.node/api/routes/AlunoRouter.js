const express = require("express");

/**
 * Rotas da entidade Aluno.
 *
 * Login e cadastro ficam em /api/v1/auth (AuthRouter), porque agora existem
 * dois tipos de usuário (aluno e professor).
 */
module.exports = class AlunoRouter {
    #jwtMiddleware;
    #alunoMiddleware;
    #alunoController;

    constructor(jwtMiddlewareDependency, alunoMiddlewareDependency, alunoControllerDependency) {
        console.log("⬆️  AlunoRouter.constructor()");
        this.#jwtMiddleware = jwtMiddlewareDependency;
        this.#alunoMiddleware = alunoMiddlewareDependency;
        this.#alunoController = alunoControllerDependency;
    }

    /**
     * @returns {express.Router}
     *
     * POST   /api/v1/alunos
     * GET    /api/v1/alunos
     * GET    /api/v1/alunos/:idAluno
     * PUT    /api/v1/alunos/:idAluno
     * DELETE /api/v1/alunos/:idAluno
     */
    createRoutes = () => {
        console.log("⬆️  AlunoRouter.createRoutes()");
        const router = express.Router();

        router.post("/",
            this.#jwtMiddleware.validateToken,
            this.#alunoMiddleware.validateBody,
            this.#alunoController.store
        );

        router.get("/",
            this.#jwtMiddleware.validateToken,
            this.#alunoController.index
        );

        router.get("/:idAluno",
            this.#jwtMiddleware.validateToken,
            this.#alunoMiddleware.validateIdParam,
            this.#alunoController.show
        );

        router.put("/:idAluno",
            this.#jwtMiddleware.validateToken,
            this.#alunoMiddleware.validateIdParam,
            this.#alunoMiddleware.validateUpdateBody,
            this.#alunoController.update
        );

        router.delete("/:idAluno",
            this.#jwtMiddleware.validateToken,
            this.#alunoMiddleware.validateIdParam,
            this.#alunoController.destroy
        );

        return router;
    };
};
