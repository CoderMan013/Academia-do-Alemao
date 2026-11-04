const ErrorResponse = require("../utils/ErrorResponse");

/**
 * Controller (camada HTTP) da entidade Matricula.
 */
module.exports = class MatriculaController {
    #matriculaService;

    constructor(matriculaServiceDependency) {
        console.log("⬆️  MatriculaController.constructor()");
        this.#matriculaService = matriculaServiceDependency;
    }

    /** POST /api/v1/matriculas */
    store = async (request, response, next) => {
        console.log("🔵 MatriculaController.store()");
        try {
            const matricula = await this.#matriculaService.createMatricula(
                request.body.matricula,
                request.usuarioAutenticado
            );

            return response.status(201).send({
                success: true,
                message: "Matrícula realizada com sucesso",
                data: { matriculas: [matricula] }
            });
        } catch (error) {
            next(error);
        }
    };

    /** GET /api/v1/matriculas */
    index = async (request, response, next) => {
        console.log("🔵 MatriculaController.index()");
        try {
            const matriculas = await this.#matriculaService.findAll();

            return response.status(200).send({
                success: true,
                message: "Busca realizada com sucesso",
                data: { matriculas }
            });
        } catch (error) {
            next(error);
        }
    };

    /** GET /api/v1/matriculas/minhas */
    minhas = async (request, response, next) => {
        console.log("🔵 MatriculaController.minhas()");
        try {
            const idAluno = request.usuarioAutenticado?.idAluno;
            const matriculas = await this.#matriculaService.findMinhas(idAluno);

            return response.status(200).send({
                success: true,
                message: "Busca realizada com sucesso",
                data: { matriculas }
            });
        } catch (error) {
            next(error);
        }
    };

    /** GET /api/v1/matriculas/:idMatricula */
    show = async (request, response, next) => {
        console.log("🔵 MatriculaController.show()");
        try {
            const idMatricula = request.params.idMatricula;
            const matricula = await this.#matriculaService.findById(idMatricula);

            if (!matricula) {
                throw new ErrorResponse(404, "Matrícula não encontrada", {
                    message: `Não existe matrícula com id ${idMatricula}`
                });
            }

            return response.status(200).send({
                success: true,
                message: "Executado com sucesso",
                data: { matriculas: [matricula] }
            });
        } catch (error) {
            next(error);
        }
    };

    /** PUT /api/v1/matriculas/:idMatricula */
    update = async (request, response, next) => {
        console.log("🔵 MatriculaController.update()");
        try {
            const idMatricula = request.params.idMatricula;
            const matricula = await this.#matriculaService.updateMatricula(
                idMatricula,
                request.body.matricula,
                request.usuarioAutenticado
            );

            if (!matricula) {
                throw new ErrorResponse(404, "Matrícula não encontrada", {
                    message: `Não existe matrícula com id ${idMatricula} para atualização`
                });
            }

            return response.status(200).send({
                success: true,
                message: "Atualizado com sucesso",
                data: { matriculas: [matricula] }
            });
        } catch (error) {
            next(error);
        }
    };

    /** DELETE /api/v1/matriculas/:idMatricula */
    destroy = async (request, response, next) => {
        console.log("🔵 MatriculaController.destroy()");
        try {
            const idMatricula = request.params.idMatricula;
            const excluiu = await this.#matriculaService.deleteMatricula(
                idMatricula,
                request.usuarioAutenticado
            );

            if (!excluiu) {
                throw new ErrorResponse(404, "Matrícula não encontrada", {
                    message: `Não existe matrícula com id ${idMatricula} para exclusão`
                });
            }

            return response.status(204).send();
        } catch (error) {
            next(error);
        }
    };
};
