const ErrorResponse = require("../utils/ErrorResponse");

/**
 * Controller (camada HTTP) da entidade Professor.
 */
module.exports = class ProfessorController {
    #professorService;

    constructor(professorServiceDependency) {
        console.log("⬆️  ProfessorController.constructor()");
        this.#professorService = professorServiceDependency;
    }

    /** POST /api/v1/professores */
    store = async (request, response, next) => {
        console.log("🔵 ProfessorController.store()");
        try {
            const professorBody = request.body.professor;
            const novoId = await this.#professorService.createProfessor(professorBody);
            const professor = await this.#professorService.findById(novoId);

            return response.status(201).send({
                success: true,
                message: "Cadastro realizado com sucesso",
                data: { professores: [professor] }
            });
        } catch (error) {
            next(error);
        }
    };

    /** GET /api/v1/professores */
    index = async (request, response, next) => {
        console.log("🔵 ProfessorController.index()");
        try {
            const professores = await this.#professorService.findAll();

            return response.status(200).send({
                success: true,
                message: "Busca realizada com sucesso",
                data: { professores }
            });
        } catch (error) {
            next(error);
        }
    };

    /** GET /api/v1/professores/me */
    me = async (request, response, next) => {
        console.log("🔵 ProfessorController.me()");
        try {
            const idProfessor = request.usuarioAutenticado?.idProfessor;
            const professor = await this.#professorService.findById(idProfessor);

            if (!professor) {
                throw new ErrorResponse(404, "Professor não encontrado", {
                    message: "O professor do token não existe mais"
                });
            }

            return response.status(200).send({
                success: true,
                message: "Executado com sucesso",
                data: { professores: [professor] }
            });
        } catch (error) {
            next(error);
        }
    };

    /** GET /api/v1/professores/me/alunos */
    meusAlunos = async (request, response, next) => {
        console.log("🔵 ProfessorController.meusAlunos()");
        try {
            const idProfessor = request.usuarioAutenticado?.idProfessor;
            const professor = await this.#professorService.findById(idProfessor);

            if (!professor) {
                throw new ErrorResponse(404, "Professor não encontrado", {
                    message: "O professor do token não existe mais"
                });
            }

            const matriculas = await this.#professorService.findMeusAlunos(idProfessor);

            return response.status(200).send({
                success: true,
                message: "Busca realizada com sucesso",
                data: { matriculas }
            });
        } catch (error) {
            next(error);
        }
    };

    /** PUT /api/v1/professores/me/modalidades */
    atualizarModalidades = async (request, response, next) => {
        console.log("🔵 ProfessorController.atualizarModalidades()");
        try {
            const idProfessor = request.usuarioAutenticado?.idProfessor;
            const professor = await this.#professorService.updateModalidades(
                idProfessor,
                request.body.modalidades
            );

            return response.status(200).send({
                success: true,
                message: "Modalidades atualizadas com sucesso",
                data: { professores: [professor] }
            });
        } catch (error) {
            next(error);
        }
    };

    /** GET /api/v1/professores/:idProfessor */
    show = async (request, response, next) => {
        console.log("🔵 ProfessorController.show()");
        try {
            const idProfessor = request.params.idProfessor;
            const professor = await this.#professorService.findById(idProfessor);

            if (!professor) {
                throw new ErrorResponse(404, "Professor não encontrado", {
                    message: `Não existe professor com id ${idProfessor}`
                });
            }

            return response.status(200).send({
                success: true,
                message: "Executado com sucesso",
                data: { professores: [professor] }
            });
        } catch (error) {
            next(error);
        }
    };

    /** PUT /api/v1/professores/:idProfessor */
    update = async (request, response, next) => {
        console.log("🔵 ProfessorController.update()");
        try {
            const idProfessor = request.params.idProfessor;
            const professorBody = request.body.professor;
            const atualizou = await this.#professorService.updateProfessor(idProfessor, professorBody);

            if (!atualizou) {
                throw new ErrorResponse(404, "Professor não encontrado", {
                    message: `Não existe professor com id ${idProfessor} para atualização`
                });
            }

            const professor = await this.#professorService.findById(idProfessor);

            return response.status(200).send({
                success: true,
                message: "Atualizado com sucesso",
                data: { professores: [professor] }
            });
        } catch (error) {
            next(error);
        }
    };

    /** DELETE /api/v1/professores/:idProfessor */
    destroy = async (request, response, next) => {
        console.log("🔵 ProfessorController.destroy()");
        try {
            const idProfessor = request.params.idProfessor;
            const excluiu = await this.#professorService.deleteProfessor(idProfessor);

            if (!excluiu) {
                throw new ErrorResponse(404, "Professor não encontrado", {
                    message: `Não existe professor com id ${idProfessor} para exclusão`
                });
            }

            return response.status(204).send();
        } catch (error) {
            next(error);
        }
    };
};
