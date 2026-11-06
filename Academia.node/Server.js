const path = require("path");
const express = require("express");
const cors = require("cors");

const ErrorResponse = require("./api/utils/ErrorResponse");
const Logger = require("./api/utils/Logger");

// Middlewares globais
const JwtMiddleware = require("./api/middleware/JwtMiddleware");

// Middlewares de validação de cada entidade
const AlunoMiddleware = require("./api/middleware/AlunoMiddleware");
const MatriculaMiddleware = require("./api/middleware/MatriculaMiddleware");
const PagamentoMiddleware = require("./api/middleware/PagamentoMiddleware");

// Controllers
const AlunoController = require("./api/controllers/AlunoController");
const MatriculaController = require("./api/controllers/MatriculaController");
const PagamentoController = require("./api/controllers/PagamentoController");
const TreinoController = require("./api/controllers/TreinoController");

// Services
const AlunoService = require("./api/services/AlunoService");
const MatriculaService = require("./api/services/MatriculaService");
const PagamentoService = require("./api/services/PagamentoService");
const TreinoService = require("./api/services/TreinoService");

// DAOs
const AlunoDAO = require("./api/dao/AlunoDAO");
const MatriculaDAO = require("./api/dao/MatriculaDAO");
const PagamentoDAO = require("./api/dao/PagamentoDAO");

// Routers
const AlunoRouter = require("./api/routes/AlunoRouter");
const MatriculaRouter = require("./api/routes/MatriculaRouter");
const PagamentoRouter = require("./api/routes/PagamentoRouter");
const TreinoRouter = require("./api/routes/TreinoRouter");

// Banco de dados (pool único de conexões MySQL)
const MysqlDatabase = require("./api/database/MysqlDatabase");

/**
 * Classe principal do servidor Express.
 *
 * Monta a arquitetura em camadas pedida em aula:
 * Router -> Middleware -> Controller -> Service -> DAO -> Banco
 *
 * Entidades: Aluno, Matricula, Pagamento e Treino.
 */
module.exports = class Server {
    // 🔒 Atributos privados (encapsulamento)
    #porta;
    #app;
    #database;

    #jwtMiddleware;

    #alunoDAO;
    #matriculaDAO;
    #pagamentoDAO;

    #alunoService;
    #matriculaService;
    #pagamentoService;
    #treinoService;

    #alunoController;
    #matriculaController;
    #pagamentoController;
    #treinoController;

    constructor(porta) {
        console.log("⬆️  Server.constructor()");
        this.#porta = porta ?? 8080;
    }

    /**
     * Inicializa o Express, o pool do MySQL e os módulos da aplicação.
     */
    init = async () => {
        console.log("⬆️  Server.init()");
        this.#app = express();
        this.#app.use(express.json());
        // O frontend é servido na raiz: http://localhost:8080/Login.html
        this.#app.use(express.static(path.join(__dirname, "static")));
        this.#app.use(cors({ origin: "*" }));

        this.#jwtMiddleware = new JwtMiddleware();

        // 🔹 Pool global de conexões MySQL (configuração do XAMPP)
        this.#database = new MysqlDatabase({
            host: process.env.DB_HOST ?? "localhost",
            user: process.env.DB_USER ?? "root",
            password: process.env.DB_PASSWORD ?? "",
            database: process.env.DB_NAME ?? "academia_db",
            port: 3306,
            waitForConnections: true,
            connectionLimit: 50,
            queueLimit: 10
        });

        await this.#database.connect();

        // 🔹 DAOs compartilhados entre os services (injeção de dependência)
        this.#alunoDAO = new AlunoDAO(this.#database);
        this.#matriculaDAO = new MatriculaDAO(this.#database);
        this.#pagamentoDAO = new PagamentoDAO(this.#database);

        // 🔹 Services
        this.#alunoService = new AlunoService(this.#alunoDAO, this.#matriculaDAO);
        this.#matriculaService = new MatriculaService(
            this.#matriculaDAO,
            this.#alunoDAO,
            this.#pagamentoDAO
        );
        this.#pagamentoService = new PagamentoService(this.#pagamentoDAO, this.#matriculaDAO);
        this.#treinoService = new TreinoService();

        // 🔹 Controllers
        this.#alunoController = new AlunoController(this.#alunoService);
        this.#matriculaController = new MatriculaController(this.#matriculaService);
        this.#pagamentoController = new PagamentoController(this.#pagamentoService);
        this.#treinoController = new TreinoController(this.#treinoService);

        this.beforeRouting();
        this.setupAluno();
        this.setupMatricula();
        this.setupPagamento();
        this.setupTreinos();
        this.setupErrorMiddleware();
    }

    /**
     * Módulo Aluno: autenticação e CRUD em /api/v1/auth e /api/v1/alunos.
     */
    setupAluno = () => {
        console.log("⬆️  Server.setupAluno()");

        const router = new AlunoRouter(
            this.#jwtMiddleware,
            new AlunoMiddleware(),
            this.#alunoController
        );

        this.#app.use("/api/v1/auth", router.createAuthRoutes());
        this.#app.use("/api/v1/alunos", router.createRoutes());
    }

    /**
     * Módulo Matrícula: CRUD + /minhas em /api/v1/matriculas
     */
    setupMatricula = () => {
        console.log("⬆️  Server.setupMatricula()");

        const router = new MatriculaRouter(
            this.#jwtMiddleware,
            new MatriculaMiddleware(),
            this.#matriculaController
        );

        this.#app.use("/api/v1/matriculas", router.createRoutes());
    }

    /**
     * Módulo Pagamento: CRUD + /minhas + /matricula/:id em /api/v1/pagamentos
     */
    setupPagamento = () => {
        console.log("⬆️  Server.setupPagamento()");

        const router = new PagamentoRouter(
            this.#jwtMiddleware,
            new PagamentoMiddleware(),
            this.#pagamentoController
        );

        this.#app.use("/api/v1/pagamentos", router.createRoutes());
    }

    /** Módulo público de treinos em /api/v1/treinos. */
    setupTreinos = () => {
        console.log("⬆️  Server.setupTreinos()");

        const router = new TreinoRouter(this.#treinoController);
        this.#app.use("/api/v1/treinos", router.createRoutes());
    }

    /**
     * Middleware executado antes de todas as rotas (apenas separador visual no console).
     */
    beforeRouting = () => {
        this.#app.use((request, response, next) => {
            console.log("------------------------------------------------------------------");
            next();
        });
    }

    /**
     * Tratamento global de erros: ErrorResponse -> status próprio, resto -> 500.
     */
    setupErrorMiddleware = () => {
        console.log("⬆️  Server.setupErrorMiddleware()");
        this.#app.use((error, request, response, next) => {
            if (error instanceof ErrorResponse) {
                return response.status(error.httpCode).json({
                    success: false,
                    message: error.message,
                    error: error.error
                });
            }

            const mensagem = "Ocorreu um erro interno no servidor";
            const detalhes = {
                message: error.message || "Erro interno",
                code: error.code,
                stack: error.stack
            };
            console.error("❌ Erro capturado:", error);
            Logger.log({ success: false, message: mensagem, error: detalhes });
            return response.status(500).json({
                success: false,
                message: mensagem
            });
        });
    }

    run = () => {
        this.#app.listen(this.#porta, () => {
            console.log(`🚀 API Node rodando em http://localhost:${this.#porta}/Login.html`);
        });
    }
}
