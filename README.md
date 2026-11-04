# Academia do Alemão

Sistema de academia com **três tabelas relacionadas** (`Aluno`, `Professor` e `Matrícula`),
autenticação JWT para dois papéis e o **mesmo frontend** servido por duas APIs independentes:
uma em **Node.js/Express** e outra em **Flask**.

A antiga tabela `Plano` deu lugar a `Professor`; cada matrícula guarda a modalidade, o professor
responsável e a duração do plano. As modalidades são fixas: **Musculação, Cross Fit, Muay Thai,
Karatê e Boxe**.

## Funcionalidades

- **Login único** para aluno e professor (`/api/v1/auth/login`), com o papel vindo no token JWT.
- **Cadastro em duas etapas**: (1) nome e escolha entre aluno/professor; (2) e-mail, senha e,
  para professor, as modalidades que leciona.
- **Painel do aluno**: cartões por modalidade com professor, período e dias restantes, remoção
  de turma e início de novo plano escolhendo modalidade, professor e duração.
- **Painel do professor**: chips para entrar/sair de modalidades e tabela dos próprios alunos
  com filtro, situação e dias restantes.
- **Regras de negócio**: e-mail único entre os dois papéis, uma matrícula ativa por modalidade,
  professor precisa lecionar a modalidade, exclusões bloqueadas quando há vínculo.

## Tecnologias

| Camada | Node | Flask |
| --- | --- | --- |
| Servidor | Express | Flask + Flask-CORS |
| Banco | MySQL (`mysql2`) | MySQL (`mysql-connector-python`) |
| Autenticação | JWT (`jsonwebtoken`) + bcrypt | JWT (`PyJWT`) + bcrypt |
| Frontend | HTML, CSS e JavaScript puro | idêntico (mesma pasta `static/`) |

## Estrutura

```
.
├── Academia.node/     API Express (porta 8080)
├── Academia.flask/    API Flask (porta 8081)
├── _tests/            suíte HTTP que roda contra qualquer uma das APIs
└── .gitignore
```

Cada pasta tem seu próprio README com o passo a passo detalhado. O script do banco é o mesmo
nas duas: [`Academia.node/docs/Banco.sql`](Academia.node/docs/Banco.sql) (idêntico ao do Flask).

## Como rodar

### 1. Banco de dados

No MySQL Workbench (usuário `root`, sem senha), abra e execute
[`docs/Banco.sql`](Academia.node/docs/Banco.sql) inteiro. Ele **recria** o schema `academia_db`
com as três tabelas e dados de exemplo.

> Se o seu MySQL usa senha ou outra porta, ajuste a conexão em `Academia.node/Server.js` ou
> `Academia.flask/server.py` (ou use as variáveis `DB_HOST`, `DB_PORT`, `DB_USER`,
> `DB_PASSWORD` e `DB_NAME`).

### 2. API em Node

```bash
cd Academia.node
npm install
npm start          # http://localhost:8080/Login.html
```

### 3. API em Flask

```bash
cd Academia.flask
pip install -r requirements.txt
python app.py      # http://localhost:8081/Login.html
```

As duas APIs compartilham o mesmo banco e podem rodar ao mesmo tempo, cada uma na sua porta.

## Contas de teste

| Papel | E-mail | Senha |
| --- | --- | --- |
| Aluna | `ana@academia.com` | `Senha@123` |
| Professor | `carlos@academia.com` | `Senha@123` |

O seed também cria Bruno Lima (aluno) e as professoras Fernanda Alves e Rafael Tanaka.

## Testes

A suíte [`_tests/test_academia_v2.mjs`](_tests/test_academia_v2.mjs) cobre login, cadastro,
permissões, regras de matrícula e as rotas do frontend — 88 verificações por API.

```bash
node _tests/test_academia_v2.mjs http://127.0.0.1:8080   # Node
node _tests/test_academia_v2.mjs http://127.0.0.1:8081   # Flask
```

## Documentação

- [API em Node.js](Academia.node/README.md)
- [API em Flask](Academia.flask/README.md)
