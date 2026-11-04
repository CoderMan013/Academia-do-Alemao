/**
 * Modalidades oferecidas pela academia.
 *
 * A lista é fixa (domínio do sistema): a matrícula guarda o nome da modalidade.
 * A validação fica aqui para que model, service e frontend trabalhem sempre
 * com o mesmo texto canônico.
 */
const MODALIDADES = [
    "Musculação",
    "Cross Fit",
    "Muay Thai",
    "Karatê",
    "Boxe"
];

/** Durações de plano oferecidas na tela (em meses). */
const DURACOES = [1, 3, 6, 12];

/** Duração usada quando o aluno não escolhe. */
const DURACAO_PADRAO_MESES = 3;

/** Remove acentos e normaliza para comparar "Karatê" com "karate". */
const semAcento = (valor) =>
    String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();

/**
 * Devolve o nome canônico da modalidade (ou null se não existir).
 * @param {string} valor
 * @returns {string|null}
 */
function modalidadeCanonica(valor) {
    const alvo = semAcento(valor);
    return MODALIDADES.find((modalidade) => semAcento(modalidade) === alvo) ?? null;
}

/**
 * @param {string} valor
 * @returns {string} nome canônico
 * @throws {Error} se a modalidade não existir
 */
function validarModalidade(valor) {
    const nome = modalidadeCanonica(valor);
    if (!nome) {
        throw new Error(`modalidade inválida. Use uma destas: ${MODALIDADES.join(", ")}.`);
    }
    return nome;
}

/**
 * Normaliza uma lista de modalidades (array ou texto separado por vírgula),
 * removendo repetições.
 * @param {Array<string>|string|null|undefined} valor
 * @returns {Array<string>}
 */
function normalizarLista(valor) {
    if (valor === undefined || valor === null) return [];

    const bruto = Array.isArray(valor) ? valor : String(valor).split(",");
    const lista = [];

    for (const item of bruto) {
        const nome = validarModalidade(item);
        if (!lista.includes(nome)) lista.push(nome);
    }

    return lista;
}

/** Lista -> texto gravado no MySQL ("Boxe, Muay Thai"). */
const listaParaTexto = (lista) => [...(lista ?? [])].join(", ");

/** Texto do MySQL -> lista. */
const textoParaLista = (texto) =>
    String(texto ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item !== "");

/**
 * @param {*} valor
 * @returns {number} duração em meses (1 a 24)
 * @throws {Error} se não for inteiro válido
 */
function validarDuracao(valor) {
    const meses = Number(valor ?? DURACAO_PADRAO_MESES);
    if (!Number.isInteger(meses) || meses < 1 || meses > 24) {
        throw new Error("duracaoMeses deve ser um número inteiro entre 1 e 24.");
    }
    return meses;
}

module.exports = {
    MODALIDADES,
    DURACOES,
    DURACAO_PADRAO_MESES,
    modalidadeCanonica,
    validarModalidade,
    normalizarLista,
    listaParaTexto,
    textoParaLista,
    validarDuracao
};
