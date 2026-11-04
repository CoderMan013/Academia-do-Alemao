# -*- coding: utf-8 -*-
from flask import Blueprint

from api.control.matricula_control import MatriculaControl
from api.middleware.jwt_middleware import JwtMiddleware
from api.middleware.matricula_middleware import MatriculaMiddleware
from api.middleware.role_middleware import RoleMiddleware

class MatriculaRoteador:
    """
    Configura as rotas da entidade Matricula.

    As rotas /minhas e /meus-alunos são específicas de cada papel; o CRUD
    completo continua disponível para consulta e manutenção.
    """

    def __init__(self,
                 jwt_middleware: JwtMiddleware,
                 role_middleware: RoleMiddleware,
                 matricula_middleware: MatriculaMiddleware,
                 matricula_control: MatriculaControl):
        print("⬆️  MatriculaRoteador.__init__()")
        self.__jwt_middleware = jwt_middleware
        self.__role_middleware = role_middleware
        self.__matricula_middleware = matricula_middleware
        self.__matricula_control = matricula_control
        self.__blueprint = Blueprint('matricula', __name__)

    def create_routes(self):
        """
        Rotas implementadas (registradas em /api/v1/matriculas):
        - GET    /minhas       -> matrículas do aluno logado
        - GET    /meus-alunos  -> matrículas das turmas do professor
        - POST   /             -> cria uma matrícula
        - GET    /             -> lista todas
        - GET    /<id>         -> busca por ID
        - PUT    /<id>         -> atualiza por ID
        - DELETE /<id>         -> remove por ID
        """

        @self.__blueprint.route('/minhas', methods=['GET'])
        @self.__jwt_middleware.validate_token
        @self.__role_middleware.require_role("aluno")
        def minhas():
            return self.__matricula_control.minhas()

        @self.__blueprint.route('/meus-alunos', methods=['GET'])
        @self.__jwt_middleware.validate_token
        @self.__role_middleware.require_role("professor")
        def meus_alunos():
            return self.__matricula_control.meus_alunos()

        @self.__blueprint.route('/', methods=['POST'], strict_slashes=False)
        @self.__jwt_middleware.validate_token
        @self.__matricula_middleware.validate_body
        def store():
            return self.__matricula_control.store()

        @self.__blueprint.route('/', methods=['GET'], strict_slashes=False)
        @self.__jwt_middleware.validate_token
        def index():
            return self.__matricula_control.index()

        @self.__blueprint.route('/<int:idMatricula>', methods=['GET'])
        @self.__jwt_middleware.validate_token
        @self.__matricula_middleware.validate_id_param
        def show(idMatricula):
            return self.__matricula_control.show(idMatricula)

        @self.__blueprint.route('/<int:idMatricula>', methods=['PUT'])
        @self.__jwt_middleware.validate_token
        @self.__matricula_middleware.validate_id_param
        @self.__matricula_middleware.validate_body
        def update(idMatricula):
            return self.__matricula_control.update(idMatricula)

        @self.__blueprint.route('/<int:idMatricula>', methods=['DELETE'])
        @self.__jwt_middleware.validate_token
        @self.__matricula_middleware.validate_id_param
        def destroy(idMatricula):
            return self.__matricula_control.destroy(idMatricula)

        return self.__blueprint
