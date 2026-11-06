# Academia do Alemão — API em Node.js

Sistema de academia com três tabelas relacionadas — **Aluno**, **Matrícula** e **Pagamento** —,
autenticação JWT e frontend servido pela própria API.

Cada aluno entra com e-mail e senha, vê os próprios treinos e cuida das mensalidades deles. As
opções oferecidas são fixas: **Musculação, Cross Fit, Muay Thai, Karatê e Boxe**.

| Item | Valor |
| --- | --- |
| Porta | `8080` |
| Banco | `academia_db` (MySQL) |
| Aluna de teste | `ana@academia.com` / `Senha@123` |
| Site | http://localhost:8080/Login.html |

---

## 1. O que você precisa ter instalado

- **Node.js** 18 ou superior (`node -v`)
- **MySQL** rodando (por exemplo, pelo XAMPP) e, para configurar um banco novo,
  **MySQL Workbench**

## 2. Criar o banco no MySQL Workbench (somente na primeira vez)

Se o banco `academia_db` e as tabelas já existem, pule esta seção. **Não rode o script novamente
em um banco com dados**, pois os dados de exemplo podem causar erro de chave duplicada.

O banco local deste projeto já está atualizado: a tabela `Matricula` usa a coluna `treino`.
Para um banco novo, crie as tabelas usando `docs/Banco.sql`. Não execute o seed novamente em um
banco que já tenha dados.

1. Inicie o MySQL local (no XAMPP, clique em **Start** na linha MySQL).
2. Abra o **MySQL Workbench** e conecte no MySQL local (usuário `root`; use a senha configurada
   no seu MySQL, ou deixe vazia se ele não tiver senha).
3. No menu **File → Open SQL Script…**, escolha [`docs/Banco.sql`](docs/Banco.sql).
4. Clique no raio ⚡ (**Execute**) para rodar o script inteiro.
   Ele cria o banco `academia_db` e as tabelas `Aluno`, `Matricula` e `Pagamento` (com as chaves
   estrangeiras). Os dados de exemplo são inseridos apenas na primeira execução em um banco novo
   ou vazio.
5. No painel **SCHEMAS** (lateral esquerda), clique no ícone de recarregar e confirme que
   `academia_db` aparece com as três tabelas.
6. Para conferir os dados, rode:

   ```sql
   USE academia_db;
   SELECT idAluno, nomeAluno, email FROM Aluno;
   SELECT idMatricula, treino, status, Aluno_idAluno FROM Matricula;
   SELECT idPagamento, valor, dataVencimento, status, Matricula_idMatricula FROM Pagamento;
   ```

> O mesmo `Banco.sql` é usado pela API em Flask: as duas implementações compartilham o banco.

## 3. Conferir a conexão no projeto

A conexão fica em [`Server.js`](Server.js#L97), no método `init()`, e já vem configurada para o
MySQL local (sem nenhuma variável de ambiente definida, valem os valores da direita):

```js
host: process.env.DB_HOST ?? "localhost",
user: process.env.DB_USER ?? "root",
password: process.env.DB_PASSWORD ?? "",
database: process.env.DB_NAME ?? "academia_db",
port: 3306
```

Host, usuário, senha e nome do banco podem ser configurados por ambiente (`DB_HOST`, `DB_USER`,
`DB_PASSWORD`, `DB_NAME`). A porta do MySQL está definida como `3306` no projeto.

## 4. Rodar a API no PowerShell do VS Code

1. Inicie o MySQL no XAMPP, se ainda não estiver rodando.
2. Abra um terminal **PowerShell** no VS Code.
3. Rode estes comandos para entrar na pasta e conferir Node/npm:

```powershell
Set-Location "C:\Users\mateu\Downloads\Academia.node"
node --version
npm --version
```

Se as dependências ainda não estiverem instaladas (por exemplo, se não existir a pasta `node_modules`),
rode uma vez:

```powershell
npm install
```

Se seu MySQL local usa `root` **sem senha**, inicie a API com:

```powershell
npm start
```

Se o `root` do MySQL **tem senha**, use este comando para informá-la sem colocá-la no README ou
salvá-la no histórico do terminal. Quando solicitado, digite a senha; se não houver senha, apenas
pressione Enter:

```powershell
$senhaSegura = Read-Host "Senha do MySQL root (Enter se nao houver)" -AsSecureString
$env:DB_PASSWORD = [System.Net.NetworkCredential]::new("", $senhaSegura).Password
$senhaSegura.Dispose()
try {
    npm start
} finally {
    Remove-Item Env:DB_PASSWORD -ErrorAction SilentlyContinue
}
```

Para encerrar o servidor, pressione **Ctrl+C** no terminal em que ele está rodando. Para iniciar
novamente após uma alteração no código, execute os comandos de início outra vez. Se o processo antigo
estiver em execução em outro terminal, encerre-o com **Ctrl+C** antes de iniciar outro na porta 8080.

Saída esperada:

```
⬆️  Conectado ao MySQL (academia_db) com sucesso!
🚀 API Node rodando em http://localhost:8080/Login.html
```

Abra **http://localhost:8080/Login.html** no navegador.

### Conta de teste

Use estes dados na tela de login:

- **E-mail:** `ana@academia.com`
- **Senha:** `Senha@123`

Essa conta é inserida pelo script `docs/Banco.sql` em uma instalação nova. Se seu banco já existia
antes da importação dos dados de exemplo, a conta pode não estar cadastrada; não execute o script
novamente em um banco com dados só para criar essa conta.

## 5. As telas

### Login e cadastro

Um único formulário de login e um cadastro simples: nome, e-mail, senha e confirmação. A conta é
criada por `POST /api/v1/auth/registrar`, que já devolve o token — o aluno cai direto no painel.

### Painel do aluno

- **Editar meus dados:** o ícone de lápis ao lado de **Atualizar** e **Sair** permite mudar o e-mail
  e, opcionalmente, a senha. Para confirmar, informe a senha atual.
- **Meus treinos:** cartões com cada treino, o período do plano e quantos dias faltam
  (com barra de progresso), além de quantas mensalidades existem naquela matrícula.
- **Iniciar novo plano:** treino e datas de início e fim informadas pelo aluno; o sistema
  gera uma mensalidade pendente por mês, do início até o último vencimento que não ultrapasse o fim.
- **Minhas mensalidades:** tabela com treino, vencimento, valor, forma de pagamento, status
  e data em que foi paga. O aluno escolhe uma mensalidade pendente em **Registrar pagamento** e
  informa a forma usada. O valor é fixo por treino: R$ 60 para Musculação e Cross Fit; R$ 120
  para Muay Thai, Karatê e Boxe. Também pode excluir uma mensalidade.

## 6. Endpoints

### Públicos

| Método | Rota | O que faz |
| --- | --- | --- |
| POST | `/api/v1/auth/login` | autentica o aluno e devolve o token |
| POST | `/api/v1/auth/registrar` | cria a conta (`nome`, `email`, `senha`) e devolve o token |
| GET | `/api/v1/treinos` | as 5 opções de treino e as durações de plano |

Exemplo de login:

```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ana@academia.com","senha":"Senha@123"}'
```

Resposta (resumida):

```json
{
  "success": true,
  "data": {
    "tipo": "aluno",
    "usuario": { "idAluno": 1, "nomeAluno": "Ana Souza", "email": "ana@academia.com", "ativo": 1 },
    "token": "eyJ..."
  }
}
```

### Autenticados (`Authorization: Bearer <token>`)

| Método | Rota | O que faz |
| --- | --- | --- |
| GET | `/api/v1/auth/sessao` | devolve os claims do token |
| PUT | `/api/v1/auth/perfil` | atualiza e-mail e, opcionalmente, senha (envie `email`, `senhaAtual` e `novaSenha`) |
| GET | `/api/v1/matriculas/minhas` | matrículas do aluno logado |
| GET/POST | `/api/v1/matriculas` | lista as próprias / inicia um plano para o aluno do token |
| GET/PUT/DELETE | `/api/v1/matriculas/:idMatricula` | busca / atualiza / remove (só o dono) |
| GET | `/api/v1/pagamentos/minhas` | mensalidades do aluno logado |
| GET | `/api/v1/pagamentos/matricula/:idMatricula` | mensalidades de uma matrícula do aluno |
| GET/POST | `/api/v1/pagamentos` | lista as próprias / cria uma mensalidade pela API |
| GET/PUT/DELETE | `/api/v1/pagamentos/:idPagamento` | busca / atualiza / exclui (só o dono) |
| GET/POST | `/api/v1/alunos` | lista / cadastra alunos |
| GET/PUT/DELETE | `/api/v1/alunos/:idAluno` | busca / atualiza / exclui |

Exemplo de criação de mensalidade pela API (no painel, elas são geradas junto com o plano):

```bash
curl -X POST http://localhost:8080/api/v1/pagamentos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"pagamento":{"valor":120,"dataVencimento":"2026-12-05","metodo":"Pix","matricula":{"idMatricula":1}}}'
```

Para registrar o pagamento, envie o status e a forma usada — a data é preenchida com o dia de hoje:

```bash
curl -X PUT http://localhost:8080/api/v1/pagamentos/3 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"pagamento":{"status":"pago","metodo":"Pix"}}'
```

## 7. Regras de negócio

- o e-mail é único (é a credencial de login);
- o aluno só pode ter **uma matrícula ativa por treino** (pode ter vários treinos);
- o treino precisa estar na lista fixa; a data de fim do plano deve ser informada no cadastro;
- **o dono de matrículas e pagamentos vem sempre do token** — ninguém mexe no que é de outro aluno
  (**403**);
- cada pagamento pertence a uma matrícula; ao excluir a matrícula, as mensalidades dela somem
  junto (`ON DELETE CASCADE`);
- o pagamento nasce **pendente**, sem forma de pagamento; ao registrar o pagamento, o aluno
  informa o método e a data recebe o dia de hoje;
- mensalidades pendentes permanecem pendentes nesta versão; não há tratamento de atraso na tela;
- ao voltar um pagamento para pendente, a forma e a data de pagamento são limpas;
- ao criar uma matrícula ativa, a API gera mensalidades pendentes com vencimentos mensais a partir
  da data inicial, incluindo o último vencimento que não ultrapasse a data final;
- o valor da mensalidade é definido pelo treino: R$ 60 para Musculação e Cross Fit; R$ 120
  para Muay Thai, Karatê e Boxe. A API calcula esse valor no servidor;
- para registrar um pagamento, o aluno escolhe uma mensalidade pendente e informa a forma de
  pagamento; a API grava o status como pago e preenche a data atual;
- método de pagamento aceita `Pix`, `Cartão` ou `Dinheiro`;
- não é possível excluir um aluno com matrícula vinculada (**400**).

## 8. Estrutura

```
Academia.node/
├── index.js                  inicia o servidor na porta 8080
├── Server.js                 monta banco, middlewares, controllers e rotas
├── docs/Banco.sql            script do banco (rodar no Workbench)
├── static/                   frontend (Login, painel, CSS, ApiService)
└── api/
    ├── domain/               lista fixa das 5 opções de treino
    ├── routes/               rotas Express
    ├── middleware/           JWT e validações de corpo
    ├── controllers/          camada HTTP (envelope { success, message, data })
    ├── services/             regras de negócio
    ├── dao/                  SQL
    ├── models/               entidades e validações de domínio
    ├── database/             pool de conexões MySQL
    └── utils/                erros, validação e log
```

## 9. Problemas comuns

| Mensagem | Causa | Solução |
| --- | --- | --- |
| `ECONNREFUSED` / `Falha ao conectar ao MySQL` | MySQL desligado ou porta errada | inicie o MySQL e confira a porta no Workbench |
| `Access denied for user 'root'` | usuário/senha diferentes do seu MySQL | ajuste `user`/`password` em `Server.js` |
| `Unknown database 'academia_db'` | o `Banco.sql` não foi executado | repita o passo 2 |
| `EADDRINUSE :8080` | porta já em uso | feche o outro processo ou troque a porta em `index.js` |
| `token inválido` | sessão expirada (8 h) | faça login de novo |
