# -*- coding: utf-8 -*-
from flask import jsonify, request

from api.service.aluno_service import AlunoService
from api.utils.error_response import ErrorResponse

"""
Classe responsável por controlar os endpoints da API REST para a entidade Aluno.

Além do CRUD, expõe o endpoint de login que devolve o token JWT.

Todas as respostas usam o mesmo envelope da API em Node: { success, message, data }.
"""
class AlunoControl:
    def __init__(self, aluno_service: AlunoService):
        """
        Construtor da classe AlunoControl
        :param aluno_service: Instância do AlunoService (injeção de dependência)
        """
        print("⬆️  AlunoControl.constructor()")
        # O Controller não acessa o banco diretamente: recebe o Service pronto
        # e encaminha para ele as operações pedidas pelas rotas.
        self.__aluno_service = aluno_service

    @staticmethod
    def _ativo_do_body(json_aluno: dict) -> int:
        """Mesmo comportamento do `ativo WARNING: 1` do JavaScript (0 é um valor válido)."""
        ativo = json_aluno.get("ativo")
        # Só usa 1 como padrão quando o campo não foi enviado; 0 significa inativo.
        return 1 if ativo is None else int(ativo)

    def login(self):
        """POST /api/v1/alunos/login -> autentica e devolve o token JWT"""
        print("🔵 AlunoControl.login()")

        # O contrato desta rota espera os dados agrupados em "aluno".
        json_aluno = request.json.get("aluno")
        # Regras de credenciais e geração do token pertencem ao Service.
        resultado = self.__aluno_service.loginAluno(json_aluno)

        # O Controller transforma o resultado do Service em uma resposta HTTP JSON.
        return jsonify({
            "success": True,
            "message": "Login efetuado com sucesso!",
            "data": resultado
        }), 200

    def store(self):
        """POST /api/v1/alunos -> cria um novo aluno"""
        print("🔵 AlunoControl.store()")

        # Lê o objeto validado pelo Middleware e pede ao Service a criação.
        json_aluno = request.json.get("aluno")
        novo_id = self.__aluno_service.createAluno(json_aluno)

        # Retorna 201 (Created) e o identificador gerado pelo banco,
        # sem incluir a senha na resposta.
        return jsonify({
            "success": True,
            "message": "Cadastro realizado com sucesso",
            "data": {
                "alunos": [
                    {
                        "idAluno": novo_id,
                        "nomeAluno": json_aluno.get("nomeAluno"),
                        "email": json_aluno.get("email"),
                        "ativo": self._ativo_do_body(json_aluno),
                    }
                ]
            }
        }), 201

    def index(self):
        """GET /api/v1/alunos -> lista todos os alunos"""
        print("🔵 AlunoControl.index()")

        # A consulta é delegada; o DAO omite o hash da senha dos resultados.
        array_alunos = self.__aluno_service.findAll()

        # A lista fica dentro de "data.alunos" para manter o envelope da API.
        return jsonify({
            "success": True,
            "message": "Busca realizada com sucesso",
            "data": {"alunos": array_alunos}
        }), 200

    def show(self, idAluno: int):
        """GET /api/v1/alunos/<idAluno> -> retorna um aluno específico"""
        print("🔵 AlunoControl.show()")

        # Usa o ID extraído da URL pela rota e encaminha a busca ao Service.
        aluno = self.__aluno_service.findById(idAluno)

        # Converte uma busca sem resultado em HTTP 404 padronizado.
        if not aluno:
            raise ErrorResponse(
                404,
                "Aluno não encontrado",
                {"message": f"Não existe aluno com id {idAluno}"}
            )

        # A API mantém listas no envelope mesmo quando retorna somente um aluno.
        return jsonify({
            "success": True,
            "message": "Executado com sucesso",
            "data": {"alunos": [aluno]}
        }), 200

    def update(self, idAluno: int):
        """PUT /api/v1/alunos/<idAluno> -> atualiza um aluno"""
        print("🔵 AlunoControl.update()")

        # O Middleware já verificou os campos obrigatórios do corpo.
        json_aluno = request.json.get("aluno")
        atualizou = self.__aluno_service.updateAluno(idAluno, json_aluno)

        # O Service/DAO sinaliza False se o ID não corresponder a um registro.
        if not atualizou:
            raise ErrorResponse(
                404,
                "Aluno não encontrado",
                {"message": f"Não existe aluno com id {idAluno} para atualização"}
            )

        # Devolve os dados atualizados sem expor credenciais.
        return jsonify({
            "success": True,
            "message": "Atualizado com sucesso",
            "data": {
                "alunos": [
                    {
                        "idAluno": int(idAluno),
                        "nomeAluno": json_aluno.get("nomeAluno"),
                        "email": json_aluno.get("email"),
                        "ativo": self._ativo_do_body(json_aluno),
                    }
                ]
            }
        }), 200

    def destroy(self, idAluno: int):
        """DELETE /api/v1/alunos/<idAluno> -> remove um aluno"""
        print("🔵 AlunoControl.destroy()")

        # O Service também verifica se há matrículas vinculadas antes da exclusão.
        excluiu = self.__aluno_service.deleteAluno(idAluno)

        # Um ID inexistente não é tratado como exclusão bem-sucedida.
        if not excluiu:
            raise ErrorResponse(
                404,
                "Aluno não encontrado",
                {"message": f"Não existe aluno com id {idAluno} para exclusão"}
            )

        # 204 não tem corpo (o frontend trata o status 204 como sucesso)
        return "", 204
