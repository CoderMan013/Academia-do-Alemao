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
        # O DAO de aluno executa operações da tabela Aluno; o de matrícula
        # permite impedir exclusões que deixariam dados relacionados inválidos.
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

        # O Model valida e normaliza os valores antes de qualquer gravação.
        aluno = Aluno()
        ativo = jsonAluno.get("ativo")

        def preencher():
            aluno.nomeAluno = jsonAluno.get("nomeAluno")
            aluno.email = jsonAluno.get("email")
            aluno.senha = jsonAluno.get("senha")
            aluno.ativo = 1 if ativo is None else ativo  # mesmo comportamento do "ativo WARNING: 1" do Node

        validar(preencher)

        # A checagem de e-mail duplicado é uma regra de negócio, por isso fica
        # no Service e não no Controller nem no DAO.
        existentes = self.__alunoDAO.findByField("email", aluno.email)
        if existentes:
            raise ErrorResponse(
                400,
                "Aluno já existe",
                {"message": f"O e-mail {aluno.email} já está cadastrado"}
            )

        # Só depois de validar os dados e a unicidade o DAO grava o aluno.
        return self.__alunoDAO.create(aluno)

    def findAll(self) -> list[dict]:
        """
        Retorna todos os alunos
        :return: list[dict]
        """
        print("🟣 AlunoService.findAll()")
        # Para uma listagem simples, o Service encaminha a consulta ao DAO.
        return self.__alunoDAO.findAll()

    def findById(self, idAluno: int) -> dict | None:
        """
        Retorna um aluno por ID.

        :param idAluno: int
        :return: dict | None
        """
        print("🟣 AlunoService.findById()")

        # Atribuir o ID ao Model aplica a regra de ID inteiro positivo.
        aluno = Aluno()
        aluno.idAluno = idAluno  # passa pela validação de domínio

        # O DAO devolve um dicionário sem a senha.
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

        # Primeiro valida os dados que sempre são necessários para atualizar.
        aluno = Aluno()
        ativo = jsonAluno.get("ativo")

        def preencher():
            aluno.idAluno = idAluno
            aluno.nomeAluno = jsonAluno.get("nomeAluno")
            aluno.email = jsonAluno.get("email")
            aluno.ativo = 1 if ativo is None else ativo  # mesmo comportamento do "ativo WARNING: 1" do Node

        validar(preencher)

        # Permite que o próprio aluno mantenha seu e-mail, mas impede usar
        # o endereço que já pertence a outra pessoa.
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
            # Senha vazia ou ausente não substitui a senha atual; se enviada,
            # precisa passar pelas regras do Model antes de chegar ao DAO.
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

        # Valida o ID e consulta as dependências antes de pedir a exclusão.
        aluno = Aluno()
        aluno.idAluno = idAluno  # validação de regra de domínio

        total_matriculas = self.__matriculaDAO.countByAluno(aluno.idAluno)
        # Protege o relacionamento: um aluno com matrículas não pode ser removido.
        if total_matriculas > 0:
            raise ErrorResponse(
                400,
                "Aluno em uso",
                {"message": f"Não é possível excluir: existem {total_matriculas} matrícula(s) deste aluno"}
            )

        # Sem matrículas vinculadas, delega a remoção ao DAO.
        return self.__alunoDAO.delete(aluno)
