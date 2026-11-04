# -*- coding: utf-8 -*-
from flask import g, jsonify, request

from api.service.professor_service import ProfessorService
from api.utils.error_response import ErrorResponse

"""
Classe responsável por controlar os endpoints da API REST para a entidade Professor.

Todas as respostas usam o mesmo envelope da API em Node: { success, message, data }.
"""
class ProfessorControl:
    def __init__(self, professor_service: ProfessorService):
        print("⬆️  ProfessorControl.constructor()")
        self.__professor_service = professor_service

    @staticmethod
    def _usuario_autenticado() -> dict:
        """Claims do token, colocados em flask.g pelo JwtMiddleware."""
        return getattr(g, "usuario", None) or {}

    @staticmethod
    def _ativo_do_body(json_professor: dict) -> int:
        ativo = json_professor.get("ativo")
        return 1 if ativo is None else int(ativo)

    def store(self):
        """POST /api/v1/professores -> cria um novo professor"""
        print("🔵 ProfessorControl.store()")

        json_professor = request.json.get("professor")
        novo_id = self.__professor_service.createProfessor(json_professor)
        professor = self.__professor_service.findById(novo_id)

        return jsonify({
            "success": True,
            "message": "Cadastro realizado com sucesso",
            "data": {"professores": [professor]}
        }), 201

    def index(self):
        """GET /api/v1/professores -> lista todos os professores"""
        print("🔵 ProfessorControl.index()")

        professores = self.__professor_service.findAll()

        return jsonify({
            "success": True,
            "message": "Busca realizada com sucesso",
            "data": {"professores": professores}
        }), 200

    def me(self):
        """GET /api/v1/professores/me -> perfil do professor logado"""
        print("🔵 ProfessorControl.me()")

        id_professor = self._usuario_autenticado().get("idProfessor")
        professor = self.__professor_service.findById(id_professor)

        if not professor:
            raise ErrorResponse(
                404,
                "Professor não encontrado",
                {"message": "O professor do token não existe mais"}
            )

        return jsonify({
            "success": True,
            "message": "Executado com sucesso",
            "data": {"professores": [professor]}
        }), 200

    def meus_alunos(self):
        """GET /api/v1/professores/me/alunos -> matrículas das turmas do professor"""
        print("🔵 ProfessorControl.meus_alunos()")

        id_professor = self._usuario_autenticado().get("idProfessor")
        professor = self.__professor_service.findById(id_professor)

        if not professor:
            raise ErrorResponse(
                404,
                "Professor não encontrado",
                {"message": "O professor do token não existe mais"}
            )

        matriculas = self.__professor_service.findMeusAlunos(id_professor)

        return jsonify({
            "success": True,
            "message": "Busca realizada com sucesso",
            "data": {"matriculas": matriculas}
        }), 200

    def atualizar_modalidades(self):
        """PUT /api/v1/professores/me/modalidades -> entra/sai de modalidades"""
        print("🔵 ProfessorControl.atualizar_modalidades()")

        id_professor = self._usuario_autenticado().get("idProfessor")
        professor = self.__professor_service.updateModalidades(
            id_professor,
            (request.json or {}).get("modalidades")
        )

        return jsonify({
            "success": True,
            "message": "Modalidades atualizadas com sucesso",
            "data": {"professores": [professor]}
        }), 200

    def show(self, idProfessor: int):
        """GET /api/v1/professores/<idProfessor> -> retorna um professor"""
        print("🔵 ProfessorControl.show()")

        professor = self.__professor_service.findById(idProfessor)

        if not professor:
            raise ErrorResponse(
                404,
                "Professor não encontrado",
                {"message": f"Não existe professor com id {idProfessor}"}
            )

        return jsonify({
            "success": True,
            "message": "Executado com sucesso",
            "data": {"professores": [professor]}
        }), 200

    def update(self, idProfessor: int):
        """PUT /api/v1/professores/<idProfessor> -> atualiza um professor"""
        print("🔵 ProfessorControl.update()")

        json_professor = request.json.get("professor")
        atualizou = self.__professor_service.updateProfessor(idProfessor, json_professor)

        if not atualizou:
            raise ErrorResponse(
                404,
                "Professor não encontrado",
                {"message": f"Não existe professor com id {idProfessor} para atualização"}
            )

        professor = self.__professor_service.findById(idProfessor)

        return jsonify({
            "success": True,
            "message": "Atualizado com sucesso",
            "data": {"professores": [professor]}
        }), 200

    def destroy(self, idProfessor: int):
        """DELETE /api/v1/professores/<idProfessor> -> remove um professor"""
        print("🔵 ProfessorControl.destroy()")

        excluiu = self.__professor_service.deleteProfessor(idProfessor)

        if not excluiu:
            raise ErrorResponse(
                404,
                "Professor não encontrado",
                {"message": f"Não existe professor com id {idProfessor} para exclusão"}
            )

        return "", 204
