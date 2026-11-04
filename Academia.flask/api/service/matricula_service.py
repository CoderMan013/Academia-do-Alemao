# -*- coding: utf-8 -*-
import datetime

from api.dao.aluno_dao import AlunoDAO
from api.dao.matricula_dao import MatriculaDAO
from api.domain.modalidades import validar_duracao
from api.model.aluno import Aluno
from api.model.matricula import Matricula
from api.utils.error_response import ErrorResponse
from api.utils.validar import validar

"""
Classe responsável pela camada de serviço da entidade Matricula.

Recebe MatriculaDAO (CRUD) e AlunoDAO (valida se o aluno existe).
Como o sistema tem um único papel logado (aluno), o dono da matrícula
vem sempre do token.
"""
class MatriculaService:
    def __init__(self,
                 matricula_dao_dependency: MatriculaDAO,
                 aluno_dao_dependency: AlunoDAO):
        print("⬆️  MatriculaService.__init__()")
        self.__matriculaDAO = matricula_dao_dependency
        self.__alunoDAO = aluno_dao_dependency

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
    def _id_aluno_do_token(usuario: dict) -> int:
        """O aluno matriculado vem do token (ninguém matricula outra pessoa)."""
        try:
            id_aluno = int((usuario or {}).get("idAluno"))
        except (TypeError, ValueError):
            id_aluno = 0

        if id_aluno <= 0:
            raise ErrorResponse(
                401,
                "Sessão inválida",
                {"message": "O token não identifica um aluno"}
            )

        return id_aluno

    def _validar_aluno(self, id_aluno: int) -> dict:
        aluno_db = self.__alunoDAO.findById(id_aluno)
        if not aluno_db:
            raise ErrorResponse(
                404,
                "Aluno não encontrado",
                {"message": f"Não existe aluno com id {id_aluno}"}
            )
        return aluno_db

    def createMatricula(self, jsonMatricula: dict, usuario: dict) -> dict:
        """
        Cria uma matrícula.

        Regras:
        - o aluno precisa existir;
        - o aluno não pode ter outra matrícula ativa na MESMA modalidade;
        - se dataFim não for informada, é calculada com duracaoMeses (padrão 3).

        :param jsonMatricula: dict
        :param usuario: dict - usuário autenticado (vem do token)
        :return: dict
        """
        print("🟣 MatriculaService.createMatricula()")

        id_aluno = self._id_aluno_do_token(usuario)
        matricula = Matricula()
        duracao = 3

        def preencher():
            nonlocal duracao
            matricula.modalidade = jsonMatricula.get("modalidade")
            matricula.status = jsonMatricula.get("status") or "ativa"
            matricula.dataInicio = jsonMatricula.get("dataInicio") or MatriculaService.hoje()
            duracao = validar_duracao(jsonMatricula.get("duracaoMeses"))
            matricula.dataFim = jsonMatricula.get("dataFim") or MatriculaService.somarMeses(
                matricula.dataInicio,
                duracao
            )

        validar(preencher)

        aluno_db = self._validar_aluno(id_aluno)

        def preencher_vinculo():
            aluno = Aluno()
            aluno.idAluno = aluno_db["idAluno"]
            matricula.aluno = aluno

        validar(preencher_vinculo)

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
            "modalidade": matricula.modalidade,
            "dataInicio": matricula.dataInicio,
            "dataFim": matricula.dataFim,
            "status": matricula.status,
            "aluno": aluno_db,
            "duracaoMeses": duracao,
        }

    def findAll(self) -> list[dict]:
        print("🟣 MatriculaService.findAll()")
        return self.__matriculaDAO.findAll()

    def findMinhas(self, idAluno: int) -> list[dict]:
        print("🟣 MatriculaService.findMinhas()")
        return self.__matriculaDAO.findByAluno(idAluno)

    def findById(self, idMatricula: int) -> dict | None:
        print("🟣 MatriculaService.findById()")

        matricula = Matricula()
        matricula.idMatricula = idMatricula

        return self.__matriculaDAO.findById(matricula.idMatricula)

    def _autorizar(self, matricula: dict, usuario: dict):
        """Confere se o aluno do token é o dono da matrícula."""
        if int((usuario or {}).get("idAluno") or 0) != int(matricula["aluno"]["idAluno"]):
            raise ErrorResponse(
                403,
                "Acesso negado",
                {"message": "Você só pode alterar as suas próprias matrículas"}
            )

    def updateMatricula(self, idMatricula: int, jsonMatricula: dict, usuario: dict) -> dict | None:
        """
        Atualiza modalidade, datas e status da matrícula.

        :param idMatricula: int
        :param jsonMatricula: dict
        :param usuario: dict
        :return: dict | None
        """
        print("🟣 MatriculaService.updateMatricula()")

        atual = self.findById(idMatricula)
        if not atual:
            return None

        self._autorizar(atual, usuario)

        matricula = Matricula()

        def preencher():
            matricula.idMatricula = idMatricula
            matricula.modalidade = jsonMatricula.get("modalidade") or atual["modalidade"]
            matricula.status = jsonMatricula.get("status") or atual["status"]
            matricula.dataInicio = jsonMatricula.get("dataInicio") or atual["dataInicio"]
            matricula.dataFim = jsonMatricula.get("dataFim") or MatriculaService.somarMeses(
                matricula.dataInicio,
                validar_duracao(jsonMatricula.get("duracaoMeses"))
            )

        validar(preencher)

        aluno_db = self._validar_aluno(atual["aluno"]["idAluno"])

        def preencher_vinculo():
            aluno = Aluno()
            aluno.idAluno = aluno_db["idAluno"]
            matricula.aluno = aluno

        validar(preencher_vinculo)

        if matricula.status == "ativa":
            ativas = self.__matriculaDAO.countByAlunoModalidade(
                aluno_db["idAluno"],
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

        atualizou = self.__matriculaDAO.update(matricula)
        return self.findById(idMatricula) if atualizou else None

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
