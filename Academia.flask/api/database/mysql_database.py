# -*- coding: utf-8 -*-
import mysql.connector
from mysql.connector import pooling
import sys


class MysqlDatabase:
    """
    Classe responsável por gerenciar a conexão com o banco MySQL.

    Implementa um singleton usando pool de conexões para reutilização,
    garantindo eficiência e desempenho na aplicação.
    """
    __pool = None

    def __init__(self, pool_name="mypool", pool_size=25, pool_reset_session=True,
                 host="127.0.0.1", user="root", password="", database="academia_db", port=3306):
        """
        Construtor que recebe parâmetros de configuração do pool.
        """
        self.pool_name = pool_name
        self.pool_size = pool_size
        self.pool_reset_session = pool_reset_session
        self.host = host
        self.user = user
        self.password = password
        self.database = database
        self.port = port

    def connect(self):
        """
        Cria e retorna o pool de conexões MySQL.
        Se o pool já existir, retorna o mesmo (singleton).
        """
        if MysqlDatabase.__pool is None:
            try:
                MysqlDatabase.__pool = mysql.connector.pooling.MySQLConnectionPool(
                    pool_name=self.pool_name,
                    pool_size=self.pool_size,
                    pool_reset_session=self.pool_reset_session,
                    host=self.host,
                    user=self.user,
                    password=self.password,
                    database=self.database,
                    port=self.port
                )

                # Testa a conexão
                conn = MysqlDatabase.__pool.get_connection()
                print(f"⬆️  Conectado ao MySQL ({self.database}) com sucesso!")
                conn.close()  # Libera a conexão de teste
            except mysql.connector.Error as err:
                print(f"❌ Falha ao conectar ao MySQL: {err}")
                sys.exit(1)
        return MysqlDatabase.__pool

    def get_connection(self):
        pool = self.connect()
        return pool.get_connection()
