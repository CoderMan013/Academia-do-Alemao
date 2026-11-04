# -*- coding: utf-8 -*-
from functools import wraps

from flask import request

from api.utils.error_response import ErrorResponse

"""
Middleware para validação de requisições relacionadas à entidade Professor.
"""
class ProfessorMiddleware:

    def validate_body(self, f):
        """
        Valida o corpo de cadastro:

        {
          "professor": {
            "nomeProfessor": "...",
            "email": "...",
            "senha": "...",
            "modalidades": ["Boxe", "Muay Thai"],
            "ativo": 1
          }
        }
        """
        @wraps(f)
        def decorated_function(*args, **kwargs):
            print("🔷 ProfessorMiddleware.validate_body()")
            body = request.get_json(silent=True)
            professor = (body or {}).get("professor")

            if not professor:
                raise ErrorResponse(400, "Erro na validação de dados", {"message": "O campo 'professor' é obrigatório!"})

            if not professor.get("nomeProfessor") or str(professor.get("nomeProfessor")).strip() == "":
                raise ErrorResponse(400, "Erro na validação de dados", {"message": "O campo 'nomeProfessor' é obrigatório!"})

            if not professor.get("email") or str(professor.get("email")).strip() == "":
                raise ErrorResponse(400, "Erro na validação de dados", {"message": "O campo 'email' é obrigatório!"})

            if not professor.get("senha") or str(professor.get("senha")).strip() == "":
                raise ErrorResponse(400, "Erro na validação de dados", {"message": "O campo 'senha' é obrigatório!"})

            return f(*args, **kwargs)
        return decorated_function

    def validate_update_body(self, f):
        """Valida o corpo do PUT (a senha é opcional)."""
        @wraps(f)
        def decorated_function(*args, **kwargs):
            print("🔷 ProfessorMiddleware.validate_update_body()")
            body = request.get_json(silent=True)
            professor = (body or {}).get("professor")

            if not professor:
                raise ErrorResponse(400, "Erro na validação de dados", {"message": "O campo 'professor' é obrigatório!"})

            if not professor.get("nomeProfessor") or str(professor.get("nomeProfessor")).strip() == "":
                raise ErrorResponse(400, "Erro na validação de dados", {"message": "O campo 'nomeProfessor' é obrigatório!"})

            if not professor.get("email") or str(professor.get("email")).strip() == "":
                raise ErrorResponse(400, "Erro na validação de dados", {"message": "O campo 'email' é obrigatório!"})

            return f(*args, **kwargs)
        return decorated_function

    def validate_modalidades_body(self, f):
        """Valida { "modalidades": ["Boxe", "Karatê"] }."""
        @wraps(f)
        def decorated_function(*args, **kwargs):
            print("🔷 ProfessorMiddleware.validate_modalidades_body()")
            body = request.get_json(silent=True)

            if not body or not isinstance(body.get("modalidades"), list):
                raise ErrorResponse(400, "Erro na validação de dados", {"message": "O campo 'modalidades' deve ser uma lista!"})

            return f(*args, **kwargs)
        return decorated_function

    def validate_id_param(self, f):
        """Valida o parâmetro de rota 'idProfessor'."""
        @wraps(f)
        def decorated_function(*args, **kwargs):
            print("🔷 ProfessorMiddleware.validate_id_param()")
            if "idProfessor" not in kwargs:
                raise ErrorResponse(400, "Erro na validação de dados", {"message": "O parâmetro 'idProfessor' é obrigatório!"})
            return f(*args, **kwargs)
        return decorated_function
