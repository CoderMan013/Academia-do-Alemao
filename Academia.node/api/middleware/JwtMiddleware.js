const MeuTokenJWT = require("../http/MeuTokenJWT");

/**
 * Middleware de autenticação.
 *
 * Se o token for válido, gera um novo token (refresh) e o coloca no header
 * da requisição; se não, responde 401 "token inválido".
 */
module.exports = class JwtMiddleware {

    /**
     * @param {Request} request
     * @param {Response} response
     * @param {Function} next
     */
    validateToken = (request, response, next) => {
        console.log("🔷 JwtMiddleware.validateToken()");

        const authorization = request.headers.authorization;
        const jwt = new MeuTokenJWT();

        if (jwt.validarToken(authorization) === true) {
            const payload = jwt.payload;

            const claims = {
                email: payload.email,
                role: payload.role,
                name: payload.name,
                idUsuario: payload.idUsuario ?? null,
                idAluno: payload.idAluno ?? null
            };

            // Refresh: renova o token a cada requisição autenticada
            request.headers.authorization = jwt.gerarToken(claims);
            request.usuarioAutenticado = claims;

            return next();
        }

        return response.status(401).send({
            success: false,
            message: "token inválido",
            error: { message: "Informe um token válido no header Authorization" }
        });
    }
}
