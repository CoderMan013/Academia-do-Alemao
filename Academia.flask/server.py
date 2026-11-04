import os
import traceback

from flask import Flask, jsonify
from flask_cors import CORS
from werkzeug.exceptions import HTTPException, NotFound

from api.database.mysql_database import MysqlDatabase
from api.domain.modalidades import MODALIDADES
from api.utils.error_response import ErrorResponse
from api.utils.logger import Logger

# Middlewares
from api.middleware.jwt_middleware import JwtMiddleware
from api.middleware.role_middleware import RoleMiddleware
from api.middleware.auth_middleware import AuthMiddleware
from api.middleware.aluno_middleware import AlunoMiddleware
from api.middleware.professor_middleware import ProfessorMiddleware
from api.middleware.matricula_middleware import MatriculaMiddleware

# Controls
from api.control.auth_control import AuthControl
from api.control.aluno_control import AlunoControl
from api.control.professor_control import ProfessorControl
from api.control.matricula_control import MatriculaControl

# Services
from api.service.auth_service import AuthService
from api.service.aluno_service import AlunoService
from api.service.professor_service import ProfessorService
from api.service.matricula_service import MatriculaService

# DAOs
from api.dao.aluno_dao import AlunoDAO
from api.dao.professor_dao import ProfessorDAO
from api.dao.matricula_dao import MatriculaDAO

# Routers
from api.router.auth_roteador import AuthRoteador
from api.router.aluno_roteador import AlunoRoteador
from api.router.professor_roteador import ProfessorRoteador
from api.router.matricula_roteador import MatriculaRoteador


class Server:
    """
    Classe principal do servidor Flask.

    Responsável por inicializar middlewares, roteadores e gerenciar a aplicação.

    Entidades: Aluno, Professor (no lugar do antigo Plano) e Matricula.
    """

    def __init__(self, porta: int = 8081):
        # 🔹 Porta em que o servidor irá rodar
        self.__porta = porta

        # 🔹 Instância Flask, configurando pasta de arquivos estáticos (o frontend)
        self.__app = Flask(__name__, static_folder="static", static_url_path="")

        # 🔹 Mantém a ordem dos campos igual à da API em Node (não ordena as chaves)
        self.__app.json.sort_keys = False

        # 🔹 Configuração de CORS (Cross-Origin Resource Sharing)
        CORS(self.__app, resources={r"/*": {"origins": "*"}})

        # 🔹 Middlewares
        self.__jwt_middleware = JwtMiddleware()
        self.__role_middleware = RoleMiddleware()
        self.__auth_middleware = AuthMiddleware()
        self.__aluno_middleware = AlunoMiddleware()
        self.__professor_middleware = ProfessorMiddleware()
        self.__matricula_middleware = MatriculaMiddleware()

        # 🔹 DAOs, Services e Controls serão inicializados após conexão com DB
        self.__aluno_dao = None
        self.__professor_dao = None
        self.__matricula_dao = None

        self.__auth_service = None
        self.__aluno_service = None
        self.__professor_service = None
        self.__matricula_service = None

        self.__auth_control = None
        self.__aluno_control = None
        self.__professor_control = None
        self.__matricula_control = None

        # 🔹 Conexão global com o banco
        self.__db_connection = None

    def init(self):
        """
        Inicializa a aplicação:
        - Conexão com o banco
        - Middlewares
        - Roteadores
        """
        # 🔹 Entrega do frontend (raiz -> index.html -> Login.html)
        self.__setup_static()

        # 🔹 Middleware de log antes das rotas
        self.__before_routing()

        # 🔹 Conexão global com MySQL (injeção de dependência)
        self.__db_connection = MysqlDatabase(
            pool_name="pool_academia",
            pool_size=10,
            host=os.environ.get("DB_HOST", "127.0.0.1"),
            user=os.environ.get("DB_USER", "root"),
            password=os.environ.get("DB_PASSWORD", ""),
            database=os.environ.get("DB_NAME", "academia_db"),
            port=int(os.environ.get("DB_PORT", "3306"))
        )

        self.__db_connection.connect()

        # 🔹 DAOs compartilhados entre os services
        self.__aluno_dao = AlunoDAO(self.__db_connection)
        self.__professor_dao = ProfessorDAO(self.__db_connection)
        self.__matricula_dao = MatriculaDAO(self.__db_connection)

        # 🔹 Services
        self.__aluno_service = AlunoService(self.__aluno_dao, self.__matricula_dao)
        self.__professor_service = ProfessorService(self.__professor_dao, self.__matricula_dao)
        self.__matricula_service = MatriculaService(
            self.__matricula_dao,
            self.__aluno_dao,
            self.__professor_dao
        )
        self.__auth_service = AuthService(
            self.__aluno_dao,
            self.__professor_dao,
            self.__aluno_service,
            self.__professor_service
        )

        # 🔹 Controls
        self.__auth_control = AuthControl(self.__auth_service)
        self.__aluno_control = AlunoControl(self.__aluno_service)
        self.__professor_control = ProfessorControl(self.__professor_service)
        self.__matricula_control = MatriculaControl(self.__matricula_service)

        # 🔹 Configuração dos módulos
        self.__setup_auth()
        self.__setup_aluno()
        self.__setup_professor()
        self.__setup_matricula()
        self.__setup_modalidades()

        # 🔹 Middleware global de tratamento de erros
        self.__error_middleware()

    def __setup_auth(self):
        """Configura o módulo de autenticação em /api/v1/auth"""
        print("⬆️  Setup Auth")

        auth_router = AuthRoteador(
            self.__jwt_middleware,
            self.__auth_middleware,
            self.__auth_control
        )

        self.__app.register_blueprint(auth_router.create_routes(), url_prefix="/api/v1/auth")

    def __setup_aluno(self):
        """Configura o módulo Aluno (DAO, Service, Control, Router)"""
        print("⬆️  Setup Aluno")

        aluno_router = AlunoRoteador(
            self.__jwt_middleware,
            self.__aluno_middleware,
            self.__aluno_control
        )

        self.__app.register_blueprint(aluno_router.create_routes(), url_prefix="/api/v1/alunos")

    def __setup_professor(self):
        """Configura o módulo Professor (DAO, Service, Control, Router)"""
        print("⬆️  Setup Professor")

        professor_router = ProfessorRoteador(
            self.__jwt_middleware,
            self.__role_middleware,
            self.__professor_middleware,
            self.__professor_control
        )

        self.__app.register_blueprint(professor_router.create_routes(), url_prefix="/api/v1/professores")

    def __setup_matricula(self):
        """Configura o módulo Matricula (DAO, Service, Control, Router)"""
        print("⬆️  Setup Matrícula")

        matricula_router = MatriculaRoteador(
            self.__jwt_middleware,
            self.__role_middleware,
            self.__matricula_middleware,
            self.__matricula_control
        )

        self.__app.register_blueprint(matricula_router.create_routes(), url_prefix="/api/v1/matriculas")

    def __setup_modalidades(self):
        """
        Rota pública com as 5 modalidades e os professores que as lecionam.
        É usada na tela de cadastro do professor e no painel do aluno.
        """
        print("⬆️  Setup Modalidades")

        @self.__app.route("/api/v1/modalidades", methods=["GET"])
        def modalidades():
            professores = self.__professor_service.findAll()

            lista = []
            for nome in MODALIDADES:
                lista.append({
                    "nome": nome,
                    "professores": [
                        {
                            "idProfessor": professor["idProfessor"],
                            "nomeProfessor": professor["nomeProfessor"],
                        }
                        for professor in professores
                        if nome in professor["modalidades"]
                    ],
                })

            return jsonify({
                "success": True,
                "message": "Busca realizada com sucesso",
                "data": {"modalidades": lista},
            }), 200

    def __setup_static(self):
        """
        A raiz do site (http://localhost:8081/) entrega o index.html,
        que redireciona para o Login.html — igual à API em Node.
        """
        @self.__app.route("/")
        def index():
            return self.__app.send_static_file("index.html")

    def __before_routing(self):
        """Middleware que loga separador antes de cada requisição"""
        @self.__app.before_request
        def log_separator():
            print("-" * 70)

    def __error_middleware(self):
        """Middleware global de tratamento de erros"""
        @self.__app.errorhandler(Exception)
        def handle_error(error):
            # 🔹 404 - Rota ou arquivo não encontrado
            if isinstance(error, NotFound):
                return jsonify({
                    "success": False,
                    "message": "Rota não encontrada",
                    "error": {"message": str(error)}
                }), 404

            # 🔹 Outros erros HTTP (405, 400 do Flask etc.)
            if isinstance(error, HTTPException):
                return jsonify({
                    "success": False,
                    "message": error.name,
                    "error": {"message": error.description}
                }), error.code

            # 🔹 Captura ErrorResponse customizado
            if isinstance(error, ErrorResponse):
                print("🟡 Server.error_middleware()")
                Logger.log(error)

                return jsonify({
                    "success": False,
                    "message": str(error.args[0]),
                    "error": error.error
                }), error.httpCode

            # 🔹 Outros erros internos (não tratados)
            print("🟡 Server.error_middleware()")
            stack_str = ''.join(traceback.format_exception(type(error), error, error.__traceback__))

            resposta = {
                "success": False,
                "message": "Ocorreu um erro interno no servidor",
                "data": {"stack": stack_str},
                "error": {
                    "message": str(error),
                    "code": getattr(error, "code", None)
                }
            }

            Logger.log(error)  # Loga a exceção real
            return jsonify(resposta), 500

    def run(self):
        """Inicia o servidor Flask na porta configurada"""
        print(f"🚀 API Flask rodando em http://localhost:{self.__porta}/Login.html")
        # ⚠️ debug=False é necessário para que o errorhandler global capture exceções
        self.__app.run(port=self.__porta, debug=False)
