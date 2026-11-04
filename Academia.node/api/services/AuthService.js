const MeuTokenJWT = require("../http/MeuTokenJWT");
const ErrorResponse = require("../utils/ErrorResponse");

/**
 * Regras de autenticação dos dois tipos de usuário.
 *
 * - Aluno e Professor têm e-mail/senha em tabelas diferentes, então o login
 *   procura primeiro no Aluno e depois no Professor;
 * - O token guarda o papel (role) e o id do usuário, e é isso que permite a
 *   API limitar cada tela ao que o usuário pode fazer.
 */
module.exports = class AuthService {
    #alunoDAO;
    #professorDAO;
    #alunoService;
    #professorService;

    constructor(alunoDAODependency, professorDAODependency, alunoServiceDependency, professorServiceDependency) {
        console.log("⬆️  AuthService.constructor()");
        this.#alunoDAO = alunoDAODependency;
        this.#professorDAO = professorDAODependency;
        this.#alunoService = alunoServiceDependency;
        this.#professorService = professorServiceDependency;
    }

    /**
     * Autentica aluno ou professor.
     * @param {{email: string, senha: string}} credenciais
     * @returns {Promise<{tipo: string, usuario: object, token: string}>}
     */
    login = async (credenciais) => {
        console.log("🟣 AuthService.login()");

        const email = String(credenciais?.email ?? "").trim().toLowerCase();
        const senha = String(credenciais?.senha ?? "");

        if (!email || !senha) {
            throw new ErrorResponse(400, "Erro na validação de dados", {
                message: "Informe 'email' e 'senha' para efetuar o login!"
            });
        }

        const aluno = await this.#alunoDAO.login(email, senha);
        if (aluno) {
            return this.#montarResposta("aluno", aluno);
        }

        const professor = await this.#professorDAO.login(email, senha);
        if (professor) {
            return this.#montarResposta("professor", professor);
        }

        throw new ErrorResponse(401, "E-mail ou senha inválidos", {
            message: "Não foi possível autenticar com as credenciais informadas"
        });
    };

    /**
     * Cria a conta (1ª tela escolhe o tipo, 2ª tela manda o resto) e já
     * devolve o token, para o usuário cair direto no painel.
     *
     * @param {object} dados - { tipo, nome, email, senha, modalidades? }
     * @returns {Promise<{tipo: string, usuario: object, token: string}>}
     */
    registrar = async (dados) => {
        console.log("🟣 AuthService.registrar()");

        const tipo = String(dados?.tipo ?? "").trim().toLowerCase();
        if (!["aluno", "professor"].includes(tipo)) {
            throw new ErrorResponse(400, "Erro na validação de dados", {
                message: "O campo 'tipo' deve ser 'aluno' ou 'professor'!"
            });
        }

        const nome = String(dados?.nome ?? "").trim();
        const email = String(dados?.email ?? "").trim().toLowerCase();
        const senha = String(dados?.senha ?? "");

        if (!nome || !email || !senha) {
            throw new ErrorResponse(400, "Erro na validação de dados", {
                message: "Informe 'nome', 'email' e 'senha'!"
            });
        }

        // O e-mail é a credencial de login: não pode existir nos dois tipos.
        const [alunos, professores] = await Promise.all([
            this.#alunoDAO.findByField("email", email),
            this.#professorDAO.findByField("email", email)
        ]);

        if (alunos.length > 0 || professores.length > 0) {
            throw new ErrorResponse(400, "E-mail já cadastrado", {
                message: `O e-mail ${email} já está cadastrado`
            });
        }

        if (tipo === "aluno") {
            await this.#alunoService.createAluno({
                nomeAluno: nome,
                email,
                senha,
                ativo: 1
            });
        } else {
            await this.#professorService.createProfessor({
                nomeProfessor: nome,
                email,
                senha,
                modalidades: dados.modalidades ?? [],
                ativo: 1
            });
        }

        return await this.login({ email, senha });
    };

    /**
     * Monta o payload devolvido ao frontend e o token JWT.
     * @param {string} tipo
     * @param {object} usuario
     */
    #montarResposta = (tipo, usuario) => {
        const ehAluno = tipo === "aluno";

        const nome = ehAluno ? usuario.nomeAluno : usuario.nomeProfessor;
        const idUsuario = ehAluno ? usuario.idAluno : usuario.idProfessor;

        const claims = {
            email: usuario.email,
            role: tipo,
            name: nome,
            idUsuario
        };

        if (ehAluno) {
            claims.idAluno = usuario.idAluno;
        } else {
            claims.idProfessor = usuario.idProfessor;
        }

        const token = new MeuTokenJWT().gerarToken(claims);

        return { tipo, usuario, token };
    };
};
