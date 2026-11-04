# -*- coding: utf-8 -*-
import re

from api.domain.modalidades import normalizar_lista
from api.utils.numeros import para_inteiro

"""
Representa a entidade Professor do sistema (contexto: academia).

Assim como o Aluno, possui e-mail e senha e autentica no sistema.
A diferença é que o professor leciona uma ou mais modalidades
(Musculação, Cross Fit, Muay Thai, Karatê, Boxe).
"""


class Professor:
    def __init__(self):
        self.__idProfessor = None
        self.__nomeProfessor = None
        self.__email = None
        self.__senha = None
        self.__modalidades = []
        self.__ativo = None

    @property
    def idProfessor(self):
        """Getter para idProfessor."""
        return self.__idProfessor

    @idProfessor.setter
    def idProfessor(self, valor):
        """Regra de domínio: número inteiro positivo."""
        parsed = para_inteiro(valor, "idProfessor")

        if parsed <= 0:
            raise ValueError("idProfessor deve ser maior que zero.")

        self.__idProfessor = parsed

    @property
    def nomeProfessor(self):
        """Getter para nomeProfessor."""
        return self.__nomeProfessor

    @nomeProfessor.setter
    def nomeProfessor(self, valor):
        """Regra de domínio: string de 3 a 128 caracteres."""
        if not isinstance(valor, str):
            raise ValueError("nomeProfessor deve ser uma string.")

        nome = valor.strip()

        if len(nome) < 3:
            raise ValueError("nomeProfessor deve ter pelo menos 3 caracteres.")

        if len(nome) > 128:
            raise ValueError("nomeProfessor deve ter no máximo 128 caracteres.")

        self.__nomeProfessor = nome

    @property
    def email(self):
        """Getter para email."""
        return self.__email

    @email.setter
    def email(self, valor):
        """Regra de domínio: formato nome@dominio.com, sempre em minúsculas."""
        if not isinstance(valor, str):
            raise ValueError("email deve ser uma string.")

        email = valor.strip().lower()

        if email == "":
            raise ValueError("email não pode ser vazio.")

        if len(email) > 64:
            raise ValueError("email deve ter no máximo 64 caracteres.")

        if not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", email):
            raise ValueError("email em formato inválido.")

        self.__email = email

    @property
    def senha(self):
        """Getter para senha (texto puro, antes do hash no DAO)."""
        return self.__senha

    @senha.setter
    def senha(self, valor):
        """
        Regra de domínio: mínimo 6 caracteres, 1 maiúscula, 1 número e 1 especial.
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
    def modalidades(self):
        """Getter para modalidades (cópia da lista)."""
        return list(self.__modalidades)

    @modalidades.setter
    def modalidades(self, valor):
        """
        Lista de modalidades que o professor leciona.

        🔹 Regra de domínio: só aceita as 5 modalidades da academia.
        """
        self.__modalidades = normalizar_lista(valor)

    @property
    def ativo(self):
        """Getter para ativo."""
        return self.__ativo

    @ativo.setter
    def ativo(self, valor):
        """Regra de domínio: 0 (inativo) ou 1 (ativo)."""
        parsed = para_inteiro(valor, "ativo")

        if parsed not in (0, 1):
            raise ValueError("ativo deve ser 0 ou 1.")

        self.__ativo = parsed
