# -*- coding: utf-8 -*-
import datetime
import unicodedata

from api.utils.numeros import para_inteiro

"""
Representa a entidade Pagamento: cada mensalidade de uma matrícula.

Relaciona-se com Matricula (N:1) e é o objeto de CRUD do aluno:
registrar, listar, alterar e excluir os próprios pagamentos.
"""

METODOS = ["Pix", "Cartão", "Dinheiro"]
STATUS = ["pendente", "pago", "atrasado"]


def _sem_acento(valor) -> str:
    """Remove acentos para comparar 'Cartao' com 'Cartão'."""
    texto = unicodedata.normalize("NFD", str(valor or ""))
    return "".join(c for c in texto if unicodedata.category(c) != "Mn").strip().lower()


class Pagamento:
    def __init__(self):
        self.__idPagamento = None
        self.__valor = None
        self.__dataVencimento = None
        self.__dataPagamento = None
        self.__metodo = None
        self.__status = None
        self.__matriculaId = None

    @staticmethod
    def normalizar_data(valor):
        """Converte date/string para o formato YYYY-MM-DD."""
        if isinstance(valor, datetime.datetime):
            return valor.date().isoformat()

        if isinstance(valor, datetime.date):
            return valor.isoformat()

        if isinstance(valor, str):
            texto = valor.strip()
            try:
                datetime.datetime.strptime(texto[:10], "%Y-%m-%d")
            except ValueError:
                raise ValueError("data inválida, use o formato YYYY-MM-DD.")
            return texto[:10]

        raise ValueError("data deve ser uma string no formato YYYY-MM-DD.")

    @property
    def idPagamento(self):
        """Getter para idPagamento."""
        return self.__idPagamento

    @idPagamento.setter
    def idPagamento(self, valor):
        """Regra de domínio: número inteiro positivo."""
        parsed = para_inteiro(valor, "idPagamento")

        if parsed <= 0:
            raise ValueError("idPagamento deve ser maior que zero.")

        self.__idPagamento = parsed

    @property
    def valor(self):
        """Getter para valor."""
        return self.__valor

    @valor.setter
    def valor(self, valor):
        """Regra de domínio: maior que zero, no máximo 100000."""
        try:
            numero = float(valor)
        except (TypeError, ValueError):
            raise ValueError("valor deve ser um número.")

        if numero != numero or numero in (float("inf"), float("-inf")):
            raise ValueError("valor deve ser um número.")

        if numero <= 0:
            raise ValueError("valor deve ser maior que zero.")

        if numero > 100000:
            raise ValueError("valor deve ser no máximo 100000.")

        self.__valor = round(numero, 2)

    @property
    def dataVencimento(self):
        """Getter para dataVencimento."""
        return self.__dataVencimento

    @dataVencimento.setter
    def dataVencimento(self, valor):
        """Define o vencimento (YYYY-MM-DD)."""
        self.__dataVencimento = Pagamento.normalizar_data(valor)

    @property
    def dataPagamento(self):
        """Getter para dataPagamento."""
        return self.__dataPagamento

    @dataPagamento.setter
    def dataPagamento(self, valor):
        """Define a data de pagamento (pode ser nula enquanto não for pago)."""
        if valor is None or str(valor).strip() == "":
            self.__dataPagamento = None
            return

        self.__dataPagamento = Pagamento.normalizar_data(valor)

    @property
    def metodo(self):
        """Getter para metodo."""
        return self.__metodo

    @metodo.setter
    def metodo(self, valor):
        """Regra de domínio: Pix | Cartão | Dinheiro."""
        nome = next((item for item in METODOS if _sem_acento(item) == _sem_acento(valor)), None)

        if not nome:
            raise ValueError(f"metodo inválido. Use um destes: {', '.join(METODOS)}.")

        self.__metodo = nome

    @property
    def status(self):
        """Getter para status."""
        return self.__status

    @status.setter
    def status(self, valor):
        """Regra de domínio: pendente | pago | atrasado."""
        nome = next((item for item in STATUS if _sem_acento(item) == _sem_acento(valor)), None)

        if not nome:
            raise ValueError(f"status inválido. Use um destes: {', '.join(STATUS)}.")

        self.__status = nome

    @property
    def matriculaId(self):
        """Getter para matriculaId."""
        return self.__matriculaId

    @matriculaId.setter
    def matriculaId(self, valor):
        """Regra de domínio: id da matrícula dona do pagamento."""
        parsed = para_inteiro(valor, "matriculaId")

        if parsed <= 0:
            raise ValueError("matriculaId deve ser um número inteiro maior que zero.")

        self.__matriculaId = parsed
