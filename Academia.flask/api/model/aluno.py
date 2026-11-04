# -*- coding: utf-8 -*-
import re

from api.utils.numeros import para_inteiro

"""
Representa a entidade Aluno do sistema (contexto: academia).

É a entidade que possui e-mail e senha, portanto é ela que autentica
no sistema (a senha é gravada com bcrypt pelo DAO).
"""


class Aluno:
    def __init__(self):
        """
        Inicializa todos os atributos como atributos de instância.
        """
        self.__idAluno = None
        self.__nomeAluno = None
        self.__email = None
        self.__senha = None
        self.__ativo = None

    @property
    def idAluno(self):
        """
        Getter para idAluno
        :return: int - Identificador do aluno
        """
        return self.__idAluno

    @idAluno.setter
    def idAluno(self, valor):
        """
        Define o ID do aluno.

        🔹 Regra de domínio: número inteiro positivo.

        :param valor: int - Número inteiro positivo representando o ID do aluno.
        :raises ValueError: se não for número inteiro positivo.
        """
        parsed = para_inteiro(valor, "idAluno")

        if parsed <= 0:
            raise ValueError("idAluno deve ser maior que zero.")

        self.__idAluno = parsed

    @property
    def nomeAluno(self):
        """
        Getter para nomeAluno
        :return: str - Nome do aluno
        """
        return self.__nomeAluno

    @nomeAluno.setter
    def nomeAluno(self, valor):
        """
        Define o nome do aluno.

        🔹 Regra de domínio: string de 3 a 128 caracteres.

        :param valor: str - Nome do aluno.
        :raises ValueError: se inválido.
        """
        if not isinstance(valor, str):
            raise ValueError("nomeAluno deve ser uma string.")

        nome = valor.strip()

        if len(nome) < 3:
            raise ValueError("nomeAluno deve ter pelo menos 3 caracteres.")

        if len(nome) > 128:
            raise ValueError("nomeAluno deve ter no máximo 128 caracteres.")

        self.__nomeAluno = nome

    @property
    def email(self):
        """
        Getter para email
        :return: str - Email do aluno
        """
        return self.__email

    @email.setter
    def email(self, valor):
        """
        Define o email do aluno.

        🔹 Regra de domínio: formato nome@dominio.com, máximo 64 caracteres
        (o e-mail é sempre gravado em minúsculas, como na API em Node).

        :param valor: str - Email do aluno.
        :raises ValueError: se inválido.
        """
        if not isinstance(valor, str):
            raise ValueError("email deve ser uma string.")

        email = valor.strip().lower()

        if email == "":
            raise ValueError("email não pode ser vazio.")

        if len(email) > 64:
            raise ValueError("email deve ter no máximo 64 caracteres.")

        email_regex = r"^[^\s@]+@[^\s@]+\.[^\s@]+$"
        if not re.match(email_regex, email):
            raise ValueError("email em formato inválido.")

        self.__email = email

    @property
    def senha(self):
        """
        Getter para senha
        :return: str - Senha do aluno (em texto puro, antes do hash no DAO)
        """
        return self.__senha

    @senha.setter
    def senha(self, valor):
        """
        Define a senha do aluno.

        🔹 Regra de domínio:
        - Mínimo 6 caracteres
        - Pelo menos 1 letra maiúscula
        - Pelo menos 1 número
        - Pelo menos 1 caractere especial

        :param valor: str - Senha do aluno.
        :raises ValueError: se inválida.
        """
        if not isinstance(valor, str):
            raise ValueError("senha deve ser uma string.")

        senha = valor.strip()

        if senha == "":
            raise ValueError("senha não pode ser vazia.")

        if len(senha) < 6:
            raise ValueError("senha deve ter pelo menos 6 caracteres.")

        if not any(c.isupper() for c in senha):
            raise ValueError("senha deve conter pelo menos uma letra maiúscula.")

        if not any(c.isdigit() for c in senha):
            raise ValueError("senha deve conter pelo menos um número.")

        especiais = "!@#$%^&*(),.?\":{}|<>_-+"
        if not any(c in especiais for c in senha):
            raise ValueError("senha deve conter pelo menos um caractere especial.")

        self.__senha = senha

    @property
    def ativo(self):
        """
        Getter para ativo
        :return: int - 1 (ativo) ou 0 (inativo)
        """
        return self.__ativo

    @ativo.setter
    def ativo(self, valor):
        """
        Define se o aluno está ativo.

        🔹 Regra de domínio: 0 (inativo) ou 1 (ativo).

        :param valor: int - 0 ou 1
        :raises ValueError: se não for 0 ou 1.
        """
        parsed = para_inteiro(valor, "ativo")

        if parsed not in (0, 1):
            raise ValueError("ativo deve ser 0 ou 1.")

        self.__ativo = parsed
