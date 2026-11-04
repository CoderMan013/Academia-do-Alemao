# -*- coding: utf-8 -*-
from flask import Blueprint, g, jsonify

from api.control.auth_control import AuthControl
from api.middleware.auth_middleware import AuthMiddleware
from api.middleware.jwt_middleware import JwtMiddleware

class AuthRoteador:
    """
    Rotas públicas de autenticação.

    É por aqui que o frontend entra e cria conta: as duas telas do cadastro
    (escolha do tipo e dados restantes) terminam em POST /registrar.
    """

    def __init__(self,
                 jwt_middleware: JwtMiddleware,
                 auth_middleware: AuthMiddleware,
                 auth_control: AuthControl):
        print("⬆️  AuthRoteador.__init__()")
        self.__jwt_middleware = jwt_middleware
        self.__auth_middleware = auth_middleware
        self.__auth_control = auth_control
        self.__blueprint = Blueprint('auth', __name__)

    def create_routes(self):
        """
        Rotas implementadas (registradas em /api/v1/auth):
        - POST /login     -> autentica o aluno
        - POST /registrar -> cria a conta e devolve o token
        - GET  /sessao    -> quem está logado (token)
        """

        @self.__blueprint.route('/login', methods=['POST'])
        @self.__auth_middleware.validate_login_body
        def login():
            return self.__auth_control.login()

        @self.__blueprint.route('/registrar', methods=['POST'])
        @self.__auth_middleware.validate_registrar_body
        def registrar():
            return self.__auth_control.registrar()

        @self.__blueprint.route('/sessao', methods=['GET'])
        @self.__jwt_middleware.validate_token
        def sessao():
            return jsonify({
                "success": True,
                "message": "Sessão válida",
                "data": {"usuario": getattr(g, "usuario", None) or {}}
            }), 200

        return self.__blueprint
