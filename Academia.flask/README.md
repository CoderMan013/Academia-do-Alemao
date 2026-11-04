# Academia do Alemão — API em Flask

Sistema de academia com três tabelas relacionadas — **Aluno**, **Matrícula** e **Pagamento** —,
autenticação JWT e frontend servido pela própria API.

Cada aluno entra com e-mail e senha, vê as próprias matrículas e cuida das mensalidades delas. As
modalidades oferecidas são fixas: **Musculação, Cross Fit, Muay Thai, Karatê e Boxe**.

| Item | Valor |
| --- | --- |
| Porta | `8081` |
| Banco | `academia_db` (MySQL) |
| Aluna de teste | `ana@academia.com` / `Senha@123` |
| Site | http://localhost:8081/Login.html |

---

## 1. O que você precisa ter instalado

- **Python** 3.10 ou superior (`python --version`)
- **MySQL** rodando, com o **MySQL Workbench** para executar o script do banco

## 2. Criar o banco no MySQL Workbench

1. Abra o **MySQL Workbench** e conecte no seu MySQL local (usuário `root`, sem senha).
2. Menu **File → Open SQL Script…** e escolha [`docs/Banco.sql`](docs/Banco.sql).
3. Clique no raio ⚡ (**Execute**) para rodar o script inteiro.
   Ele cria o banco `academia_db`, as tabelas `Aluno`, `Matricula` e `Pagamento` (com as chaves
   estrangeiras) e já insere alunos, matrículas e mensalidades de exemplo.
4. No painel **SCHEMAS** (lateral esquerda), clique no ícone de recarregar e confirme que
   `academia_db` aparece com as três tabelas.
5. Para conferir os dados, rode:

   ```sql
   USE academia_db;
   SELECT idAluno, nomeAluno, email FROM Aluno;
   SELECT idMatricula, modalidade, status, Aluno_idAluno FROM Matricula;
   SELECT idPagamento, valor, dataVencimento, status, Matricula_idMatricula FROM Pagamento;
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

### Login e cadastro

Um único formulário de login e um cadastro simples: nome, e-mail, senha e confirmação. A conta é
criada por `POST /api/v1/auth/registrar`, que já devolve o token — o aluno cai direto no painel.

### Painel do aluno

- **Minhas modalidades:** cartões com cada modalidade, o período do plano e quantos dias faltam
  (com barra de progresso), além de quantas mensalidades existem naquela matrícula.
- **Iniciar novo plano:** modalidade → duração (1, 3, 6 ou 12 meses) → data de início.
- **Minhas mensalidades:** tabela com modalidade, vencimento, valor, forma de pagamento, status
  e data em que foi paga. O aluno pode registrar uma nova mensalidade, marcar como paga e excluir.

## 6. Endpoints

### Públicos

| Método | Rota | O que faz |
| --- | --- | --- |
| POST | `/api/v1/auth/login` | autentica o aluno e devolve o token |
| POST | `/api/v1/auth/registrar` | cria a conta (`nome`, `email`, `senha`) e devolve o token |
| GET | `/api/v1/modalidades` | as 5 modalidades e as durações de plano |

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

| Método | Rota | O que faz |
| --- | --- | --- |
| GET | `/api/v1/auth/sessao` | devolve os claims do token |
| GET | `/api/v1/matriculas/minhas` | matrículas do aluno logado |
| GET/POST | `/api/v1/matriculas` | lista todas / inicia um plano para o aluno do token |
| GET/PUT/DELETE | `/api/v1/matriculas/:idMatricula` | busca / atualiza / remove (só o dono) |
| GET | `/api/v1/pagamentos/minhas` | mensalidades do aluno logado |
| GET | `/api/v1/pagamentos/matricula/:idMatricula` | mensalidades de uma matrícula do aluno |
| GET/POST | `/api/v1/pagamentos` | lista todas / registra uma mensalidade |
| GET/PUT/DELETE | `/api/v1/pagamentos/:idPagamento` | busca / atualiza / exclui (só o dono) |
| GET/POST | `/api/v1/alunos` | lista / cadastra alunos |
| GET/PUT/DELETE | `/api/v1/alunos/:idAluno` | busca / atualiza / exclui |

Exemplo de mensalidade (aluno logado):

```bash
curl -X POST http://localhost:8081/api/v1/pagamentos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"pagamento":{"valor":120,"dataVencimento":"2026-12-05","metodo":"Pix","matricula":{"idMatricula":1}}}'
```

Para marcar como paga, basta um `PUT` com o novo status — a data de pagamento é preenchida com o
dia de hoje:

```bash
curl -X PUT http://localhost:8081/api/v1/pagamentos/3 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"pagamento":{"status":"pago"}}'
```

## 7. Regras de negócio

- o e-mail é único (é a credencial de login);
- o aluno só pode ter **uma matrícula ativa por modalidade** (pode ter várias modalidades);
- a modalidade precisa estar na lista fixa; `dataFim` é calculada com `duracaoMeses` (padrão 3);
- **o dono de matrículas e pagamentos vem sempre do token** — ninguém mexe no que é de outro aluno
  (**403**);
- cada pagamento pertence a uma matrícula; ao excluir a matrícula, as mensalidades dela somem
  junto (`ON DELETE CASCADE`);
- o pagamento nasce **pendente**; se ficar pendente com vencimento no passado, a listagem mostra
  **atrasado** (calculado na consulta);
- ao marcar como **pago** sem informar a data, a data de pagamento recebe o dia de hoje; voltando
  para outro status, a data é limpa;
- valor precisa ser maior que zero e no máximo 100000; método aceita `Pix`, `Cartão` ou `Dinheiro`;
- não é possível excluir um aluno com matrícula vinculada (**400**).

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
    ├── middleware/           JWT e validações de corpo
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
