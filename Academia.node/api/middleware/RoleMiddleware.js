/**
 * Middleware de autorização por papel (role).
 *
 * O JwtMiddleware autentica e coloca os claims em request.usuarioAutenticado.
 * Aqui só verificamos se o papel do usuário está entre os permitidos.
 */
module.exports = class RoleMiddleware {

    /**
     * @param {...string} roles - papéis aceitos ("aluno", "professor")
     * @returns {Function} middleware Express
     */
    requireRole = (...roles) => {
        return (request, response, next) => {
            console.log(`🔷 RoleMiddleware.requireRole(${roles.join(", ")})`);

            const papel = request.usuarioAutenticado?.role;

            if (!roles.includes(papel)) {
                return response.status(403).send({
                    success: false,
                    message: "Acesso negado",
                    error: {
                        message: `Esta rota é exclusiva para ${roles.join(" ou ")}`
                    }
                });
            }

            return next();
        };
    };
};
