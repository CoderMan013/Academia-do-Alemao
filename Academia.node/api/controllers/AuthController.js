/**
 * Controller da autenticação (login e cadastro com escolha de papel).
 */
module.exports = class AuthController {
    #authService;

    constructor(authServiceDependency) {
        console.log("⬆️  AuthController.constructor()");
        this.#authService = authServiceDependency;
    }

    /** POST /api/v1/auth/login */
    login = async (request, response, next) => {
        console.log("🔵 AuthController.login()");
        try {
            const resultado = await this.#authService.login(request.body);

            return response.status(200).send({
                success: true,
                message: "Login efetuado com sucesso!",
                data: resultado
            });
        } catch (error) {
            next(error);
        }
    };

    /** POST /api/v1/auth/registrar */
    registrar = async (request, response, next) => {
        console.log("🔵 AuthController.registrar()");
        try {
            const resultado = await this.#authService.registrar(request.body);

            return response.status(201).send({
                success: true,
                message: "Cadastro realizado com sucesso",
                data: resultado
            });
        } catch (error) {
            next(error);
        }
    };
};
