const AlunoService = require("../services/AlunoService");
const ErrorResponse = require("../utils/ErrorResponse");

/**
 * Controller (camada de controle HTTP) da entidade Aluno.
 * Além do CRUD, expõe o endpoint de login que devolve o token JWT.
 */
module.exports = class AlunoController {
    #alunoService;

    constructor(alunoServiceDependency) {
        console.log("⬆️  AlunoController.constructor()");
        this.#alunoService = alunoServiceDependency;
    }

    /** POST /api/v1/alunos/login */
    login = async (request, response, next) => {
        console.log("🔵 AlunoController.login()");
        try {
            const alunoBody = request.body.aluno;
            const resultado = await this.#alunoService.loginAluno(alunoBody);

            return response.status(200).send({
                success: true,
                message: "Login efetuado com sucesso!",
                data: resultado
            });
        } catch (error) {
            next(error);
        }
    }

    /** POST /api/v1/alunos */
    store = async (request, response, next) => {
        console.log("🔵 AlunoController.store()");
        try {
            const alunoBody = request.body.aluno;
            const novoId = await this.#alunoService.createAluno(alunoBody);

            return response.status(201).send({
                success: true,
                message: "Cadastro realizado com sucesso",
                data: {
                    alunos: [{
                        idAluno: novoId,
                        nomeAluno: alunoBody.nomeAluno,
                        email: alunoBody.email,
                        ativo: Number(alunoBody.ativo ?? 1)
                    }]
                }
            });
        } catch (error) {
            next(error);
        }
    }

    /** GET /api/v1/alunos */
    index = async (request, response, next) => {
        console.log("🔵 AlunoController.index()");
        try {
            const alunos = await this.#alunoService.findAll();

            return response.status(200).send({
                success: true,
                message: "Busca realizada com sucesso",
                data: { alunos }
            });
        } catch (error) {
            next(error);
        }
    }

    /** GET /api/v1/alunos/:idAluno */
    show = async (request, response, next) => {
        console.log("🔵 AlunoController.show()");
        try {
            const idAluno = request.params.idAluno;
            const aluno = await this.#alunoService.findById(idAluno);

            if (!aluno) {
                throw new ErrorResponse(404, "Aluno não encontrado", {
                    message: `Não existe aluno com id ${idAluno}`
                });
            }

            return response.status(200).send({
                success: true,
                message: "Executado com sucesso",
                data: { alunos: [aluno] }
            });
        } catch (error) {
            next(error);
        }
    }

    /** PUT /api/v1/alunos/:idAluno */
    update = async (request, response, next) => {
        console.log("🔵 AlunoController.update()");
        try {
            const idAluno = request.params.idAluno;
            const alunoBody = request.body.aluno;

            const atualizou = await this.#alunoService.updateAluno(idAluno, alunoBody);
            if (!atualizou) {
                throw new ErrorResponse(404, "Aluno não encontrado", {
                    message: `Não existe aluno com id ${idAluno} para atualização`
                });
            }

            return response.status(200).send({
                success: true,
                message: "Atualizado com sucesso",
                data: {
                    alunos: [{
                        idAluno: Number(idAluno),
                        nomeAluno: alunoBody.nomeAluno,
                        email: alunoBody.email,
                        ativo: Number(alunoBody.ativo ?? 1)
                    }]
                }
            });
        } catch (error) {
            next(error);
        }
    }

    /** DELETE /api/v1/alunos/:idAluno */
    destroy = async (request, response, next) => {
        console.log("🔵 AlunoController.destroy()");
        try {
            const idAluno = request.params.idAluno;
            const excluiu = await this.#alunoService.deleteAluno(idAluno);

            if (!excluiu) {
                throw new ErrorResponse(404, "Aluno não encontrado", {
                    message: `Não existe aluno com id ${idAluno} para exclusão`
                });
            }

            return response.status(204).send({
                success: true,
                message: "Excluído com sucesso",
                data: { alunos: [{ idAluno: Number(idAluno) }] }
            });
        } catch (error) {
            next(error);
        }
    }
}
