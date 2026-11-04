# Academia do Alemão — API em Flask

Sistema de academia com três tabelas relacionadas — **Aluno**, **Professor** e **Matrícula** —
autenticação JWT para os dois tipos de usuário e frontend servido pela própria API.

A antiga tabela `Plano` foi substituída por `Professor`. As modalidades oferecidas são fixas:
**Musculação, Cross Fit, Muay Thai, Karatê e Boxe**.

| Item | Valor |
| --- | --- |
| Porta | `8081` |
| Banco | `academia_db` (MySQL) |
| Aluna de teste | `ana@academia.com` / `Senha@123` |
| Professor de teste | `carlos@academia.com` / `Senha@123` |
| Site | http://localhost:8081/Login.html |

---

## 1. O que você precisa ter instalado

- **Python** 3.10 ou superior (`python --version`)
- **MySQL** rodando, com o **MySQL Workbench** para executar o script do banco

## 2. Criar o banco no MySQL Workbench

1. Abra o **MySQL Workbench** e conecte no seu MySQL local (usuário `root`, sem senha).
2. Menu **File → Open SQL Script…** e escolha [`docs/Banco.sql`](docs/Banco.sql).
3. Clique no raio ⚡ (**Execute**) para rodar o script inteiro.
   Ele cria o banco `academia_db`, as tabelas `Aluno`, `Professor` e `Matricula` (com as duas
   chaves estrangeiras) e já insere professores, alunos e matrículas de exemplo.
4. No painel **SCHEMAS** (lateral esquerda), clique no ícone de recarregar e confirme que
   `academia_db` aparece com as três tabelas.
5. Para conferir os dados, rode:

   ```sql
   USE academia_db;
   SELECT idProfessor, nomeProfessor, modalidades FROM Professor;
   SELECT idAluno, nomeAluno, email FROM Aluno;
   SELECT idMatricula, modalidade, status, Aluno_idAluno, Professor_idProfessor FROM Matricula;
   ```

> Alternativa: em vez de rodar o script na mão, execute `python install.py` — ele instala as
> bibliotecas e cria o banco sozinho (mesmo `docs/Banco.sql`, root sem senha).
>
> O mesmo `Banco.sql` é usado pela API em Node: as duas implementações compartilham o banco.

## 3. Conferir a conexão no projeto

A conexão fica em [`server.py`](server.py#L110), no método `init()`, e já vem configurada para o
MySQL local (sem nenhuma variável de ambiente definida, valem os valores da direita):

```python
MysqlDatabase(
    pool_name="pool_academia",
    pool_size=10,
    host=os.environ.get("DB_HOST", "127.0.0.1"),
    user=os.environ.get("DB_USER", "root"),
    password=os.environ.get("DB_PASSWORD", ""),
    database=os.environ.get("DB_NAME", "academia_db"),
    port=int(os.environ.get("DB_PORT", "3306"))
)
```

Se o seu Workbench usa outra porta, host ou usuário, altere **apenas essas linhas**. As mesmas
variáveis podem ser passadas por ambiente (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`,
`DB_NAME`), que têm prioridade sobre os valores do arquivo.

## 4. Rodar a API

No terminal, dentro da pasta `Academia.flask`:

```bash
pip install -r requirements.txt    # só na primeira vez
python app.py
```

Saída esperada:

```
⬆️  Conectado ao MySQL (academia_db) com sucesso!
🚀 API Flask rodando em http://localhost:8081/Login.html
 * Running on http://127.0.0.1:8081
```

Abra **http://localhost:8081/Login.html** no navegador.

## 5. As telas

### Login

Um único formulário: a API procura o e-mail primeiro em `Aluno` e depois em `Professor`, então
aluno e professor entram pelo mesmo lugar. O painel que abre depende do papel que veio no token.

### Cadastro em duas etapas

1. **Etapa 1 — quem é você:** nome e escolha entre **Aluno** e **Professor**.
2. **Etapa 2 — seus dados:** e-mail, senha e confirmação. Se for professor, aparece também a
   lista das 5 modalidades para marcar as que ele quer lecionar.

A conta é criada por `POST /api/v1/auth/registrar`, que já devolve o token — o usuário cai direto
no painel.

### Painel do aluno

- Cartões com **cada modalidade**, o **professor** que leciona, o período e **quantos dias faltam**
  para o plano terminar (com barra de progresso).
- Botão **Remover** para sair de uma turma.
- Formulário **Iniciar novo plano**: modalidade → professor (só aparecem os que lecionam aquela
  modalidade) → duração (1, 3, 6 ou 12 meses) → início.

### Painel do professor

- **Modalidades que leciono**: chips clicáveis para entrar ou sair de uma modalidade.
  Se houver aluno ativo na modalidade, a API bloqueia a saída (o aluno ficaria sem professor).
- **Meus alunos**: tabela com aluno, e-mail, modalidade, período, situação e dias restantes,
  com filtro por nome ou modalidade.

## 6. Endpoints

### Públicos

| Método | Rota | O que faz |
| --- | --- | --- |
| POST | `/api/v1/auth/login` | autentica aluno **ou** professor e devolve o token |
| POST | `/api/v1/auth/registrar` | cria a conta (`tipo: "aluno"` ou `"professor"`) e devolve o token |
| GET | `/api/v1/modalidades` | as 5 modalidades e os professores de cada uma |

Exemplo de login:

```bash
curl -X POST http://localhost:8081/api/v1/auth/login \
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

| Método | Rota | Papel | O que faz |
| --- | --- | --- | --- |
| GET | `/api/v1/auth/sessao` | qualquer | devolve os claims do token |
| GET | `/api/v1/matriculas/minhas` | aluno | matrículas do próprio aluno |
| POST | `/api/v1/matriculas` | aluno/professor | inicia um plano (aluno usa o próprio id) |
| DELETE | `/api/v1/matriculas/:idMatricula` | dono | remove a matrícula |
| GET | `/api/v1/professores/me` | professor | perfil do professor logado |
| GET | `/api/v1/professores/me/alunos` | professor | matrículas das turmas dele |
| PUT | `/api/v1/professores/me/modalidades` | professor | entra/sai de modalidades |
| GET/POST | `/api/v1/alunos` | qualquer | lista / cadastra alunos |
| GET/PUT/DELETE | `/api/v1/alunos/:idAluno` | qualquer | busca / atualiza / exclui |
| GET/POST | `/api/v1/professores` | qualquer | lista / cadastra professores |
| GET/PUT/DELETE | `/api/v1/professores/:idProfessor` | qualquer | busca / atualiza / exclui |
| GET | `/api/v1/matriculas` | qualquer | lista todas as matrículas |
| GET/PUT | `/api/v1/matriculas/:idMatricula` | dono | busca / atualiza uma matrícula |

Exemplo de matrícula (aluno logado):

```bash
curl -X POST http://localhost:8081/api/v1/matriculas \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"matricula":{"modalidade":"Boxe","dataInicio":"2026-11-03","duracaoMeses":3,"professor":{"idProfessor":1}}}'
```

## 7. Regras de negócio

- o e-mail é único entre **alunos e professores** (é a credencial de login);
- o professor só pode lecionar modalidades da lista fixa;
- o aluno só pode ter **uma matrícula ativa por modalidade** (pode ter várias modalidades);
- o professor da matrícula precisa lecionar aquela modalidade;
- `dataFim` é calculada com `duracaoMeses` (padrão 3) quando não é informada;
- o aluno só altera/remove as próprias matrículas; o professor, as das próprias turmas;
- não é possível excluir aluno/professor com matrícula vinculada (**400**);
- não é possível sair de uma modalidade que ainda tem aluno ativo (**400**).

## 8. Estrutura

```
Academia.flask/
├── app.py                    inicia o servidor na porta 8081
├── server.py                 monta banco, middlewares, controls e rotas
├── install.py                instala as bibliotecas e cria o banco
├── requirements.txt          dependências do projeto
├── docs/Banco.sql            script do banco (rodar no Workbench)
├── static/                   frontend (Login, painel, CSS, ApiService)
└── api/
    ├── domain/               lista fixa das 5 modalidades
    ├── router/               Blueprints com as rotas
    ├── middleware/           JWT, papel (aluno/professor) e validações
    ├── control/              camada HTTP (envelope { success, message, data })
    ├── service/              regras de negócio
    ├── dao/                  SQL
    ├── model/                entidades e validações de domínio
    ├── database/             pool de conexões MySQL
    ├── http/                 geração e validação do JWT
    ├── utils/                erros, validação e log
    └── system/log.log        log dos erros tratados
```

## 9. Problemas comuns

| Mensagem | Causa | Solução |
| --- | --- | --- |
| `Falha ao conectar ao MySQL` / `2003` | MySQL desligado ou porta errada | inicie o MySQL e confira a porta no Workbench |
| `Access denied for user 'root'` | usuário/senha diferentes do seu MySQL | ajuste `user`/`password` em `server.py` |
| `Unknown database 'academia_db'` | o `Banco.sql` não foi executado | repita o passo 2 |
| `Address already in use` | porta 8081 ocupada | feche o outro processo ou troque a porta em `app.py` |
| `ModuleNotFoundError: flask` | dependências não instaladas | `pip install -r requirements.txt` |
| `token inválido` | sessão expirada (8 h) | faça login de novo |
