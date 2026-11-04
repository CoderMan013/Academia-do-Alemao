# -*- coding: utf-8 -*-
from functools import wraps

from flask import request

from api.utils.error_response import ErrorResponse

"""
Middleware para validação de requisições relacionadas à entidade Aluno.

Objetivos:
- Garantir que os campos obrigatórios existam antes de chamar os métodos do Controller ou Service.
- Lançar erros padronizados usando ErrorResponse quando a validação falhar.
"""
class AlunoMiddleware:

    def validate_body(self, f):
        """
        Decorator para validar o corpo da requisição para criação de um aluno.

        Corpo esperado:
        { "aluno": { "nomeAluno": "...", "email": "...", "senha": "...", "ativo": 1 } }
        """
        @wraps(f)
        def decorated_function(*args, **kwargs):
            print("🔷 AlunoMiddleware.validate_body()")
            body = request.get_json(silent=True)

            if not body or 'aluno' not in body:
                raise ErrorResponse(400, "Erro na validação de dados", {"message": "O campo 'aluno' é obrigatório!"})

            aluno = body['aluno']

            campos_obrigatorios = ["nomeAluno", "email", "senha"]
            for campo in campos_obrigatorios:
                if not aluno.get(campo) or str(aluno.get(campo)).strip() == "":
                    raise ErrorResponse(400, "Erro na validação de dados", {"message": f"O campo '{campo}' é obrigatório!"})

            return f(*args, **kwargs)
        return decorated_function

    def validate_update_body(self, f):
        """
        Decorator para validar o corpo do PUT: igual ao de cadastro,
        mas a senha é opcional (se não vier, a senha atual é mantida).
        """
        @wraps(f)
        def decorated_function(*args, **kwargs):
            print("🔷 AlunoMiddleware.validate_update_body()")
            body = request.get_json(silent=True)

            if not body or 'aluno' not in body:
                raise ErrorResponse(400, "Erro na validação de dados", {"message": "O campo 'aluno' é obrigatório!"})

            aluno = body['aluno']

            campos_obrigatorios = ["nomeAluno", "email"]
            for campo in campos_obrigatorios:
                if not aluno.get(campo) or str(aluno.get(campo)).strip() == "":
                    raise ErrorResponse(400, "Erro na validação de dados", {"message": f"O campo '{campo}' é obrigatório!"})

            return f(*args, **kwargs)
        return decorated_function

    def validate_id_param(self, f):
        """
        Decorator para validar o parâmetro de rota 'idAluno'.
        """
        @wraps(f)
        def decorated_function(*args, **kwargs):
            print("🔷 AlunoMiddleware.validate_id_param()")
            if 'idAluno' not in kwargs:
                raise ErrorResponse(400, "Erro na validação de dados", {"message": "O parâmetro 'idAluno' é obrigatório!"})
            return f(*args, **kwargs)
        return decorated_function
