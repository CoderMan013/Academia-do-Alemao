# -*- coding: utf-8 -*-
from functools import wraps

from flask import g, jsonify, request

from api.http.meu_token_jwt import MeuTokenJWT

"""
Middleware Flask para validação de tokens JWT.

Se o token for válido, a rota protegida é executada; se não, responde 401
com o mesmo envelope usado pela API em Node.
"""
class JwtMiddleware:
    def validate_token(self, f):
        """
        Decorator que valida o token enviado no header Authorization.

        :param f: função da rota protegida
        """
        @wraps(f)
        def decorated_function(*args, **kwargs):
            print("🔷 JwtMiddleware.validate_token()")

            authorization = request.headers.get("Authorization", None)
            jwt_instance = MeuTokenJWT()

            if jwt_instance.validarToken(authorization):
                # Claims disponíveis para os controls e para o RoleMiddleware
                g.usuario = jwt_instance.payload
                return f(*args, **kwargs)

            return jsonify({
                "success": False,
                "message": "token inválido",
                "error": {"message": "Informe um token válido no header Authorization"}
            }), 401

        return decorated_function
