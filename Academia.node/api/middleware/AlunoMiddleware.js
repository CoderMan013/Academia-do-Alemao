const ErrorResponse = require("../utils/ErrorResponse");

/**
 * Middleware de validação das requisições de Aluno.
 *
 * Esta camada verifica se o corpo e os parâmetros da requisição têm os campos
 * necessários antes de chamar o Controller. As regras completas de domínio
 * (formato do e-mail, força da senha, etc.) são conferidas pelo Model/Service.
 */
module.exports = class AlunoMiddleware {

    /**
     * Primeiro filtro do login: garante que o cliente enviou as duas credenciais.
     * A verificação de que elas correspondem a uma conta é feita no Service/DAO.
     */
    validateLoginBody = (request, response, next) => {
        console.log("🔷 AlunoMiddleware.validateLoginBody()");

        if (!request.body?.email || !request.body?.senha) {
            throw new ErrorResponse(400, "Erro na validação de dados", {
                message: "Informe 'email' e 'senha' para efetuar o login!"
            });
        }

        next();
    };

    /**
     * Confere a presença dos três campos exigidos no cadastro público.
     * Se faltar algum, interrompe a rota com HTTP 400; caso contrário, next()
     * permite que o próximo middleware ou Controller continue o fluxo.
     */
    validateRegistrarBody = (request, response, next) => {
        console.log("🔷 AlunoMiddleware.validateRegistrarBody()");
        const body = request.body;

        if (!body?.nome || String(body.nome).trim() === "") {
            throw new ErrorResponse(400, "Erro na validação de dados", {
                message: "O campo 'nome' é obrigatório!"
            });
        }

        if (!body?.email || String(body.email).trim() === "") {
            throw new ErrorResponse(400, "Erro na validação de dados", {
                message: "O campo 'email' é obrigatório!"
            });
        }

        if (!body?.senha || String(body.senha).trim() === "") {
            throw new ErrorResponse(400, "Erro na validação de dados", {
                message: "O campo 'senha' é obrigatório!"
            });
        }

        next();
    };

    validatePerfilBody = (request, response, next) => {
        console.log("🔷 AlunoMiddleware.validatePerfilBody()");
        const body = request.body;

        // A alteração de perfil sempre exige e-mail e senha atual, mesmo quando
        // o aluno só quer trocar o e-mail. A nova senha, por outro lado, é opcional.
        if (!body || typeof body.email !== "string" || body.email.trim() === "") {
            throw new ErrorResponse(400, "Erro na validação de dados", {
                message: "Informe um e-mail válido."
            });
        }

        if (typeof body.senhaAtual !== "string" || body.senhaAtual === "") {
            throw new ErrorResponse(400, "Erro na validação de dados", {
                message: "Informe sua senha atual para confirmar as alterações."
            });
        }

        if (body.novaSenha !== undefined && typeof body.novaSenha !== "string") {
            throw new ErrorResponse(400, "Erro na validação de dados", {
                message: "A nova senha deve ser um texto."
            });
        }

        next();
    };

    /**
     * Valida o formato de entrada do CRUD administrativo de aluno: neste endpoint,
     * os campos vêm agrupados dentro de request.body.aluno.
     */
    validateBody = (request, response, next) => {
        console.log("🔷 AlunoMiddleware.validateBody()");
        const body = request.body;

        if (!body || !body.aluno) {
            throw new ErrorResponse(400, "Erro na validação de dados", {
                message: "O campo 'aluno' é obrigatório!"
            });
        }

        const aluno = body.aluno;

        if (!aluno.nomeAluno || String(aluno.nomeAluno).trim() === "") {
            throw new ErrorResponse(400, "Erro na validação de dados", {
                message: "O campo 'nomeAluno' é obrigatório!"
            });
        }

        if (!aluno.email || String(aluno.email).trim() === "") {
            throw new ErrorResponse(400, "Erro na validação de dados", {
                message: "O campo 'email' é obrigatório!"
            });
        }

        if (!aluno.senha || String(aluno.senha).trim() === "") {
            throw new ErrorResponse(400, "Erro na validação de dados", {
                message: "O campo 'senha' é obrigatório!"
            });
        }

        next();
    }

    /**
     * Valida o corpo do PUT do CRUD. Nome e e-mail são obrigatórios;
     * senha não é exigida, para que uma atualização de outros dados não a apague.
     */
    validateUpdateBody = (request, response, next) => {
        console.log("🔷 AlunoMiddleware.validateUpdateBody()");
        const body = request.body;

        if (!body || !body.aluno) {
            throw new ErrorResponse(400, "Erro na validação de dados", {
                message: "O campo 'aluno' é obrigatório!"
            });
        }

        const aluno = body.aluno;

        if (!aluno.nomeAluno || String(aluno.nomeAluno).trim() === "") {
            throw new ErrorResponse(400, "Erro na validação de dados", {
                message: "O campo 'nomeAluno' é obrigatório!"
            });
        }

        if (!aluno.email || String(aluno.email).trim() === "") {
            throw new ErrorResponse(400, "Erro na validação de dados", {
                message: "O campo 'email' é obrigatório!"
            });
        }

        next();
    }

    /**
     * Garante que a rota recebeu o identificador de aluno esperado.
     * A existência e a validade numérica detalhada são verificadas nas camadas seguintes.
     */
    validateIdParam = (request, response, next) => {
        console.log("🔷 AlunoMiddleware.validateIdParam()");
        const { idAluno } = request.params;

        if (!idAluno) {
            throw new ErrorResponse(400, "Erro na validação de dados", {
                message: "O parâmetro 'idAluno' é obrigatório!"
            });
        }

        next();
    }
}
