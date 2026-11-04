/**
 * Teste HTTP do novo modelo (Aluno / Professor / Modalidade / Matrícula).
 *
 * Roda contra uma API de verdade (MySQL), seja a Node (:8080) ou a Flask (:8081).
 * O banco precisa estar com o seed de docs/Banco.sql.
 *
 * Uso:
 *   node _tests/test_academia_v2.mjs http://127.0.0.1:8081
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

const emailUnico = `teste.${Date.now()}@academia.com`;
const emailProf = `prof.${Date.now()}@academia.com`;

async function main() {
  console.log(`\nAPI: ${BASE}\n`);

  console.log("[1] Frontend estático");
  let r = await pedir("GET", "/Login.html");
  checar("GET /Login.html -> 200", r.status === 200, `(${r.status})`);
  checar("cadastro tem as duas etapas", r.texto.includes("etapa1") && r.texto.includes("etapa2"), "faltou etapa1/etapa2");
  checar("cadastro tem escolha Aluno/Professor", r.texto.includes('value="aluno"') && r.texto.includes('value="professor"'), "faltou radio");
  checar("cadastro tem as 5 modalidades do professor", r.texto.includes("checkModalidades"), "faltou checkModalidades");

  r = await pedir("GET", "/dashboard.html");
  checar("GET /dashboard.html -> 200", r.status === 200, `(${r.status})`);
  checar("painel tem visão do aluno e do professor", r.texto.includes("viewAluno") && r.texto.includes("viewProfessor"), "faltou view");

  r = await pedir("GET", "/dashboard.js");
  checar("dashboard.js usa as rotas por papel", r.texto.includes("matriculas/minhas") && r.texto.includes("professores/me/alunos"), "faltou rota");

  r = await pedir("GET", "/css/styles.css");
  checar("GET /css/styles.css -> 200", r.status === 200, `(${r.status})`);
  checar("CSS tem os cartões de matrícula", r.texto.includes(".mat-card"), "faltou .mat-card");

  r = await pedir("GET", "/rota-que-nao-existe");
  checar("rota inexistente -> 404", r.status === 404, `(${r.status})`);

  console.log("\n[2] Modalidades (rota pública)");
  r = await pedir("GET", "/api/v1/modalidades");
  checar("GET /modalidades sem token -> 200", r.status === 200, `(${r.status})`);
  const modalidades = r.json?.data?.modalidades ?? [];
  checar("devolve as 5 modalidades", modalidades.length === 5, JSON.stringify(modalidades.map((m) => m.nome)));
  checar("nomes canônicos", ["Musculação", "Cross Fit", "Muay Thai", "Karatê", "Boxe"].every((nome) => modalidades.some((m) => m.nome === nome)), JSON.stringify(modalidades.map((m) => m.nome)));

  const muayThai = modalidades.find((m) => m.nome === "Muay Thai");
  checar("Muay Thai tem o professor Carlos", muayThai?.professores?.some((p) => p.nomeProfessor === "Carlos Mendes"), JSON.stringify(muayThai));
  const karate = modalidades.find((m) => m.nome === "Karatê");
  checar("Karatê tem o professor Rafael", karate?.professores?.some((p) => p.nomeProfessor === "Rafael Tanaka"), JSON.stringify(karate));

  console.log("\n[3] Autenticação dos dois papéis");
  r = await pedir("GET", "/api/v1/matriculas/minhas");
  checar("GET /matriculas/minhas sem token -> 401", r.status === 401, `(${r.status})`);

  r = await pedir("POST", "/api/v1/auth/login", { email: "ana@academia.com", senha: "errada" });
  checar("login com senha errada -> 401", r.status === 401, `(${r.status})`);

  r = await pedir("POST", "/api/v1/auth/login", { email: "ana@academia.com", senha: "Senha@123" });
  checar("login da aluna -> 200", r.status === 200, `(${r.status})`);
  const tokenAluno = r.json?.data?.token;
  const tipoAluno = r.json?.data?.tipo;
  const usuarioAluno = r.json?.data?.usuario;
  checar("login devolve token", Boolean(tokenAluno), JSON.stringify(r.json).slice(0, 160));
  checar("login identifica o papel 'aluno'", tipoAluno === "aluno", String(tipoAluno));
  checar("login devolve o idAluno", usuarioAluno?.idAluno === 1, JSON.stringify(usuarioAluno));
  checar("login não devolve a senha", usuarioAluno?.senha === undefined, JSON.stringify(usuarioAluno));

  r = await pedir("POST", "/api/v1/auth/login", { email: "carlos@academia.com", senha: "Senha@123" });
  checar("login do professor -> 200", r.status === 200, `(${r.status})`);
  const tokenProf = r.json?.data?.token;
  const usuarioProf = r.json?.data?.usuario;
  checar("login identifica o papel 'professor'", r.json?.data?.tipo === "professor", JSON.stringify(r.json?.data?.tipo));
  checar("professor devolve modalidades em lista", Array.isArray(usuarioProf?.modalidades) && usuarioProf.modalidades.includes("Boxe"), JSON.stringify(usuarioProf));

  r = await pedir("POST", "/api/v1/auth/login", { email: "naoexiste@academia.com", senha: "Senha@123" });
  checar("login de e-mail inexistente -> 401", r.status === 401, `(${r.status})`);

  r = await pedir("GET", "/api/v1/auth/sessao", undefined, tokenAluno);
  checar("GET /auth/sessao com token -> 200", r.status === 200, `(${r.status})`);
  checar("sessão devolve role aluno", r.json?.data?.usuario?.role === "aluno", JSON.stringify(r.json?.data));

  console.log("\n[4] Cadastro em duas etapas (payload final)");
  r = await pedir("POST", "/api/v1/auth/registrar", {
    tipo: "aluno",
    nome: "Teste Aluno",
    email: emailUnico,
    senha: "Senha@123"
  });
  checar("cadastro de aluno -> 201", r.status === 201, `(${r.status}) ${JSON.stringify(r.json)}`);
  const tokenAlunoNovo = r.json?.data?.token;
  const idAlunoNovo = r.json?.data?.usuario?.idAluno;
  checar("cadastro já devolve o token", Boolean(tokenAlunoNovo), JSON.stringify(r.json).slice(0, 160));
  checar("cadastro devolve o idAluno", Number.isInteger(idAlunoNovo), JSON.stringify(r.json?.data?.usuario));

  r = await pedir("POST", "/api/v1/auth/registrar", {
    tipo: "professor",
    nome: "Teste Professor",
    email: emailProf,
    senha: "Senha@123",
    modalidades: ["Karatê", "Boxe"]
  });
  checar("cadastro de professor -> 201", r.status === 201, `(${r.status}) ${JSON.stringify(r.json)}`);
  const idProfessorNovo = r.json?.data?.usuario?.idProfessor;
  checar("professor já nasce com as modalidades", JSON.stringify(r.json?.data?.usuario?.modalidades) === JSON.stringify(["Karatê", "Boxe"]), JSON.stringify(r.json?.data?.usuario));

  r = await pedir("POST", "/api/v1/auth/registrar", {
    tipo: "aluno",
    nome: "Email Repetido",
    email: emailUnico,
    senha: "Senha@123"
  });
  checar("e-mail repetido -> 400", r.status === 400, `(${r.status})`);
  checar("mensagem 'E-mail já cadastrado'", r.json?.message === "E-mail já cadastrado", JSON.stringify(r.json));

  r = await pedir("POST", "/api/v1/auth/registrar", {
    tipo: "professor",
    nome: "Email da Aluna",
    email: "ana@academia.com",
    senha: "Senha@123",
    modalidades: ["Boxe"]
  });
  checar("e-mail de aluno usado em professor -> 400", r.status === 400, `(${r.status})`);

  r = await pedir("POST", "/api/v1/auth/registrar", {
    tipo: "admin",
    nome: "Papel Inválido",
    email: `admin.${Date.now()}@academia.com`,
    senha: "Senha@123"
  });
  checar("tipo inválido -> 400", r.status === 400, `(${r.status})`);

  r = await pedir("POST", "/api/v1/auth/registrar", {
    tipo: "professor",
    nome: "Modalidade Errada",
    email: `bale.${Date.now()}@academia.com`,
    senha: "Senha@123",
    modalidades: ["Balé"]
  });
  checar("modalidade fora da lista -> 400", r.status === 400, `(${r.status})`);

  r = await pedir("POST", "/api/v1/auth/registrar", {
    tipo: "aluno",
    nome: "Senha Fraca",
    email: `fraca.${Date.now()}@academia.com`,
    senha: "123456"
  });
  checar("senha fraca -> 400", r.status === 400, `(${r.status})`);

  console.log("\n[5] Aluno: minhas matrículas e novos planos");
  r = await pedir("GET", "/api/v1/matriculas/minhas", undefined, tokenAluno);
  checar("GET /matriculas/minhas -> 200", r.status === 200, `(${r.status})`);
  const minhas = r.json?.data?.matriculas ?? [];
  checar("Ana começa com 3 matrículas", minhas.length === 3, `(${minhas.length})`);
  checar("2 ativas + 1 concluída", minhas.filter((m) => m.status === "ativa").length === 2 && minhas.some((m) => m.status === "concluida"), JSON.stringify(minhas.map((m) => m.status)));
  checar("matrícula traz professor aninhado", Boolean(minhas[0]?.professor?.nomeProfessor), JSON.stringify(minhas[0]));
  checar("matrícula traz a modalidade", typeof minhas[0]?.modalidade === "string", JSON.stringify(minhas[0]));
  checar("data como texto YYYY-MM-DD", /^\d{4}-\d{2}-\d{2}$/.test(minhas[0]?.dataFim ?? ""), JSON.stringify(minhas[0]?.dataFim));

  r = await pedir("POST", "/api/v1/matriculas", {
    matricula: {
      modalidade: "Boxe",
      dataInicio: "2026-11-03",
      duracaoMeses: 3,
      professor: { idProfessor: 1 }
    }
  }, tokenAluno);
  checar("aluno inicia plano de Boxe -> 201", r.status === 201, `(${r.status}) ${JSON.stringify(r.json)}`);
  const nova = r.json?.data?.matriculas?.[0];
  checar("dataFim calculada (+3 meses)", nova?.dataFim === "2027-02-03", JSON.stringify(nova));
  checar("matrícula fica com o aluno do token", nova?.aluno?.idAluno === 1, JSON.stringify(nova?.aluno));
  checar("matrícula fica com o professor escolhido", nova?.professor?.idProfessor === 1, JSON.stringify(nova?.professor));
  const idNova = nova?.idMatricula;

  r = await pedir("POST", "/api/v1/matriculas", {
    matricula: { modalidade: "Boxe", dataInicio: "2026-11-04", professor: { idProfessor: 1 } }
  }, tokenAluno);
  checar("mesma modalidade ativa -> 400", r.status === 400, `(${r.status})`);
  checar("mensagem 'Matrícula duplicada'", r.json?.message === "Matrícula duplicada", JSON.stringify(r.json));

  r = await pedir("POST", "/api/v1/matriculas", {
    matricula: { modalidade: "Musculação", dataInicio: "2026-11-04", professor: { idProfessor: 1 } }
  }, tokenAluno);
  checar("professor que não leciona a modalidade -> 400", r.status === 400, `(${r.status})`);
  checar("mensagem explica a modalidade", String(r.json?.message).includes("não leciona"), JSON.stringify(r.json));

  r = await pedir("POST", "/api/v1/matriculas", {
    matricula: { modalidade: "Karatê", dataInicio: "2026-11-04", professor: { idProfessor: 999 } }
  }, tokenAluno);
  checar("professor inexistente -> 404", r.status === 404, `(${r.status})`);

  r = await pedir("POST", "/api/v1/matriculas", {
    matricula: {
      modalidade: "Karatê",
      dataInicio: "2026-11-04",
      aluno: { idAluno: 2 },
      professor: { idProfessor: 3 }
    }
  }, tokenAluno);
  checar("aluno não consegue matricular outra pessoa -> usa o próprio id", r.json?.data?.matriculas?.[0]?.aluno?.idAluno === 1, JSON.stringify(r.json?.data?.matriculas?.[0]?.aluno));
  const idKarate = r.json?.data?.matriculas?.[0]?.idMatricula;
  if (idKarate) await pedir("DELETE", `/api/v1/matriculas/${idKarate}`, undefined, tokenAluno);

  console.log("\n[6] Professor: modalidades e meus alunos");
  r = await pedir("GET", "/api/v1/professores/me", undefined, tokenProf);
  checar("GET /professores/me -> 200", r.status === 200, `(${r.status})`);
  checar("perfil do Carlos", r.json?.data?.professores?.[0]?.idProfessor === 1, JSON.stringify(r.json?.data));

  r = await pedir("GET", "/api/v1/professores/me", undefined, tokenAluno);
  checar("aluno não acessa /professores/me -> 403", r.status === 403, `(${r.status})`);

  r = await pedir("GET", "/api/v1/professores/me/alunos", undefined, tokenProf);
  checar("GET /professores/me/alunos -> 200", r.status === 200, `(${r.status})`);
  const alunosDoCarlos = r.json?.data?.matriculas ?? [];
  checar("Carlos vê a aluna Ana", alunosDoCarlos.some((m) => m.aluno.nomeAluno === "Ana Souza"), JSON.stringify(alunosDoCarlos.map((m) => m.aluno.nomeAluno)));
  checar("Carlos vê a nova matrícula de Boxe", alunosDoCarlos.some((m) => m.idMatricula === idNova), `id ${idNova}`);

  r = await pedir("GET", "/api/v1/professores/me/alunos", undefined, tokenAluno);
  checar("aluno não acessa /professores/me/alunos -> 403", r.status === 403, `(${r.status})`);

  r = await pedir("PUT", "/api/v1/professores/me/modalidades", { modalidades: ["Boxe"] }, tokenProf);
  checar("sair de modalidade com aluno ativo -> 400", r.status === 400, `(${r.status})`);
  checar("mensagem 'Modalidade em uso'", r.json?.message === "Modalidade em uso", JSON.stringify(r.json));

  r = await pedir("PUT", "/api/v1/professores/me/modalidades", { modalidades: ["Boxe", "Muay Thai", "Karatê"] }, tokenProf);
  checar("adicionar Karatê -> 200", r.status === 200, `(${r.status})`);
  checar("perfil devolve a lista nova", JSON.stringify(r.json?.data?.professores?.[0]?.modalidades) === JSON.stringify(["Boxe", "Muay Thai", "Karatê"]), JSON.stringify(r.json?.data));

  r = await pedir("PUT", "/api/v1/professores/me/modalidades", { modalidades: ["Boxe", "Balé"] }, tokenProf);
  checar("modalidade inválida no painel -> 400", r.status === 400, `(${r.status})`);

  r = await pedir("PUT", "/api/v1/professores/me/modalidades", { modalidades: "Boxe" }, tokenProf);
  checar("modalidades precisa ser lista -> 400", r.status === 400, `(${r.status})`);

  console.log("\n[7] Integridade e permissões");
  r = await pedir("GET", "/api/v1/professores");
  checar("GET /professores sem token -> 401", r.status === 401, `(${r.status})`);

  r = await pedir("GET", "/api/v1/professores", undefined, tokenAluno);
  checar("GET /professores com token -> 200", r.status === 200, `(${r.status})`);
  checar("lista traz modalidades em array", Array.isArray(r.json?.data?.professores?.[0]?.modalidades), JSON.stringify(r.json?.data?.professores?.[0]));

  r = await pedir("GET", "/api/v1/professores/999", undefined, tokenAluno);
  checar("professor inexistente -> 404", r.status === 404, `(${r.status})`);

  r = await pedir("DELETE", "/api/v1/professores/1", undefined, tokenProf);
  checar("excluir professor com matrícula -> 400", r.status === 400, `(${r.status})`);
  checar("mensagem 'Professor em uso'", r.json?.message === "Professor em uso", JSON.stringify(r.json));

  r = await pedir("DELETE", "/api/v1/alunos/1", undefined, tokenAluno);
  checar("excluir aluno com matrícula -> 400", r.status === 400, `(${r.status})`);
  checar("mensagem 'Aluno em uso'", r.json?.message === "Aluno em uso", JSON.stringify(r.json));

  r = await pedir("GET", "/api/v1/matriculas", undefined, tokenProf);
  checar("GET /matriculas -> 200", r.status === 200, `(${r.status})`);
  const todas = r.json?.data?.matriculas ?? [];
  const deBruno = todas.find((m) => m.aluno.idAluno === 2);
  checar("matrícula do Bruno encontrada", Boolean(deBruno), JSON.stringify(todas.map((m) => m.aluno.idAluno)));

  if (deBruno) {
    r = await pedir("DELETE", `/api/v1/matriculas/${deBruno.idMatricula}`, undefined, tokenAluno);
    checar("aluno não exclui matrícula de outro -> 403", r.status === 403, `(${r.status})`);
  }

  r = await pedir("GET", "/api/v1/matriculas/minhas", undefined, tokenProf);
  checar("professor não acessa /matriculas/minhas -> 403", r.status === 403, `(${r.status})`);

  r = await pedir("POST", "/api/v1/matriculas", {
    matricula: {
      modalidade: "Boxe",
      dataInicio: "2026-11-05",
      aluno: { idAluno: 2 },
      professor: { idProfessor: 1 }
    }
  }, tokenProf);
  checar("professor matricula um aluno -> 201", r.status === 201, `(${r.status}) ${JSON.stringify(r.json)}`);
  const idDoProfessor = r.json?.data?.matriculas?.[0]?.idMatricula;
  checar("matrícula criada para o aluno informado", r.json?.data?.matriculas?.[0]?.aluno?.idAluno === 2, JSON.stringify(r.json?.data?.matriculas?.[0]?.aluno));

  if (idDoProfessor) {
    r = await pedir("DELETE", `/api/v1/matriculas/${idDoProfessor}`, undefined, tokenProf);
    checar("professor remove matrícula da própria turma -> 204", r.status === 204, `(${r.status})`);
  }

  if (idNova) {
    r = await pedir("DELETE", `/api/v1/matriculas/${idNova}`, undefined, tokenAluno);
    checar("aluno remove a própria matrícula -> 204", r.status === 204, `(${r.status})`);
    checar("204 sem corpo", r.texto === "", JSON.stringify(r.texto));
  }

  r = await pedir("GET", "/api/v1/matriculas/minhas", undefined, tokenAluno);
  checar("depois de remover, volta a 3 matrículas", (r.json?.data?.matriculas ?? []).length === 3, JSON.stringify((r.json?.data?.matriculas ?? []).length));

  if (idProfessorNovo) {
    r = await pedir("DELETE", `/api/v1/professores/${idProfessorNovo}`, undefined, tokenProf);
    checar("limpeza: professor criado sem matrícula -> 204", r.status === 204, `(${r.status})`);
  }

  if (idAlunoNovo) {
    r = await pedir("DELETE", `/api/v1/alunos/${idAlunoNovo}`, undefined, tokenProf);
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
