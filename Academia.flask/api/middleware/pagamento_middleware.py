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
            "valor": 120.00,
            "dataVencimento": "2026-12-05",
            "dataPagamento": null,
            "metodo": "Pix",
            "status": "pendente",
            "matricula": { "idMatricula": 1 }
          }
        }
        """
        @wraps(f)
        def decorated_function(*args, **kwargs):
            print("🔷 PagamentoMiddleware.validate_body()")
            body = request.get_json(silent=True)
            pagamento = (body or {}).get("pagamento")

            if not pagamento:
                raise ErrorResponse(400, "Erro na validação de dados", {"message": "O campo 'pagamento' é obrigatório!"})

            valor = pagamento.get("valor")
            if valor is None or str(valor).strip() == "":
                raise ErrorResponse(400, "Erro na validação de dados", {"message": "O campo 'valor' é obrigatório!"})

            if not pagamento.get("dataVencimento"):
                raise ErrorResponse(400, "Erro na validação de dados", {"message": "O campo 'dataVencimento' é obrigatório!"})

            if not (pagamento.get("matricula") or {}).get("idMatricula"):
                raise ErrorResponse(400, "Erro na validação de dados", {"message": "O campo 'matricula.idMatricula' é obrigatório!"})

            return f(*args, **kwargs)
        return decorated_function

    def validate_update_body(self, f):
        """PUT: exige ao menos valor ou status."""
        @wraps(f)
        def decorated_function(*args, **kwargs):
            print("🔷 PagamentoMiddleware.validate_update_body()")
            body = request.get_json(silent=True)
            pagamento = (body or {}).get("pagamento")

            if not pagamento:
                raise ErrorResponse(400, "Erro na validação de dados", {"message": "O campo 'pagamento' é obrigatório!"})

            if pagamento.get("valor") is None and pagamento.get("status") is None:
                raise ErrorResponse(400, "Erro na validação de dados", {"message": "Informe ao menos 'valor' ou 'status' para atualizar!"})

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
