const bcrypt = require("bcrypt");
const Professor = require("../models/Professor");
const { listaParaTexto, textoParaLista } = require("../domain/Modalidades");

/**
 * DAO da tabela Professor.
 *
 * Responsabilidades extras:
 * - Criptografar a senha com bcrypt antes de gravar;
 * - Autenticar o professor no login;
 * - Converter a coluna `modalidades` (texto) para array na leitura.
 */
module.exports = class ProfessorDAO {
    #database;

    constructor(databaseInstance) {
        console.log("⬆️  ProfessorDAO.constructor()");
        this.#database = databaseInstance;
    }

    /** Converte a linha do MySQL no formato usado pela API. */
    static converter = (linha) => ({
        idProfessor: Number(linha.idProfessor),
        nomeProfessor: linha.nomeProfessor,
        email: linha.email,
        modalidades: textoParaLista(linha.modalidades),
        ativo: Number(linha.ativo)
    });

    /** @param {Professor} objProfessor @returns {Promise<number>} */
    create = async (objProfessor) => {
        console.log("🟢 ProfessorDAO.create()");

        const senhaHash = await bcrypt.hash(objProfessor.senha, 12);

        const SQL = `
            INSERT INTO Professor (nomeProfessor, email, senha, modalidades, ativo)
            VALUES (?, ?, ?, ?, ?);`;
        const params = [
            objProfessor.nomeProfessor,
            objProfessor.email,
            senhaHash,
            listaParaTexto(objProfessor.modalidades),
            objProfessor.ativo ?? 1
        ];

        const pool = await this.#database.getPool();
        const [resultado] = await pool.execute(SQL, params);

        if (!resultado.insertId) {
            throw new Error("Falha ao inserir professor");
        }

        return resultado.insertId;
    };

    /** @param {Professor} objProfessor @returns {Promise<boolean>} */
    delete = async (objProfessor) => {
        console.log("🟢 ProfessorDAO.delete()");

        const SQL = "DELETE FROM Professor WHERE idProfessor = ?;";

        const pool = await this.#database.getPool();
        const [resultado] = await pool.execute(SQL, [objProfessor.idProfessor]);

        return resultado.affectedRows > 0;
    };

    /** @param {Professor} objProfessor @returns {Promise<boolean>} */
    update = async (objProfessor) => {
        console.log("🟢 ProfessorDAO.update()");

        let SQL;
        let params;

        if (objProfessor.senha) {
            const senhaHash = await bcrypt.hash(objProfessor.senha, 12);
            SQL = `
                UPDATE Professor
                SET nomeProfessor = ?, email = ?, senha = ?, modalidades = ?, ativo = ?
                WHERE idProfessor = ?;`;
            params = [
                objProfessor.nomeProfessor,
                objProfessor.email,
                senhaHash,
                listaParaTexto(objProfessor.modalidades),
                objProfessor.ativo,
                objProfessor.idProfessor
            ];
        } else {
            SQL = `
                UPDATE Professor
                SET nomeProfessor = ?, email = ?, modalidades = ?, ativo = ?
                WHERE idProfessor = ?;`;
            params = [
                objProfessor.nomeProfessor,
                objProfessor.email,
                listaParaTexto(objProfessor.modalidades),
                objProfessor.ativo,
                objProfessor.idProfessor
            ];
        }

        const pool = await this.#database.getPool();
        const [resultado] = await pool.execute(SQL, params);

        return resultado.affectedRows > 0;
    };

    /**
     * Substitui a lista de modalidades do professor.
     * @param {number} idProfessor
     * @param {Array<string>} modalidades
     * @returns {Promise<boolean>}
     */
    updateModalidades = async (idProfessor, modalidades) => {
        console.log("🟢 ProfessorDAO.updateModalidades()");

        const SQL = "UPDATE Professor SET modalidades = ? WHERE idProfessor = ?;";

        const pool = await this.#database.getPool();
        const [resultado] = await pool.execute(SQL, [listaParaTexto(modalidades), idProfessor]);

        return resultado.affectedRows > 0;
    };

    /** @returns {Promise<Array>} */
    findAll = async () => {
        console.log("🟢 ProfessorDAO.findAll()");

        const SQL = `
            SELECT idProfessor, nomeProfessor, email, modalidades, ativo
            FROM Professor
            ORDER BY idProfessor;`;

        const pool = await this.#database.getPool();
        const [resultado] = await pool.execute(SQL);

        return resultado.map(ProfessorDAO.converter);
    };

    /** @param {number} idProfessor @returns {Promise<object|null>} */
    findById = async (idProfessor) => {
        console.log("🟢 ProfessorDAO.findById()");

        const resultado = await this.findByField("idProfessor", idProfessor);
        return resultado[0] || null;
    };

    /**
     * @param {string} field - idProfessor | nomeProfessor | email | ativo
     * @param {*} value
     * @returns {Promise<Array>}
     */
    findByField = async (field, value) => {
        console.log(`🟢 ProfessorDAO.findByField() - Campo: ${field}, Valor: ${value}`);

        const allowedFields = ["idProfessor", "nomeProfessor", "email", "ativo"];
        if (!allowedFields.includes(field)) {
            throw new Error(`Campo inválido para busca: ${field}`);
        }

        const SQL = `
            SELECT idProfessor, nomeProfessor, email, modalidades, ativo
            FROM Professor
            WHERE ${field} = ?;`;

        const pool = await this.#database.getPool();
        const [resultado] = await pool.execute(SQL, [value]);

        return resultado.map(ProfessorDAO.converter);
    };

    /**
     * Verifica e-mail + senha e devolve o professor autenticado (sem a senha).
     * @param {string} email
     * @param {string} senha
     * @returns {Promise<object|null>}
     */
    login = async (email, senha) => {
        console.log("🟢 ProfessorDAO.login()");

        const SQL = `
            SELECT idProfessor, nomeProfessor, email, senha, modalidades, ativo
            FROM Professor
            WHERE email = ?;`;

        const pool = await this.#database.getPool();
        const [resultado] = await pool.execute(SQL, [email]);

        if (resultado.length !== 1) {
            return null;
        }

        const professorDB = resultado[0];
        const senhaValida = await bcrypt.compare(senha, professorDB.senha);

        if (!senhaValida) {
            return null;
        }

        if (Number(professorDB.ativo) !== 1) {
            return null;
        }

        return ProfessorDAO.converter(professorDB);
    };
};
