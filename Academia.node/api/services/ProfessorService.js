const Professor = require("../models/Professor");
const ErrorResponse = require("../utils/ErrorResponse");
const validar = require("../utils/Validar");
const { normalizarLista } = require("../domain/Modalidades");

/**
 * Regras de negócio de Professor.
 *
 * Recebe ProfessorDAO (CRUD/login) e MatriculaDAO (impede excluir professor
 * com matrícula e sair de uma modalidade que ainda tem aluno ativo).
 */
module.exports = class ProfessorService {
    #professorDAO;
    #matriculaDAO;

    constructor(professorDAODependency, matriculaDAODependency) {
        console.log("⬆️  ProfessorService.constructor()");
        this.#professorDAO = professorDAODependency;
        this.#matriculaDAO = matriculaDAODependency;
    }

    /**
     * Cria um professor.
     * @param {object} professorJson
     * @returns {Promise<number>}
     */
    createProfessor = async (professorJson) => {
        console.log("🟣 ProfessorService.createProfessor()");

        const professor = new Professor();
        validar(() => {
            professor.nomeProfessor = professorJson.nomeProfessor;
            professor.email = professorJson.email;
            professor.senha = professorJson.senha;
            professor.modalidades = professorJson.modalidades ?? [];
            professor.ativo = professorJson.ativo ?? 1;
        });

        const existentes = await this.#professorDAO.findByField("email", professor.email);
        if (existentes.length > 0) {
            throw new ErrorResponse(400, "Professor já existe", {
                message: `O e-mail ${professor.email} já está cadastrado`
            });
        }

        return await this.#professorDAO.create(professor);
    };

    /** @returns {Promise<Array>} */
    findAll = async () => {
        console.log("🟣 ProfessorService.findAll()");
        return await this.#professorDAO.findAll();
    };

    /**
     * Matrículas das turmas deste professor (a tela "Meus alunos").
     * @param {number} idProfessor
     * @returns {Promise<Array>}
     */
    findMeusAlunos = async (idProfessor) => {
        console.log("🟣 ProfessorService.findMeusAlunos()");
        return await this.#matriculaDAO.findByProfessor(idProfessor);
    };

    /** @param {number} idProfessor @returns {Promise<object|null>} */
    findById = async (idProfessor) => {
        console.log("🟣 ProfessorService.findById()");

        const professor = new Professor();
        validar(() => { professor.idProfessor = idProfessor; });

        return await this.#professorDAO.findById(professor.idProfessor);
    };

    /**
     * Atualiza os dados do professor (senha é opcional).
     * @param {number} idProfessor
     * @param {object} professorJson
     * @returns {Promise<boolean>}
     */
    updateProfessor = async (idProfessor, professorJson) => {
        console.log("🟣 ProfessorService.updateProfessor()");

        const atual = await this.findById(idProfessor);
        if (!atual) {
            return false;
        }

        const professor = new Professor();
        validar(() => {
            professor.idProfessor = idProfessor;
            professor.nomeProfessor = professorJson.nomeProfessor;
            professor.email = professorJson.email;
            professor.modalidades = professorJson.modalidades ?? atual.modalidades;
            professor.ativo = professorJson.ativo ?? atual.ativo;
        });

        const existentes = await this.#professorDAO.findByField("email", professor.email);
        const outroProfessor = existentes.find((item) => Number(item.idProfessor) !== professor.idProfessor);
        if (outroProfessor) {
            throw new ErrorResponse(400, "Professor já existe", {
                message: `O e-mail ${professor.email} já está cadastrado`
            });
        }

        if (professorJson.senha !== undefined && professorJson.senha !== null && String(professorJson.senha).trim() !== "") {
            validar(() => { professor.senha = professorJson.senha; });
        }

        return await this.#professorDAO.update(professor);
    };

    /**
     * Atualiza as modalidades do próprio professor.
     *
     * Regra: não é possível deixar de lecionar uma modalidade que ainda tem
     * matrícula ativa — o aluno ficaria sem professor.
     *
     * @param {number} idProfessor
     * @param {Array<string>} modalidades
     * @returns {Promise<object>} professor atualizado
     */
    updateModalidades = async (idProfessor, modalidades) => {
        console.log("🟣 ProfessorService.updateModalidades()");

        const atual = await this.findById(idProfessor);
        if (!atual) {
            throw new ErrorResponse(404, "Professor não encontrado", {
                message: `Não existe professor com id ${idProfessor}`
            });
        }

        let novaLista = [];
        validar(() => { novaLista = normalizarLista(modalidades); });

        const removidas = atual.modalidades.filter((modalidade) => !novaLista.includes(modalidade));
        for (const modalidade of removidas) {
            const ativos = await this.#matriculaDAO.countByProfessorModalidade(idProfessor, modalidade, "ativa");
            if (ativos > 0) {
                throw new ErrorResponse(400, "Modalidade em uso", {
                    message: `Não é possível sair de ${modalidade}: existem ${ativos} aluno(s) ativo(s) nessa modalidade`
                });
            }
        }

        await this.#professorDAO.updateModalidades(idProfessor, novaLista);
        return await this.#professorDAO.findById(idProfessor);
    };

    /**
     * Exclui um professor somente se não houver matrícula vinculada.
     * @param {number} idProfessor
     * @returns {Promise<boolean>}
     */
    deleteProfessor = async (idProfessor) => {
        console.log("🟣 ProfessorService.deleteProfessor()");

        const professor = new Professor();
        validar(() => { professor.idProfessor = idProfessor; });

        const totalMatriculas = await this.#matriculaDAO.countByProfessor(professor.idProfessor);
        if (totalMatriculas > 0) {
            throw new ErrorResponse(400, "Professor em uso", {
                message: `Não é possível excluir: existem ${totalMatriculas} matrícula(s) deste professor`
            });
        }

        return await this.#professorDAO.delete(professor);
    };
};
