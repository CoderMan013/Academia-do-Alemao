const Aluno = require("../models/Aluno");
const ErrorResponse = require("../utils/ErrorResponse");
const validar = require("../utils/Validar");

/**
 * Regras de negócio de Aluno, incluindo o login (JWT).
 *
 * Recebe AlunoDAO e MatriculaDAO por injeção de dependência:
 * - AlunoDAO: CRUD + autenticação;
 * - MatriculaDAO: impede excluir aluno com matrícula.
 */
module.exports = class AlunoService {
    #alunoDAO;
    #matriculaDAO;

    constructor(alunoDAODependency, matriculaDAODependency) {
        console.log("⬆️  AlunoService.constructor()");
        this.#alunoDAO = alunoDAODependency;
        this.#matriculaDAO = matriculaDAODependency;
    }

    /**
     * Cria um aluno.
     * Regras: campos válidos (model) e e-mail único.
     * @param {object} alunoJson
     * @returns {Promise<number>}
     */
    createAluno = async (alunoJson) => {
        console.log("🟣 AlunoService.createAluno()");

        const aluno = new Aluno();
        validar(() => {
            aluno.nomeAluno = alunoJson.nomeAluno;
            aluno.email = alunoJson.email;
            aluno.senha = alunoJson.senha;
            aluno.ativo = alunoJson.ativo ?? 1;
        });

        const existentes = await this.#alunoDAO.findByField("email", aluno.email);
        if (existentes.length > 0) {
            throw new ErrorResponse(400, "Aluno já existe", {
                message: `O e-mail ${aluno.email} já está cadastrado`
            });
        }

        return await this.#alunoDAO.create(aluno);
    }

    /** @returns {Promise<Array>} */
    findAll = async () => {
        console.log("🟣 AlunoService.findAll()");
        return await this.#alunoDAO.findAll();
    }

    /** @param {number} idAluno @returns {Promise<object|null>} */
    findById = async (idAluno) => {
        console.log("🟣 AlunoService.findById()");

        const aluno = new Aluno();
        validar(() => { aluno.idAluno = idAluno; });

        return await this.#alunoDAO.findById(aluno.idAluno);
    }

    /**
     * Atualiza um aluno (e-mail não pode repetir o de outro aluno).
     * @param {number} idAluno
     * @param {object} alunoJson
     * @returns {Promise<boolean>}
     */
    updateAluno = async (idAluno, alunoJson) => {
        console.log("🟣 AlunoService.updateAluno()");

        const aluno = new Aluno();
        validar(() => {
            aluno.idAluno = idAluno;
            aluno.nomeAluno = alunoJson.nomeAluno;
            aluno.email = alunoJson.email;
            aluno.ativo = alunoJson.ativo ?? 1;
        });

        const existentes = await this.#alunoDAO.findByField("email", aluno.email);
        const outroAluno = existentes.find((item) => Number(item.idAluno) !== aluno.idAluno);
        if (outroAluno) {
            throw new ErrorResponse(400, "Aluno já existe", {
                message: `O e-mail ${aluno.email} já está cadastrado`
            });
        }

        // Senha é opcional no update: se vier, é criptografada pelo DAO
        if (alunoJson.senha !== undefined && alunoJson.senha !== null && String(alunoJson.senha).trim() !== "") {
            validar(() => { aluno.senha = alunoJson.senha; });
        }

        return await this.#alunoDAO.update(aluno);
    }

    /**
     * Exclui um aluno somente se não houver matrícula vinculada.
     * @param {number} idAluno
     * @returns {Promise<boolean>}
     */
    deleteAluno = async (idAluno) => {
        console.log("🟣 AlunoService.deleteAluno()");

        const aluno = new Aluno();
        validar(() => { aluno.idAluno = idAluno; });

        const totalMatriculas = await this.#matriculaDAO.countByAluno(aluno.idAluno);
        if (totalMatriculas > 0) {
            throw new ErrorResponse(400, "Aluno em uso", {
                message: `Não é possível excluir: existem ${totalMatriculas} matrícula(s) deste aluno`
            });
        }

        return await this.#alunoDAO.delete(aluno);
    }
}
