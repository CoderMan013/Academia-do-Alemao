# -*- coding: utf-8 -*-
import bcrypt

from api.domain.modalidades import lista_para_texto, texto_para_lista
from api.model.professor import Professor

"""
DAO da tabela Professor.

Responsabilidades extras:
- Criptografar a senha com bcrypt antes de gravar;
- Autenticar o professor no login;
- Converter a coluna `modalidades` (texto) para lista na leitura.
"""
class ProfessorDAO:
    # Custo do bcrypt igual ao usado na API em Node (12)
    CUSTO_BCRYPT = 12

    def __init__(self, database_dependency):
        print("⬆️  ProfessorDAO.__init__()")
        self.__database = database_dependency

    @staticmethod
    def _converter(linha: dict) -> dict:
        """Converte a linha do MySQL para o mesmo formato devolvido pela API em Node."""
        return {
            "idProfessor": int(linha["idProfessor"]),
            "nomeProfessor": linha["nomeProfessor"],
            "email": linha["email"],
            "modalidades": texto_para_lista(linha["modalidades"]),
            "ativo": int(linha["ativo"]),
        }

    def create(self, objProfessor: Professor) -> int:
        print("🟢 ProfessorDAO.create()")

        senha_hash = bcrypt.hashpw(
            objProfessor.senha.encode("utf-8"),
            bcrypt.gensalt(rounds=ProfessorDAO.CUSTO_BCRYPT)
        ).decode("utf-8")

        SQL = """
            INSERT INTO Professor (nomeProfessor, email, senha, modalidades, ativo)
            VALUES (%s, %s, %s, %s, %s);"""
        params = (
            objProfessor.nomeProfessor,
            objProfessor.email,
            senha_hash,
            lista_para_texto(objProfessor.modalidades),
            objProfessor.ativo,
        )

        with self.__database.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(SQL, params)
                conn.commit()
                insert_id = cursor.lastrowid

        if not insert_id:
            raise Exception("Falha ao inserir professor")
        return insert_id

    def delete(self, objProfessor: Professor) -> bool:
        print("🟢 ProfessorDAO.delete()")
        SQL = "DELETE FROM Professor WHERE idProfessor = %s;"

        with self.__database.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(SQL, (objProfessor.idProfessor,))
                conn.commit()
                affected = cursor.rowcount

        return affected > 0

    def update(self, objProfessor: Professor) -> bool:
        """Atualiza o professor. Se a senha vier preenchida, é criptografada de novo."""
        print("🟢 ProfessorDAO.update()")

        if objProfessor.senha:
            senha_hash = bcrypt.hashpw(
                objProfessor.senha.encode("utf-8"),
                bcrypt.gensalt(rounds=ProfessorDAO.CUSTO_BCRYPT)
            ).decode("utf-8")
            SQL = """
                UPDATE Professor
                SET nomeProfessor = %s, email = %s, senha = %s, modalidades = %s, ativo = %s
                WHERE idProfessor = %s;"""
            params = (
                objProfessor.nomeProfessor,
                objProfessor.email,
                senha_hash,
                lista_para_texto(objProfessor.modalidades),
                objProfessor.ativo,
                objProfessor.idProfessor,
            )
        else:
            SQL = """
                UPDATE Professor
                SET nomeProfessor = %s, email = %s, modalidades = %s, ativo = %s
                WHERE idProfessor = %s;"""
            params = (
                objProfessor.nomeProfessor,
                objProfessor.email,
                lista_para_texto(objProfessor.modalidades),
                objProfessor.ativo,
                objProfessor.idProfessor,
            )

        with self.__database.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(SQL, params)
                conn.commit()
                affected = cursor.rowcount

        return affected > 0

    def update_modalidades(self, idProfessor: int, modalidades: list[str]) -> bool:
        """Substitui a lista de modalidades do professor."""
        print("🟢 ProfessorDAO.update_modalidades()")

        SQL = "UPDATE Professor SET modalidades = %s WHERE idProfessor = %s;"

        with self.__database.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(SQL, (lista_para_texto(modalidades), idProfessor))
                conn.commit()
                affected = cursor.rowcount

        return affected > 0

    def findAll(self) -> list[dict]:
        print("🟢 ProfessorDAO.findAll()")

        SQL = """
            SELECT idProfessor, nomeProfessor, email, modalidades, ativo
            FROM Professor
            ORDER BY idProfessor;"""

        with self.__database.get_connection() as conn:
            with conn.cursor(dictionary=True) as cursor:
                cursor.execute(SQL)
                resultados = cursor.fetchall()

        return [ProfessorDAO._converter(linha) for linha in resultados]

    def findById(self, idProfessor: int) -> dict | None:
        print("🟢 ProfessorDAO.findById()")
        resultados = self.findByField("idProfessor", idProfessor)
        return resultados[0] if resultados else None

    def findByField(self, field: str, value) -> list[dict]:
        """
        :param field: idProfessor | nomeProfessor | email | ativo
        :param value: valor procurado
        :return: list[dict]
        """
        print(f"🟢 ProfessorDAO.findByField() - Campo: {field}, Valor: {value}")

        allowed_fields = ["idProfessor", "nomeProfessor", "email", "ativo"]
        if field not in allowed_fields:
            raise ValueError(f"Campo inválido para busca: {field}")

        SQL = f"""
            SELECT idProfessor, nomeProfessor, email, modalidades, ativo
            FROM Professor
            WHERE {field} = %s;"""

        with self.__database.get_connection() as conn:
            with conn.cursor(dictionary=True) as cursor:
                cursor.execute(SQL, (value,))
                resultados = cursor.fetchall()

        return [ProfessorDAO._converter(linha) for linha in resultados]

    def login(self, email: str, senha: str) -> dict | None:
        """
        Verifica e-mail + senha e devolve o professor autenticado (sem a senha).

        :param email: e-mail já normalizado (minúsculo)
        :param senha: senha em texto puro
        :return: dict | None
        """
        print("🟢 ProfessorDAO.login()")

        SQL = """
            SELECT idProfessor, nomeProfessor, email, senha, modalidades, ativo
            FROM Professor
            WHERE email = %s;"""

        with self.__database.get_connection() as conn:
            with conn.cursor(dictionary=True) as cursor:
                cursor.execute(SQL, (email,))
                resultados = cursor.fetchall()

        if len(resultados) != 1:
            return None

        professor_db = resultados[0]

        senha_valida = bcrypt.checkpw(
            senha.encode("utf-8"),
            professor_db["senha"].encode("utf-8")
        )

        if not senha_valida:
            return None

        if int(professor_db["ativo"]) != 1:
            return None

        return ProfessorDAO._converter(professor_db)
