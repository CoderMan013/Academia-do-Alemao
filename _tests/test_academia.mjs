/**
 * Teste HTTP do modelo Aluno / Matrícula / Pagamento.
 *
 * Roda contra uma API de verdade (MySQL), seja a Node (:8080) ou a Flask (:8081).
 * O banco precisa estar com o seed de docs/Banco.sql.
 *
 * Uso:
 *   node _tests/test_academia.mjs http://127.0.0.1:8080
 *   node _tests/test_academia.mjs http://127.0.0.1:8081
 */
const BASE = process.argv[2] ?? "http://127.0.0.1:8081";

let total = 0;
const falhas = [];

function checar(descricao, condicao, detalhe = "") {
  total++;
  if (condicao) {
    console.log(`  ✅ ${descricao}`);
  } else {
    falhas.push(`${descricao} ${detalhe}`);
    console.log(`  ❌ ${descricao} ${detalhe}`);
  }
}

async function pedir(metodo, rota, corpo, token) {
  const headers = {};
  if (corpo !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const resposta = await fetch(`${BASE}${rota}`, {
    method: metodo,
    headers,
    body: corpo === undefined ? undefined : JSON.stringify(corpo)
  });

  const texto = await resposta.text();
  let json = {};
  try {
    json = texto ? JSON.parse(texto) : {};
  } catch {
    json = { raw: texto.slice(0, 200) };
  }
  return { status: resposta.status, json, texto };
}

function hoje() {
  const agora = new Date();
  const local = new Date(agora.getTime() - agora.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

const emailUnico = `teste.${Date.now()}@academia.com`;

async function main() {
  console.log(`\nAPI: ${BASE}\n`);

  console.log("[1] Frontend estático");
  let r = await pedir("GET", "/Login.html");
  checar("GET /Login.html -> 200", r.status === 200, `(${r.status})`);
  checar("login tem o formulário de cadastro", r.texto.includes("formCadastro"), "faltou formCadastro");
  checar("login não tem mais a escolha de papel", !r.texto.includes('value="professor"'), "ainda tem papel professor");
  checar("rodapé aponta a conta de teste", r.texto.includes("ana@academia.com"), "faltou a dica");

  r = await pedir("GET", "/dashboard.html");
  checar("GET /dashboard.html -> 200", r.status === 200, `(${r.status})`);
  checar("painel tem a tabela de mensalidades", r.texto.includes("tabelaPagamentos"), "faltou tabelaPagamentos");
  checar("painel não tem mais a visão do professor", !r.texto.includes("viewProfessor"), "ainda tem viewProfessor");

  r = await pedir("GET", "/dashboard.js");
  checar(
    "painel chama matrículas e pagamentos",
    r.texto.includes("matriculas/minhas") && r.texto.includes("pagamentos/minhas"),
    "faltou alguma rota"
  );
  checar("painel não menciona professor", !/professor/i.test(r.texto), "ainda menciona professor");

  r = await pedir("GET", "/css/styles.css");
  checar("GET /css/styles.css -> 200", r.status === 200, `(${r.status})`);
  checar("CSS tem os cartões de matrícula", r.texto.includes(".mat-card"), "faltou .mat-card");
  checar("CSS tem o chip de pago", r.texto.includes(".chip--pago"), "faltou .chip--pago");

  r = await pedir("GET", "/rota-que-nao-existe");
  checar("rota inexistente -> 404", r.status === 404, `(${r.status})`);

  console.log("\n[2] Modalidades (rota pública)");
  r = await pedir("GET", "/api/v1/modalidades");
  checar("GET /modalidades sem token -> 200", r.status === 200, `(${r.status})`);
  const modalidades = r.json?.data?.modalidades ?? [];
  checar("devolve as 5 modalidades", modalidades.length === 5, JSON.stringify(modalidades.map((m) => m.nome)));
  checar(
    "nomes canônicos",
    ["Musculação", "Cross Fit", "Muay Thai", "Karatê", "Boxe"].every((nome) => modalidades.some((m) => m.nome === nome)),
    JSON.stringify(modalidades.map((m) => m.nome))
  );
  checar("devolve as durações de plano", JSON.stringify(r.json?.data?.duracoes) === "[1,3,6,12]", JSON.stringify(r.json?.data?.duracoes));

  console.log("\n[3] Autenticação do aluno");
  r = await pedir("GET", "/api/v1/matriculas/minhas");
  checar("GET /matriculas/minhas sem token -> 401", r.status === 401, `(${r.status})`);

  r = await pedir("POST", "/api/v1/auth/login", { email: "ana@academia.com", senha: "errada" });
  checar("login com senha errada -> 401", r.status === 401, `(${r.status})`);

  r = await pedir("POST", "/api/v1/auth/login", { email: "ana@academia.com", senha: "Senha@123" });
  checar("login da aluna -> 200", r.status === 200, `(${r.status})`);
  const tokenAna = r.json?.data?.token;
  const usuarioAna = r.json?.data?.usuario;
  checar("login devolve token", Boolean(tokenAna), JSON.stringify(r.json).slice(0, 160));
  checar("login identifica o papel 'aluno'", r.json?.data?.tipo === "aluno", String(r.json?.data?.tipo));
  checar("login devolve o idAluno", usuarioAna?.idAluno === 1, JSON.stringify(usuarioAna));
  checar("login não devolve a senha", usuarioAna?.senha === undefined, JSON.stringify(usuarioAna));

  r = await pedir("POST", "/api/v1/auth/login", { email: "bruno@academia.com", senha: "Senha@123" });
  checar("login do Bruno -> 200", r.status === 200, `(${r.status})`);
  const tokenBruno = r.json?.data?.token;
  checar("Bruno é o aluno 2", r.json?.data?.usuario?.idAluno === 2, JSON.stringify(r.json?.data?.usuario));

  r = await pedir("POST", "/api/v1/auth/login", { email: "naoexiste@academia.com", senha: "Senha@123" });
  checar("login de e-mail inexistente -> 401", r.status === 401, `(${r.status})`);

  r = await pedir("GET", "/api/v1/auth/sessao", undefined, tokenAna);
  checar("GET /auth/sessao com token -> 200", r.status === 200, `(${r.status})`);
  checar("sessão devolve role aluno", r.json?.data?.usuario?.role === "aluno", JSON.stringify(r.json?.data));

  console.log("\n[4] Cadastro");
  r = await pedir("POST", "/api/v1/auth/registrar", { nome: "Teste Aluno", email: emailUnico, senha: "Senha@123" });
  checar("cadastro -> 201", r.status === 201, `(${r.status}) ${JSON.stringify(r.json)}`);
  const tokenNovo = r.json?.data?.token;
  const idAlunoNovo = r.json?.data?.usuario?.idAluno;
  checar("cadastro já devolve o token", Boolean(tokenNovo), JSON.stringify(r.json).slice(0, 160));
  checar("cadastro devolve o idAluno", Number.isInteger(idAlunoNovo), JSON.stringify(r.json?.data?.usuario));

  r = await pedir("POST", "/api/v1/auth/registrar", { nome: "Email Repetido", email: emailUnico, senha: "Senha@123" });
  checar("e-mail repetido -> 400", r.status === 400, `(${r.status})`);
  checar("mensagem 'E-mail já cadastrado'", r.json?.message === "E-mail já cadastrado", JSON.stringify(r.json));

  r = await pedir("POST", "/api/v1/auth/registrar", { email: `sem.nome.${Date.now()}@academia.com`, senha: "Senha@123" });
  checar("cadastro sem nome -> 400", r.status === 400, `(${r.status})`);

  r = await pedir("POST", "/api/v1/auth/registrar", { nome: "Senha Fraca", email: `fraca.${Date.now()}@academia.com`, senha: "123456" });
  checar("senha fraca -> 400", r.status === 400, `(${r.status})`);

  console.log("\n[5] Matrículas");
  r = await pedir("GET", "/api/v1/matriculas/minhas", undefined, tokenAna);
  checar("GET /matriculas/minhas -> 200", r.status === 200, `(${r.status})`);
  const minhas = r.json?.data?.matriculas ?? [];
  checar("Ana começa com 3 matrículas", minhas.length === 3, `(${minhas.length})`);
  checar(
    "2 ativas + 1 concluída",
    minhas.filter((m) => m.status === "ativa").length === 2 && minhas.some((m) => m.status === "concluida"),
    JSON.stringify(minhas.map((m) => m.status))
  );
  checar("matrícula não tem mais professor", minhas[0]?.professor === undefined, JSON.stringify(minhas[0]));
  checar("matrícula traz a modalidade", typeof minhas[0]?.modalidade === "string", JSON.stringify(minhas[0]));
  checar("data como texto YYYY-MM-DD", /^\d{4}-\d{2}-\d{2}$/.test(minhas[0]?.dataFim ?? ""), JSON.stringify(minhas[0]?.dataFim));

  r = await pedir("POST", "/api/v1/matriculas", {
    matricula: { modalidade: "Boxe", dataInicio: "2026-11-03", duracaoMeses: 3 }
  }, tokenAna);
  checar("aluna inicia plano de Boxe -> 201", r.status === 201, `(${r.status}) ${JSON.stringify(r.json)}`);
  const nova = r.json?.data?.matriculas?.[0];
  checar("dataFim calculada (+3 meses)", nova?.dataFim === "2027-02-03", JSON.stringify(nova?.dataFim));
  checar("matrícula fica com o aluno do token", nova?.aluno?.idAluno === 1, JSON.stringify(nova?.aluno));
  const idNova = nova?.idMatricula;

  r = await pedir("POST", "/api/v1/matriculas", {
    matricula: { modalidade: "Boxe", dataInicio: "2026-11-04" }
  }, tokenAna);
  checar("mesma modalidade ativa -> 400", r.status === 400, `(${r.status})`);
  checar("mensagem 'Matrícula duplicada'", r.json?.message === "Matrícula duplicada", JSON.stringify(r.json));

  r = await pedir("POST", "/api/v1/matriculas", {
    matricula: { modalidade: "Balé", dataInicio: "2026-11-04" }
  }, tokenAna);
  checar("modalidade fora da lista -> 400", r.status === 400, `(${r.status})`);

  r = await pedir("POST", "/api/v1/matriculas", {
    matricula: { modalidade: "Karatê", dataInicio: "2026-11-04", aluno: { idAluno: 2 } }
  }, tokenAna);
  checar(
    "aluna não consegue matricular outra pessoa -> usa o próprio id",
    r.json?.data?.matriculas?.[0]?.aluno?.idAluno === 1,
    JSON.stringify(r.json?.data?.matriculas?.[0]?.aluno)
  );
  const idKarate = r.json?.data?.matriculas?.[0]?.idMatricula;
  if (idKarate) await pedir("DELETE", `/api/v1/matriculas/${idKarate}`, undefined, tokenAna);

  r = await pedir("POST", "/api/v1/matriculas", {
    matricula: { modalidade: "Boxe", aluno: { idAluno: 99 } }
  }, tokenBruno);
  checar("Boxe para o Bruno não é duplicado da Ana -> 201", r.status === 201, `(${r.status})`);
  const idBoxeBruno = r.json?.data?.matriculas?.[0]?.idMatricula;
  checar("matrícula foi para o Bruno (token)", r.json?.data?.matriculas?.[0]?.aluno?.idAluno === 2, JSON.stringify(r.json?.data?.matriculas?.[0]?.aluno));

  r = await pedir("GET", "/api/v1/matriculas/999999", undefined, tokenAna);
  checar("matrícula inexistente -> 404", r.status === 404, `(${r.status})`);

  console.log("\n[6] Pagamentos");
  r = await pedir("GET", "/api/v1/pagamentos/minhas", undefined, tokenAna);
  checar("GET /pagamentos/minhas -> 200", r.status === 200, `(${r.status})`);
  const pagamentosAna = r.json?.data?.pagamentos ?? [];
  checar("Ana começa com 5 mensalidades", pagamentosAna.length === 5, `(${pagamentosAna.length})`);
  checar(
    "cada mensalidade traz a matrícula e a modalidade",
    Boolean(pagamentosAna[0]?.matricula?.idMatricula) && typeof pagamentosAna[0]?.matricula?.modalidade === "string",
    JSON.stringify(pagamentosAna[0])
  );
  checar("valor é número", typeof pagamentosAna[0]?.valor === "number", JSON.stringify(pagamentosAna[0]?.valor));
  checar(
    "pagamento pago tem dataPagamento",
    pagamentosAna.filter((p) => p.status === "pago").every((p) => /^\d{4}-\d{2}-\d{2}$/.test(p.dataPagamento ?? "")),
    JSON.stringify(pagamentosAna.filter((p) => p.status === "pago").map((p) => p.dataPagamento))
  );

  r = await pedir("POST", "/api/v1/pagamentos", {
    pagamento: { valor: 130, dataVencimento: "2027-01-05", metodo: "Pix", status: "pendente", matricula: { idMatricula: 1 } }
  }, tokenAna);
  checar("registrar mensalidade -> 201", r.status === 201, `(${r.status}) ${JSON.stringify(r.json)}`);
  const novoPagamento = r.json?.data?.pagamentos?.[0];
  checar("nasce pendente e sem data de pagamento", novoPagamento?.status === "pendente" && novoPagamento?.dataPagamento === null, JSON.stringify(novoPagamento));
  checar("valor arredondado em número", novoPagamento?.valor === 130, JSON.stringify(novoPagamento?.valor));
  const idPagamento = novoPagamento?.idPagamento;

  r = await pedir("POST", "/api/v1/pagamentos", {
    pagamento: { valor: 100, dataVencimento: "2020-01-10", metodo: "Dinheiro", status: "pendente", matricula: { idMatricula: 2 } }
  }, tokenAna);
  checar("mensalidade vencida -> 201", r.status === 201, `(${r.status})`);
  const idVencida = r.json?.data?.pagamentos?.[0]?.idPagamento;
  checar("vencida nasce como 'atrasado'", r.json?.data?.pagamentos?.[0]?.status === "atrasado", JSON.stringify(r.json?.data?.pagamentos?.[0]?.status));

  r = await pedir("POST", "/api/v1/pagamentos", {
    pagamento: { valor: 100, dataVencimento: "2027-01-05", matricula: { idMatricula: 4 } }
  }, tokenAna);
  checar("mensalidade em matrícula de outro aluno -> 403", r.status === 403, `(${r.status})`);

  r = await pedir("POST", "/api/v1/pagamentos", {
    pagamento: { valor: 0, dataVencimento: "2027-01-05", matricula: { idMatricula: 1 } }
  }, tokenAna);
  checar("valor zero -> 400", r.status === 400, `(${r.status})`);

  r = await pedir("POST", "/api/v1/pagamentos", {
    pagamento: { valor: 100, dataVencimento: "2027-01-05", metodo: "Boleto", matricula: { idMatricula: 1 } }
  }, tokenAna);
  checar("método inválido -> 400", r.status === 400, `(${r.status})`);

  r = await pedir("POST", "/api/v1/pagamentos", {
    pagamento: { valor: 100, dataVencimento: "2027-01-05" }
  }, tokenAna);
  checar("sem matrícula -> 400", r.status === 400, `(${r.status})`);

  r = await pedir("GET", "/api/v1/pagamentos/matricula/1", undefined, tokenAna);
  checar("GET /pagamentos/matricula/1 -> 200", r.status === 200, `(${r.status})`);
  checar(
    "lista da matrícula inclui a nova mensalidade",
    (r.json?.data?.pagamentos ?? []).some((p) => p.idPagamento === idPagamento),
    JSON.stringify((r.json?.data?.pagamentos ?? []).map((p) => p.idPagamento))
  );

  r = await pedir("GET", "/api/v1/pagamentos/matricula/4", undefined, tokenAna);
  checar("mensalidades de matrícula de outro aluno -> 403", r.status === 403, `(${r.status})`);

  r = await pedir("GET", "/api/v1/pagamentos/matricula/999999", undefined, tokenAna);
  checar("matrícula inexistente nos pagamentos -> 404", r.status === 404, `(${r.status})`);

  r = await pedir("PUT", `/api/v1/pagamentos/${idPagamento}`, { pagamento: { status: "pago" } }, tokenAna);
  checar("marcar como paga -> 200", r.status === 200, `(${r.status})`);
  checar("status virou 'pago'", r.json?.data?.pagamentos?.[0]?.status === "pago", JSON.stringify(r.json?.data?.pagamentos?.[0]?.status));
  checar("dataPagamento preenchida com hoje", r.json?.data?.pagamentos?.[0]?.dataPagamento === hoje(), JSON.stringify(r.json?.data?.pagamentos?.[0]?.dataPagamento));

  r = await pedir("PUT", `/api/v1/pagamentos/${idPagamento}`, { pagamento: { valor: 145 } }, tokenAna);
  checar("alterar o valor mantém 'pago'", r.status === 200 && r.json?.data?.pagamentos?.[0]?.valor === 145, JSON.stringify(r.json?.data?.pagamentos?.[0]));

  r = await pedir("PUT", `/api/v1/pagamentos/${idPagamento}`, { pagamento: { status: "pendente" } }, tokenBruno);
  checar("outro aluno não altera -> 403", r.status === 403, `(${r.status})`);

  r = await pedir("GET", "/api/v1/pagamentos/999999", undefined, tokenAna);
  checar("pagamento inexistente -> 404", r.status === 404, `(${r.status})`);

  r = await pedir("DELETE", `/api/v1/pagamentos/${idVencida}`, undefined, tokenAna);
  checar("excluir mensalidade -> 204", r.status === 204, `(${r.status})`);
  checar("204 sem corpo", r.texto === "", JSON.stringify(r.texto));

  r = await pedir("DELETE", `/api/v1/pagamentos/${idVencida}`, undefined, tokenAna);
  checar("excluir de novo -> 404", r.status === 404, `(${r.status})`);

  r = await pedir("DELETE", `/api/v1/pagamentos/${idPagamento}`, undefined, tokenBruno);
  checar("outro aluno não exclui -> 403", r.status === 403, `(${r.status})`);

  console.log("\n[7] Integridade e limpeza");
  r = await pedir("GET", "/api/v1/alunos/1", undefined, tokenAna);
  checar("GET /alunos/1 -> 200", r.status === 200, `(${r.status})`);

  r = await pedir("DELETE", "/api/v1/alunos/1", undefined, tokenAna);
  checar("excluir aluno com matrícula -> 400", r.status === 400, `(${r.status})`);
  checar("mensagem 'Aluno em uso'", r.json?.message === "Aluno em uso", JSON.stringify(r.json));

  r = await pedir("DELETE", `/api/v1/matriculas/4`, undefined, tokenAna);
  checar("excluir matrícula de outro aluno -> 403", r.status === 403, `(${r.status})`);

  // Ao remover a matrícula, os pagamentos dela somem junto (ON DELETE CASCADE).
  r = await pedir("POST", "/api/v1/pagamentos", {
    pagamento: { valor: 55, dataVencimento: "2027-02-05", matricula: { idMatricula: idNova } }
  }, tokenAna);
  const idPagamentoCascata = r.json?.data?.pagamentos?.[0]?.idPagamento;
  checar("mensalidade na matrícula nova -> 201", r.status === 201, `(${r.status})`);

  r = await pedir("DELETE", `/api/v1/matriculas/${idNova}`, undefined, tokenAna);
  checar("aluna remove a própria matrícula -> 204", r.status === 204, `(${r.status})`);

  r = await pedir("GET", `/api/v1/pagamentos/${idPagamentoCascata}`, undefined, tokenAna);
  checar("mensalidade foi apagada junto (cascade) -> 404", r.status === 404, `(${r.status})`);

  r = await pedir("GET", "/api/v1/matriculas/minhas", undefined, tokenAna);
  checar("Ana volta a 3 matrículas", (r.json?.data?.matriculas ?? []).length === 3, JSON.stringify((r.json?.data?.matriculas ?? []).length));

  r = await pedir("DELETE", `/api/v1/pagamentos/${idPagamento}`, undefined, tokenAna);
  checar("limpeza: mensalidade de teste excluída -> 204", r.status === 204, `(${r.status})`);

  r = await pedir("GET", "/api/v1/pagamentos/minhas", undefined, tokenAna);
  checar("Ana volta a 5 mensalidades", (r.json?.data?.pagamentos ?? []).length === 5, JSON.stringify((r.json?.data?.pagamentos ?? []).length));

  if (idBoxeBruno) {
    r = await pedir("DELETE", `/api/v1/matriculas/${idBoxeBruno}`, undefined, tokenBruno);
    checar("limpeza: Bruno remove a matrícula de teste -> 204", r.status === 204, `(${r.status})`);
  }

  if (idAlunoNovo) {
    r = await pedir("DELETE", `/api/v1/alunos/${idAlunoNovo}`, undefined, tokenNovo);
    checar("limpeza: aluno criado sem matrícula -> 204", r.status === 204, `(${r.status})`);
  }

  console.log("\n" + "=".repeat(60));
  console.log(`RESULTADO: ${total - falhas.length}/${total} verificações passaram`);
  if (falhas.length) {
    console.log("FALHAS:");
    for (const falha of falhas) console.log(" -", falha);
    process.exit(1);
  }
}

main().catch((erro) => {
  console.error("Erro fatal no teste:", erro);
  process.exit(1);
});
