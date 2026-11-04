# -*- coding: utf-8 -*-
from api.dao.matricula_dao import MatriculaDAO
from api.dao.professor_dao import ProfessorDAO
from api.domain.modalidades import normalizar_lista
from api.model.professor import Professor
from api.utils.error_response import ErrorResponse
from api.utils.validar import validar

"""
Classe responsável pela camada de serviço da entidade Professor.

Recebe ProfessorDAO (CRUD/login) e MatriculaDAO (impede excluir professor com
matrícula e sair de uma modalidade que ainda tem aluno ativo).
"""
class ProfessorService:
    def __init__(self,
                 professor_dao_dependency: ProfessorDAO,
                 matricula_dao_dependency: MatriculaDAO):
        print("⬆️  ProfessorService.__init__()")
        self.__professorDAO = professor_dao_dependency
        self.__matriculaDAO = matricula_dao_dependency

    def createProfessor(self, jsonProfessor: dict) -> int:
        """
        Cria um novo professor.

        :param jsonProfessor: dict - {nomeProfessor, email, senha, modalidades, ativo}
        :return: int - ID do novo professor
        """
        print("🟣 ProfessorService.createProfessor()")

        professor = Professor()
        ativo = jsonProfessor.get("ativo")

        def preencher():
            professor.nomeProfessor = jsonProfessor.get("nomeProfessor")
            professor.email = jsonProfessor.get("email")
            professor.senha = jsonProfessor.get("senha")
            professor.modalidades = jsonProfessor.get("modalidades") or []
            professor.ativo = 1 if ativo is None else ativo

        validar(preencher)

        existentes = self.__professorDAO.findByField("email", professor.email)
        if existentes:
            raise ErrorResponse(
                400,
                "Professor já existe",
                {"message": f"O e-mail {professor.email} já está cadastrado"}
            )

        return self.__professorDAO.create(professor)

    def findAll(self) -> list[dict]:
        print("🟣 ProfessorService.findAll()")
        return self.__professorDAO.findAll()

    def findById(self, idProfessor: int) -> dict | None:
        print("🟣 ProfessorService.findById()")

        professor = Professor()
        professor.idProfessor = idProfessor  # validação de domínio

        return self.__professorDAO.findById(professor.idProfessor)

    def findMeusAlunos(self, idProfessor: int) -> list[dict]:
        print("🟣 ProfessorService.findMeusAlunos()")
        return self.__matriculaDAO.findByProfessor(idProfessor)

    def updateProfessor(self, idProfessor: int, jsonProfessor: dict) -> bool:
        """
        Atualiza os dados do professor (senha é opcional).

        :param idProfessor: int
        :param jsonProfessor: dict
        :return: bool
        """
        print("🟣 ProfessorService.updateProfessor()")

        atual = self.findById(idProfessor)
        if not atual:
            return False

        professor = Professor()
        ativo = jsonProfessor.get("ativo")

        def preencher():
            professor.idProfessor = idProfessor
            professor.nomeProfessor = jsonProfessor.get("nomeProfessor")
            professor.email = jsonProfessor.get("email")
            professor.modalidades = jsonProfessor.get("modalidades") or atual["modalidades"]
            professor.ativo = atual["ativo"] if ativo is None else ativo

        validar(preencher)

        existentes = self.__professorDAO.findByField("email", professor.email)
        outro_professor = [item for item in existentes if item["idProfessor"] != professor.idProfessor]
        if outro_professor:
            raise ErrorResponse(
                400,
                "Professor já existe",
                {"message": f"O e-mail {professor.email} já está cadastrado"}
            )

        senha = jsonProfessor.get("senha")
        if senha is not None and str(senha).strip() != "":
            def preencher_senha():
                professor.senha = senha

            validar(preencher_senha)

        return self.__professorDAO.update(professor)

    def updateModalidades(self, idProfessor: int, modalidades) -> dict:
        """
        Atualiza as modalidades do próprio professor.

        🔹 Regra: não é possível deixar de lecionar uma modalidade que ainda tem
        matrícula ativa — o aluno ficaria sem professor.

        :param idProfessor: int
        :param modalidades: list[str]
        :return: dict - professor atualizado
        """
        print("🟣 ProfessorService.updateModalidades()")

        atual = self.findById(idProfessor)
        if not atual:
            raise ErrorResponse(
                404,
                "Professor não encontrado",
                {"message": f"Não existe professor com id {idProfessor}"}
            )

        nova_lista: list[str] = []

        def preencher_lista():
            # normalizar_lista valida cada nome; a atribuição usa a lista normalizada
            nova_lista.extend(normalizar_lista(modalidades))

        validar(preencher_lista)

        removidas = [m for m in atual["modalidades"] if m not in nova_lista]
        for modalidade in removidas:
            ativos = self.__matriculaDAO.countByProfessorModalidade(idProfessor, modalidade, "ativa")
            if ativos > 0:
                raise ErrorResponse(
                    400,
                    "Modalidade em uso",
                    {"message": f"Não é possível sair de {modalidade}: existem {ativos} aluno(s) ativo(s) nessa modalidade"}
                )

        self.__professorDAO.update_modalidades(idProfessor, nova_lista)
        return self.__professorDAO.findById(idProfessor)

    def deleteProfessor(self, idProfessor: int) -> bool:
        """
        Exclui um professor somente se não houver matrícula vinculada.

        :param idProfessor: int
        :return: bool
        """
        print("🟣 ProfessorService.deleteProfessor()")

        professor = Professor()
        professor.idProfessor = idProfessor

        total_matriculas = self.__matriculaDAO.countByProfessor(professor.idProfessor)
        if total_matriculas > 0:
            raise ErrorResponse(
                400,
                "Professor em uso",
                {"message": f"Não é possível excluir: existem {total_matriculas} matrícula(s) deste professor"}
            )

        return self.__professorDAO.delete(professor)
