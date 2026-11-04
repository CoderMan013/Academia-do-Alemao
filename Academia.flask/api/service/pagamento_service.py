# -*- coding: utf-8 -*-
import datetime

from api.dao.matricula_dao import MatriculaDAO
from api.dao.pagamento_dao import PagamentoDAO
from api.model.pagamento import Pagamento
from api.utils.error_response import ErrorResponse
from api.utils.validar import validar

"""
Regras de negócio de Pagamento.

O aluno registra as mensalidades das próprias matrículas e só pode
alterar/excluir o que é dele. Um pagamento nasce "pendente" e, quando
marcado como "pago" sem data, recebe a data de hoje.
"""
class PagamentoService:
    def __init__(self,
                 pagamento_dao_dependency: PagamentoDAO,
                 matricula_dao_dependency: MatriculaDAO):
        print("⬆️  PagamentoService.__init__()")
        self.__pagamentoDAO = pagamento_dao_dependency
        self.__matriculaDAO = matricula_dao_dependency

    @staticmethod
    def hoje() -> str:
        """Data de hoje no formato YYYY-MM-DD."""
        return datetime.date.today().isoformat()

    @staticmethod
    def _id_aluno_do_token(usuario: dict) -> int:
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

    def _matricula_do_aluno(self, id_matricula: int, usuario: dict) -> dict:
        """Carrega a matrícula e confere se ela é do aluno logado."""
        id_aluno = self._id_aluno_do_token(usuario)

        matricula = self.__matriculaDAO.findById(id_matricula)
        if not matricula:
            raise ErrorResponse(
                404,
                "Matrícula não encontrada",
                {"message": f"Não existe matrícula com id {id_matricula}"}
            )

        if int(matricula["aluno"]["idAluno"]) != id_aluno:
            raise ErrorResponse(
                403,
                "Acesso negado",
                {"message": "A matrícula informada não é sua"}
            )

        return matricula

    def createPagamento(self, jsonPagamento: dict, usuario: dict) -> dict:
        """
        Cria um pagamento para uma matrícula do aluno logado.

        :param jsonPagamento: dict
        :param usuario: dict
        :return: dict
        """
        print("🟣 PagamentoService.createPagamento()")

        pagamento = Pagamento()

        def preencher():
            pagamento.valor = jsonPagamento.get("valor")
            pagamento.dataVencimento = jsonPagamento.get("dataVencimento") or PagamentoService.hoje()
            pagamento.metodo = jsonPagamento.get("metodo") or "Pix"
            pagamento.status = jsonPagamento.get("status") or "pendente"
            pagamento.dataPagamento = jsonPagamento.get("dataPagamento")
            pagamento.matriculaId = (jsonPagamento.get("matricula") or {}).get("idMatricula")

        validar(preencher)

        self._matricula_do_aluno(pagamento.matriculaId, usuario)

        if pagamento.status == "pago" and not pagamento.dataPagamento:
            pagamento.dataPagamento = PagamentoService.hoje()

        novo_id = self.__pagamentoDAO.create(pagamento)
        return self.__pagamentoDAO.findById(novo_id)

    def findAll(self) -> list[dict]:
        print("🟣 PagamentoService.findAll()")
        return self.__pagamentoDAO.findAll()

    def findMinhas(self, idAluno: int) -> list[dict]:
        print("🟣 PagamentoService.findMinhas()")
        return self.__pagamentoDAO.findByAluno(idAluno)

    def findByMatricula(self, idMatricula: int, usuario: dict) -> list[dict]:
        print("🟣 PagamentoService.findByMatricula()")
        self._matricula_do_aluno(idMatricula, usuario)
        return self.__pagamentoDAO.findByMatricula(idMatricula)

    def findById(self, idPagamento: int) -> dict | None:
        print("🟣 PagamentoService.findById()")

        pagamento = Pagamento()
        pagamento.idPagamento = idPagamento

        return self.__pagamentoDAO.findById(pagamento.idPagamento)

    def _autorizar(self, pagamento: dict, usuario: dict):
        """Confere se o pagamento pertence a uma matrícula do aluno do token."""
        id_aluno = self._id_aluno_do_token(usuario)

        if int(pagamento["matricula"]["aluno"]["idAluno"]) != id_aluno:
            raise ErrorResponse(
                403,
                "Acesso negado",
                {"message": "Você só pode alterar os seus próprios pagamentos"}
            )

    def updatePagamento(self, idPagamento: int, jsonPagamento: dict, usuario: dict) -> dict | None:
        """
        Atualiza valor, vencimento, pagamento, método e status.

        :param idPagamento: int
        :param jsonPagamento: dict
        :param usuario: dict
        :return: dict | None
        """
        print("🟣 PagamentoService.updatePagamento()")

        atual = self.findById(idPagamento)
        if not atual:
            return None

        self._autorizar(atual, usuario)

        pagamento = Pagamento()

        def preencher():
            pagamento.idPagamento = idPagamento
            pagamento.valor = jsonPagamento.get("valor", atual["valor"])
            pagamento.dataVencimento = jsonPagamento.get("dataVencimento") or atual["dataVencimento"]
            pagamento.metodo = jsonPagamento.get("metodo") or atual["metodo"]
            pagamento.status = jsonPagamento.get("status") or atual["status"]
            pagamento.dataPagamento = jsonPagamento.get("dataPagamento", atual["dataPagamento"])
            pagamento.matriculaId = atual["matricula"]["idMatricula"]

        validar(preencher)

        if pagamento.status == "pago" and not pagamento.dataPagamento:
            pagamento.dataPagamento = PagamentoService.hoje()

        if pagamento.status != "pago":
            pagamento.dataPagamento = None

        atualizou = self.__pagamentoDAO.update(pagamento)
        return self.findById(idPagamento) if atualizou else None

    def deletePagamento(self, idPagamento: int, usuario: dict) -> bool:
        """
        Exclui um pagamento do aluno.

        :param idPagamento: int
        :param usuario: dict
        :return: bool
        """
        print("🟣 PagamentoService.deletePagamento()")

        atual = self.findById(idPagamento)
        if not atual:
            return False

        self._autorizar(atual, usuario)

        pagamento = Pagamento()
        pagamento.idPagamento = idPagamento

        return self.__pagamentoDAO.delete(pagamento)
