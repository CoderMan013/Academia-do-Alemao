# -*- coding: utf-8 -*-
import datetime

from api.dao.aluno_dao import AlunoDAO
from api.dao.matricula_dao import MatriculaDAO
from api.dao.professor_dao import ProfessorDAO
from api.domain.modalidades import validar_duracao
from api.model.aluno import Aluno
from api.model.matricula import Matricula
from api.model.professor import Professor
from api.utils.error_response import ErrorResponse
from api.utils.validar import validar

"""
Classe responsável pela camada de serviço da entidade Matricula.

Recebe três DAOs por injeção de dependência:
- MatriculaDAO: CRUD da matrícula;
- AlunoDAO: valida se o aluno existe;
- ProfessorDAO: valida se o professor existe e se leciona a modalidade.
"""
class MatriculaService:
    def __init__(self,
                 matricula_dao_dependency: MatriculaDAO,
                 aluno_dao_dependency: AlunoDAO,
                 professor_dao_dependency: ProfessorDAO):
        print("⬆️  MatriculaService.__init__()")
        self.__matriculaDAO = matricula_dao_dependency
        self.__alunoDAO = aluno_dao_dependency
        self.__professorDAO = professor_dao_dependency

    @staticmethod
    def hoje() -> str:
        """Data de hoje no formato YYYY-MM-DD."""
        return datetime.date.today().isoformat()

    @staticmethod
    def somarMeses(dataInicio: str, meses: int) -> str:
        """
        Soma meses a uma data YYYY-MM-DD (retorna YYYY-MM-DD).

        Reproduz o Date.UTC do JavaScript usado na API em Node: quando o dia
        não existe no mês de destino (ex.: 31/01 + 1 mês), a data avança para
        o mês seguinte.
        """
        ano, mes, dia = (int(parte) for parte in dataInicio.split("-"))

        total_meses = (ano * 12 + (mes - 1)) + int(meses)
        novo_ano, novo_mes = divmod(total_meses, 12)
        novo_mes += 1

        primeiro_dia = datetime.date(novo_ano, novo_mes, 1)
        resultado = primeiro_dia + datetime.timedelta(days=dia - 1)

        return resultado.isoformat()

    @staticmethod
    def _id_aluno_do_body(json_matricula: dict, usuario: dict) -> int:
        """
        O aluno matriculado vem do token quando quem chama é aluno
        (ninguém matricula outra pessoa).
        """
        if (usuario or {}).get("role") == "aluno":
            return int(usuario.get("idAluno"))

        try:
            return int((json_matricula.get("aluno") or {}).get("idAluno"))
        except (TypeError, ValueError):
            raise ErrorResponse(
                400,
                "Erro na validação de dados",
                {"message": "O campo 'aluno.idAluno' é obrigatório!"}
            )

    @staticmethod
    def _id_professor_do_body(json_matricula: dict) -> int:
        try:
            return int((json_matricula.get("professor") or {}).get("idProfessor"))
        except (TypeError, ValueError):
            raise ErrorResponse(
                400,
                "Erro na validação de dados",
                {"message": "O campo 'professor.idProfessor' é obrigatório!"}
            )

    def _validar_vinculos(self, id_aluno: int, id_professor: int, modalidade: str) -> tuple[dict, dict]:
        """
        Carrega aluno e professor e valida a modalidade do professor.

        :return: (aluno_db, professor_db)
        """
        aluno_db = self.__alunoDAO.findById(id_aluno)
        if not aluno_db:
            raise ErrorResponse(
                404,
                "Aluno não encontrado",
                {"message": f"Não existe aluno com id {id_aluno}"}
            )

        professor_db = self.__professorDAO.findById(id_professor)
        if not professor_db:
            raise ErrorResponse(
                404,
                "Professor não encontrado",
                {"message": f"Não existe professor com id {id_professor}"}
            )

        if modalidade not in professor_db["modalidades"]:
            raise ErrorResponse(
                400,
                "Professor não leciona essa modalidade",
                {"message": f"{professor_db['nomeProfessor']} não leciona {modalidade}"}
            )

        return aluno_db, professor_db

    def createMatricula(self, jsonMatricula: dict, usuario: dict) -> dict:
        """
        Cria uma matrícula.

        Regras:
        - o aluno precisa existir;
        - o professor precisa existir e lecionar a modalidade;
        - o aluno não pode ter outra matrícula ativa na MESMA modalidade;
        - se dataFim não for informada, é calculada com duracaoMeses (padrão 3).

        :param jsonMatricula: dict
        :param usuario: dict - usuário autenticado (vem do token)
        :return: dict
        """
        print("🟣 MatriculaService.createMatricula()")

        id_aluno = self._id_aluno_do_body(jsonMatricula, usuario)
        id_professor = self._id_professor_do_body(jsonMatricula)

        matricula = Matricula()

        def preencher():
            matricula.modalidade = jsonMatricula.get("modalidade")
            matricula.status = jsonMatricula.get("status") or "ativa"
            matricula.dataInicio = jsonMatricula.get("dataInicio") or MatriculaService.hoje()
            duracao = validar_duracao(jsonMatricula.get("duracaoMeses"))
            matricula.dataFim = jsonMatricula.get("dataFim") or MatriculaService.somarMeses(
                matricula.dataInicio,
                duracao
            )

        validar(preencher)

        aluno_db, professor_db = self._validar_vinculos(
            id_aluno,
            id_professor,
            matricula.modalidade
        )

        # Os models exigem instâncias completas: monta a partir dos dados do banco.
        def preencher_vinculos():
            aluno = Aluno()
            aluno.idAluno = aluno_db["idAluno"]

            professor = Professor()
            professor.idProfessor = professor_db["idProfessor"]

            matricula.aluno = aluno
            matricula.professor = professor

        validar(preencher_vinculos)

        if matricula.status == "ativa":
            ativas = self.__matriculaDAO.countByAlunoModalidade(
                id_aluno,
                matricula.modalidade,
                "ativa"
            )

            if ativas > 0:
                raise ErrorResponse(
                    400,
                    "Matrícula duplicada",
                    {"message": f"O aluno {aluno_db['nomeAluno']} já possui uma matrícula ativa em {matricula.modalidade}"}
                )

        novo_id = self.__matriculaDAO.create(matricula)

        return {
            "idMatricula": novo_id,
            "dataInicio": matricula.dataInicio,
            "dataFim": matricula.dataFim,
            "status": matricula.status,
            "modalidade": matricula.modalidade,
            "aluno": aluno_db,
            "professor": professor_db,
        }

    def findAll(self) -> list[dict]:
        print("🟣 MatriculaService.findAll()")
        return self.__matriculaDAO.findAll()

    def findMinhas(self, idAluno: int) -> list[dict]:
        print("🟣 MatriculaService.findMinhas()")
        return self.__matriculaDAO.findByAluno(idAluno)

    def findMeusAlunos(self, idProfessor: int) -> list[dict]:
        print("🟣 MatriculaService.findMeusAlunos()")
        return self.__matriculaDAO.findByProfessor(idProfessor)

    def findById(self, idMatricula: int) -> dict | None:
        print("🟣 MatriculaService.findById()")

        matricula = Matricula()
        matricula.idMatricula = idMatricula

        return self.__matriculaDAO.findById(matricula.idMatricula)

    def _autorizar(self, matricula: dict, usuario: dict):
        """Confere se o usuário do token pode mexer nessa matrícula."""
        papel = (usuario or {}).get("role")

        if papel == "aluno" and int(usuario.get("idAluno") or 0) != int(matricula["aluno"]["idAluno"]):
            raise ErrorResponse(
                403,
                "Acesso negado",
                {"message": "Você só pode alterar as suas próprias matrículas"}
            )

        if papel == "professor" and int(usuario.get("idProfessor") or 0) != int(matricula["professor"]["idProfessor"]):
            raise ErrorResponse(
                403,
                "Acesso negado",
                {"message": "Você só pode alterar as matrículas das suas turmas"}
            )

    def updateMatricula(self, idMatricula: int, jsonMatricula: dict, usuario: dict) -> bool:
        """
        Atualiza datas, status, modalidade e professor da matrícula.

        :param idMatricula: int
        :param jsonMatricula: dict
        :param usuario: dict
        :return: bool
        """
        print("🟣 MatriculaService.updateMatricula()")

        atual = self.findById(idMatricula)
        if not atual:
            return False

        self._autorizar(atual, usuario)

        id_aluno = self._id_aluno_do_body(jsonMatricula, usuario)
        id_professor = self._id_professor_do_body(jsonMatricula)

        matricula = Matricula()

        def preencher():
            matricula.idMatricula = idMatricula
            matricula.modalidade = jsonMatricula.get("modalidade")
            matricula.status = jsonMatricula.get("status") or atual["status"]
            matricula.dataInicio = jsonMatricula.get("dataInicio") or atual["dataInicio"]
            matricula.dataFim = jsonMatricula.get("dataFim") or MatriculaService.somarMeses(
                matricula.dataInicio,
                validar_duracao(jsonMatricula.get("duracaoMeses"))
            )

        validar(preencher)

        aluno_db, professor_db = self._validar_vinculos(
            id_aluno,
            id_professor,
            matricula.modalidade
        )

        def preencher_vinculos():
            aluno = Aluno()
            aluno.idAluno = aluno_db["idAluno"]

            professor = Professor()
            professor.idProfessor = professor_db["idProfessor"]

            matricula.aluno = aluno
            matricula.professor = professor

        validar(preencher_vinculos)

        if matricula.status == "ativa":
            ativas = self.__matriculaDAO.countByAlunoModalidade(
                id_aluno,
                matricula.modalidade,
                "ativa",
                idMatricula
            )

            if ativas > 0:
                raise ErrorResponse(
                    400,
                    "Matrícula duplicada",
                    {"message": f"O aluno {aluno_db['nomeAluno']} já possui uma matrícula ativa em {matricula.modalidade}"}
                )

        return self.__matriculaDAO.update(matricula)

    def deleteMatricula(self, idMatricula: int, usuario: dict) -> bool:
        """
        Exclui a matrícula (o aluno sai da turma).

        :param idMatricula: int
        :param usuario: dict
        :return: bool
        """
        print("🟣 MatriculaService.deleteMatricula()")

        atual = self.findById(idMatricula)
        if not atual:
            return False

        self._autorizar(atual, usuario)

        matricula = Matricula()
        matricula.idMatricula = idMatricula

        return self.__matriculaDAO.delete(matricula)
