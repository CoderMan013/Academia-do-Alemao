# -*- coding: utf-8 -*-
import datetime

from api.domain.modalidades import validar_modalidade
from api.model.aluno import Aluno
from api.utils.numeros import para_inteiro

"""
Representa a entidade Matricula: a tabela do meio do projeto.

Relaciona o Aluno ao treino escolhido e guarda o período do plano.
Cada matrícula pode ter vários pagamentos (mensalidades).
"""


class Matricula:
    def __init__(self):
        self.__idMatricula = None
        self.__dataInicio = None
        self.__dataFim = None
        self.__status = None
        self.__modalidade = None
        self.__aluno = None

    @staticmethod
    def normalizar_data(valor):
        """
        Converte date/string para o formato YYYY-MM-DD.

        :param valor: datetime.date ou str
        :return: str
        :raises ValueError: se a data for inválida.
        """
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
    def idMatricula(self):
        """Getter para idMatricula."""
        return self.__idMatricula

    @idMatricula.setter
    def idMatricula(self, valor):
        """Regra de domínio: número inteiro positivo."""
        parsed = para_inteiro(valor, "idMatricula")

        if parsed <= 0:
            raise ValueError("idMatricula deve ser maior que zero.")

        self.__idMatricula = parsed

    @property
    def dataInicio(self):
        """Getter para dataInicio."""
        return self.__dataInicio

    @dataInicio.setter
    def dataInicio(self, valor):
        """Define a data de início (YYYY-MM-DD)."""
        self.__dataInicio = Matricula.normalizar_data(valor)

    @property
    def dataFim(self):
        """Getter para dataFim."""
        return self.__dataFim

    @dataFim.setter
    def dataFim(self, valor):
        """Regra de domínio: a data final não pode ser anterior à inicial."""
        data = Matricula.normalizar_data(valor)

        if self.__dataInicio and data < self.__dataInicio:
            raise ValueError("dataFim não pode ser anterior a dataInicio.")

        self.__dataFim = data

    @property
    def status(self):
        """Getter para status."""
        return self.__status

    @status.setter
    def status(self, valor):
        """Regra de domínio: ativa | cancelada | concluida."""
        if not isinstance(valor, str):
            raise ValueError("status deve ser uma string.")

        status = valor.strip().lower()
        permitidos = ["ativa", "cancelada", "concluida"]

        if status not in permitidos:
            raise ValueError(f"status deve ser um destes valores: {', '.join(permitidos)}.")

        self.__status = status

    @property
    def modalidade(self):
        """Getter do treino."""
        return self.__modalidade

    @modalidade.setter
    def modalidade(self, valor):
        """Regra de domínio: um dos 5 treinos da academia."""
        if not isinstance(valor, str):
            raise ValueError("O treino deve ser informado como texto.")

        self.__modalidade = validar_modalidade(valor)

    @property
    def aluno(self):
        """Getter para aluno."""
        return self.__aluno

    @aluno.setter
    def aluno(self, valor):
        """Regra de domínio: instância válida de Aluno."""
        if not isinstance(valor, Aluno):
            raise ValueError("aluno deve ser uma instância válida de Aluno.")

        self.__aluno = valor
