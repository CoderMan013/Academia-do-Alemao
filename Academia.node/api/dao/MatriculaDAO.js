const Matricula = require("../models/Matricula");

/**
 * DAO da tabela Matricula.
 *
 * Como Matricula é a tabela do meio, as consultas de leitura usam JOIN
 * para devolver o aluno e o professor já aninhados no objeto.
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
            INSERT INTO Matricula (dataInicio, dataFim, status, modalidade, Aluno_idAluno, Professor_idProfessor)
            VALUES (?, ?, ?, ?, ?, ?);`;
        const params = [
            objMatricula.dataInicio,
            objMatricula.dataFim,
            objMatricula.status,
            objMatricula.modalidade,
            objMatricula.aluno.idAluno,
            objMatricula.professor.idProfessor
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
            SET dataInicio = ?, dataFim = ?, status = ?, modalidade = ?,
                Aluno_idAluno = ?, Professor_idProfessor = ?
            WHERE idMatricula = ?;`;
        const params = [
            objMatricula.dataInicio,
            objMatricula.dataFim,
            objMatricula.status,
            objMatricula.modalidade,
            objMatricula.aluno.idAluno,
            objMatricula.professor.idProfessor,
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
            SELECT m.idMatricula, m.dataInicio, m.dataFim, m.status, m.modalidade,
                   a.idAluno, a.nomeAluno, a.email AS emailAluno,
                   p.idProfessor, p.nomeProfessor, p.email AS emailProfessor
            FROM Matricula m
            JOIN Aluno a ON a.idAluno = m.Aluno_idAluno
            JOIN Professor p ON p.idProfessor = m.Professor_idProfessor
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

    /** @param {number} idProfessor @returns {Promise<Array>} */
    findByProfessor = async (idProfessor) => {
        console.log("🟢 MatriculaDAO.findByProfessor()");
        return await this.findByField("Professor_idProfessor", idProfessor);
    };

    /**
     * @param {string} field - idMatricula | status | modalidade | Aluno_idAluno | Professor_idProfessor
     * @param {*} value
     * @returns {Promise<Array>}
     */
    findByField = async (field, value) => {
        console.log(`🟢 MatriculaDAO.findByField() - Campo: ${field}, Valor: ${value}`);

        const allowedFields = [
            "idMatricula",
            "status",
            "modalidade",
            "Aluno_idAluno",
            "Professor_idProfessor"
        ];
        if (!allowedFields.includes(field)) {
            throw new Error(`Campo inválido para busca: ${field}`);
        }

        const SQL = `
            SELECT m.idMatricula, m.dataInicio, m.dataFim, m.status, m.modalidade,
                   a.idAluno, a.nomeAluno, a.email AS emailAluno,
                   p.idProfessor, p.nomeProfessor, p.email AS emailProfessor
            FROM Matricula m
            JOIN Aluno a ON a.idAluno = m.Aluno_idAluno
            JOIN Professor p ON p.idProfessor = m.Professor_idProfessor
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
     * Quantidade de matrículas de um professor (impede excluir professor em uso).
     * @param {number} idProfessor
     * @returns {Promise<number>}
     */
    countByProfessor = async (idProfessor) => {
        console.log("🟢 MatriculaDAO.countByProfessor()");

        const SQL = "SELECT COUNT(*) AS total FROM Matricula WHERE Professor_idProfessor = ?;";

        const pool = await this.#database.getPool();
        const [resultado] = await pool.execute(SQL, [idProfessor]);

        return Number(resultado[0].total);
    };

    /**
     * Matrículas de um professor em uma modalidade (impede sair de modalidade em uso).
     * @param {number} idProfessor
     * @param {string} modalidade
     * @param {string|null} status
     * @returns {Promise<number>}
     */
    countByProfessorModalidade = async (idProfessor, modalidade, status = null) => {
        console.log("🟢 MatriculaDAO.countByProfessorModalidade()");

        let SQL = `
            SELECT COUNT(*) AS total
            FROM Matricula
            WHERE Professor_idProfessor = ? AND modalidade = ?`;
        const params = [idProfessor, modalidade];

        if (status) {
            SQL += " AND status = ?";
            params.push(status);
        }

        const pool = await this.#database.getPool();
        const [resultado] = await pool.execute(SQL, params);

        return Number(resultado[0].total);
    };

    /**
     * Matrículas de um aluno em uma modalidade.
     * @param {number} idAluno
     * @param {string} modalidade
     * @param {string|null} status
     * @param {number|null} ignorarId - id que não deve ser contado (usado no update)
     * @returns {Promise<number>}
     */
    countByAlunoModalidade = async (idAluno, modalidade, status = null, ignorarId = null) => {
        console.log("🟢 MatriculaDAO.countByAlunoModalidade()");

        let SQL = `
            SELECT COUNT(*) AS total
            FROM Matricula
            WHERE Aluno_idAluno = ? AND modalidade = ?`;
        const params = [idAluno, modalidade];

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

    /** Monta o objeto aninhado (aluno + professor) a partir da linha do JOIN. */
    static montarObjeto = (linha) => ({
        idMatricula: Number(linha.idMatricula),
        dataInicio: String(linha.dataInicio).slice(0, 10),
        dataFim: String(linha.dataFim).slice(0, 10),
        status: linha.status,
        modalidade: linha.modalidade,
        aluno: {
            idAluno: Number(linha.idAluno),
            nomeAluno: linha.nomeAluno,
            email: linha.emailAluno
        },
        professor: {
            idProfessor: Number(linha.idProfessor),
            nomeProfessor: linha.nomeProfessor,
            email: linha.emailProfessor
        }
    });
};
