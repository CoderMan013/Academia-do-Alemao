# -*- coding: utf-8 -*-
from functools import wraps

from flask import request

from api.utils.error_response import ErrorResponse

"""
Middleware para validação de requisições relacionadas à entidade Pagamento.
"""
class PagamentoMiddleware:

    def validate_body(self, f):
        """
        Corpo esperado:
        {
          "pagamento": {
            "dataVencimento": "2026-12-05",  // opcional: hoje
            "status": "pendente",             // opcional: pendente
            "matricula": { "idMatricula": 1 }
          }
        }
        """
        @wraps(f)
        def decorated_function(*args, **kwargs):
            print("🔷 PagamentoMiddleware.validate_body()")
            body = request.get_json(silent=True)
            pagamento = body.get("pagamento") if isinstance(body, dict) else None

            if not isinstance(pagamento, dict):
                raise ErrorResponse(400, "Erro na validação de dados", {"message": "O campo 'pagamento' é obrigatório!"})

            if not (pagamento.get("matricula") or {}).get("idMatricula"):
                raise ErrorResponse(400, "Erro na validação de dados", {"message": "O campo 'matricula.idMatricula' é obrigatório!"})

            return f(*args, **kwargs)
        return decorated_function

    def validate_update_body(self, f):
        """PUT: exige um status de pagamento."""
        @wraps(f)
        def decorated_function(*args, **kwargs):
            print("🔷 PagamentoMiddleware.validate_update_body()")
            body = request.get_json(silent=True)
            pagamento = body.get("pagamento") if isinstance(body, dict) else None

            if not isinstance(pagamento, dict):
                raise ErrorResponse(400, "Erro na validação de dados", {"message": "O campo 'pagamento' é obrigatório!"})

            if pagamento.get("status") is None:
                raise ErrorResponse(400, "Erro na validação de dados", {"message": "Informe 'status' para atualizar!"})

            return f(*args, **kwargs)
        return decorated_function

    def validate_id_param(self, f):
        """Valida o parâmetro de rota 'idPagamento'."""
        @wraps(f)
        def decorated_function(*args, **kwargs):
            print("🔷 PagamentoMiddleware.validate_id_param()")
            if "idPagamento" not in kwargs:
                raise ErrorResponse(400, "Erro na validação de dados", {"message": "O parâmetro 'idPagamento' é obrigatório!"})
            return f(*args, **kwargs)
        return decorated_function

    def validate_id_matricula(self, f):
        """Valida o parâmetro de rota 'idMatricula'."""
        @wraps(f)
        def decorated_function(*args, **kwargs):
            print("🔷 PagamentoMiddleware.validate_id_matricula()")
            if "idMatricula" not in kwargs:
                raise ErrorResponse(400, "Erro na validação de dados", {"message": "O parâmetro 'idMatricula' é obrigatório!"})
            return f(*args, **kwargs)
        return decorated_function
