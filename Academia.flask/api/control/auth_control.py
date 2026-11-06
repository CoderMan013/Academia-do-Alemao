# -*- coding: utf-8 -*-
from flask import g, jsonify, request

from api.service.auth_service import AuthService

"""
Classe responsável por controlar a autenticação (login e cadastro).
"""
class AuthControl:
    def __init__(self, auth_service: AuthService):
        print("⬆️  AuthControl.constructor()")
        self.__auth_service = auth_service

    def login(self):
        """POST /api/v1/auth/login -> autentica o aluno"""
        print("🔵 AuthControl.login()")

        resultado = self.__auth_service.login(request.json)

        return jsonify({
            "success": True,
            "message": "Login efetuado com sucesso!",
            "data": resultado
        }), 200

    def registrar(self):
        """POST /api/v1/auth/registrar -> cria a conta e já devolve o token"""
        print("🔵 AuthControl.registrar()")

        resultado = self.__auth_service.registrar(request.json)

        return jsonify({
            "success": True,
            "message": "Cadastro realizado com sucesso",
            "data": resultado
        }), 201

    def perfil(self):
        """PUT /api/v1/auth/perfil -> atualiza os dados do aluno autenticado."""
        print("🔵 AuthControl.perfil()")
        resultado = self.__auth_service.atualizarPerfil(
            getattr(g, "usuario", None) or {},
            request.get_json(silent=True) or {},
        )

        return jsonify({
            "success": True,
            "message": "Dados atualizados com sucesso",
            "data": resultado
        }), 200
