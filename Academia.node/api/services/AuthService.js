const MeuTokenJWT = require("../http/MeuTokenJWT");
const ErrorResponse = require("../utils/ErrorResponse");

/**
 * Regras de autenticação.
 *
 * O sistema tem um único papel logado: o aluno. A conta é criada pelo
 * cadastro e o token guarda o id do aluno, que é o que autoriza o CRUD
 * das próprias matrículas e dos próprios pagamentos.
 */
module.exports = class AuthService {
    #alunoDAO;
    #alunoService;

    constructor(alunoDAODependency, alunoServiceDependency) {
        console.log("⬆️  AuthService.constructor()");
        this.#alunoDAO = alunoDAODependency;
        this.#alunoService = alunoServiceDependency;
    }

    /**
     * Autentica o aluno.
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
        if (!aluno) {
            throw new ErrorResponse(401, "E-mail ou senha inválidos", {
                message: "Não foi possível autenticar com as credenciais informadas"
            });
        }

        return this.#montarResposta(aluno);
    };

    /**
     * Cria a conta do aluno e já devolve o token, para cair direto no painel.
     * @param {object} dados - { nome, email, senha }
     * @returns {Promise<{tipo: string, usuario: object, token: string}>}
     */
    registrar = async (dados) => {
        console.log("🟣 AuthService.registrar()");

        const nome = String(dados?.nome ?? "").trim();
        const email = String(dados?.email ?? "").trim().toLowerCase();
        const senha = String(dados?.senha ?? "");

        if (!nome || !email || !senha) {
            throw new ErrorResponse(400, "Erro na validação de dados", {
                message: "Informe 'nome', 'email' e 'senha'!"
            });
        }

        const existentes = await this.#alunoDAO.findByField("email", email);
        if (existentes.length > 0) {
            throw new ErrorResponse(400, "E-mail já cadastrado", {
                message: `O e-mail ${email} já está cadastrado`
            });
        }

        await this.#alunoService.createAluno({
            nomeAluno: nome,
            email,
            senha,
            ativo: 1
        });

        return await this.login({ email, senha });
    };

    /**
     * Monta o payload devolvido ao frontend e o token JWT.
     * @param {object} usuario
     */
    #montarResposta = (usuario) => {
        const claims = {
            email: usuario.email,
            role: "aluno",
            name: usuario.nomeAluno,
            idUsuario: usuario.idAluno,
            idAluno: usuario.idAluno
        };

        const token = new MeuTokenJWT().gerarToken(claims);

        return { tipo: "aluno", usuario, token };
    };
};
