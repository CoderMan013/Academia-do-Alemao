# -*- coding: utf-8 -*-

"""
Conversões numéricas usadas pelos models.

O JavaScript só aceita como inteiro um valor que não tenha casas decimais
(Number.isInteger). O int() do Python truncaria 3.9 para 3 sem erro, então
esta função reproduz o comportamento da API em Node.
"""


def para_inteiro(valor, campo: str) -> int:
    try:
        numero = float(valor)
    except (TypeError, ValueError):
        raise ValueError(f"{campo} deve ser um número inteiro.")

    if not numero.is_integer():
        raise ValueError(f"{campo} deve ser um número inteiro.")

    return int(numero)
