# -*- coding: utf-8 -*-
from flask import g, jsonify, request

from api.service.matricula_service import MatriculaService
from api.utils.error_response import ErrorResponse

"""
Classe responsável por controlar os endpoints da API REST para Matricula.

Usa flask.g.usuario (colocado pelo JWT) para limitar as ações ao aluno logado.
"""
class MatriculaControl:
    def __init__(self, matricula_service: MatriculaService):
        print("⬆️  MatriculaControl.constructor()")
        self.__matricula_service = matricula_service

    @staticmethod
    def _usuario_autenticado() -> dict:
        return getattr(g, "usuario", None) or {}

    def store(self):
        """POST /api/v1/matriculas -> cria uma nova matrícula"""
        print("🔵 MatriculaControl.store()")

        json_matricula = request.json.get("matricula")
        resultado = self.__matricula_service.createMatricula(
            json_matricula,
            self._usuario_autenticado()
        )

        return jsonify({
            "success": True,
            "message": "Matrícula realizada com sucesso",
            "data": {"matriculas": [resultado]}
        }), 201

    def index(self):
        """GET /api/v1/matriculas -> lista todas as matrículas"""
        print("🔵 MatriculaControl.index()")

        matriculas = self.__matricula_service.findMinhas(
            self._usuario_autenticado().get("idAluno")
        )

        return jsonify({
            "success": True,
            "message": "Busca realizada com sucesso",
            "data": {"matriculas": matriculas}
        }), 200

    def minhas(self):
        """GET /api/v1/matriculas/minhas -> matrículas do aluno logado"""
        print("🔵 MatriculaControl.minhas()")

        id_aluno = self._usuario_autenticado().get("idAluno")
        matriculas = self.__matricula_service.findMinhas(id_aluno)

        return jsonify({
            "success": True,
            "message": "Busca realizada com sucesso",
            "data": {"matriculas": matriculas}
        }), 200

    def show(self, idMatricula: int):
        """GET /api/v1/matriculas/<idMatricula> -> retorna uma matrícula"""
        print("🔵 MatriculaControl.show()")

        matricula = self.__matricula_service.findById(
            idMatricula,
            self._usuario_autenticado()
        )

        if not matricula:
            raise ErrorResponse(
                404,
                "Matrícula não encontrada",
                {"message": f"Não existe matrícula com id {idMatricula}"}
            )

        return jsonify({
            "success": True,
            "message": "Executado com sucesso",
            "data": {"matriculas": [matricula]}
        }), 200

    def update(self, idMatricula: int):
        """PUT /api/v1/matriculas/<idMatricula> -> atualiza uma matrícula"""
        print("🔵 MatriculaControl.update()")

        json_matricula = request.json.get("matricula")
        matricula = self.__matricula_service.updateMatricula(
            idMatricula,
            json_matricula,
            self._usuario_autenticado()
        )

        if not matricula:
            raise ErrorResponse(
                404,
                "Matrícula não encontrada",
                {"message": f"Não existe matrícula com id {idMatricula} para atualização"}
            )

        return jsonify({
            "success": True,
            "message": "Atualizado com sucesso",
            "data": {"matriculas": [matricula]}
        }), 200

    def destroy(self, idMatricula: int):
        """DELETE /api/v1/matriculas/<idMatricula> -> remove uma matrícula"""
        print("🔵 MatriculaControl.destroy()")

        excluiu = self.__matricula_service.deleteMatricula(
            idMatricula,
            self._usuario_autenticado()
        )

        if not excluiu:
            raise ErrorResponse(
                404,
                "Matrícula não encontrada",
                {"message": f"Não existe matrícula com id {idMatricula} para exclusão"}
            )

        return "", 204
