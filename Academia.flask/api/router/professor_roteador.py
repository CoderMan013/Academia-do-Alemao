# -*- coding: utf-8 -*-
from flask import Blueprint

from api.control.professor_control import ProfessorControl
from api.middleware.jwt_middleware import JwtMiddleware
from api.middleware.professor_middleware import ProfessorMiddleware
from api.middleware.role_middleware import RoleMiddleware

class ProfessorRoteador:
    """
    Configura as rotas da entidade Professor.

    /me e /me/alunos usam o id do token: o professor só vê os próprios dados.
    """

    def __init__(self,
                 jwt_middleware: JwtMiddleware,
                 role_middleware: RoleMiddleware,
                 professor_middleware: ProfessorMiddleware,
                 professor_control: ProfessorControl):
        print("⬆️  ProfessorRoteador.__init__()")
        self.__jwt_middleware = jwt_middleware
        self.__role_middleware = role_middleware
        self.__professor_middleware = professor_middleware
        self.__professor_control = professor_control
        self.__blueprint = Blueprint('professor', __name__)

    def create_routes(self):
        """
        Rotas implementadas (registradas em /api/v1/professores):
        - GET    /me               -> perfil do professor logado
        - GET    /me/alunos        -> matrículas das turmas dele
        - PUT    /me/modalidades   -> entra/sai de modalidades
        - GET    /                 -> lista professores
        - POST   /                 -> cria professor
        - GET    /<id>             -> busca por ID
        - PUT    /<id>             -> atualiza por ID
        - DELETE /<id>             -> remove por ID
        """

        @self.__blueprint.route('/me', methods=['GET'])
        @self.__jwt_middleware.validate_token
        @self.__role_middleware.require_role("professor")
        def me():
            return self.__professor_control.me()

        @self.__blueprint.route('/me/alunos', methods=['GET'])
        @self.__jwt_middleware.validate_token
        @self.__role_middleware.require_role("professor")
        def meus_alunos():
            return self.__professor_control.meus_alunos()

        @self.__blueprint.route('/me/modalidades', methods=['PUT'])
        @self.__jwt_middleware.validate_token
        @self.__role_middleware.require_role("professor")
        @self.__professor_middleware.validate_modalidades_body
        def atualizar_modalidades():
            return self.__professor_control.atualizar_modalidades()

        @self.__blueprint.route('/', methods=['GET'], strict_slashes=False)
        @self.__jwt_middleware.validate_token
        def index():
            return self.__professor_control.index()

        @self.__blueprint.route('/', methods=['POST'], strict_slashes=False)
        @self.__jwt_middleware.validate_token
        @self.__professor_middleware.validate_body
        def store():
            return self.__professor_control.store()

        @self.__blueprint.route('/<int:idProfessor>', methods=['GET'])
        @self.__jwt_middleware.validate_token
        @self.__professor_middleware.validate_id_param
        def show(idProfessor):
            return self.__professor_control.show(idProfessor)

        @self.__blueprint.route('/<int:idProfessor>', methods=['PUT'])
        @self.__jwt_middleware.validate_token
        @self.__professor_middleware.validate_id_param
        @self.__professor_middleware.validate_update_body
        def update(idProfessor):
            return self.__professor_control.update(idProfessor)

        @self.__blueprint.route('/<int:idProfessor>', methods=['DELETE'])
        @self.__jwt_middleware.validate_token
        @self.__professor_middleware.validate_id_param
        def destroy(idProfessor):
            return self.__professor_control.destroy(idProfessor)

        return self.__blueprint
