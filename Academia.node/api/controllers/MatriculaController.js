const ErrorResponse = require("../utils/ErrorResponse");

/**
 * Controller (camada de controle HTTP) da entidade Matricula.
 *
 * Usa request.usuarioAutenticado (do JWT) para limitar as ações:
 * - aluno vê e altera apenas as próprias matrículas;
 * - professor vê as matrículas das turmas dele.
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
            const matriculaBody = request.body.matricula;
            const resultado = await this.#matriculaService.createMatricula(
                matriculaBody,
                request.usuarioAutenticado
            );

            return response.status(201).send({
                success: true,
                message: "Matrícula realizada com sucesso",
                data: { matriculas: [resultado] }
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

    /** GET /api/v1/matriculas/minhas (aluno) */
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

    /** GET /api/v1/matriculas/meus-alunos (professor) */
    meusAlunos = async (request, response, next) => {
        console.log("🔵 MatriculaController.meusAlunos()");
        try {
            const idProfessor = request.usuarioAutenticado?.idProfessor;
            const matriculas = await this.#matriculaService.findMeusAlunos(idProfessor);

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
            const matriculaBody = request.body.matricula;

            const atualizou = await this.#matriculaService.updateMatricula(
                idMatricula,
                matriculaBody,
                request.usuarioAutenticado
            );

            if (!atualizou) {
                throw new ErrorResponse(404, "Matrícula não encontrada", {
                    message: `Não existe matrícula com id ${idMatricula} para atualização`
                });
            }

            const matricula = await this.#matriculaService.findById(idMatricula);

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
