import ApiService from "./ApiService.js";

/* =====================================================================
   Painel da Academia do Alemão
   - Só existe o aluno logado.
   - Aluno: vê/remove suas matrículas, inicia planos novos e cuida
     das mensalidades (registrar, marcar como paga, excluir).
   ===================================================================== */

const sessao = JSON.parse(localStorage.getItem("userData") ?? "null");
const token = sessao?.data?.token;
const usuario = sessao?.data?.usuario ?? {};

if (!token) {
    localStorage.removeItem("userData");
    window.location.href = "Login.html";
}

const api = new ApiService(token);

/* ------------------------------ elementos ---------------------------- */

const boasVindas = document.getElementById("boasVindas");
const btnSair = document.getElementById("btnSair");
const btnAtualizar = document.getElementById("btnAtualizar");

const statsAluno = document.getElementById("statsAluno");
const minhasMatriculas = document.getElementById("minhasMatriculas");
const msgAluno = document.getElementById("msgAluno");
const formNova = document.getElementById("formNova");
const selModalidade = document.getElementById("selModalidade");
const selDuracao = document.getElementById("selDuracao");
const txtInicio = document.getElementById("txtInicio");
const btnNova = document.getElementById("btnNova");
const msgNova = document.getElementById("msgNova");

const tabelaPagamentos = document.getElementById("tabelaPagamentos");
const msgPagamentos = document.getElementById("msgPagamentos");
const formPagamento = document.getElementById("formPagamento");
const selMatriculaPagamento = document.getElementById("selMatriculaPagamento");
const txtValor = document.getElementById("txtValor");
const txtVencimento = document.getElementById("txtVencimento");
const selMetodo = document.getElementById("selMetodo");
const btnPagamento = document.getElementById("btnPagamento");
const msgNovoPagamento = document.getElementById("msgNovoPagamento");

const modalRemover = document.getElementById("modalRemover");
const textoRemocao = document.getElementById("textoRemocao");
const btnCancelarRemocao = document.getElementById("btnCancelarRemocao");
const btnConfirmarRemocao = document.getElementById("btnConfirmarRemocao");

/* ------------------------------- estado ------------------------------ */

const estado = {
    modalidades: [],
    minhas: [],
    pagamentos: [],
    remover: null,
    salvando: false
};

/* ------------------------------- helpers ----------------------------- */

function formatarData(valor) {
    if (!valor) return "—";
    const [ano, mes, dia] = String(valor).slice(0, 10).split("-");
    return `${dia}/${mes}/${ano}`;
}

function formatarDinheiro(valor) {
    return Number(valor ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function hojeISO() {
    const agora = new Date();
    const local = new Date(agora.getTime() - agora.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
}

function diasRestantes(dataFim) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const fim = new Date(`${String(dataFim).slice(0, 10)}T00:00:00`);
    return Math.round((fim.getTime() - hoje.getTime()) / 86400000);
}

function descreverPrazo(matricula) {
    if (matricula.status !== "ativa") {
        return matricula.status === "concluida" ? "Plano concluído" : "Plano cancelado";
    }

    const dias = diasRestantes(matricula.dataFim);
    if (dias > 1) return `Faltam ${dias} dias`;
    if (dias === 1) return "Falta 1 dia";
    if (dias === 0) return "Último dia do plano";
    return `Plano vencido há ${Math.abs(dias)} dia(s)`;
}

function percentualDoPlano(matricula) {
    const inicio = new Date(`${String(matricula.dataInicio).slice(0, 10)}T00:00:00`).getTime();
    const fim = new Date(`${String(matricula.dataFim).slice(0, 10)}T00:00:00`).getTime();
    const agora = Date.now();

    if (!Number.isFinite(inicio) || !Number.isFinite(fim) || fim <= inicio) return 100;

    return Math.min(100, Math.max(0, ((agora - inicio) / (fim - inicio)) * 100));
}

function mensagem(elemento, texto, tipoMsg) {
    elemento.textContent = texto ?? "";
    elemento.className = tipoMsg === "erro" ? "hint hint--error" : tipoMsg === "ok" ? "hint hint--ok" : "hint";
}

function criarStat(valor, rotulo) {
    const caixa = document.createElement("article");
    caixa.className = "stat";

    const numero = document.createElement("p");
    numero.className = "stat__value";
    numero.textContent = valor;

    const texto = document.createElement("p");
    texto.className = "stat__label";
    texto.textContent = rotulo;

    caixa.append(numero, texto);
    return caixa;
}

function sair() {
    localStorage.removeItem("userData");
    window.location.href = "Login.html";
}

/* ------------------------------- dados ------------------------------- */

async function carregarModalidades() {
    const resposta = await api.get("/api/v1/modalidades");
    if (resposta.success) {
        estado.modalidades = resposta.data?.modalidades ?? [];
    }
    return estado.modalidades;
}

async function carregarAluno() {
    mensagem(msgAluno, "Carregando…");

    const [matriculas, pagamentos] = await Promise.all([
        api.get("/api/v1/matriculas/minhas"),
        api.get("/api/v1/pagamentos/minhas"),
        carregarModalidades()
    ]);

    if (matriculas.statusHttp === 401 || pagamentos.statusHttp === 401) return sair();

    if (!matriculas.success) {
        estado.minhas = [];
        mensagem(msgAluno, matriculas.error?.message || matriculas.message || "Não foi possível carregar suas matrículas.", "erro");
    } else {
        estado.minhas = matriculas.data?.matriculas ?? [];
        mensagem(msgAluno, "");
    }

    if (!pagamentos.success) {
        estado.pagamentos = [];
        mensagem(msgPagamentos, pagamentos.error?.message || pagamentos.message || "Não foi possível carregar suas mensalidades.", "erro");
    } else {
        estado.pagamentos = pagamentos.data?.pagamentos ?? [];
        mensagem(msgPagamentos, "");
    }

    renderStats();
    renderMinhas();
    renderPagamentos();
    preencherNovaMatricula();
    preencherFormPagamento();
}

function renderStats() {
    const ativas = estado.minhas.filter((m) => m.status === "ativa");
    const abertas = estado.pagamentos.filter((p) => p.status !== "pago");
    const pagas = estado.pagamentos.filter((p) => p.status === "pago");
    const totalPago = pagas.reduce((soma, p) => soma + Number(p.valor ?? 0), 0);

    statsAluno.replaceChildren(
        criarStat(ativas.length, "modalidades ativas"),
        criarStat(abertas.length, "mensalidades em aberto"),
        criarStat(formatarDinheiro(totalPago), "total já pago")
    );
}

/* ----------------------------- matrículas ---------------------------- */

function renderMinhas() {
    minhasMatriculas.replaceChildren();

    if (estado.minhas.length === 0) {
        const vazio = document.createElement("p");
        vazio.className = "empty";
        vazio.textContent = "Você ainda não está em nenhuma modalidade. Escolha uma abaixo para começar.";
        minhasMatriculas.appendChild(vazio);
        return;
    }

    for (const matricula of estado.minhas) {
        minhasMatriculas.appendChild(criarCartaoMatricula(matricula));
    }
}

function criarCartaoMatricula(matricula) {
    const cartao = document.createElement("article");
    cartao.className = "mat-card";

    const topo = document.createElement("div");
    topo.className = "mat-card__top";

    const chipModalidade = document.createElement("span");
    chipModalidade.className = "chip chip--modalidade";
    chipModalidade.textContent = matricula.modalidade;

    const chipStatus = document.createElement("span");
    chipStatus.className = `chip chip--${matricula.status}`;
    chipStatus.textContent = matricula.status;

    topo.append(chipModalidade, chipStatus);

    const titulo = document.createElement("h3");
    titulo.className = "mat-card__title";
    titulo.textContent = matricula.modalidade;

    const mensalidades = estado.pagamentos.filter(
        (p) => p.matricula?.idMatricula === matricula.idMatricula
    ).length;

    const info = document.createElement("p");
    info.className = "mat-card__meta";
    info.textContent = `${mensalidades} mensalidade(s) registrada(s)`;

    const periodo = document.createElement("p");
    periodo.className = "mat-card__meta";
    periodo.textContent = `${formatarData(matricula.dataInicio)} → ${formatarData(matricula.dataFim)}`;

    const barra = document.createElement("div");
    barra.className = "progress";
    const preenchido = document.createElement("span");
    preenchido.style.width = `${percentualDoPlano(matricula)}%`;
    preenchido.className = matricula.status === "ativa" ? "" : "progress__bar--off";
    barra.appendChild(preenchido);

    const rodape = document.createElement("div");
    rodape.className = "mat-card__foot";

    const prazo = document.createElement("p");
    prazo.className = "mat-card__foot-text";
    prazo.textContent = descreverPrazo(matricula);

    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "btn btn--danger btn--tiny";
    botao.textContent = "Remover";
    botao.addEventListener("click", () => abrirRemocao(matricula));

    rodape.append(prazo, botao);

    cartao.append(topo, titulo, info, periodo, barra, rodape);
    return cartao;
}

function preencherNovaMatricula() {
    selModalidade.replaceChildren();

    if (estado.modalidades.length === 0) {
        const opcao = document.createElement("option");
        opcao.value = "";
        opcao.textContent = "Carregando modalidades…";
        selModalidade.appendChild(opcao);
        btnNova.disabled = true;
        return;
    }

    for (const modalidade of estado.modalidades) {
        const opcao = document.createElement("option");
        opcao.value = modalidade.nome;
        opcao.textContent = modalidade.nome;
        selModalidade.appendChild(opcao);
    }

    btnNova.disabled = false;
    if (!txtInicio.value) txtInicio.value = hojeISO();
}

async function criarMatricula() {
    if (btnNova.disabled) return;

    const modalidade = selModalidade.value;
    const duracaoMeses = Number(selDuracao.value);
    const dataInicio = txtInicio.value || hojeISO();

    if (!modalidade) return mensagem(msgNova, "Escolha uma modalidade.", "erro");

    btnNova.disabled = true;
    btnNova.textContent = "Iniciando...";
    mensagem(msgNova, "");

    const resposta = await api.post("/api/v1/matriculas", {
        matricula: { modalidade, dataInicio, duracaoMeses }
    });

    btnNova.disabled = false;
    btnNova.textContent = "Iniciar plano";

    if (resposta.statusHttp === 401) return sair();

    if (!resposta.success) {
        mensagem(msgNova, resposta.error?.message || resposta.message || "Não foi possível iniciar o plano.", "erro");
        return;
    }

    await carregarAluno();
    mensagem(msgNova, `Plano de ${modalidade} iniciado!`, "ok");
}

function abrirRemocao(matricula) {
    estado.remover = matricula;
    textoRemocao.textContent = `Remover ${matricula.modalidade} das suas modalidades?`;
    modalRemover.hidden = false;
    btnConfirmarRemocao.focus();
}

function fecharRemocao() {
    modalRemover.hidden = true;
    estado.remover = null;
}

async function confirmarRemocao() {
    const matricula = estado.remover;
    fecharRemocao();
    if (!matricula) return;

    const resposta = await api.delete("/api/v1/matriculas", matricula.idMatricula);
    if (resposta.statusHttp === 401) return sair();

    if (!resposta.success) {
        mensagem(msgAluno, resposta.error?.message || resposta.message || "Não foi possível remover.", "erro");
        return;
    }

    await carregarAluno();
    mensagem(msgAluno, "Modalidade removida.", "ok");
}

/* ----------------------------- pagamentos ---------------------------- */

function renderPagamentos() {
    tabelaPagamentos.replaceChildren();

    const tabela = document.createElement("table");
    tabela.className = "table";

    const thead = document.createElement("thead");
    const trHead = document.createElement("tr");
    for (const titulo of ["Modalidade", "Vencimento", "Valor", "Forma", "Status", "Pago em", "Ações"]) {
        const th = document.createElement("th");
        th.textContent = titulo;
        trHead.appendChild(th);
    }
    thead.appendChild(trHead);
    tabela.appendChild(thead);

    const tbody = document.createElement("tbody");

    if (estado.pagamentos.length === 0) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = 7;
        td.className = "table__empty";
        td.textContent = "Nenhuma mensalidade registrada ainda. Use o formulário abaixo.";
        tr.appendChild(td);
        tbody.appendChild(tr);
    }

    for (const pagamento of estado.pagamentos) {
        const tr = document.createElement("tr");

        const celulas = [
            pagamento.matricula?.modalidade ?? "—",
            formatarData(pagamento.dataVencimento),
            formatarDinheiro(pagamento.valor),
            pagamento.metodo
        ];

        for (const valor of celulas) {
            const td = document.createElement("td");
            td.textContent = valor;
            tr.appendChild(td);
        }

        const tdStatus = document.createElement("td");
        const chip = document.createElement("span");
        chip.className = `chip chip--${pagamento.status}`;
        chip.textContent = pagamento.status;
        tdStatus.appendChild(chip);
        tr.appendChild(tdStatus);

        const tdPago = document.createElement("td");
        tdPago.textContent = pagamento.dataPagamento ? formatarData(pagamento.dataPagamento) : "—";
        tr.appendChild(tdPago);

        const tdAcoes = document.createElement("td");
        const acoes = document.createElement("div");
        acoes.className = "row-actions";

        if (pagamento.status !== "pago") {
            const btnPagar = document.createElement("button");
            btnPagar.type = "button";
            btnPagar.className = "btn btn--primary btn--tiny";
            btnPagar.textContent = "Marcar paga";
            btnPagar.addEventListener("click", () => marcarComoPaga(pagamento));
            acoes.appendChild(btnPagar);
        }

        const btnExcluir = document.createElement("button");
        btnExcluir.type = "button";
        btnExcluir.className = "btn btn--danger btn--tiny";
        btnExcluir.textContent = "Excluir";
        btnExcluir.addEventListener("click", () => excluirPagamento(pagamento));
        acoes.appendChild(btnExcluir);

        tdAcoes.appendChild(acoes);
        tr.appendChild(tdAcoes);

        tbody.appendChild(tr);
    }

    tabela.appendChild(tbody);
    tabelaPagamentos.appendChild(tabela);
}

function preencherFormPagamento() {
    const anterior = selMatriculaPagamento.value;
    selMatriculaPagamento.replaceChildren();

    if (estado.minhas.length === 0) {
        const opcao = document.createElement("option");
        opcao.value = "";
        opcao.textContent = "Inicie um plano primeiro";
        selMatriculaPagamento.appendChild(opcao);
        btnPagamento.disabled = true;
        return;
    }

    for (const matricula of estado.minhas) {
        const opcao = document.createElement("option");
        opcao.value = String(matricula.idMatricula);
        opcao.textContent = `${matricula.modalidade} (${matricula.status})`;
        selMatriculaPagamento.appendChild(opcao);
    }

    btnPagamento.disabled = false;
    if (anterior) selMatriculaPagamento.value = anterior;
    if (!txtVencimento.value) txtVencimento.value = hojeISO();
}

async function registrarPagamento() {
    if (btnPagamento.disabled) return;

    const idMatricula = Number(selMatriculaPagamento.value);
    const valor = Number(txtValor.value);
    const dataVencimento = txtVencimento.value || hojeISO();
    const metodo = selMetodo.value;

    if (!Number.isInteger(idMatricula) || idMatricula <= 0) {
        return mensagem(msgNovoPagamento, "Inicie um plano antes de registrar mensalidades.", "erro");
    }

    if (!Number.isFinite(valor) || valor <= 0) {
        return mensagem(msgNovoPagamento, "Informe um valor maior que zero.", "erro");
    }

    btnPagamento.disabled = true;
    btnPagamento.textContent = "Registrando...";
    mensagem(msgNovoPagamento, "");

    const resposta = await api.post("/api/v1/pagamentos", {
        pagamento: {
            valor,
            dataVencimento,
            metodo,
            status: "pendente",
            matricula: { idMatricula }
        }
    });

    btnPagamento.disabled = false;
    btnPagamento.textContent = "Registrar";

    if (resposta.statusHttp === 401) return sair();

    if (!resposta.success) {
        mensagem(msgNovoPagamento, resposta.error?.message || resposta.message || "Não foi possível registrar.", "erro");
        return;
    }

    txtValor.value = "";
    await carregarAluno();
    mensagem(msgNovoPagamento, "Mensalidade registrada!", "ok");
}

async function marcarComoPaga(pagamento) {
    mensagem(msgPagamentos, "Salvando…");

    const resposta = await api.put("/api/v1/pagamentos", pagamento.idPagamento, {
        pagamento: { status: "pago" }
    });

    if (resposta.statusHttp === 401) return sair();

    if (!resposta.success) {
        mensagem(msgPagamentos, resposta.error?.message || resposta.message || "Não foi possível marcar como paga.", "erro");
        return;
    }

    await carregarAluno();
    mensagem(msgPagamentos, "Mensalidade marcada como paga.", "ok");
}

async function excluirPagamento(pagamento) {
    const rotulo = `${pagamento.matricula?.modalidade ?? "mensalidade"} · ${formatarDinheiro(pagamento.valor)}`;
    if (!window.confirm(`Excluir ${rotulo}?`)) return;

    mensagem(msgPagamentos, "Excluindo…");

    const resposta = await api.delete("/api/v1/pagamentos", pagamento.idPagamento);
    if (resposta.statusHttp === 401) return sair();

    if (!resposta.success) {
        mensagem(msgPagamentos, resposta.error?.message || resposta.message || "Não foi possível excluir.", "erro");
        return;
    }

    await carregarAluno();
    mensagem(msgPagamentos, "Mensalidade excluída.", "ok");
}

/* ------------------------------ eventos ------------------------------ */

btnSair.addEventListener("click", sair);
btnAtualizar.addEventListener("click", carregarAluno);

btnNova.addEventListener("click", criarMatricula);
formNova.addEventListener("submit", (evento) => {
    evento.preventDefault();
    criarMatricula();
});

btnPagamento.addEventListener("click", registrarPagamento);
formPagamento.addEventListener("submit", (evento) => {
    evento.preventDefault();
    registrarPagamento();
});

btnCancelarRemocao.addEventListener("click", fecharRemocao);
btnConfirmarRemocao.addEventListener("click", confirmarRemocao);
modalRemover.addEventListener("click", (evento) => {
    if (evento.target === modalRemover) fecharRemocao();
});

/* ------------------------------ início ------------------------------- */

boasVindas.textContent = `Olá, ${usuario.nomeAluno ?? "aluno"}`;

if (token) carregarAluno();
