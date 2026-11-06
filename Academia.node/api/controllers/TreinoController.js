/**
 * Controller (camada HTTP) da entidade Treino.
 */
module.exports = class TreinoController {
    #treinoService;

    constructor(treinoServiceDependency) {
        console.log("⬆️  TreinoController.constructor()");
        this.#treinoService = treinoServiceDependency;
    }

    /** GET /api/v1/treinos */
    index = async (request, response, next) => {
        console.log("🔵 TreinoController.index()");
        try {
            const treinos = await this.#treinoService.findAll();

            return response.status(200).send({
                success: true,
                message: "Busca realizada com sucesso",
                data: treinos
            });
        } catch (error) {
            next(error);
        }
    };
};
