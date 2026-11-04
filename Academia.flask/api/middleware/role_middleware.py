# -*- coding: utf-8 -*-
from functools import wraps

from flask import g, jsonify

"""
Middleware de autorização por papel (role).

O JwtMiddleware autentica e coloca os claims em flask.g.usuario.
Aqui só verificamos se o papel do usuário está entre os permitidos.
"""
class RoleMiddleware:

    def require_role(self, *roles):
        """
        Decorator que libera a rota apenas para os papéis informados.

        :param roles: papéis aceitos ("aluno", "professor")
        """
        def decorator(f):
            @wraps(f)
            def decorated_function(*args, **kwargs):
                print(f"🔷 RoleMiddleware.require_role({', '.join(roles)})")

                usuario = getattr(g, "usuario", None) or {}

                if usuario.get("role") not in roles:
                    return jsonify({
                        "success": False,
                        "message": "Acesso negado",
                        "error": {"message": f"Esta rota é exclusiva para {' ou '.join(roles)}"}
                    }), 403

                return f(*args, **kwargs)
            return decorated_function
        return decorator
