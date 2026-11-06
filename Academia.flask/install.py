import os
import subprocess
import sys

import mysql.connector
from mysql.connector import errorcode

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


# --------- Passo 1: Instalar bibliotecas ---------
def install_packages():
    packages = ["flask", "flask-cors", "mysql-connector-python", "bcrypt", "pyjwt"]
    for pkg in packages:
        subprocess.check_call([sys.executable, "-m", "pip", "install", pkg])


# --------- Passo 2: Criar banco de dados a partir do arquivo SQL ---------
def setup_database(host="127.0.0.1", user="root", password="", port=3306, sql_file=None):
    sql_file = sql_file or os.path.join(BASE_DIR, "docs", "Banco.sql")
    cnx = None
    cursor = None

    try:
        # Conecta ao MySQL (sem especificar database ainda)
        cnx = mysql.connector.connect(host=host, user=user, password=password, port=port)
        cursor = cnx.cursor()

        # Executa o SQL do arquivo
        with open(sql_file, 'r', encoding='utf-8') as f:
            sql_script = f.read()

        # Separar comandos individuais por ';'
        commands = [command.strip() for command in sql_script.split(';') if command.strip()]

        for command in commands:
            cursor.execute(command)

        cnx.commit()
        print(f"Script SQL '{sql_file}' executado com sucesso!")
        return True

    except mysql.connector.Error as err:
        if err.errno == errorcode.ER_ACCESS_DENIED_ERROR:
            print("Erro: usuário ou senha incorretos")
        elif err.errno == errorcode.CR_CONN_HOST_ERROR:
            print(f"Erro: não foi possível conectar em {host}:{port}. O MySQL está rodandoOK:")
        else:
            print(err)
        return False
    finally:
        if cursor is not None:
            cursor.close()
        if cnx is not None:
            cnx.close()


# --------- Execução ---------
if __name__ == "__main__":
    print("Instalando pacotes...")
    install_packages()
    print("Configurando banco de dados...")
    setup_database(password="")  # o MySQL local (XAMPP/Workbench) usa root sem senha
