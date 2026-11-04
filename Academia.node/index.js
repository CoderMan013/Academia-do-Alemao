const Server = require("./Server");

/**
 * Arquivo principal de inicialização da API (item 1 da ficha).
 *
 * Responsabilidades:
 * - Criar a instância do servidor
 * - Inicializar dependências (banco, middlewares, rotas)
 * - Subir o servidor Express na porta 8080
 */
(async () => {
    try {
        const server = new Server(8080);
        await server.init();
        server.run();
        console.log("✅ API Node (alunos / modalidades / matriculas / pagamentos) iniciada");
    } catch (error) {
        console.error("❌ Erro ao iniciar o servidor:", error);
    }
})();
