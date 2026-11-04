# -*- coding: utf-8 -*-
from functools import wraps

from flask import request

from api.utils.error_response import ErrorResponse

"""
Middleware para validação de requisições relacionadas à entidade Matricula.

A matrícula precisa da modalidade e do professor; o aluno vem do token
quando quem está logado é aluno.
"""
class MatriculaMiddleware:

    def validate_body(self, f):
        """
        Corpo esperado:
        {
          "matricula": {
            "modalidade": "Muay Thai",
            "dataInicio": "2026-11-03",    // opcional: hoje
            "duracaoMeses": 3,             // opcional: 3
            "status": "ativa",             // opcional
            "aluno": { "idAluno": 1 },     // opcional para aluno logado
            "professor": { "idProfessor": 1 }
          }
        }
        """
        @wraps(f)
        def decorated_function(*args, **kwargs):
            print("🔷 MatriculaMiddleware.validate_body()")
            body = request.get_json(silent=True)
            matricula = (body or {}).get("matricula")

            if not matricula:
                raise ErrorResponse(400, "Erro na validação de dados", {"message": "O campo 'matricula' é obrigatório!"})

            if not matricula.get("modalidade") or str(matricula.get("modalidade")).strip() == "":
                raise ErrorResponse(400, "Erro na validação de dados", {"message": "O campo 'modalidade' é obrigatório!"})

            if not matricula.get("professor") or not matricula.get("professor", {}).get("idProfessor"):
                raise ErrorResponse(400, "Erro na validação de dados", {"message": "O campo 'professor.idProfessor' é obrigatório!"})

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
