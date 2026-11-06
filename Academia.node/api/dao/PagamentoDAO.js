/**
 * DAO da tabela Pagamento.
 *
 * As leituras usam JOIN com Matricula e Aluno para devolver o treino e
 * o dono do pagamento. Registros antigos marcados como "atrasado" são
 * apresentados como pendentes enquanto esse status não é usado na tela.
 */
module.exports = class PagamentoDAO {
    #database;

    constructor(databaseInstance) {
        console.log("⬆️  PagamentoDAO.constructor()");
        this.#database = databaseInstance;
    }

    /** SQL base das leituras, incluindo matrícula e aluno. */
    static get SELECT_BASE() {
        return `
            SELECT p.idPagamento, p.valor, p.dataVencimento, p.dataPagamento,
                   p.metodo,
                   CASE WHEN p.status = 'atrasado' THEN 'pendente' ELSE p.status END AS status,
                   m.idMatricula, m.treino,
                   a.idAluno, a.nomeAluno, a.email AS emailAluno
            FROM Pagamento p
            JOIN Matricula m ON m.idMatricula = p.Matricula_idMatricula
            JOIN Aluno a ON a.idAluno = m.Aluno_idAluno`;
    }

    /** @param {string} operador - "WHERE" ou "AND" */
    static condicao(field) {
        return field === "Aluno_idAluno" ? "a.idAluno" : `p.${field}`;
    }

    /** @param {object} objPagamento @returns {Promise<number>} */
    create = async (objPagamento) => {
        console.log("🟢 PagamentoDAO.create()");

        const SQL = `
            INSERT INTO Pagamento (valor, dataVencimento, dataPagamento, metodo, status, Matricula_idMatricula)
            VALUES (?, ?, ?, ?, ?, ?);`;
        const params = [
            objPagamento.valor,
            objPagamento.dataVencimento,
            objPagamento.dataPagamento,
            objPagamento.metodo,
            objPagamento.status,
            objPagamento.matriculaId
        ];

        const pool = await this.#database.getPool();
        const [resultado] = await pool.execute(SQL, params);

        if (!resultado.insertId) {
            throw new Error("Falha ao inserir pagamento");
        }

        return resultado.insertId;
    };

    /**
     * Cria em lote as mensalidades pendentes de uma matrícula.
     * @param {Array<{valor: number, dataVencimento: string, matriculaId: number}>} mensalidades
     */
    createMensalidades = async (mensalidades) => {
        console.log("🟢 PagamentoDAO.createMensalidades()");
        if (mensalidades.length === 0) return;

        const placeholders = mensalidades.map(() => "(?, ?, NULL, '', 'pendente', ?)").join(", ");
        const params = mensalidades.flatMap((mensalidade) => [
            mensalidade.valor,
            mensalidade.dataVencimento,
            mensalidade.matriculaId
        ]);
        const SQL = `
            INSERT INTO Pagamento
                (valor, dataVencimento, dataPagamento, metodo, status, Matricula_idMatricula)
            VALUES ${placeholders};`;

        const pool = await this.#database.getPool();
        const [resultado] = await pool.execute(SQL, params);

        if (resultado.affectedRows !== mensalidades.length) {
            throw new Error("Falha ao gerar todas as mensalidades da matrícula");
        }
    };

    /** @param {object} objPagamento @returns {Promise<boolean>} */
    delete = async (objPagamento) => {
        console.log("🟢 PagamentoDAO.delete()");

        const SQL = "DELETE FROM Pagamento WHERE idPagamento = ?;";

        const pool = await this.#database.getPool();
        const [resultado] = await pool.execute(SQL, [objPagamento.idPagamento]);

        return resultado.affectedRows > 0;
    };

    /** @param {object} objPagamento @returns {Promise<boolean>} */
    update = async (objPagamento) => {
        console.log("🟢 PagamentoDAO.update()");

        const SQL = `
            UPDATE Pagamento
            SET valor = ?, dataVencimento = ?, dataPagamento = ?, metodo = ?, status = ?
            WHERE idPagamento = ?;`;
        const params = [
            objPagamento.valor,
            objPagamento.dataVencimento,
            objPagamento.dataPagamento,
            objPagamento.metodo,
            objPagamento.status,
            objPagamento.idPagamento
        ];

        const pool = await this.#database.getPool();
        const [resultado] = await pool.execute(SQL, params);

        return resultado.affectedRows > 0;
    };

    /** @returns {Promise<Array>} */
    findAll = async () => {
        console.log("🟢 PagamentoDAO.findAll()");

        const SQL = `${PagamentoDAO.SELECT_BASE} ORDER BY p.dataVencimento, p.idPagamento;`;

        const pool = await this.#database.getPool();
        const [matrizDados] = await pool.execute(SQL);

        return matrizDados.map(PagamentoDAO.montarObjeto);
    };

    /** @param {number} idPagamento @returns {Promise<object|null>} */
    findById = async (idPagamento) => {
        console.log("🟢 PagamentoDAO.findById()");

        const SQL = `${PagamentoDAO.SELECT_BASE} WHERE p.idPagamento = ?;`;

        const pool = await this.#database.getPool();
        const [resultado] = await pool.execute(SQL, [idPagamento]);

        return resultado.length > 0 ? PagamentoDAO.montarObjeto(resultado[0]) : null;
    };

    /** @param {number} idMatricula @returns {Promise<Array>} */
    findByMatricula = async (idMatricula) => {
        console.log("🟢 PagamentoDAO.findByMatricula()");

        const SQL = `${PagamentoDAO.SELECT_BASE} WHERE m.idMatricula = ? ORDER BY p.dataVencimento;`;

        const pool = await this.#database.getPool();
        const [resultado] = await pool.execute(SQL, [idMatricula]);

        return resultado.map(PagamentoDAO.montarObjeto);
    };

    /** @param {number} idAluno @returns {Promise<Array>} */
    findByAluno = async (idAluno) => {
        console.log("🟢 PagamentoDAO.findByAluno()");

        const SQL = `${PagamentoDAO.SELECT_BASE} WHERE a.idAluno = ? ORDER BY p.dataVencimento;`;

        const pool = await this.#database.getPool();
        const [resultado] = await pool.execute(SQL, [idAluno]);

        return resultado.map(PagamentoDAO.montarObjeto);
    };

    /** @param {number} idMatricula @returns {Promise<number>} */
    countByMatricula = async (idMatricula) => {
        console.log("🟢 PagamentoDAO.countByMatricula()");

        const SQL = "SELECT COUNT(*) AS total FROM Pagamento WHERE Matricula_idMatricula = ?;";

        const pool = await this.#database.getPool();
        const [resultado] = await pool.execute(SQL, [idMatricula]);

        return Number(resultado[0].total);
    };

    /** Monta o objeto aninhado (matrícula + aluno) a partir da linha do JOIN. */
    static montarObjeto = (linha) => ({
        idPagamento: Number(linha.idPagamento),
        valor: Number(linha.valor),
        dataVencimento: String(linha.dataVencimento).slice(0, 10),
        dataPagamento: linha.dataPagamento ? String(linha.dataPagamento).slice(0, 10) : null,
        metodo: linha.metodo,
        status: linha.status,
        matricula: {
            idMatricula: Number(linha.idMatricula),
            treino: linha.treino,
            aluno: {
                idAluno: Number(linha.idAluno),
                nomeAluno: linha.nomeAluno,
                email: linha.emailAluno
            }
        }
    });
};
