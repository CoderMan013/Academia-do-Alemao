const express = require("express");

/**
 * Rotas públicas de autenticação.
 *
 * É por aqui que o frontend entra e cria conta: as duas telas do cadastro
 * (escolha do tipo e dados restantes) terminam em POST /registrar.
 */
module.exports = class AuthRouter {
    #jwtMiddleware;
    #authMiddleware;
    #authController;

    constructor(jwtMiddlewareDependency, authMiddlewareDependency, authControllerDependency) {
        console.log("⬆️  AuthRouter.constructor()");
        this.#jwtMiddleware = jwtMiddlewareDependency;
        this.#authMiddleware = authMiddlewareDependency;
        this.#authController = authControllerDependency;
    }

    /**
     * @returns {express.Router}
     *
     * POST /api/v1/auth/login      (público)
     * POST /api/v1/auth/registrar  (público)
     * GET  /api/v1/auth/sessao     (token) - quem está logado
     */
    createRoutes = () => {
        console.log("⬆️  AuthRouter.createRoutes()");
        const router = express.Router();

        router.post("/login",
            this.#authMiddleware.validateLoginBody,
            this.#authController.login
        );

        router.post("/registrar",
            this.#authMiddleware.validateRegistrarBody,
            this.#authController.registrar
        );

        router.get("/sessao",
            this.#jwtMiddleware.validateToken,
            (request, response) => response.status(200).send({
                success: true,
                message: "Sessão válida",
                data: { usuario: request.usuarioAutenticado }
            })
        );

        return router;
    };
};
