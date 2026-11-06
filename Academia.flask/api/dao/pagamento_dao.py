# -*- coding: utf-8 -*-
from api.model.pagamento import Pagamento

"""
DAO da tabela Pagamento.

As leituras usam JOIN com Matricula e Aluno para devolver o treino e
o dono do pagamento. O status legado "atrasado" é apresentado como
"pendente", sem alterar os registros armazenados.
"""
class PagamentoDAO:
    SELECT_BASE = """
        SELECT p.idPagamento, p.valor, p.dataVencimento, p.dataPagamento,
               p.metodo,
               CASE
                   WHEN p.status = 'atrasado' THEN 'pendente'
                   ELSE p.status
               END AS status,
               m.idMatricula, m.treino AS modalidade,
               a.idAluno, a.nomeAluno, a.email AS emailAluno
        FROM Pagamento p
        JOIN Matricula m ON m.idMatricula = p.Matricula_idMatricula
        JOIN Aluno a ON a.idAluno = m.Aluno_idAluno"""

    def __init__(self, database_dependency):
        print("⬆️  PagamentoDAO.__init__()")
        self.__database = database_dependency

    def create(self, objPagamento: Pagamento, conn=None) -> int:
        print("🟢 PagamentoDAO.create()")

        SQL = """
            INSERT INTO Pagamento (valor, dataVencimento, dataPagamento, metodo, status, Matricula_idMatricula)
            VALUES (%s, %s, %s, %s, %s, %s);"""
        params = (
            objPagamento.valor,
            objPagamento.dataVencimento,
            objPagamento.dataPagamento,
            objPagamento.metodo,
            objPagamento.status,
            objPagamento.matriculaId,
        )

        if conn is None:
            with self.__database.get_connection() as connection:
                with connection.cursor() as cursor:
                    cursor.execute(SQL, params)
                    connection.commit()
                    insert_id = cursor.lastrowid
        else:
            with conn.cursor() as cursor:
                cursor.execute(SQL, params)
                insert_id = cursor.lastrowid

        if not insert_id:
            raise Exception("Falha ao inserir pagamento")
        return insert_id

    def delete(self, objPagamento: Pagamento) -> bool:
        print("🟢 PagamentoDAO.delete()")
        SQL = "DELETE FROM Pagamento WHERE idPagamento = %s;"

        with self.__database.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(SQL, (objPagamento.idPagamento,))
                conn.commit()
                affected = cursor.rowcount

        return affected > 0

    def update(self, objPagamento: Pagamento) -> bool:
        print("🟢 PagamentoDAO.update()")

        SQL = """
            UPDATE Pagamento
            SET valor = %s, dataVencimento = %s, dataPagamento = %s, metodo = %s, status = %s
            WHERE idPagamento = %s;"""
        params = (
            objPagamento.valor,
            objPagamento.dataVencimento,
            objPagamento.dataPagamento,
            objPagamento.metodo,
            objPagamento.status,
            objPagamento.idPagamento,
        )

        with self.__database.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(SQL, params)
                conn.commit()
                affected = cursor.rowcount

        return affected > 0

    def findAll(self) -> list[dict]:
        print("🟢 PagamentoDAO.findAll()")

        SQL = f"{PagamentoDAO.SELECT_BASE} ORDER BY p.dataVencimento, p.idPagamento;"

        with self.__database.get_connection() as conn:
            with conn.cursor(dictionary=True) as cursor:
                cursor.execute(SQL)
                matriz_dados = cursor.fetchall()

        return [PagamentoDAO.montar_objeto(linha) for linha in matriz_dados]

    def findById(self, idPagamento: int) -> dict | None:
        print("🟢 PagamentoDAO.findById()")

        SQL = f"{PagamentoDAO.SELECT_BASE} WHERE p.idPagamento = %s;"

        with self.__database.get_connection() as conn:
            with conn.cursor(dictionary=True) as cursor:
                cursor.execute(SQL, (idPagamento,))
                resultado = cursor.fetchall()

        return PagamentoDAO.montar_objeto(resultado[0]) if resultado else None

    def findByMatricula(self, idMatricula: int) -> list[dict]:
        print("🟢 PagamentoDAO.findByMatricula()")

        SQL = f"{PagamentoDAO.SELECT_BASE} WHERE m.idMatricula = %s ORDER BY p.dataVencimento;"

        with self.__database.get_connection() as conn:
            with conn.cursor(dictionary=True) as cursor:
                cursor.execute(SQL, (idMatricula,))
                resultados = cursor.fetchall()

        return [PagamentoDAO.montar_objeto(linha) for linha in resultados]

    def findByAluno(self, idAluno: int) -> list[dict]:
        print("🟢 PagamentoDAO.findByAluno()")

        SQL = f"{PagamentoDAO.SELECT_BASE} WHERE a.idAluno = %s ORDER BY p.dataVencimento;"

        with self.__database.get_connection() as conn:
            with conn.cursor(dictionary=True) as cursor:
                cursor.execute(SQL, (idAluno,))
                resultados = cursor.fetchall()

        return [PagamentoDAO.montar_objeto(linha) for linha in resultados]

    def countByMatricula(self, idMatricula: int) -> int:
        print("🟢 PagamentoDAO.countByMatricula()")

        SQL = "SELECT COUNT(*) AS total FROM Pagamento WHERE Matricula_idMatricula = %s;"

        with self.__database.get_connection() as conn:
            with conn.cursor(dictionary=True) as cursor:
                cursor.execute(SQL, (idMatricula,))
                resultado = cursor.fetchall()

        return int(resultado[0]["total"])

    @staticmethod
    def montar_objeto(linha: dict) -> dict:
        """Monta o objeto aninhado (matrícula + aluno) a partir da linha do JOIN."""
        return {
            "idPagamento": int(linha["idPagamento"]),
            "valor": float(linha["valor"]),
            "dataVencimento": Pagamento.normalizar_data(linha["dataVencimento"]),
            "dataPagamento": Pagamento.normalizar_data(linha["dataPagamento"]) if linha["dataPagamento"] else None,
            "metodo": linha["metodo"],
            "status": linha["status"],
            "matricula": {
                "idMatricula": int(linha["idMatricula"]),
                "modalidade": linha["modalidade"],
                "aluno": {
                    "idAluno": int(linha["idAluno"]),
                    "nomeAluno": linha["nomeAluno"],
                    "email": linha["emailAluno"],
                },
            },
        }
