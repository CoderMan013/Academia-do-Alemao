# -*- coding: utf-8 -*-
import mysql.connector

from api.dao.aluno_dao import AlunoDAO
from api.http.meu_token_jwt import MeuTokenJWT
from api.model.aluno import Aluno
from api.service.aluno_service import AlunoService
from api.utils.error_response import ErrorResponse
from api.utils.validar import validar

"""
Regras de autenticação.

O sistema tem um único papel logado: o aluno. A conta é criada pelo
cadastro e o token guarda o id do aluno, que é o que autoriza o CRUD
das próprias matrículas e dos próprios pagamentos.
"""
class AuthService:
    def __init__(self,
                 aluno_dao_dependency: AlunoDAO,
                 aluno_service_dependency: AlunoService):
        print("⬆️  AuthService.__init__()")
        self.__alunoDAO = aluno_dao_dependency
        self.__alunoService = aluno_service_dependency

    def login(self, credenciais: dict) -> dict:
        """
        Autentica o aluno.

        :param credenciais: dict - {email, senha}
        :return: dict - {tipo, usuario, token}
        """
        print("🟣 AuthService.login()")

        email = str((credenciais or {}).get("email") or "").strip().lower()
        senha = str((credenciais or {}).get("senha") or "")

        if not email or not senha:
            raise ErrorResponse(
                400,
                "Erro na validação de dados",
                {"message": "Informe 'email' e 'senha' para efetuar o login!"}
            )

        aluno = self.__alunoDAO.login(email, senha)
        if not aluno:
            raise ErrorResponse(
                401,
                "E-mail ou senha inválidos",
                {"message": "Não foi possível autenticar com as credenciais informadas"}
            )

        return self._montar_resposta(aluno)

    def registrar(self, dados: dict) -> dict:
        """
        Cria a conta do aluno e já devolve o token, para cair direto no painel.

        :param dados: dict - {nome, email, senha}
        :return: dict - {tipo, usuario, token}
        """
        print("🟣 AuthService.registrar()")

        nome = str((dados or {}).get("nome") or "").strip()
        email = str((dados or {}).get("email") or "").strip().lower()
        senha = str((dados or {}).get("senha") or "")

        if not nome or not email or not senha:
            raise ErrorResponse(
                400,
                "Erro na validação de dados",
                {"message": "Informe 'nome', 'email' e 'senha'!"}
            )

        if self.__alunoDAO.findByField("email", email):
            raise ErrorResponse(
                400,
                "E-mail já cadastrado",
                {"message": f"O e-mail {email} já está cadastrado"}
            )

        self.__alunoService.createAluno({
            "nomeAluno": nome,
            "email": email,
            "senha": senha,
            "ativo": 1,
        })

        return self.login({"email": email, "senha": senha})

    def atualizarPerfil(self, usuario: dict, dados: dict) -> dict:
        """Atualiza o perfil do aluno identificado exclusivamente pelo JWT."""
        if not isinstance(dados, dict):
            raise ErrorResponse(
                400,
                "Erro na validação de dados",
                {"message": "Envie os dados do perfil em um objeto JSON."}
            )
        try:
            id_aluno = int((usuario or {}).get("idAluno"))
        except (TypeError, ValueError):
            id_aluno = 0

        if id_aluno <= 0:
            raise ErrorResponse(401, "Sessão inválida", {"message": "O token não identifica um aluno"})

        senha_atual = dados.get("senhaAtual")
        if not isinstance(senha_atual, str) or not senha_atual:
            raise ErrorResponse(
                400,
                "Erro na validação de dados",
                {"message": "Informe a senha atual para salvar os dados."}
            )

        if not self.__alunoDAO.verificarSenha(id_aluno, senha_atual):
            raise ErrorResponse(
                401,
                "Senha atual incorreta",
                {"message": "A senha atual informada não confere."}
            )

        aluno = Aluno()
        nova_senha = dados.get("novaSenha", "")

        def validar_dados():
            aluno.email = dados.get("email")
            if nova_senha is not None and nova_senha != "":
                aluno.senha = nova_senha

        validar(validar_dados)

        existentes = self.__alunoDAO.findByField("email", aluno.email)
        if any(int(item["idAluno"]) != id_aluno for item in existentes):
            raise ErrorResponse(
                400,
                "E-mail já cadastrado",
                {"message": f"O e-mail {aluno.email} já está cadastrado"}
            )

        try:
            atualizado = self.__alunoDAO.updatePerfil(id_aluno, aluno.email, aluno.senha)
        except mysql.connector.IntegrityError:
            raise ErrorResponse(
                400,
                "E-mail já cadastrado",
                {"message": f"O e-mail {aluno.email} já está cadastrado"}
            )

        if not atualizado:
            raise ErrorResponse(
                404,
                "Aluno não encontrado",
                {"message": f"Não existe aluno com id {id_aluno}"}
            )

        usuario_atualizado = self.__alunoDAO.findById(id_aluno)
        if not usuario_atualizado:
            raise ErrorResponse(
                404,
                "Aluno não encontrado",
                {"message": f"Não existe aluno com id {id_aluno}"}
            )

        return self._montar_resposta(usuario_atualizado)

    @staticmethod
    def _montar_resposta(usuario: dict) -> dict:
        """Monta o payload devolvido ao frontend e o token JWT."""
        claims = {
            "email": usuario["email"],
            "role": "aluno",
            "name": usuario["nomeAluno"],
            "idUsuario": usuario["idAluno"],
            "idAluno": usuario["idAluno"],
        }

        token = MeuTokenJWT().gerarToken(claims)

        return {"tipo": "aluno", "usuario": usuario, "token": token}
