const AlunoService = require("../services/AlunoService");
const ErrorResponse = require("../utils/ErrorResponse");

/**
 * Controller (camada de controle HTTP) da entidade Aluno.
 *
 * Recebe request/response, chama o Service adequado e converte o resultado
 * em status e JSON HTTP. Regras de negócio ficam no Service; consultas SQL,
 * no DAO. Erros assíncronos são encaminhados ao middleware global com next().
 */
module.exports = class AlunoController {
    #alunoService;

    constructor(alunoServiceDependency) {
        console.log("⬆️  AlunoController.constructor()");
        this.#alunoService = alunoServiceDependency;
    }

    /**
     * POST /api/v1/auth/login
     * Entrega as credenciais ao Service e devolve 200 com usuário/token se
     * autenticarem; erros são encaminhados ao tratamento global.
     */
    login = async (request, response, next) => {
        console.log("🔵 AlunoController.login()");
        try {
            const resultado = await this.#alunoService.login(request.body);

            return response.status(200).send({
                success: true,
                message: "Login efetuado com sucesso!",
                data: resultado
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/auth/registrar
     * Cria a conta e devolve 201, indicando que o recurso foi criado.
     */
    registrar = async (request, response, next) => {
        console.log("🔵 AlunoController.registrar()");
        try {
            const resultado = await this.#alunoService.registrar(request.body);

            return response.status(201).send({
                success: true,
                message: "Cadastro realizado com sucesso",
                data: resultado
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/auth/sessao
     * O JWT Middleware já validou o token e colocou as claims em
     * request.usuarioAutenticado; aqui apenas devolvemos esses dados.
     */
    sessao = (request, response) => {
        return response.status(200).send({
            success: true,
            message: "Sessão válida",
            data: { usuario: request.usuarioAutenticado }
        });
    }

    /**
     * PUT /api/v1/auth/perfil
     * Não recebe ID de aluno do cliente: identifica a conta pelas claims do JWT,
     * pede ao Service a confirmação da senha e devolve sessão/token atualizados.
     */
    atualizarPerfil = async (request, response, next) => {
        try {
            const usuarioAutenticado = request.usuarioAutenticado;
            if (usuarioAutenticado?.role !== "aluno" || !usuarioAutenticado.idAluno) {
                throw new ErrorResponse(403, "Acesso não permitido", {
                    message: "Somente o aluno autenticado pode atualizar os próprios dados."
                });
            }

            const resultado = await this.#alunoService.alterarConta(
                usuarioAutenticado.idAluno,
                request.body
            );

            return response.status(200).send({
                success: true,
                message: "Dados atualizados com sucesso",
                data: resultado
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/alunos
     * Cria aluno pelo CRUD e monta uma resposta sem incluir a senha recebida.
     */
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

    /**
     * GET /api/v1/alunos
     * Solicita a listagem ao Service e a envolve no contrato JSON data.alunos.
     */
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

    /**
     * GET /api/v1/alunos/:idAluno
     * Consulta um registro; se não existir, transforma o resultado vazio em HTTP 404.
     */
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

    /**
     * PUT /api/v1/alunos/:idAluno
     * Delega a atualização ao Service. O booleano informa se alguma linha foi
     * encontrada/atualizada e permite responder 404 quando o ID não existe.
     */
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

    /**
     * DELETE /api/v1/alunos/:idAluno
     * Pede ao Service a exclusão e converte ausência do registro em HTTP 404;
     * a regra que impede excluir aluno com matrícula não fica nesta camada.
     */
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
