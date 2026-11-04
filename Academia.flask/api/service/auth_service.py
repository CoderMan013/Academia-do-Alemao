# -*- coding: utf-8 -*-
from api.dao.aluno_dao import AlunoDAO
from api.http.meu_token_jwt import MeuTokenJWT
from api.service.aluno_service import AlunoService
from api.utils.error_response import ErrorResponse

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
