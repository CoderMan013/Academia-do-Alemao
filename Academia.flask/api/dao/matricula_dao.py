# -*- coding: utf-8 -*-
from api.model.matricula import Matricula

"""
DAO da tabela Matricula.

As consultas de leitura usam JOIN com Aluno para devolver o aluno
já aninhado no objeto.
"""
class MatriculaDAO:
    def __init__(self, database_dependency):
        print("⬆️  MatriculaDAO.__init__()")
        self.__database = database_dependency

    def create(self, objMatricula: Matricula) -> int:
        print("🟢 MatriculaDAO.create()")

        SQL = """
            INSERT INTO Matricula (modalidade, dataInicio, dataFim, status, Aluno_idAluno)
            VALUES (%s, %s, %s, %s, %s);"""
        params = (
            objMatricula.modalidade,
            objMatricula.dataInicio,
            objMatricula.dataFim,
            objMatricula.status,
            objMatricula.aluno.idAluno,
        )

        with self.__database.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(SQL, params)
                conn.commit()
                insert_id = cursor.lastrowid

        if not insert_id:
            raise Exception("Falha ao inserir matrícula")
        return insert_id

    def delete(self, objMatricula: Matricula) -> bool:
        print("🟢 MatriculaDAO.delete()")
        SQL = "DELETE FROM Matricula WHERE idMatricula = %s;"

        with self.__database.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(SQL, (objMatricula.idMatricula,))
                conn.commit()
                affected = cursor.rowcount

        return affected > 0

    def update(self, objMatricula: Matricula) -> bool:
        print("🟢 MatriculaDAO.update()")

        SQL = """
            UPDATE Matricula
            SET modalidade = %s, dataInicio = %s, dataFim = %s, status = %s, Aluno_idAluno = %s
            WHERE idMatricula = %s;"""
        params = (
            objMatricula.modalidade,
            objMatricula.dataInicio,
            objMatricula.dataFim,
            objMatricula.status,
            objMatricula.aluno.idAluno,
            objMatricula.idMatricula,
        )

        with self.__database.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(SQL, params)
                conn.commit()
                affected = cursor.rowcount

        return affected > 0

    def findAll(self) -> list[dict]:
        print("🟢 MatriculaDAO.findAll()")

        SQL = """
            SELECT m.idMatricula, m.modalidade, m.dataInicio, m.dataFim, m.status,
                   a.idAluno, a.nomeAluno, a.email AS emailAluno
            FROM Matricula m
            JOIN Aluno a ON a.idAluno = m.Aluno_idAluno
            ORDER BY m.idMatricula;"""

        with self.__database.get_connection() as conn:
            with conn.cursor(dictionary=True) as cursor:
                cursor.execute(SQL)
                matriz_dados = cursor.fetchall()

        return [MatriculaDAO.montar_objeto(linha) for linha in matriz_dados]

    def findById(self, idMatricula: int) -> dict | None:
        print("🟢 MatriculaDAO.findById()")
        resultados = self.findByField("idMatricula", idMatricula)
        return resultados[0] if resultados else None

    def findByAluno(self, idAluno: int) -> list[dict]:
        print("🟢 MatriculaDAO.findByAluno()")
        return self.findByField("Aluno_idAluno", idAluno)

    def findByField(self, field: str, value) -> list[dict]:
        """
        :param field: idMatricula | status | modalidade | Aluno_idAluno
        :param value: valor procurado
        :return: list[dict]
        """
        print(f"🟢 MatriculaDAO.findByField() - Campo: {field}, Valor: {value}")

        allowed_fields = ["idMatricula", "status", "modalidade", "Aluno_idAluno"]
        if field not in allowed_fields:
            raise ValueError(f"Campo inválido para busca: {field}")

        SQL = f"""
            SELECT m.idMatricula, m.modalidade, m.dataInicio, m.dataFim, m.status,
                   a.idAluno, a.nomeAluno, a.email AS emailAluno
            FROM Matricula m
            JOIN Aluno a ON a.idAluno = m.Aluno_idAluno
            WHERE m.{field} = %s
            ORDER BY m.idMatricula;"""

        with self.__database.get_connection() as conn:
            with conn.cursor(dictionary=True) as cursor:
                cursor.execute(SQL, (value,))
                matriz_dados = cursor.fetchall()

        return [MatriculaDAO.montar_objeto(linha) for linha in matriz_dados]

    def countByAluno(self, idAluno: int, status: str | None = None) -> int:
        """Quantidade de matrículas de um aluno (usada nas regras de negócio)."""
        print("🟢 MatriculaDAO.countByAluno()")

        SQL = "SELECT COUNT(*) AS total FROM Matricula WHERE Aluno_idAluno = %s"
        params = [idAluno]

        if status:
            SQL += " AND status = %s"
            params.append(status)

        with self.__database.get_connection() as conn:
            with conn.cursor(dictionary=True) as cursor:
                cursor.execute(SQL, tuple(params))
                resultado = cursor.fetchall()

        return int(resultado[0]["total"])

    def countByAlunoModalidade(self, idAluno: int, modalidade: str,
                               status: str | None = None, ignorar_id: int | None = None) -> int:
        """Matrículas de um aluno em uma modalidade."""
        print("🟢 MatriculaDAO.countByAlunoModalidade()")

        SQL = """
            SELECT COUNT(*) AS total
            FROM Matricula
            WHERE Aluno_idAluno = %s AND modalidade = %s"""
        params = [idAluno, modalidade]

        if status:
            SQL += " AND status = %s"
            params.append(status)

        if ignorar_id:
            SQL += " AND idMatricula <> %s"
            params.append(ignorar_id)

        with self.__database.get_connection() as conn:
            with conn.cursor(dictionary=True) as cursor:
                cursor.execute(SQL, tuple(params))
                resultado = cursor.fetchall()

        return int(resultado[0]["total"])

    @staticmethod
    def montar_objeto(linha: dict) -> dict:
        """Monta o objeto aninhado (aluno) a partir da linha do JOIN."""
        return {
            "idMatricula": int(linha["idMatricula"]),
            "modalidade": linha["modalidade"],
            "dataInicio": Matricula.normalizar_data(linha["dataInicio"]),
            "dataFim": Matricula.normalizar_data(linha["dataFim"]),
            "status": linha["status"],
            "aluno": {
                "idAluno": int(linha["idAluno"]),
                "nomeAluno": linha["nomeAluno"],
                "email": linha["emailAluno"],
            },
        }
