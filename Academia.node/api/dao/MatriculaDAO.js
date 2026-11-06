const Matricula = require("../models/Matricula");

/**
 * DAO da tabela Matricula.
 *
 * As consultas de leitura usam JOIN com Aluno para devolver o aluno
 * já aninhado no objeto.
 */
module.exports = class MatriculaDAO {
    #database;

    constructor(databaseInstance) {
        console.log("⬆️  MatriculaDAO.constructor()");
        this.#database = databaseInstance;
    }

    /** @param {Matricula} objMatricula @returns {Promise<number>} */
    create = async (objMatricula) => {
        console.log("🟢 MatriculaDAO.create()");

        const SQL = `
            INSERT INTO Matricula (treino, dataInicio, dataFim, status, Aluno_idAluno)
            VALUES (?, ?, ?, ?, ?);`;
        const params = [
            objMatricula.treino,
            objMatricula.dataInicio,
            objMatricula.dataFim,
            objMatricula.status,
            objMatricula.aluno.idAluno
        ];

        const pool = await this.#database.getPool();
        const [resultado] = await pool.execute(SQL, params);

        if (!resultado.insertId) {
            throw new Error("Falha ao inserir matrícula");
        }

        return resultado.insertId;
    };

    /** @param {Matricula} objMatricula @returns {Promise<boolean>} */
    delete = async (objMatricula) => {
        console.log("🟢 MatriculaDAO.delete()");

        const SQL = "DELETE FROM Matricula WHERE idMatricula = ?;";

        const pool = await this.#database.getPool();
        const [resultado] = await pool.execute(SQL, [objMatricula.idMatricula]);

        return resultado.affectedRows > 0;
    };

    /** @param {Matricula} objMatricula @returns {Promise<boolean>} */
    update = async (objMatricula) => {
        console.log("🟢 MatriculaDAO.update()");

        const SQL = `
            UPDATE Matricula
            SET treino = ?, dataInicio = ?, dataFim = ?, status = ?, Aluno_idAluno = ?
            WHERE idMatricula = ?;`;
        const params = [
            objMatricula.treino,
            objMatricula.dataInicio,
            objMatricula.dataFim,
            objMatricula.status,
            objMatricula.aluno.idAluno,
            objMatricula.idMatricula
        ];

        const pool = await this.#database.getPool();
        const [resultado] = await pool.execute(SQL, params);

        return resultado.affectedRows > 0;
    };

    /** @returns {Promise<Array>} */
    findAll = async () => {
        console.log("🟢 MatriculaDAO.findAll()");

        const SQL = `
            SELECT m.idMatricula, m.treino, m.dataInicio, m.dataFim, m.status,
                   a.idAluno, a.nomeAluno, a.email AS emailAluno
            FROM Matricula m
            JOIN Aluno a ON a.idAluno = m.Aluno_idAluno
            ORDER BY m.idMatricula;`;

        const pool = await this.#database.getPool();
        const [matrizDados] = await pool.execute(SQL);

        return matrizDados.map((linha) => MatriculaDAO.montarObjeto(linha));
    };

    /** @param {number} idMatricula @returns {Promise<object|null>} */
    findById = async (idMatricula) => {
        console.log("🟢 MatriculaDAO.findById()");

        const resultado = await this.findByField("idMatricula", idMatricula);
        return resultado[0] || null;
    };

    /** @param {number} idAluno @returns {Promise<Array>} */
    findByAluno = async (idAluno) => {
        console.log("🟢 MatriculaDAO.findByAluno()");
        return await this.findByField("Aluno_idAluno", idAluno);
    };

    /**
     * @param {string} field - idMatricula | status | treino | Aluno_idAluno
     * @param {*} value
     * @returns {Promise<Array>}
     */
    findByField = async (field, value) => {
        console.log(`🟢 MatriculaDAO.findByField() - Campo: ${field}, Valor: ${value}`);

        const allowedFields = ["idMatricula", "status", "treino", "Aluno_idAluno"];
        if (!allowedFields.includes(field)) {
            throw new Error(`Campo inválido para busca: ${field}`);
        }

        const SQL = `
            SELECT m.idMatricula, m.treino, m.dataInicio, m.dataFim, m.status,
                   a.idAluno, a.nomeAluno, a.email AS emailAluno
            FROM Matricula m
            JOIN Aluno a ON a.idAluno = m.Aluno_idAluno
            WHERE m.${field} = ?
            ORDER BY m.idMatricula;`;

        const pool = await this.#database.getPool();
        const [matrizDados] = await pool.execute(SQL, [value]);

        return matrizDados.map((linha) => MatriculaDAO.montarObjeto(linha));
    };

    /**
     * Quantidade de matrículas de um aluno.
     * @param {number} idAluno
     * @param {string|null} status - opcional (ex.: "ativa")
     * @returns {Promise<number>}
     */
    countByAluno = async (idAluno, status = null) => {
        console.log("🟢 MatriculaDAO.countByAluno()");

        let SQL = "SELECT COUNT(*) AS total FROM Matricula WHERE Aluno_idAluno = ?";
        const params = [idAluno];

        if (status) {
            SQL += " AND status = ?";
            params.push(status);
        }

        const pool = await this.#database.getPool();
        const [resultado] = await pool.execute(SQL, params);

        return Number(resultado[0].total);
    };

    /**
     * Matrículas de um aluno em um treino.
     * @param {number} idAluno
     * @param {string} treino
     * @param {string|null} status
     * @param {number|null} ignorarId - id que não deve ser contado (usado no update)
     * @returns {Promise<number>}
     */
    countByAlunoTreino = async (idAluno, treino, status = null, ignorarId = null) => {
        console.log("🟢 MatriculaDAO.countByAlunoTreino()");

        let SQL = `
            SELECT COUNT(*) AS total
            FROM Matricula
            WHERE Aluno_idAluno = ? AND treino = ?`;
        const params = [idAluno, treino];

        if (status) {
            SQL += " AND status = ?";
            params.push(status);
        }

        if (ignorarId) {
            SQL += " AND idMatricula <> ?";
            params.push(ignorarId);
        }

        const pool = await this.#database.getPool();
        const [resultado] = await pool.execute(SQL, params);

        return Number(resultado[0].total);
    };

    /** Monta o objeto aninhado (aluno) a partir da linha do JOIN. */
    static montarObjeto = (linha) => ({
        idMatricula: Number(linha.idMatricula),
        treino: linha.treino,
        dataInicio: String(linha.dataInicio).slice(0, 10),
        dataFim: String(linha.dataFim).slice(0, 10),
        status: linha.status,
        aluno: {
            idAluno: Number(linha.idAluno),
            nomeAluno: linha.nomeAluno,
            email: linha.emailAluno
        }
    });
};
