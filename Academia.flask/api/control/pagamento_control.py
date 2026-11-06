# -*- coding: utf-8 -*-
from flask import g, jsonify, request

from api.service.pagamento_service import PagamentoService
from api.utils.error_response import ErrorResponse

"""
Classe responsável por controlar os endpoints da API REST para Pagamento.

Usa flask.g.usuario (colocado pelo JWT) para garantir que o aluno só
mexa nos próprios pagamentos.
"""
class PagamentoControl:
    def __init__(self, pagamento_service: PagamentoService):
        print("⬆️  PagamentoControl.constructor()")
        self.__pagamento_service = pagamento_service

    @staticmethod
    def _usuario_autenticado() -> dict:
        return getattr(g, "usuario", None) or {}

    def minhas(self):
        """GET /api/v1/pagamentos/minhas -> pagamentos do aluno logado"""
        print("🔵 PagamentoControl.minhas()")

        id_aluno = self._usuario_autenticado().get("idAluno")
        pagamentos = self.__pagamento_service.findMinhas(id_aluno)

        return jsonify({
            "success": True,
            "message": "Busca realizada com sucesso",
            "data": {"pagamentos": pagamentos}
        }), 200

    def por_matricula(self, idMatricula: int):
        """GET /api/v1/pagamentos/matricula/<idMatricula>"""
        print("🔵 PagamentoControl.por_matricula()")

        pagamentos = self.__pagamento_service.findByMatricula(
            idMatricula,
            self._usuario_autenticado()
        )

        return jsonify({
            "success": True,
            "message": "Busca realizada com sucesso",
            "data": {"pagamentos": pagamentos}
        }), 200

    def store(self):
        """POST /api/v1/pagamentos -> registra um pagamento"""
        print("🔵 PagamentoControl.store()")

        json_pagamento = request.json.get("pagamento")
        pagamento = self.__pagamento_service.createPagamento(
            json_pagamento,
            self._usuario_autenticado()
        )

        return jsonify({
            "success": True,
            "message": "Pagamento registrado com sucesso",
            "data": {"pagamentos": [pagamento]}
        }), 201

    def index(self):
        """GET /api/v1/pagamentos -> lista todos os pagamentos"""
        print("🔵 PagamentoControl.index()")

        pagamentos = self.__pagamento_service.findMinhas(
            self._usuario_autenticado().get("idAluno")
        )

        return jsonify({
            "success": True,
            "message": "Busca realizada com sucesso",
            "data": {"pagamentos": pagamentos}
        }), 200

    def show(self, idPagamento: int):
        """GET /api/v1/pagamentos/<idPagamento>"""
        print("🔵 PagamentoControl.show()")

        pagamento = self.__pagamento_service.findById(
            idPagamento,
            self._usuario_autenticado()
        )

        if not pagamento:
            raise ErrorResponse(
                404,
                "Pagamento não encontrado",
                {"message": f"Não existe pagamento com id {idPagamento}"}
            )

        return jsonify({
            "success": True,
            "message": "Executado com sucesso",
            "data": {"pagamentos": [pagamento]}
        }), 200

    def update(self, idPagamento: int):
        """PUT /api/v1/pagamentos/<idPagamento>"""
        print("🔵 PagamentoControl.update()")

        json_pagamento = request.json.get("pagamento")
        pagamento = self.__pagamento_service.updatePagamento(
            idPagamento,
            json_pagamento,
            self._usuario_autenticado()
        )

        if not pagamento:
            raise ErrorResponse(
                404,
                "Pagamento não encontrado",
                {"message": f"Não existe pagamento com id {idPagamento} para atualização"}
            )

        return jsonify({
            "success": True,
            "message": "Atualizado com sucesso",
            "data": {"pagamentos": [pagamento]}
        }), 200

    def destroy(self, idPagamento: int):
        """DELETE /api/v1/pagamentos/<idPagamento>"""
        print("🔵 PagamentoControl.destroy()")

        excluiu = self.__pagamento_service.deletePagamento(
            idPagamento,
            self._usuario_autenticado()
        )

        if not excluiu:
            raise ErrorResponse(
                404,
                "Pagamento não encontrado",
                {"message": f"Não existe pagamento com id {idPagamento} para exclusão"}
            )

        return "", 204
