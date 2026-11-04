# -*- coding: utf-8 -*-
from flask import Blueprint

from api.control.pagamento_control import PagamentoControl
from api.middleware.jwt_middleware import JwtMiddleware
from api.middleware.pagamento_middleware import PagamentoMiddleware

class PagamentoRoteador:
    """
    Configura as rotas da entidade Pagamento.
    """

    def __init__(self,
                 jwt_middleware: JwtMiddleware,
                 pagamento_middleware: PagamentoMiddleware,
                 pagamento_control: PagamentoControl):
        print("⬆️  PagamentoRoteador.__init__()")
        self.__jwt_middleware = jwt_middleware
        self.__pagamento_middleware = pagamento_middleware
        self.__pagamento_control = pagamento_control
        self.__blueprint = Blueprint('pagamento', __name__)

    def create_routes(self):
        """
        Rotas implementadas (registradas em /api/v1/pagamentos):
        - GET    /minhas                    -> pagamentos do aluno logado
        - GET    /matricula/<idMatricula>   -> pagamentos de uma matrícula
        - POST   /                          -> registra um pagamento
        - GET    /                          -> lista todos
        - GET    /<id>                      -> busca por ID
        - PUT    /<id>                      -> atualiza por ID
        - DELETE /<id>                      -> remove por ID
        """

        @self.__blueprint.route('/minhas', methods=['GET'])
        @self.__jwt_middleware.validate_token
        def minhas():
            return self.__pagamento_control.minhas()

        @self.__blueprint.route('/matricula/<int:idMatricula>', methods=['GET'])
        @self.__jwt_middleware.validate_token
        @self.__pagamento_middleware.validate_id_matricula
        def por_matricula(idMatricula):
            return self.__pagamento_control.por_matricula(idMatricula)

        @self.__blueprint.route('/', methods=['POST'], strict_slashes=False)
        @self.__jwt_middleware.validate_token
        @self.__pagamento_middleware.validate_body
        def store():
            return self.__pagamento_control.store()

        @self.__blueprint.route('/', methods=['GET'], strict_slashes=False)
        @self.__jwt_middleware.validate_token
        def index():
            return self.__pagamento_control.index()

        @self.__blueprint.route('/<int:idPagamento>', methods=['GET'])
        @self.__jwt_middleware.validate_token
        @self.__pagamento_middleware.validate_id_param
        def show(idPagamento):
            return self.__pagamento_control.show(idPagamento)

        @self.__blueprint.route('/<int:idPagamento>', methods=['PUT'])
        @self.__jwt_middleware.validate_token
        @self.__pagamento_middleware.validate_id_param
        @self.__pagamento_middleware.validate_update_body
        def update(idPagamento):
            return self.__pagamento_control.update(idPagamento)

        @self.__blueprint.route('/<int:idPagamento>', methods=['DELETE'])
        @self.__jwt_middleware.validate_token
        @self.__pagamento_middleware.validate_id_param
        def destroy(idPagamento):
            return self.__pagamento_control.destroy(idPagamento)

        return self.__blueprint
