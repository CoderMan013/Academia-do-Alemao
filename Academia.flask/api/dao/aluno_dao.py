# -*- coding: utf-8 -*-
import bcrypt

from api.model.aluno import Aluno

"""
DAO da tabela Aluno.

Responsabilidades extras:
- Criptografar a senha com bcrypt antes de gravar (create/update);
- Autenticar o aluno no login (comparação com bcrypt.checkpw).
A senha nunca é devolvida nas consultas de leitura.
"""
class AlunoDAO:
    # Custo do bcrypt igual ao usado na API em Node (12)
    CUSTO_BCRYPT = 12

    def __init__(self, database_dependency):
        print("⬆️  AlunoDAO.__init__()")
        # Recebe a conexão/pool do banco por injeção, sem criar outra conexão aqui.
        self.__database = database_dependency

    @staticmethod
    def _converter(linha: dict) -> dict:
        """Converte a linha do MySQL para o mesmo formato devolvido pela API em Node."""
        # Centraliza a conversão de tipos e evita incluir a coluna "senha"
        # nas respostas usadas por consultas comuns.
        return {
            "idAluno": int(linha["idAluno"]),
            "nomeAluno": linha["nomeAluno"],
            "email": linha["email"],
            "ativo": int(linha["ativo"]),
        }

    def create(self, objAluno: Aluno) -> int:
        print("🟢 AlunoDAO.create()")
        # A senha em texto puro só é usada para calcular o hash; no banco
        # é armazenado exclusivamente o resultado do bcrypt.
        senha_hash = bcrypt.hashpw(
            objAluno.senha.encode("utf-8"),
            bcrypt.gensalt(rounds=AlunoDAO.CUSTO_BCRYPT)
        ).decode("utf-8")

        SQL = "INSERT INTO Aluno (nomeAluno, email, senha, ativo) VALUES (%s, %s, %s, %s);"
        # Placeholders (%s) mantêm os valores separados do comando SQL.
        params = (objAluno.nomeAluno, objAluno.email, senha_hash, objAluno.ativo)

        # Os context managers fecham cursor/conexão mesmo se a consulta falhar.
        with self.__database.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(SQL, params)
                conn.commit()
                insert_id = cursor.lastrowid

        # O ID gerado confirma que o INSERT realmente criou um registro.
        if not insert_id:
            raise Exception("Falha ao inserir aluno")
        return insert_id

    def delete(self, objAluno: Aluno) -> bool:
        print("🟢 AlunoDAO.delete()")
        SQL = "DELETE FROM Aluno WHERE idAluno = %s;"

        # Executa a remoção e confirma a transação no banco.
        with self.__database.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(SQL, (objAluno.idAluno,))
                conn.commit()
                affected = cursor.rowcount

        # rowcount permite ao Service/Controller distinguir ID encontrado de ausente.
        return affected > 0

    def update(self, objAluno: Aluno) -> bool:
        """
        Atualiza o aluno. Se a senha vier preenchida, é criptografada de novo.
        """
        print("🟢 AlunoDAO.update()")

        # Só recalcula o hash quando uma nova senha foi fornecida.
        if objAluno.senha:
            senha_hash = bcrypt.hashpw(
                objAluno.senha.encode("utf-8"),
                bcrypt.gensalt(rounds=AlunoDAO.CUSTO_BCRYPT)
            ).decode("utf-8")
            SQL = "UPDATE Aluno SET nomeAluno = %s, email = %s, senha = %s, ativo = %s WHERE idAluno = %s;"
            params = (
                objAluno.nomeAluno,
                objAluno.email,
                senha_hash,
                objAluno.ativo,
                objAluno.idAluno,
            )
        else:
            SQL = "UPDATE Aluno SET nomeAluno = %s, email = %s, ativo = %s WHERE idAluno = %s;"
            params = (objAluno.nomeAluno, objAluno.email, objAluno.ativo, objAluno.idAluno)

        # Nos dois casos, os parâmetros acompanham a variante correta do UPDATE.
        with self.__database.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(SQL, params)
                conn.commit()
                affected = cursor.rowcount

        return affected > 0

    def findAll(self) -> list[dict]:
        print("🟢 AlunoDAO.findAll()")
        # A consulta seleciona explicitamente os campos públicos e não lê senha.
        SQL = "SELECT idAluno, nomeAluno, email, ativo FROM Aluno ORDER BY idAluno;"

        with self.__database.get_connection() as conn:
            with conn.cursor(dictionary=True) as cursor:
                cursor.execute(SQL)
                resultados = cursor.fetchall()

        # Padroniza cada linha antes de devolvê-la à camada de Service.
        return [AlunoDAO._converter(linha) for linha in resultados]

    def findById(self, idAluno: int) -> dict | None:
        print("🟢 AlunoDAO.findById()")
        # Reaproveita a busca genérica e retorna um único resultado ou None.
        resultados = self.findByField("idAluno", idAluno)
        return resultados[0] if resultados else None

    def findByField(self, field: str, value) -> list[dict]:
        """
        :param field: idAluno | nomeAluno | email | ativo
        :param value: valor procurado
        :return: list[dict]
        """
        print(f"🟢 AlunoDAO.findByField() - Campo: {field}, Valor: {value}")

        allowed_fields = ["idAluno", "nomeAluno", "email", "ativo"]
        # O nome da coluna é interpolado no SQL; a lista permitida impede
        # que um campo arbitrário seja usado nessa posição.
        if field not in allowed_fields:
            raise ValueError(f"Campo inválido para busca: {field}")

        SQL = f"SELECT idAluno, nomeAluno, email, ativo FROM Aluno WHERE {field} = %s;"

        # O valor continua parametrizado mesmo com o campo previamente validado.
        with self.__database.get_connection() as conn:
            with conn.cursor(dictionary=True) as cursor:
                cursor.execute(SQL, (value,))
                resultados = cursor.fetchall()

        return [AlunoDAO._converter(linha) for linha in resultados]

    def login(self, email: str, senha: str) -> dict | None:
        """
        Verifica e-mail + senha e devolve o aluno autenticado (sem a senha).

        :param email: e-mail já normalizado (minúsculo)
        :param senha: senha em texto puro
        :return: dict | None
        """
        print("🟢 AlunoDAO.login()")
        # O hash precisa ser selecionado nesta consulta para conferência,
        # mas nunca é incluído no dicionário de retorno.
        SQL = "SELECT idAluno, nomeAluno, email, senha, ativo FROM Aluno WHERE email = %s;"

        with self.__database.get_connection() as conn:
            with conn.cursor(dictionary=True) as cursor:
                cursor.execute(SQL, (email,))
                resultados = cursor.fetchall()

        # Login só pode prosseguir com exatamente uma conta correspondente.
        if len(resultados) != 1:
            print("❌ Aluno não encontrado")
            return None

        aluno_db = resultados[0]

        # bcrypt compara a senha informada com o hash guardado sem descriptografá-lo.
        senha_valida = bcrypt.checkpw(
            senha.encode("utf-8"),
            aluno_db["senha"].encode("utf-8")
        )

        if not senha_valida:
            print("❌ Senha inválida")
            return None

        # Contas desativadas não podem receber autenticação válida.
        if int(aluno_db["ativo"]) != 1:
            print("❌ Aluno inativo")
            return None

        print("✅ AlunoDAO.login() -> sucesso")
        # Devolve somente dados públicos da conta; a camada superior pode
        # usar o ID/email para montar a sessão e o token.
        return {
            "idAluno": int(aluno_db["idAluno"]),
            "nomeAluno": aluno_db["nomeAluno"],
            "email": aluno_db["email"],
            "ativo": int(aluno_db["ativo"]),
        }

    def verificarSenha(self, idAluno: int, senha: str) -> bool:
        """Confere a senha atual sem expor o hash ao service ou ao cliente."""
        # Esta consulta é limitada ao ID do aluno e não retorna o hash ao chamador.
        SQL = "SELECT senha FROM Aluno WHERE idAluno = %s;"

        with self.__database.get_connection() as conn:
            with conn.cursor(dictionary=True) as cursor:
                cursor.execute(SQL, (idAluno,))
                resultados = cursor.fetchall()

        # Ausência ou duplicidade inesperada significa que a senha não confere.
        if len(resultados) != 1:
            return False

        return bcrypt.checkpw(
            senha.encode("utf-8"),
            resultados[0]["senha"].encode("utf-8")
        )

    def updatePerfil(self, idAluno: int, email: str, novaSenha: str | None = None) -> bool:
        """Atualiza e-mail e, opcionalmente, a senha do próprio aluno."""
        # O perfil tem um fluxo próprio: pode alterar apenas o e-mail ou também
        # gerar um novo hash quando a nova senha foi validada pelo Service.
        if novaSenha:
            senha_hash = bcrypt.hashpw(
                novaSenha.encode("utf-8"),
                bcrypt.gensalt(rounds=AlunoDAO.CUSTO_BCRYPT)
            ).decode("utf-8")
            SQL = "UPDATE Aluno SET email = %s, senha = %s WHERE idAluno = %s;"
            params = (email, senha_hash, idAluno)
        else:
            SQL = "UPDATE Aluno SET email = %s WHERE idAluno = %s;"
            params = (email, idAluno)

        with self.__database.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(SQL, params)
                conn.commit()

        return True
