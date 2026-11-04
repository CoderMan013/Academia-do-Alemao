# -*- coding: utf-8 -*-
from api.dao.aluno_dao import AlunoDAO
from api.dao.professor_dao import ProfessorDAO
from api.http.meu_token_jwt import MeuTokenJWT
from api.service.aluno_service import AlunoService
from api.service.professor_service import ProfessorService
from api.utils.error_response import ErrorResponse

"""
Regras de autenticação dos dois tipos de usuário.

- Aluno e Professor têm e-mail/senha em tabelas diferentes, então o login
  procura primeiro no Aluno e depois no Professor;
- O token guarda o papel (role) e o id do usuário, e é isso que permite a
  API limitar cada tela ao que o usuário pode fazer.
"""
class AuthService:
    def __init__(self,
                 aluno_dao_dependency: AlunoDAO,
                 professor_dao_dependency: ProfessorDAO,
                 aluno_service_dependency: AlunoService,
                 professor_service_dependency: ProfessorService):
        print("⬆️  AuthService.__init__()")
        self.__alunoDAO = aluno_dao_dependency
        self.__professorDAO = professor_dao_dependency
        self.__alunoService = aluno_service_dependency
        self.__professorService = professor_service_dependency

    def login(self, credenciais: dict) -> dict:
        """
        Autentica aluno ou professor.

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
        if aluno:
            return self._montar_resposta("aluno", aluno)

        professor = self.__professorDAO.login(email, senha)
        if professor:
            return self._montar_resposta("professor", professor)

        raise ErrorResponse(
            401,
            "E-mail ou senha inválidos",
            {"message": "Não foi possível autenticar com as credenciais informadas"}
        )

    def registrar(self, dados: dict) -> dict:
        """
        Cria a conta (1ª tela escolhe o tipo, 2ª tela manda o resto) e já
        devolve o token, para o usuário cair direto no painel.

        :param dados: dict - {tipo, nome, email, senha, modalidades?}
        :return: dict - {tipo, usuario, token}
        """
        print("🟣 AuthService.registrar()")

        tipo = str((dados or {}).get("tipo") or "").strip().lower()
        if tipo not in ("aluno", "professor"):
            raise ErrorResponse(
                400,
                "Erro na validação de dados",
                {"message": "O campo 'tipo' deve ser 'aluno' ou 'professor'!"}
            )

        nome = str((dados or {}).get("nome") or "").strip()
        email = str((dados or {}).get("email") or "").strip().lower()
        senha = str((dados or {}).get("senha") or "")

        if not nome or not email or not senha:
            raise ErrorResponse(
                400,
                "Erro na validação de dados",
                {"message": "Informe 'nome', 'email' e 'senha'!"}
            )

        # O e-mail é a credencial de login: não pode existir nos dois tipos.
        if self.__alunoDAO.findByField("email", email) or self.__professorDAO.findByField("email", email):
            raise ErrorResponse(
                400,
                "E-mail já cadastrado",
                {"message": f"O e-mail {email} já está cadastrado"}
            )

        if tipo == "aluno":
            self.__alunoService.createAluno({
                "nomeAluno": nome,
                "email": email,
                "senha": senha,
                "ativo": 1,
            })
        else:
            self.__professorService.createProfessor({
                "nomeProfessor": nome,
                "email": email,
                "senha": senha,
                "modalidades": dados.get("modalidades") or [],
                "ativo": 1,
            })

        return self.login({"email": email, "senha": senha})

    @staticmethod
    def _montar_resposta(tipo: str, usuario: dict) -> dict:
        """Monta o payload devolvido ao frontend e o token JWT."""
        eh_aluno = tipo == "aluno"

        nome = usuario["nomeAluno"] if eh_aluno else usuario["nomeProfessor"]
        id_usuario = usuario["idAluno"] if eh_aluno else usuario["idProfessor"]

        claims = {
            "email": usuario["email"],
            "role": tipo,
            "name": nome,
            "idUsuario": id_usuario,
        }

        if eh_aluno:
            claims["idAluno"] = usuario["idAluno"]
        else:
            claims["idProfessor"] = usuario["idProfessor"]

        token = MeuTokenJWT().gerarToken(claims)

        return {"tipo": tipo, "usuario": usuario, "token": token}
