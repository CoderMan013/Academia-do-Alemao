# -*- coding: utf-8 -*-
from api.utils.error_response import ErrorResponse

"""
Executa as validações dos setters dos models.

Os setters lançam ValueError (regra de domínio). Aqui esse erro é convertido
em ErrorResponse 400, para que o cliente receba "erro de validação" em vez de 500.

É o mesmo papel do Validar.js da API em Node.
"""


def validar(validacao):
    """
    :param validacao: função sem parâmetros que preenche o model
    """
    try:
        validacao()
    except ValueError as erro:
        raise ErrorResponse(400, "Erro na validação de dados", {"message": str(erro)})
