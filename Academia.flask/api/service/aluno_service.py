# -*- coding: utf-8 -*-
from api.dao.aluno_dao import AlunoDAO
from api.dao.matricula_dao import MatriculaDAO
from api.model.aluno import Aluno
from api.utils.error_response import ErrorResponse
from api.utils.validar import validar

"""
Classe responsável pela camada de serviço para a entidade Aluno, incluindo o login (JWT).

Observações sobre injeção de dependência:
- O AlunoService recebe AlunoDAO e MatriculaDAO via construtor:
  - AlunoDAO: CRUD + autenticação;
  - MatriculaDAO: impede excluir aluno com matrícula.
"""
class AlunoService:
    def __init__(self, aluno_dao_dependency: AlunoDAO, matricula_dao_dependency: MatriculaDAO):
        """
        Construtor da classe AlunoService

        :param aluno_dao_dependency: AlunoDAO
        :param matricula_dao_dependency: MatriculaDAO
        """
        print("⬆️  AlunoService.__init__()")
        self.__alunoDAO = aluno_dao_dependency
        self.__matriculaDAO = matricula_dao_dependency

    def createAluno(self, jsonAluno: dict) -> int:
        """
        Cria um novo aluno.

        :param jsonAluno: dict - {nomeAluno, email, senha, ativo}
        :return: int - ID do novo aluno criado

        🔹 Validações:
        - campos válidos (model)
        - e-mail não pode repetir
        """
        print("🟣 AlunoService.createAluno()")

        aluno = Aluno()
        ativo = jsonAluno.get("ativo")

        def preencher():
            aluno.nomeAluno = jsonAluno.get("nomeAluno")
            aluno.email = jsonAluno.get("email")
            aluno.senha = jsonAluno.get("senha")
            aluno.ativo = 1 if ativo is None else ativo  # mesmo comportamento do "ativo ?? 1" do Node

        validar(preencher)

        existentes = self.__alunoDAO.findByField("email", aluno.email)
        if existentes:
            raise ErrorResponse(
                400,
                "Aluno já existe",
                {"message": f"O e-mail {aluno.email} já está cadastrado"}
            )

        return self.__alunoDAO.create(aluno)

    def findAll(self) -> list[dict]:
        """
        Retorna todos os alunos
        :return: list[dict]
        """
        print("🟣 AlunoService.findAll()")
        return self.__alunoDAO.findAll()

    def findById(self, idAluno: int) -> dict | None:
        """
        Retorna um aluno por ID.

        :param idAluno: int
        :return: dict | None
        """
        print("🟣 AlunoService.findById()")

        aluno = Aluno()
        aluno.idAluno = idAluno  # passa pela validação de domínio

        return self.__alunoDAO.findById(aluno.idAluno)

    def updateAluno(self, idAluno: int, jsonAluno: dict) -> bool:
        """
        Atualiza um aluno (e-mail não pode repetir o de outro aluno).

        🔹 A senha é opcional: se não vier, a senha atual é mantida.

        :param idAluno: int
        :param jsonAluno: dict
        :return: bool
        """
        print("🟣 AlunoService.updateAluno()")

        aluno = Aluno()
        ativo = jsonAluno.get("ativo")

        def preencher():
            aluno.idAluno = idAluno
            aluno.nomeAluno = jsonAluno.get("nomeAluno")
            aluno.email = jsonAluno.get("email")
            aluno.ativo = 1 if ativo is None else ativo  # mesmo comportamento do "ativo ?? 1" do Node

        validar(preencher)

        existentes = self.__alunoDAO.findByField("email", aluno.email)
        outro_aluno = [item for item in existentes if item["idAluno"] != aluno.idAluno]
        if outro_aluno:
            raise ErrorResponse(
                400,
                "Aluno já existe",
                {"message": f"O e-mail {aluno.email} já está cadastrado"}
            )

        senha = jsonAluno.get("senha")
        if senha is not None and str(senha).strip() != "":
            def preencher_senha():
                aluno.senha = senha

            validar(preencher_senha)

        return self.__alunoDAO.update(aluno)

    def deleteAluno(self, idAluno: int) -> bool:
        """
        Exclui um aluno somente se não houver matrícula vinculada.

        :param idAluno: int
        :return: bool
        """
        print("🟣 AlunoService.deleteAluno()")

        aluno = Aluno()
        aluno.idAluno = idAluno  # validação de regra de domínio

        total_matriculas = self.__matriculaDAO.countByAluno(aluno.idAluno)
        if total_matriculas > 0:
            raise ErrorResponse(
                400,
                "Aluno em uso",
                {"message": f"Não é possível excluir: existem {total_matriculas} matrícula(s) deste aluno"}
            )

        return self.__alunoDAO.delete(aluno)
