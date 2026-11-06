# -*- coding: utf-8 -*-
from functools import wraps

from flask import request

from api.utils.error_response import ErrorResponse

"""
Middleware para validação de requisições relacionadas à entidade Matricula.

A matrícula precisa do treino; o aluno vem do token.
"""
class MatriculaMiddleware:

    def validate_body(self, f):
        """
        Corpo esperado:
        {
          "matricula": {
            "modalidade": "Muay Thai",
            "dataInicio": "2026-11-03",    // opcional: hoje
            "dataFim": "2027-02-03",       // obrigatório
            "duracaoMeses": 3,             // informativo para o painel
            "status": "ativa"              // opcional
          }
        }
        """
        @wraps(f)
        def decorated_function(*args, **kwargs):
            print("🔷 MatriculaMiddleware.validate_body()")
            body = request.get_json(silent=True)
            matricula = body.get("matricula") if isinstance(body, dict) else None

            if not isinstance(matricula, dict):
                raise ErrorResponse(400, "Erro na validação de dados", {"message": "O campo 'matricula' é obrigatório!"})

            if not matricula.get("modalidade") or str(matricula.get("modalidade")).strip() == "":
                raise ErrorResponse(400, "Erro na validação de dados", {"message": "O treino é obrigatório."})

            if not matricula.get("dataFim"):
                raise ErrorResponse(400, "Erro na validação de dados", {"message": "O campo 'dataFim' é obrigatório!"})

            return f(*args, **kwargs)
        return decorated_function

    def validate_id_param(self, f):
        """Valida o parâmetro de rota 'idMatricula'."""
        @wraps(f)
        def decorated_function(*args, **kwargs):
            print("🔷 MatriculaMiddleware.validate_id_param()")
            if "idMatricula" not in kwargs:
                raise ErrorResponse(400, "Erro na validação de dados", {"message": "O parâmetro 'idMatricula' é obrigatório!"})
            return f(*args, **kwargs)
        return decorated_function
