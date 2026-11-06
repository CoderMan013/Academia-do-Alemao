# -*- coding: utf-8 -*-
import unicodedata

"""
Treinos oferecidos pela academia.

A lista é fixa (domínio do sistema): a matrícula guarda o nome do treino.
A validação fica aqui para que model, service e frontend trabalhem sempre
com o mesmo texto canônico.
"""

MODALIDADES = [
    "Musculação",
    "Cross Fit",
    "Muay Thai",
    "Karatê",
    "Boxe",
]

PRECOS_MENSALIDADES = {
    "Musculação": 60,
    "Cross Fit": 60,
    "Muay Thai": 120,
    "Karatê": 120,
    "Boxe": 120,
}

# Durações de plano oferecidas na tela (em meses)
DURACOES = [1, 3, 6, 12]

# Duração usada quando o aluno não escolhe
DURACAO_PADRAO_MESES = 3


def _sem_acento(valor) -> str:
    """Remove acentos e normaliza para comparar 'Karatê' com 'karate'."""
    texto = unicodedata.normalize("NFD", str(valor if valor is not None else ""))
    return "".join(c for c in texto if unicodedata.category(c) != "Mn").strip().lower()


def modalidade_canonica(valor):
    """
    Devolve o nome canônico do treino (ou None se não existir).

    :param valor: str
    :return: str | None
    """
    alvo = _sem_acento(valor)

    for modalidade in MODALIDADES:
        if _sem_acento(modalidade) == alvo:
            return modalidade

    return None


def validar_modalidade(valor) -> str:
    """
    :param valor: str
    :return: str - nome canônico
    :raises ValueError: se o treino não existir
    """
    nome = modalidade_canonica(valor)

    if not nome:
        raise ValueError(f"Treino inválido. Escolha um destes: {', '.join(MODALIDADES)}.")

    return nome


def preco_mensalidade(valor) -> int:
    """Retorna o preço mensal do treino, usando sempre o nome canônico."""
    return PRECOS_MENSALIDADES[validar_modalidade(valor)]


def normalizar_lista(valor) -> list[str]:
    """
    Normaliza uma lista de treinos (lista ou texto separado por vírgula),
    removendo repetições.

    :param valor: list | str | None
    :return: list[str]
    """
    if valor is None:
        return []

    bruto = valor if isinstance(valor, (list, tuple)) else str(valor).split(",")
    lista = []

    for item in bruto:
        nome = validar_modalidade(item)
        if nome not in lista:
            lista.append(nome)

    return lista


def lista_para_texto(lista) -> str:
    """Lista -> texto gravado no MySQL ('Boxe, Muay Thai')."""
    return ", ".join(lista or [])


def texto_para_lista(texto) -> list[str]:
    """Texto do MySQL -> lista."""
    return [item.strip() for item in str(texto or "").split(",") if item.strip()]


def validar_duracao(valor) -> int:
    """
    :param valor: qualquer valor numérico
    :return: int - duração em meses (1 a 24)
    :raises ValueError: se não for inteiro válido
    """
    if valor is None:
        return DURACAO_PADRAO_MESES

    try:
        numero = float(valor)
    except (TypeError, ValueError):
        raise ValueError("duracaoMeses deve ser um número inteiro entre 1 e 24.")

    if not numero.is_integer() or numero < 1 or numero > 24:
        raise ValueError("duracaoMeses deve ser um número inteiro entre 1 e 24.")

    return int(numero)
