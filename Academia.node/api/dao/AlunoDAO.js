const bcrypt = require("bcrypt");
const Aluno = require("../models/Aluno");

/**
 * DAO da tabela Aluno.
 *
 * Responsabilidades extras:
 * - Criptografar a senha com bcrypt antes de gravar (create/update);
 * - Autenticar o aluno no login (comparação com bcrypt.compare).
 * A senha nunca é devolvida nas consultas de leitura.
 */
module.exports = class AlunoDAO {
    #database;

    constructor(databaseInstance) {
        console.log("⬆️  AlunoDAO.constructor()");
        this.#database = databaseInstance;
    }

    /** @param {Aluno} objAluno @returns {Promise<number>} */
    create = async (objAluno) => {
        console.log("🟢 AlunoDAO.create()");

        const senhaHash = await bcrypt.hash(objAluno.senha, 12);

        const SQL = "INSERT INTO Aluno (nomeAluno, email, senha, ativo) VALUES (?, ?, ?, ?);";
        const params = [objAluno.nomeAluno, objAluno.email, senhaHash, objAluno.ativo ?? 1];

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

        const pool = await this.#database.getPool();
        const [resultado] = await pool.execute(SQL, params);

        return resultado.affectedRows > 0;
    };

    /** @returns {Promise<Array>} */
    findAll = async () => {
        console.log("🟢 AlunoDAO.findAll()");

        const SQL = "SELECT idAluno, nomeAluno, email, ativo FROM Aluno ORDER BY idAluno;";

        const pool = await this.#database.getPool();
        const [resultado] = await pool.execute(SQL);

        return resultado;
    };

    /** @param {number} idAluno @returns {Promise<object|null>} */
    findById = async (idAluno) => {
        console.log("🟢 AlunoDAO.findById()");

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

        const SQL = "SELECT idAluno, nomeAluno, email, senha, ativo FROM Aluno WHERE email = ?;";

        const pool = await this.#database.getPool();
        const [resultado] = await pool.execute(SQL, [email]);

        if (resultado.length !== 1) {
            console.log("❌ Aluno não encontrado");
            return null;
        }

        const alunoDB = resultado[0];
        const senhaValida = await bcrypt.compare(senha, alunoDB.senha);

        if (!senhaValida) {
            console.log("❌ Senha inválida");
            return null;
        }

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
};
