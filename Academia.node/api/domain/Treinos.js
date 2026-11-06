/**
 * Treinos oferecidos pela academia.
 *
 * A lista é fixa (domínio do sistema): a matrícula guarda o nome do treino.
 * A validação fica aqui para que model, service e frontend trabalhem sempre
 * com o mesmo texto canônico.
 */
const TREINOS = [
    "Musculação",
    "Cross Fit",
    "Muay Thai",
    "Karatê",
    "Boxe"
];

const VALORES_MENSALIDADE = {
    "Musculação": 60,
    "Cross Fit": 60,
    "Muay Thai": 120,
    "Karatê": 120,
    "Boxe": 120
};

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
 * Devolve o nome canônico do treino (ou null se não existir).
 * @param {string} valor
 * @returns {string|null}
 */
function treinoCanonico(valor) {
    const alvo = semAcento(valor);
    return TREINOS.find((treino) => semAcento(treino) === alvo) ?? null;
}

/**
 * Devolve o valor fixo da mensalidade do treino.
 * @param {string} treino
 * @returns {number}
 * @throws {Error} se o treino não existir
 */
function valorMensalidade(treino) {
    const nome = treinoCanonico(treino);
    if (!nome) {
        throw new Error(`treino inválido. Use uma destas: ${TREINOS.join(", ")}.`);
    }
    return VALORES_MENSALIDADE[nome];
}

/**
 * @param {string} valor
 * @returns {string} nome canônico
 * @throws {Error} se o treino não existir
 */
function validarTreino(valor) {
    const nome = treinoCanonico(valor);
    if (!nome) {
        throw new Error(`treino inválido. Use uma destas: ${TREINOS.join(", ")}.`);
    }
    return nome;
}

/**
 * Normaliza uma lista de treinos (array ou texto separado por vírgula),
 * removendo repetições.
 * @param {Array<string>|string|null|undefined} valor
 * @returns {Array<string>}
 */
function normalizarLista(valor) {
    if (valor === undefined || valor === null) return [];

    const bruto = Array.isArray(valor) ? valor : String(valor).split(",");
    const lista = [];

    for (const item of bruto) {
        const nome = validarTreino(item);
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
    TREINOS,
    DURACOES,
    DURACAO_PADRAO_MESES,
    treinoCanonico,
    valorMensalidade,
    validarTreino,
    normalizarLista,
    listaParaTexto,
    textoParaLista,
    validarDuracao
};
