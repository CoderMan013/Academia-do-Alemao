const express = require("express");

/**
 * Rotas da entidade Aluno.
 *
 * Login e cadastro pertencem ao módulo Aluno e mantêm os caminhos públicos
 * existentes em /api/v1/auth.
 * O Router apenas combina URL, método HTTP e middlewares na ordem correta;
 * ele não contém regra de negócio nem executa SQL.
 */
module.exports = class AlunoRouter {
    // Dependências recebidas do Server: autenticação, validação e respostas HTTP.
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
     * POST /api/v1/auth/login
     * POST /api/v1/auth/registrar
     * GET  /api/v1/auth/sessao
     * PUT  /api/v1/auth/perfil
     */
    createAuthRoutes = () => {
        console.log("⬆️  AlunoRouter.createAuthRoutes()");
        const router = express.Router();

        // Login e cadastro são públicos: primeiro validam o corpo e depois
        // delegam ao Controller, que chama o Service.
        router.post("/login",
            this.#alunoMiddleware.validateLoginBody,
            this.#alunoController.login
        );

        router.post("/registrar",
            this.#alunoMiddleware.validateRegistrarBody,
            this.#alunoController.registrar
        );

        // Sessão e perfil exigem token válido. No perfil, o token é validado
        // antes do corpo e o aluno-alvo será obtido das claims autenticadas.
        router.get("/sessao",
            this.#jwtMiddleware.validateToken,
            this.#alunoController.sessao
        );

        router.put("/perfil",
            this.#jwtMiddleware.validateToken,
            this.#alunoMiddleware.validatePerfilBody,
            this.#alunoController.atualizarPerfil
        );

        return router;
    };

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

        // CRUD protegido: toda rota exige JWT. Rotas com corpo ou ID também
        // passam pelos validadores específicos antes de chegar ao Controller.
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
