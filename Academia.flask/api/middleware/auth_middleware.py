# -*- coding: utf-8 -*-
from functools import wraps

from flask import request

from api.utils.error_response import ErrorResponse

"""
Middleware para validação das requisições de autenticação.
"""
class AuthMiddleware:

    def validate_login_body(self, f):
        """Corpo esperado: { "email": "...", "senha": "..." }"""
        @wraps(f)
        def decorated_function(*args, **kwargs):
            print("🔷 AuthMiddleware.validate_login_body()")
            body = request.get_json(silent=True) or {}

            if not body.get("email") or not body.get("senha"):
                raise ErrorResponse(400, "Erro na validação de dados", {
                    "message": "Informe 'email' e 'senha' para efetuar o login!"
                })

            return f(*args, **kwargs)
        return decorated_function

    def validate_registrar_body(self, f):
        """
        Corpo esperado (cadastro):
        { "nome": "...", "email": "...", "senha": "..." }
        """
        @wraps(f)
        def decorated_function(*args, **kwargs):
            print("🔷 AuthMiddleware.validate_registrar_body()")
            body = request.get_json(silent=True) or {}

            if not body.get("nome") or str(body.get("nome")).strip() == "":
                raise ErrorResponse(400, "Erro na validação de dados", {
                    "message": "O campo 'nome' é obrigatório!"
                })

            if not body.get("email") or str(body.get("email")).strip() == "":
                raise ErrorResponse(400, "Erro na validação de dados", {
                    "message": "O campo 'email' é obrigatório!"
                })

            if not body.get("senha") or str(body.get("senha")).strip() == "":
                raise ErrorResponse(400, "Erro na validação de dados", {
                    "message": "O campo 'senha' é obrigatório!"
                })

            return f(*args, **kwargs)
        return decorated_function
