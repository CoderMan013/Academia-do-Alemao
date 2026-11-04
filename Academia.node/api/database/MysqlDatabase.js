const mysql = require("mysql2/promise");

/**
 * Gerencia a conexão com o MySQL usando um pool de conexões compartilhado (singleton).
 *
 * Recebe a configuração por injeção de dependência, então nenhuma outra camada
 * precisa saber como a conexão foi criada.
 */
module.exports = class MysqlDatabase {
    // Pool compartilhado entre todas as instâncias
    static #pool;

    #host;
    #user;
    #password;
    #database;
    #port;
    #waitForConnections;
    #connectionLimit;
    #queueLimit;

    constructor(config = {}) {
        this.#host = config.host || "127.0.0.1";
        this.#user = config.user || "root";
        this.#password = config.password || "";
        this.#database = config.database || "academia_db";
        this.#port = config.port || 3306;
        this.#waitForConnections = config.waitForConnections ?? true;
        this.#connectionLimit = config.connectionLimit || 10;
        this.#queueLimit = config.queueLimit || 10;
    }

    /**
     * Cria o pool na primeira chamada e o reutiliza depois.
     * @returns {Promise<Pool>}
     */
    async connect() {
        if (!MysqlDatabase.#pool) {
            MysqlDatabase.#pool = mysql.createPool({
                host: this.#host,
                user: this.#user,
                password: this.#password,
                database: this.#database,
                port: this.#port,
                waitForConnections: this.#waitForConnections,
                connectionLimit: this.#connectionLimit,
                queueLimit: this.#queueLimit,
                // Datas (DATE) voltam como string 'YYYY-MM-DD', sem sofrer ajuste de fuso
                dateStrings: true
            });

            try {
                const connection = await MysqlDatabase.#pool.getConnection();
                console.log(`⬆️  Conectado ao MySQL (${this.#database}) com sucesso!`);
                connection.release();
            } catch (error) {
                console.error("❌ Falha ao conectar ao MySQL:", error.message);
                process.exit(1);
            }
        }
        return MysqlDatabase.#pool;
    }

    async getPool() {
        return await this.connect();
    }
};
