/**
 * ApiService - encapsula as chamadas HTTP para a API.
 *
 * - Recebe apenas o token JWT;
 * - Sempre conversa com a API da MESMA ORIGEM (quem entrega o HTML é o próprio
 *   servidor: :8080 no Node ou :8081 no Flask), por isso as URLs são relativas;
 * - Envia o header Authorization: Bearer <token>;
 * - Devolve sempre um objeto com { success, message, data, statusHttp },
 *   mesmo quando a API está fora do ar (assim a tela mostra a mensagem certa).
 */
export default class ApiService {
    #token;

    /**
     * @param {string|null} token - token JWT
     */
    constructor(token = null) {
        this.#token = token;
    }

    #headers(comCorpo = false) {
        const headers = {};
        if (comCorpo) headers["Content-Type"] = "application/json";
        if (this.#token) headers["Authorization"] = `Bearer ${this.#token}`;
        return headers;
    }

    /**
     * Executa a requisição e normaliza a resposta.
     * @param {string} metodo
     * @param {string} uri
     * @param {object|undefined} corpo
     */
    async #executar(metodo, uri, corpo) {
        try {
            const resposta = await fetch(uri, {
                method: metodo,
                headers: this.#headers(corpo !== undefined),
                body: corpo === undefined ? undefined : JSON.stringify(corpo)
            });

            // DELETE responde 204 (sem corpo)
            if (resposta.status === 204) {
                return { success: true, message: "Excluído com sucesso", statusHttp: 204 };
            }

            const json = await resposta.json().catch(() => ({}));
            json.statusHttp = resposta.status;
            console.log(`${metodo} ${uri} -> ${resposta.status}`, json);
            return json;
        } catch (erro) {
            console.error(`Erro em ${metodo} ${uri}:`, erro.message);
            return {
                success: false,
                statusHttp: 0,
                message: "Não foi possível falar com a API. Ela está rodando?",
                error: { message: erro.message }
            };
        }
    }

    /** GET simples, sem token (usado em endpoints públicos). */
    async simpleGet(uri) {
        return await this.#executar("GET", uri);
    }

    async get(uri) {
        return await this.#executar("GET", uri);
    }

    async getById(uri, id) {
        return await this.#executar("GET", `${uri}/${id}`);
    }

    async post(uri, jsonObject) {
        return await this.#executar("POST", uri, jsonObject);
    }

    async put(uri, id, jsonObject) {
        return await this.#executar("PUT", `${uri}/${id}`, jsonObject);
    }

    /** PUT em uma rota sem id (ex.: /professores/me/modalidades). */
    async putDireto(uri, jsonObject) {
        return await this.#executar("PUT", uri, jsonObject);
    }

    async delete(uri, id) {
        return await this.#executar("DELETE", `${uri}/${id}`);
    }

    get token() {
        return this.#token;
    }

    set token(valor) {
        this.#token = valor;
    }
}
