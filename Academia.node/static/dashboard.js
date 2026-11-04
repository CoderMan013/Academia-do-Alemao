import ApiService from "./ApiService.js";

/* =====================================================================
   Painel da Academia do Alemão
   - A mesma página serve aluno e professor; o papel vem do token.
   - Aluno: vê/remove suas matrículas e inicia novos planos.
   - Professor: escolhe as modalidades que leciona e vê seus alunos.
   ===================================================================== */

const sessao = JSON.parse(localStorage.getItem("userData") ?? "null");
const token = sessao?.data?.token;
const tipo = sessao?.data?.tipo;
const usuario = sessao?.data?.usuario ?? {};

const sessaoValida = Boolean(token) && (tipo === "aluno" || tipo === "professor");

if (!sessaoValida) {
    localStorage.removeItem("userData");
    window.location.href = "Login.html";
}

const api = new ApiService(token);

/* ------------------------------ elementos ---------------------------- */

const boasVindas = document.getElementById("boasVindas");
const badgePapel = document.getElementById("badgePapel");
const btnSair = document.getElementById("btnSair");
const btnAtualizar = document.getElementById("btnAtualizar");

const viewAluno = document.getElementById("viewAluno");
const statsAluno = document.getElementById("statsAluno");
const minhasMatriculas = document.getElementById("minhasMatriculas");
const msgAluno = document.getElementById("msgAluno");
const formNova = document.getElementById("formNova");
const selModalidade = document.getElementById("selModalidade");
const selProfessor = document.getElementById("selProfessor");
const selDuracao = document.getElementById("selDuracao");
const txtInicio = document.getElementById("txtInicio");
const btnNova = document.getElementById("btnNova");
const msgNova = document.getElementById("msgNova");

const viewProfessor = document.getElementById("viewProfessor");
const statsProfessor = document.getElementById("statsProfessor");
const chipsModalidades = document.getElementById("chipsModalidades");
const msgModalidades = document.getElementById("msgModalidades");
const filtroAlunos = document.getElementById("filtroAlunos");
const tabelaAlunos = document.getElementById("tabelaAlunos");
const msgAlunos = document.getElementById("msgAlunos");

const modalRemover = document.getElementById("modalRemover");
const textoRemocao = document.getElementById("textoRemocao");
const btnCancelarRemocao = document.getElementById("btnCancelarRemocao");
const btnConfirmarRemocao = document.getElementById("btnConfirmarRemocao");

/* ------------------------------- estado ------------------------------ */

const estado = {
    modalidades: [],
    minhas: [],
    meusAlunos: [],
    perfil: null,
    remover: null,
    salvando: false
};

/* ------------------------------- helpers ----------------------------- */

function formatarData(valor) {
    if (!valor) return "—";
    const [ano, mes, dia] = String(valor).slice(0, 10).split("-");
    return `${dia}/${mes}/${ano}`;
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

/* --------------------------- dados comuns ---------------------------- */

async function carregarModalidades() {
    const resposta = await api.get("/api/v1/modalidades");
    if (resposta.success) {
        estado.modalidades = resposta.data?.modalidades ?? [];
    }
    return estado.modalidades;
}

/* ============================== ALUNO ================================ */

async function carregarAluno() {
    mensagem(msgAluno, "Carregando…");

    const [matriculas] = await Promise.all([
        api.get("/api/v1/matriculas/minhas"),
        carregarModalidades()
    ]);

    if (matriculas.statusHttp === 401) return sair();

    if (!matriculas.success) {
        estado.minhas = [];
        mensagem(msgAluno, matriculas.error?.message || matriculas.message || "Não foi possível carregar suas matrículas.", "erro");
    } else {
        estado.minhas = matriculas.data?.matriculas ?? [];
        mensagem(msgAluno, "");
    }

    renderStatsAluno();
    renderMinhas();
    preencherNovaMatricula();
}

function renderStatsAluno() {
    const ativas = estado.minhas.filter((m) => m.status === "ativa");
    const professores = new Set(ativas.map((m) => m.professor.idProfessor)).size;
    const prazos = ativas.map((m) => diasRestantes(m.dataFim)).filter((dias) => dias >= 0);
    const proximo = prazos.length ? Math.min(...prazos) : null;

    statsAluno.replaceChildren(
        criarStat(ativas.length, "modalidades ativas"),
        criarStat(professores, "professores"),
        criarStat(proximo === null ? "—" : `${proximo}`, "dias até o próximo vencimento")
    );
}

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

    const professor = document.createElement("p");
    professor.className = "mat-card__meta";
    professor.textContent = `Professor(a): ${matricula.professor.nomeProfessor}`;

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

    cartao.append(topo, titulo, professor, periodo, barra, rodape);
    return cartao;
}

function preencherNovaMatricula() {
    const disponiveis = estado.modalidades.filter((modalidade) => modalidade.professores.length > 0);

    selModalidade.replaceChildren();

    if (disponiveis.length === 0) {
        const opcao = document.createElement("option");
        opcao.value = "";
        opcao.textContent = "Nenhum professor cadastrado ainda";
        selModalidade.appendChild(opcao);
        selProfessor.replaceChildren();
        btnNova.disabled = true;
        return;
    }

    for (const modalidade of disponiveis) {
        const opcao = document.createElement("option");
        opcao.value = modalidade.nome;
        opcao.textContent = modalidade.nome;
        selModalidade.appendChild(opcao);
    }

    btnNova.disabled = false;
    if (!txtInicio.value) txtInicio.value = hojeISO();
    preencherProfessores();
}

function preencherProfessores() {
    const modalidade = estado.modalidades.find((item) => item.nome === selModalidade.value);

    selProfessor.replaceChildren();

    for (const professor of modalidade?.professores ?? []) {
        const opcao = document.createElement("option");
        opcao.value = String(professor.idProfessor);
        opcao.textContent = professor.nomeProfessor;
        selProfessor.appendChild(opcao);
    }
}

async function criarMatricula() {
    if (btnNova.disabled) return;

    const modalidade = selModalidade.value;
    const idProfessor = Number(selProfessor.value);
    const duracaoMeses = Number(selDuracao.value);
    const dataInicio = txtInicio.value || hojeISO();

    if (!modalidade) return mensagem(msgNova, "Escolha uma modalidade.", "erro");
    if (!Number.isInteger(idProfessor) || idProfessor <= 0) {
        return mensagem(msgNova, "Escolha um professor.", "erro");
    }

    btnNova.disabled = true;
    btnNova.textContent = "Iniciando...";
    mensagem(msgNova, "");

    const resposta = await api.post("/api/v1/matriculas", {
        matricula: {
            modalidade,
            dataInicio,
            duracaoMeses,
            professor: { idProfessor }
        }
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
    textoRemocao.textContent = `Remover ${matricula.modalidade} (${matricula.professor.nomeProfessor}) das suas modalidades?`;
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

/* ============================ PROFESSOR ============================== */

async function carregarProfessor() {
    mensagem(msgAlunos, "Carregando…");

    const [perfil, alunos] = await Promise.all([
        api.get("/api/v1/professores/me"),
        api.get("/api/v1/professores/me/alunos"),
        carregarModalidades()
    ]);

    if (perfil.statusHttp === 401) return sair();

    if (!perfil.success) {
        mensagem(msgAlunos, perfil.error?.message || perfil.message || "Não foi possível carregar seu perfil.", "erro");
        return;
    }

    estado.perfil = perfil.data?.professores?.[0] ?? null;
    estado.meusAlunos = alunos.success ? (alunos.data?.matriculas ?? []) : [];
    mensagem(msgAlunos, "");

    renderStatsProfessor();
    renderChips();
    renderTabelaAlunos();
}

function renderStatsProfessor() {
    const ativas = estado.meusAlunos.filter((m) => m.status === "ativa");
    const modalidadesAtivas = new Set(ativas.map((m) => m.modalidade)).size;
    const alunosUnicos = new Set(ativas.map((m) => m.aluno.idAluno)).size;

    statsProfessor.replaceChildren(
        criarStat(alunosUnicos, "alunos ativos"),
        criarStat(modalidadesAtivas, "turmas em andamento"),
        criarStat(estado.perfil?.modalidades?.length ?? 0, "modalidades que leciona")
    );
}

function renderChips() {
    chipsModalidades.replaceChildren();

    for (const modalidade of estado.modalidades) {
        const leciona = (estado.perfil?.modalidades ?? []).includes(modalidade.nome);
        const ativos = estado.meusAlunos.filter(
            (m) => m.modalidade === modalidade.nome && m.status === "ativa"
        ).length;

        const botao = document.createElement("button");
        botao.type = "button";
        botao.className = `chip-btn${leciona ? " is-on" : ""}`;
        botao.textContent = ativos > 0 ? `${modalidade.nome} · ${ativos}` : modalidade.nome;
        botao.title = leciona ? "Clique para parar de lecionar" : "Clique para começar a lecionar";
        botao.addEventListener("click", () => alternarModalidade(modalidade.nome, leciona));

        chipsModalidades.appendChild(botao);
    }
}

async function alternarModalidade(nome, leciona) {
    if (estado.salvando || !estado.perfil) return;

    const atuais = estado.perfil.modalidades ?? [];
    const novas = leciona
        ? atuais.filter((modalidade) => modalidade !== nome)
        : [...atuais, nome];

    estado.salvando = true;
    mensagem(msgModalidades, "Salvando…");

    const resposta = await api.putDireto("/api/v1/professores/me/modalidades", {
        modalidades: novas
    });

    estado.salvando = false;

    if (resposta.statusHttp === 401) return sair();

    if (!resposta.success) {
        mensagem(msgModalidades, resposta.error?.message || resposta.message || "Não foi possível alterar.", "erro");
        return;
    }

    estado.perfil = resposta.data?.professores?.[0] ?? estado.perfil;
    mensagem(msgModalidades, leciona ? `Você saiu de ${nome}.` : `Agora você leciona ${nome}.`, "ok");

    renderChips();
    renderStatsProfessor();
}

function renderTabelaAlunos() {
    const texto = filtroAlunos.value.trim().toLowerCase();
    const linhas = estado.meusAlunos.filter((m) => {
        if (!texto) return true;
        return String(m.aluno.nomeAluno).toLowerCase().includes(texto)
            || String(m.modalidade).toLowerCase().includes(texto);
    });

    tabelaAlunos.replaceChildren();

    const tabela = document.createElement("table");
    tabela.className = "table";

    const thead = document.createElement("thead");
    const trHead = document.createElement("tr");
    for (const titulo of ["Aluno", "E-mail", "Modalidade", "Início", "Fim", "Situação", "Restam"]) {
        const th = document.createElement("th");
        th.textContent = titulo;
        trHead.appendChild(th);
    }
    thead.appendChild(trHead);
    tabela.appendChild(thead);

    const tbody = document.createElement("tbody");

    if (linhas.length === 0) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = 7;
        td.className = "table__empty";
        td.textContent = estado.meusAlunos.length === 0
            ? "Você ainda não tem alunos. Escolha uma modalidade acima para começar."
            : "Nenhum aluno corresponde ao filtro.";
        tr.appendChild(td);
        tbody.appendChild(tr);
    }

    for (const matricula of linhas) {
        const tr = document.createElement("tr");

        const celulas = [
            matricula.aluno.nomeAluno,
            matricula.aluno.email,
            matricula.modalidade,
            formatarData(matricula.dataInicio),
            formatarData(matricula.dataFim)
        ];

        for (const valor of celulas) {
            const td = document.createElement("td");
            td.textContent = valor;
            tr.appendChild(td);
        }

        const tdStatus = document.createElement("td");
        const chip = document.createElement("span");
        chip.className = `chip chip--${matricula.status}`;
        chip.textContent = matricula.status;
        tdStatus.appendChild(chip);
        tr.appendChild(tdStatus);

        const tdPrazo = document.createElement("td");
        tdPrazo.textContent = descreverPrazo(matricula);
        tr.appendChild(tdPrazo);

        tbody.appendChild(tr);
    }

    tabela.appendChild(tbody);
    tabelaAlunos.appendChild(tabela);

    const contador = document.createElement("p");
    contador.className = "panel__count";
    contador.textContent = `${linhas.length} de ${estado.meusAlunos.length} matrícula(s)`;
    tabelaAlunos.appendChild(contador);
}

/* ------------------------------ eventos ------------------------------ */

btnSair.addEventListener("click", sair);

btnAtualizar.addEventListener("click", async () => {
    if (tipo === "aluno") await carregarAluno();
    else await carregarProfessor();
});

selModalidade.addEventListener("change", preencherProfessores);
btnNova.addEventListener("click", criarMatricula);

formNova.addEventListener("submit", (evento) => {
    evento.preventDefault();
    criarMatricula();
});

filtroAlunos.addEventListener("input", renderTabelaAlunos);

btnCancelarRemocao.addEventListener("click", fecharRemocao);
btnConfirmarRemocao.addEventListener("click", confirmarRemocao);
modalRemover.addEventListener("click", (evento) => {
    if (evento.target === modalRemover) fecharRemocao();
});

/* ------------------------------ início ------------------------------- */

function iniciar() {
    const nome = tipo === "aluno" ? usuario.nomeAluno : usuario.nomeProfessor;

    boasVindas.textContent = `Olá, ${nome ?? "usuário"}`;
    badgePapel.textContent = tipo === "aluno" ? "Aluno" : "Professor";
    badgePapel.classList.add(`badge--${tipo}`);

    viewAluno.hidden = tipo !== "aluno";
    viewProfessor.hidden = tipo !== "professor";

    if (tipo === "aluno") {
        carregarAluno();
    } else {
        carregarProfessor();
    }
}

if (sessaoValida) iniciar();
