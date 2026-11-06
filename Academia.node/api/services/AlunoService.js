const Aluno = require("../models/Aluno");
const ErrorResponse = require("../utils/ErrorResponse");
const MeuTokenJWT = require("../http/MeuTokenJWT");
const validar = require("../utils/Validar");

/**
 * Regras de negócio de Aluno, incluindo autenticação (JWT).
 *
 * Recebe AlunoDAO e MatriculaDAO por injeção de dependência:
 * - AlunoDAO: CRUD + autenticação;
 * - MatriculaDAO: impede excluir aluno com matrícula.
 *
 * Exemplo de fluxo: o Controller chama login(), o Service normaliza e verifica
 * as credenciais, o DAO consulta o banco e compara o hash, e o Service monta
 * a resposta autenticada. É nesta camada que se coordenam Model e DAOs.
 */
module.exports = class AlunoService {
    // O Service não cria conexão por conta própria: recebe os DAOs necessários.
    #alunoDAO;
    #matriculaDAO;

    constructor(alunoDAODependency, matriculaDAODependency) {
        console.log("⬆️  AlunoService.constructor()");
        this.#alunoDAO = alunoDAODependency;
        this.#matriculaDAO = matriculaDAODependency;
    }

    /**
     * Autentica o aluno.
     * @param {{email: string, senha: string}} credenciais
     * @returns {Promise<{tipo: string, usuario: object, token: string}>}
     */
    login = async (credenciais) => {
        console.log("🟣 AlunoService.login()");

        // Normalizar e-mail evita diferenças por espaços ou maiúsculas; senha
        // não é normalizada, pois deve ser comparada exatamente como cadastrada.
        const email = String(credenciais?.email ?? "").trim().toLowerCase();
        const senha = String(credenciais?.senha ?? "");

        if (!email || !senha) {
            throw new ErrorResponse(400, "Erro na validação de dados", {
                message: "Informe 'email' e 'senha' para efetuar o login!"
            });
        }

        // O DAO devolve null se e-mail/senha não corresponderem ou se a conta
        // estiver inativa. O Service converte isso em erro de autenticação HTTP.
        const aluno = await this.#alunoDAO.login(email, senha);
        if (!aluno) {
            throw new ErrorResponse(401, "E-mail ou senha inválidos", {
                message: "Não foi possível autenticar com as credenciais informadas"
            });
        }

        // Uma autenticação bem-sucedida recebe token JWT e dados públicos.
        return this.#montarResposta(aluno);
    }

    alterarConta = async (idAluno, dados) => {
        console.log("🟣 AlunoService.alterarConta()");

        // O ID foi extraído do token pelo Controller; busca os dados atuais para
        // preservar nome/estado e não confiar em campos de identidade do cliente.
        const atual = await this.findById(idAluno);
        if (!atual) {
            throw new ErrorResponse(404, "Aluno não encontrado", {
                message: "Não foi possível encontrar a conta autenticada."
            });
        }

        // Exigir a senha atual protege a conta mesmo que o usuário deixe a sessão aberta.
        if (!(await this.#alunoDAO.validarSenha(atual.idAluno, dados.senhaAtual))) {
            throw new ErrorResponse(401, "Senha atual inválida", {
                message: "Confira sua senha atual e tente novamente."
            });
        }

        // Usar o Model aplica as validações de e-mail e, se presente, da senha nova.
        const aluno = new Aluno();
        validar(() => {
            aluno.idAluno = atual.idAluno;
            aluno.nomeAluno = atual.nomeAluno;
            aluno.email = dados.email;
            aluno.ativo = atual.ativo;
            if (dados.novaSenha) aluno.senha = dados.novaSenha;
        });

        // O e-mail pode permanecer igual ao do próprio aluno, mas não pode
        // pertencer a nenhuma outra conta.
        const existentes = await this.#alunoDAO.findByField("email", aluno.email);
        const outroAluno = existentes.find((item) => Number(item.idAluno) !== aluno.idAluno);
        if (outroAluno) {
            throw new ErrorResponse(400, "E-mail já cadastrado", {
                message: `O e-mail ${aluno.email} já está cadastrado`
            });
        }

        // Se a pessoa confirmou a senha mas não alterou nenhum dado, evita um
        // UPDATE sem mudanças (o MySQL pode reportar zero linhas afetadas).
        if (aluno.email === String(atual.email).trim().toLowerCase() && !aluno.senha) {
            return this.#montarResposta(atual);
        }

        // O DAO persiste os campos e cria hash novo somente se a senha mudou.
        const atualizou = await this.#alunoDAO.update(aluno);
        if (!atualizou) {
            throw new ErrorResponse(404, "Aluno não encontrado", {
                message: "Não foi possível atualizar a conta autenticada."
            });
        }

        // Gera token com o e-mail atualizado e devolve somente dados seguros.
        return this.#montarResposta({
            idAluno: aluno.idAluno,
            nomeAluno: aluno.nomeAluno,
            email: aluno.email,
            ativo: aluno.ativo
        });
    }

    /**
     * Cria a conta do aluno e devolve o token de autenticação.
     * @param {{nome: string, email: string, senha: string}} dados
     * @returns {Promise<{tipo: string, usuario: object, token: string}>}
     */
    registrar = async (dados) => {
        console.log("🟣 AlunoService.registrar()");

        // Cadastro tem nomes de campo próprios; converte e normaliza antes
        // de chamar a operação compartilhada de criação.
        const nome = String(dados?.nome ?? "").trim();
        const email = String(dados?.email ?? "").trim().toLowerCase();
        const senha = String(dados?.senha ?? "");

        if (!nome || !email || !senha) {
            throw new ErrorResponse(400, "Erro na validação de dados", {
                message: "Informe 'nome', 'email' e 'senha'!"
            });
        }

        // Verifica unicidade antes de inserir para devolver uma mensagem clara.
        const existentes = await this.#alunoDAO.findByField("email", email);
        if (existentes.length > 0) {
            throw new ErrorResponse(400, "E-mail já cadastrado", {
                message: `O e-mail ${email} já está cadastrado`
            });
        }

        // createAluno valida o Model e o DAO grava a senha em bcrypt.
        await this.createAluno({
            nomeAluno: nome,
            email,
            senha,
            ativo: 1
        });

        // Ao terminar, autentica a conta recém-criada para devolver a mesma
        // resposta que o fluxo normal de login (incluindo o token).
        return await this.login({ email, senha });
    }

    /**
     * Constrói a resposta pública da autenticação. As claims incluem o ID e o
     * papel necessários às rotas protegidas; a senha não entra no token.
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

    /**
     * Cria um aluno.
     * Regras: campos válidos (model) e e-mail único.
     * @param {object} alunoJson
     * @returns {Promise<number>}
     */
    createAluno = async (alunoJson) => {
        console.log("🟣 AlunoService.createAluno()");

        // Atribuir pelo Model executa todas as validações de domínio antes
        // de qualquer tentativa de gravação no banco.
        const aluno = new Aluno();
        validar(() => {
            aluno.nomeAluno = alunoJson.nomeAluno;
            aluno.email = alunoJson.email;
            aluno.senha = alunoJson.senha;
            aluno.ativo = alunoJson.ativo ?? 1;
        });

        // A restrição também existe no banco, mas esta checagem permite uma
        // mensagem de negócio compreensível antes de chegar ao erro SQL.
        const existentes = await this.#alunoDAO.findByField("email", aluno.email);
        if (existentes.length > 0) {
            throw new ErrorResponse(400, "Aluno já existe", {
                message: `O e-mail ${aluno.email} já está cadastrado`
            });
        }

        // A persistência e o hash da senha são responsabilidade do DAO.
        return await this.#alunoDAO.create(aluno);
    }

    /** @returns {Promise<Array>} */
    findAll = async () => {
        console.log("🟣 AlunoService.findAll()");
        // A listagem retorna somente os campos públicos definidos pelo DAO.
        return await this.#alunoDAO.findAll();
    }

    /** @param {number} idAluno @returns {Promise<object|null>} */
    findById = async (idAluno) => {
        console.log("🟣 AlunoService.findById()");

        // Passa o ID pelo Model para rejeitar valores inválidos antes da consulta.
        const aluno = new Aluno();
        validar(() => { aluno.idAluno = idAluno; });

        return await this.#alunoDAO.findById(aluno.idAluno);
    }

    /**
     * Atualiza um aluno (e-mail não pode repetir o de outro aluno).
     * @param {number} idAluno
     * @param {object} alunoJson
     * @returns {Promise<boolean>}
     */
    updateAluno = async (idAluno, alunoJson) => {
        console.log("🟣 AlunoService.updateAluno()");

        const aluno = new Aluno();
        // Constrói um objeto validado com os campos permitidos para atualização.
        validar(() => {
            aluno.idAluno = idAluno;
            aluno.nomeAluno = alunoJson.nomeAluno;
            aluno.email = alunoJson.email;
            aluno.ativo = alunoJson.ativo ?? 1;
        });

        // Desconsidera o próprio registro ao verificar se outro aluno usa o e-mail.
        const existentes = await this.#alunoDAO.findByField("email", aluno.email);
        const outroAluno = existentes.find((item) => Number(item.idAluno) !== aluno.idAluno);
        if (outroAluno) {
            throw new ErrorResponse(400, "Aluno já existe", {
                message: `O e-mail ${aluno.email} já está cadastrado`
            });
        }

        // Senha é opcional no update: se vier preenchida, o Model valida e o DAO
        // gera um novo hash; se vier vazia/ausente, a senha armazenada é mantida.
        if (alunoJson.senha !== undefined && alunoJson.senha !== null && String(alunoJson.senha).trim() !== "") {
            validar(() => { aluno.senha = alunoJson.senha; });
        }

        return await this.#alunoDAO.update(aluno);
    }

    /**
     * Exclui um aluno somente se não houver matrícula vinculada.
     * @param {number} idAluno
     * @returns {Promise<boolean>}
     */
    deleteAluno = async (idAluno) => {
        console.log("🟣 AlunoService.deleteAluno()");

        const aluno = new Aluno();
        validar(() => { aluno.idAluno = idAluno; });

        // Antes de excluir, consulta a relação com Matrícula para evitar remover
        // um aluno ainda utilizado pelo sistema e respeitar a FK do banco.
        const totalMatriculas = await this.#matriculaDAO.countByAluno(aluno.idAluno);
        if (totalMatriculas > 0) {
            throw new ErrorResponse(400, "Aluno em uso", {
                message: `Não é possível excluir: existem ${totalMatriculas} matrícula(s) deste aluno`
            });
        }

        return await this.#alunoDAO.delete(aluno);
    }
}
