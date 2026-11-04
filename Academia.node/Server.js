const path = require("path");
const express = require("express");
const cors = require("cors");

const ErrorResponse = require("./api/utils/ErrorResponse");
const Logger = require("./api/utils/Logger");
const { MODALIDADES } = require("./api/domain/Modalidades");

// Middlewares globais
const JwtMiddleware = require("./api/middleware/JwtMiddleware");
const RoleMiddleware = require("./api/middleware/RoleMiddleware");

// Middlewares de validação de cada entidade
const AuthMiddleware = require("./api/middleware/AuthMiddleware");
const AlunoMiddleware = require("./api/middleware/AlunoMiddleware");
const ProfessorMiddleware = require("./api/middleware/ProfessorMiddleware");
const MatriculaMiddleware = require("./api/middleware/MatriculaMiddleware");

// Controllers
const AuthController = require("./api/controllers/AuthController");
const AlunoController = require("./api/controllers/AlunoController");
const ProfessorController = require("./api/controllers/ProfessorController");
const MatriculaController = require("./api/controllers/MatriculaController");

// Services
const AuthService = require("./api/services/AuthService");
const AlunoService = require("./api/services/AlunoService");
const ProfessorService = require("./api/services/ProfessorService");
const MatriculaService = require("./api/services/MatriculaService");

// DAOs
const AlunoDAO = require("./api/dao/AlunoDAO");
const ProfessorDAO = require("./api/dao/ProfessorDAO");
const MatriculaDAO = require("./api/dao/MatriculaDAO");

// Routers
const AuthRouter = require("./api/routes/AuthRouter");
const AlunoRouter = require("./api/routes/AlunoRouter");
const ProfessorRouter = require("./api/routes/ProfessorRouter");
const MatriculaRouter = require("./api/routes/MatriculaRouter");

// Banco de dados (pool único de conexões MySQL)
const MysqlDatabase = require("./api/database/MysqlDatabase");

/**
 * Classe principal do servidor Express.
 *
 * Monta a arquitetura em camadas pedida em aula:
 * Router -> Middleware -> Controller -> Service -> DAO -> Banco
 *
 * Entidades: Aluno, Professor (no lugar do antigo Plano) e Matricula.
 */
module.exports = class Server {
    // 🔒 Atributos privados (encapsulamento)
    #porta;
    #app;
    #database;

    #jwtMiddleware;
    #roleMiddleware;

    #alunoDAO;
    #professorDAO;
    #matriculaDAO;

    #authService;
    #alunoService;
    #professorService;
    #matriculaService;

    #authController;
    #alunoController;
    #professorController;
    #matriculaController;

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
        this.#roleMiddleware = new RoleMiddleware();

        // 🔹 Pool global de conexões MySQL (configuração do XAMPP)
        this.#database = new MysqlDatabase({
            host: process.env.DB_HOST ?? "localhost",
            user: process.env.DB_USER ?? "root",
            password: process.env.DB_PASSWORD ?? "",
            database: process.env.DB_NAME ?? "academia_db",
            port: Number(process.env.DB_PORT ?? 3306),
            waitForConnections: true,
            connectionLimit: 50,
            queueLimit: 10
        });

        await this.#database.connect();

        // 🔹 DAOs compartilhados entre os services (injeção de dependência)
        this.#alunoDAO = new AlunoDAO(this.#database);
        this.#professorDAO = new ProfessorDAO(this.#database);
        this.#matriculaDAO = new MatriculaDAO(this.#database);

        // 🔹 Services
        this.#alunoService = new AlunoService(this.#alunoDAO, this.#matriculaDAO);
        this.#professorService = new ProfessorService(this.#professorDAO, this.#matriculaDAO);
        this.#matriculaService = new MatriculaService(
            this.#matriculaDAO,
            this.#alunoDAO,
            this.#professorDAO
        );
        this.#authService = new AuthService(
            this.#alunoDAO,
            this.#professorDAO,
            this.#alunoService,
            this.#professorService
        );

        // 🔹 Controllers
        this.#authController = new AuthController(this.#authService);
        this.#alunoController = new AlunoController(this.#alunoService);
        this.#professorController = new ProfessorController(this.#professorService);
        this.#matriculaController = new MatriculaController(this.#matriculaService);

        this.beforeRouting();
        this.setupAuth();
        this.setupAluno();
        this.setupProfessor();
        this.setupMatricula();
        this.setupModalidades();
        this.setupErrorMiddleware();
    }

    /**
     * Módulo Auth: login e cadastro dos dois tipos de usuário em /api/v1/auth
     */
    setupAuth = () => {
        console.log("⬆️  Server.setupAuth()");

        const router = new AuthRouter(
            this.#jwtMiddleware,
            new AuthMiddleware(),
            this.#authController
        );

        this.#app.use("/api/v1/auth", router.createRoutes());
    }

    /**
     * Módulo Aluno: CRUD em /api/v1/alunos
     */
    setupAluno = () => {
        console.log("⬆️  Server.setupAluno()");

        const router = new AlunoRouter(
            this.#jwtMiddleware,
            new AlunoMiddleware(),
            this.#alunoController
        );

        this.#app.use("/api/v1/alunos", router.createRoutes());
    }

    /**
     * Módulo Professor: CRUD + /me em /api/v1/professores
     */
    setupProfessor = () => {
        console.log("⬆️  Server.setupProfessor()");

        const router = new ProfessorRouter(
            this.#jwtMiddleware,
            this.#roleMiddleware,
            new ProfessorMiddleware(),
            this.#professorController
        );

        this.#app.use("/api/v1/professores", router.createRoutes());
    }

    /**
     * Módulo Matrícula: CRUD + /minhas + /meus-alunos em /api/v1/matriculas
     */
    setupMatricula = () => {
        console.log("⬆️  Server.setupMatricula()");

        const router = new MatriculaRouter(
            this.#jwtMiddleware,
            this.#roleMiddleware,
            new MatriculaMiddleware(),
            this.#matriculaController
        );

        this.#app.use("/api/v1/matriculas", router.createRoutes());
    }

    /**
     * Lista as modalidades e os professores que as lecionam.
     * Rota pública: é usada também na tela de cadastro do professor.
     */
    setupModalidades = () => {
        console.log("⬆️  Server.setupModalidades()");

        this.#app.get("/api/v1/modalidades", async (request, response, next) => {
            try {
                const professores = await this.#professorService.findAll();

                const modalidades = MODALIDADES.map((nome) => ({
                    nome,
                    professores: professores
                        .filter((professor) => professor.modalidades.includes(nome))
                        .map((professor) => ({
                            idProfessor: professor.idProfessor,
                            nomeProfessor: professor.nomeProfessor
                        }))
                }));

                return response.status(200).send({
                    success: true,
                    message: "Busca realizada com sucesso",
                    data: { modalidades }
                });
            } catch (error) {
                next(error);
            }
        });
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

            const resposta = {
                success: false,
                message: "Ocorreu um erro interno no servidor",
                data: { stack: error.stack },
                error: { message: error.message || "Erro interno", code: error.code }
            };
            console.error("❌ Erro capturado:", resposta);
            Logger.log(resposta);
            return response.status(500).json(resposta);
        });
    }

    run = () => {
        this.#app.listen(this.#porta, () => {
            console.log(`🚀 API Node rodando em http://localhost:${this.#porta}/Login.html`);
        });
    }
}
