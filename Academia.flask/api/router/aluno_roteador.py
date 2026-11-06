# -*- coding: utf-8 -*-
from flask import Blueprint

from api.control.aluno_control import AlunoControl
from api.middleware.aluno_middleware import AlunoMiddleware
from api.middleware.jwt_middleware import JwtMiddleware

class AlunoRoteador:
    """
    Classe responsável por configurar as rotas da entidade Aluno no Flask.

    A única rota pública é o login (POST /login): é ela que gera o token
    usado nas demais requisições.
    """

    def __init__(self, jwt_middleware: JwtMiddleware, aluno_middleware: AlunoMiddleware, aluno_control: AlunoControl):
        """
        Construtor da classe.

        :param jwt_middleware: Middleware para validação de tokens JWT.
        :param aluno_middleware: Middleware para validar parâmetros e corpo da requisição.
        :param aluno_control: Controlador responsável pela lógica de negócio da entidade Aluno.
        """
        print("⬆️  AlunoRoteador.__init__()")
        # O Router recebe as dependências prontas; cada rota combina autenticação,
        # validação de entrada e chamada ao método adequado do Controller.
        self.__jwt_middleware = jwt_middleware
        self.__aluno_middleware = aluno_middleware
        self.__aluno_control = aluno_control
        # Cria um Blueprint específico para as rotas de aluno
        self.__blueprint = Blueprint('aluno', __name__)

    def create_routes(self):
        """
        Configura as rotas da API REST para a entidade Aluno.

        Rotas implementadas (registradas em /api/v1/alunos):
        - POST /login      -> autentica o aluno e devolve o token (público)
        - POST /registrar  -> auto-cadastro feito pela tela de login (público)
        - POST /           -> cria um aluno
        - GET /         -> lista todos os alunos
        - GET /<id>     -> retorna um aluno por ID
        - PUT /<id>     -> atualiza um aluno por ID
        - DELETE /<id>  -> remove um aluno por ID
        """

        # POST / -> cria um aluno
        # Os decorators são executados de fora para dentro: o token é validado
        # antes da validação do corpo e da chamada ao Controller.
        @self.__blueprint.route('/', methods=['POST'], strict_slashes=False)
        @self.__jwt_middleware.validate_token
        @self.__aluno_middleware.validate_body
        def store():
            """Rota responsável por criar um novo aluno."""
            return self.__aluno_control.store()

        # GET / -> lista todos os alunos
        # Exige sessão porque a listagem de alunos não é uma rota pública.
        @self.__blueprint.route('/', methods=['GET'], strict_slashes=False)
        @self.__jwt_middleware.validate_token
        def index():
            """Rota responsável por listar todos os alunos cadastrados."""
            return self.__aluno_control.index()

        # GET /<idAluno> -> retorna um aluno específico
        # O conversor <int:...> rejeita IDs que não sejam números inteiros na URL.
        @self.__blueprint.route('/<int:idAluno>', methods=['GET'])
        @self.__jwt_middleware.validate_token
        @self.__aluno_middleware.validate_id_param
        def show(idAluno):
            """
            Rota que retorna um aluno específico pelo seu ID.

            :param idAluno: int - ID do aluno vindo da URI.
            """
            return self.__aluno_control.show(idAluno)

        # PUT /<idAluno> -> atualiza um aluno
        # Além da autenticação, valida o ID e os campos obrigatórios; senha é opcional.
        @self.__blueprint.route('/<int:idAluno>', methods=['PUT'])
        @self.__jwt_middleware.validate_token
        @self.__aluno_middleware.validate_id_param
        @self.__aluno_middleware.validate_update_body
        def update(idAluno):
            """Rota que atualiza um aluno existente (senha é opcional)."""
            return self.__aluno_control.update(idAluno)

        # DELETE /<idAluno> -> remove um aluno
        # A regra que bloqueia exclusão de aluno com matrícula fica no Service.
        @self.__blueprint.route('/<int:idAluno>', methods=['DELETE'])
        @self.__jwt_middleware.validate_token
        @self.__aluno_middleware.validate_id_param
        def destroy(idAluno):
            """
            Rota que remove um aluno pelo seu ID.

            :param idAluno: int - ID do aluno a ser removido.
            """
            return self.__aluno_control.destroy(idAluno)

        # O Server registra este Blueprint sob o prefixo /api/v1/alunos.
        return self.__blueprint
