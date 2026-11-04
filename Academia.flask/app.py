from server import Server

"""
Arquivo principal de inicialização do servidor Flask (item 2 da ficha).

Responsabilidades:
- Cria a instância do servidor
- Inicializa todas as dependências (banco, middlewares, rotas)
- Inicia o servidor na porta 8081 (a API em Node usa a 8080)
"""


def main():
    try:
        # Cria instância do servidor na porta 8081
        server = Server(porta=8081)

        # Inicializa servidor (DB, middlewares, roteadores)
        server.init()

        # Inicia servidor Flask
        server.run()

        print("✅ Servidor iniciado com sucesso")
    except Exception as error:
        print("❌ Erro ao iniciar o servidor:", error)


if __name__ == "__main__":
    main()
