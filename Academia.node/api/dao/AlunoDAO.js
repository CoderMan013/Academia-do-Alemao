const bcrypt = require("bcrypt");
const Aluno = require("../models/Aluno");

/**
 * DAO da tabela Aluno.
 *
 * Responsabilidades extras:
 * - Criptografar a senha com bcrypt antes de gravar (create/update);
 * - Autenticar o aluno no login (comparação com bcrypt.compare).
 * A senha nunca é devolvida nas consultas de leitura.
 *
 * O DAO é a única camada deste módulo que conhece SQL. Os valores da query
 * são enviados como parâmetros para não concatenar dados do usuário ao SQL.
 */
module.exports = class AlunoDAO {
    // Database é fornecido pelo Server por injeção de dependência.
    #database;

    constructor(databaseInstance) {
        console.log("⬆️  AlunoDAO.constructor()");
        this.#database = databaseInstance;
    }

    /** @param {Aluno} objAluno @returns {Promise<number>} */
    create = async (objAluno) => {
        console.log("🟢 AlunoDAO.create()");

        // Bcrypt transforma a senha em hash com custo 12 antes de persistir;
        // a senha em texto puro nunca é incluída no INSERT.
        const senhaHash = await bcrypt.hash(objAluno.senha, 12);

        const SQL = "INSERT INTO Aluno (nomeAluno, email, senha, ativo) VALUES (?, ?, ?, ?);";
        const params = [objAluno.nomeAluno, objAluno.email, senhaHash, objAluno.ativo ?? 1];

        // O placeholder ? mantém os valores separados da instrução SQL.
        const pool = await this.#database.getPool();
        const [resultado] = await pool.execute(SQL, params);

        if (!resultado.insertId) {
            throw new Error("Falha ao inserir aluno");
        }

        return resultado.insertId;
    };

    /** @param {Aluno} objAluno @returns {Promise<boolean>} */
    delete = async (objAluno) => {
        console.log("🟢 AlunoDAO.delete()");

        // O Service já verificou as regras de negócio; aqui o DAO executa a
        // exclusão pelo ID e informa se alguma linha foi removida.
        const SQL = "DELETE FROM Aluno WHERE idAluno = ?;";

        const pool = await this.#database.getPool();
        const [resultado] = await pool.execute(SQL, [objAluno.idAluno]);

        return resultado.affectedRows > 0;
    };

    /**
     * Atualiza o aluno. Se a senha vier preenchida, é criptografada de novo.
     * @param {Aluno} objAluno
     * @returns {Promise<boolean>}
     */
    update = async (objAluno) => {
        console.log("🟢 AlunoDAO.update()");

        // Há duas queries para não sobrescrever a senha com vazio/ausente:
        // apenas a atualização que recebeu senha nova muda a coluna senha.
        let SQL;
        let params;

        if (objAluno.senha) {
            const senhaHash = await bcrypt.hash(objAluno.senha, 12);
            SQL = "UPDATE Aluno SET nomeAluno = ?, email = ?, senha = ?, ativo = ? WHERE idAluno = ?;";
            params = [
                objAluno.nomeAluno,
                objAluno.email,
                senhaHash,
                objAluno.ativo,
                objAluno.idAluno
            ];
        } else {
            SQL = "UPDATE Aluno SET nomeAluno = ?, email = ?, ativo = ? WHERE idAluno = ?;";
            params = [objAluno.nomeAluno, objAluno.email, objAluno.ativo, objAluno.idAluno];
        }

        // Tanto a versão com senha quanto sem senha usa parâmetros SQL.
        const pool = await this.#database.getPool();
        const [resultado] = await pool.execute(SQL, params);

        return resultado.affectedRows > 0;
    };

    /** @returns {Promise<Array>} */
    findAll = async () => {
        console.log("🟢 AlunoDAO.findAll()");

        // A senha é intencionalmente omitida do SELECT de listagem.
        const SQL = "SELECT idAluno, nomeAluno, email, ativo FROM Aluno ORDER BY idAluno;";

        const pool = await this.#database.getPool();
        const [resultado] = await pool.execute(SQL);

        return resultado;
    };

    /** @param {number} idAluno @returns {Promise<object|null>} */
    findById = async (idAluno) => {
        console.log("🟢 AlunoDAO.findById()");

        // Reutiliza a busca genérica e converte a lista em um único objeto ou null.
        const resultado = await this.findByField("idAluno", idAluno);
        return resultado[0] || null;
    };

    /**
     * @param {string} field - idAluno | nomeAluno | email | ativo
     * @param {*} value
     * @returns {Promise<Array>}
     */
    findByField = async (field, value) => {
        console.log(`🟢 AlunoDAO.findByField() - Campo: ${field}, Valor: ${value}`);

        // Nome de coluna não pode ser parametrizado com ?; por isso é escolhido
        // apenas de uma lista fixa. O valor da busca continua parametrizado.
        const allowedFields = ["idAluno", "nomeAluno", "email", "ativo"];
        if (!allowedFields.includes(field)) {
            throw new Error(`Campo inválido para busca: ${field}`);
        }

        const SQL = `SELECT idAluno, nomeAluno, email, ativo FROM Aluno WHERE ${field} = ?;`;

        const pool = await this.#database.getPool();
        const [resultado] = await pool.execute(SQL, [value]);

        return resultado || [];
    };

    /**
     * Verifica e-mail + senha e devolve o aluno autenticado (sem a senha).
     * @param {string} email
     * @param {string} senha
     * @returns {Promise<object|null>}
     */
    login = async (email, senha) => {
        console.log("🟢 AlunoDAO.login()");

        // Só esta consulta lê o hash de senha, necessário para a comparação.
        // O resultado retornado ao Service abaixo contém apenas dados públicos.
        const SQL = "SELECT idAluno, nomeAluno, email, senha, ativo FROM Aluno WHERE email = ?;";

        const pool = await this.#database.getPool();
        const [resultado] = await pool.execute(SQL, [email]);

        if (resultado.length !== 1) {
            console.log("❌ Aluno não encontrado");
            return null;
        }

        const alunoDB = resultado[0];
        // Compara a senha digitada com o hash guardado; nunca compara ou grava
        // senhas em texto puro no banco.
        const senhaValida = await bcrypt.compare(senha, alunoDB.senha);

        if (!senhaValida) {
            console.log("❌ Senha inválida");
            return null;
        }

        // Contas desativadas não podem iniciar sessão, mesmo com senha correta.
        if (Number(alunoDB.ativo) !== 1) {
            console.log("❌ Aluno inativo");
            return null;
        }

        return {
            idAluno: alunoDB.idAluno,
            nomeAluno: alunoDB.nomeAluno,
            email: alunoDB.email,
            ativo: Number(alunoDB.ativo)
        };
    };

    validarSenha = async (idAluno, senha) => {
        console.log("🟢 AlunoDAO.validarSenha()");

        // Revalida a senha atual para a operação de perfil sem expor o hash
        // para o Service ou para o cliente.
        const SQL = "SELECT senha FROM Aluno WHERE idAluno = ?;";
        const pool = await this.#database.getPool();
        const [resultado] = await pool.execute(SQL, [idAluno]);

        if (resultado.length !== 1) return false;
        return await bcrypt.compare(senha, resultado[0].senha);
    };
};
