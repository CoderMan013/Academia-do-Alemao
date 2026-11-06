const { TREINOS, DURACOES, valorMensalidade } = require("../domain/Treinos");

/**
 * Regras de consulta da entidade Treino.
 */
module.exports = class TreinoService {
    /** @returns {{treinos: Array<{nome: string}>, duracoes: number[]}} */
    findAll = async () => {
        console.log("🟣 TreinoService.findAll()");
        return {
            treinos: TREINOS.map((nome) => ({
                nome,
                valorMensalidade: valorMensalidade(nome)
            })),
            duracoes: DURACOES
        };
    };
};
