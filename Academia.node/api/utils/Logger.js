const fs = require("fs");
const path = require("path");

/**
 * Grava erros em api/system/log.log (mesmo padrão de log usado em aula).
 */
module.exports = class Logger {
    static #arquivo = path.join(__dirname, "..", "system", "log.log");

    static log(objeto) {
        try {
            fs.mkdirSync(path.dirname(Logger.#arquivo), { recursive: true });
            const linha = `[${new Date().toISOString()}] ${JSON.stringify(objeto)}\n`;
            fs.appendFileSync(Logger.#arquivo, linha, "utf8");
        } catch (erro) {
            console.error("Falha ao gravar o log:", erro.message);
        }
    }
};
