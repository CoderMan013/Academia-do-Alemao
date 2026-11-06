# Academia do Alemão — API em Flask

Sistema de academia com três tabelas relacionadas — **Aluno**, **Matrícula** e **Pagamento** —,
autenticação JWT e frontend servido pela própria API.

Cada aluno entra com e-mail e senha, vê os próprios treinos e cuida das mensalidades deles. Os
treinos oferecidos são fixos: **Musculação, Cross Fit, Muay Thai, Karatê e Boxe**.

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

## 2. Preparar o banco MySQL

O banco precisa estar iniciado e conter as tabelas `Aluno`, `Matricula` e `Pagamento`, com as
colunas existentes no projeto. **Não execute `docs/Banco.sql` em um banco preenchido:** o script
começa com `DROP SCHEMA` e apaga o banco e todos os seus dados antes de recriá-lo. Também não rode
`python install.py` em um banco que você deseja preservar, pois esse script executa o mesmo SQL.

Para um banco novo ou descartável, abra `docs/Banco.sql` no MySQL Workbench e execute-o sabendo que
ele cria os dados de exemplo e substitui por completo o schema `academia_db`. Para conferir um banco
existente, rode:

   ```sql
   USE academia_db;
   SELECT idAluno, nomeAluno, email FROM Aluno;
   SELECT idMatricula, treino, status, Aluno_idAluno FROM Matricula;
   SELECT idPagamento, valor, dataVencimento, status, Matricula_idMatricula FROM Pagamento;
   ```

Se o banco já existe e contém a coluna antiga `Matricula.modalidade`, renomeie-a sem apagar
os dados antes de iniciar a versão atualizada da API:

   ```sql
   USE academia_db;
   ALTER TABLE Matricula
     CHANGE COLUMN modalidade treino VARCHAR(64) NOT NULL;
   ```

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

## 4. Rodar a API no Windows

1. Inicie o serviço MySQL no XAMPP, Workbench ou serviço instalado. O padrão do projeto é
   `127.0.0.1:3306`, usuário `root`, senha vazia e banco `academia_db`.
2. Abra o PowerShell na pasta `Academia.flask`.
3. Crie e ative o ambiente virtual (a criação só é necessária uma vez):

   ```powershell
   py -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```

   Se o PowerShell bloquear a ativação, não precisa alterar a política de segurança: execute os
   comandos seguintes usando `.\.venv\Scripts\python.exe`.
4. Instale as dependências na primeira execução e inicie a API:

   ```powershell
   python -m pip install -r requirements.txt
   python app.py
   ```

   Sem ativar o ambiente virtual:

   ```powershell
   .\.venv\Scripts\python.exe -m pip install -r requirements.txt
   .\.venv\Scripts\python.exe app.py
   ```

5. Mantenha esse terminal aberto e acesse **http://localhost:8081/Login.html**. Para parar o
   servidor, volte ao terminal e pressione `Ctrl+C`.

Saída esperada:

```
⬆️  Conectado ao MySQL (academia_db) com sucesso!
🚀 API Flask rodando em http://localhost:8081/Login.html
 * Running on http://127.0.0.1:8081
```

## 5. As telas

### Login e cadastro

Um formulário de login e um cadastro simples: nome, e-mail, senha e confirmação. A conta é criada
por `POST /api/v1/auth/registrar`, que já devolve o token — o aluno cai direto no painel.

### Painel do aluno

- **Meus treinos:** cartões com cada treino, o período do plano e quantos dias faltam
  (com barra de progresso), além de quantas mensalidades existem naquela matrícula.
- **Iniciar novo plano:** treino → duração (1, 3, 6 ou 12 meses) → data de início. O servidor
  cria automaticamente as mensalidades pendentes com os preços fixos do treino.
- **Minhas mensalidades:** tabela com treino, vencimento, valor, forma de pagamento, status
  e data em que foi paga. O aluno escolhe uma mensalidade pendente e o método para registrar o
  pagamento, ou exclui uma mensalidade.
- **Editar perfil:** atualiza o e-mail e, opcionalmente, a senha após confirmar a senha atual.

## 6. Endpoints

### Públicos

| Método | Rota | O que faz |
| --- | --- | --- |
| POST | `/api/v1/auth/login` | autentica o aluno e devolve o token |
| POST | `/api/v1/auth/registrar` | cria a conta (`nome`, `email`, `senha`) e devolve o token |
| GET | `/api/v1/modalidades` | os 5 treinos com preço e as durações de plano |

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
| PUT | `/api/v1/auth/perfil` | atualiza e-mail/senha com confirmação da senha atual |
| GET | `/api/v1/matriculas/minhas` | matrículas do aluno logado |
| GET/POST | `/api/v1/matriculas` | lista as próprias / inicia um plano para o aluno do token |
| GET/PUT/DELETE | `/api/v1/matriculas/:idMatricula` | busca / atualiza / remove (só o dono) |
| GET | `/api/v1/pagamentos/minhas` | mensalidades do aluno logado |
| GET | `/api/v1/pagamentos/matricula/:idMatricula` | mensalidades de uma matrícula do aluno |
| GET/POST | `/api/v1/pagamentos` | lista as próprias / registra uma mensalidade |
| GET/PUT/DELETE | `/api/v1/pagamentos/:idPagamento` | busca / atualiza / exclui (só o dono) |
| GET/POST | `/api/v1/alunos` | lista / cadastra alunos |
| GET/PUT/DELETE | `/api/v1/alunos/:idAluno` | busca / atualiza / exclui |

Exemplo de criação manual de mensalidade pela API (não é o fluxo do painel; o valor enviado é
ignorado e calculado pelo servidor):

```bash
curl -X POST http://localhost:8081/api/v1/pagamentos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"pagamento":{"valor":120,"dataVencimento":"2026-12-05","metodo":"Pix","matricula":{"idMatricula":1}}}'
```

Para marcar como paga, basta um `PUT` com o novo status — a data de pagamento é preenchida com o
dia de hoje. O método deve ser um dos valores `Pix`, `Cartão` ou `Dinheiro`:

```bash
curl -X PUT http://localhost:8081/api/v1/pagamentos/3 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"pagamento":{"status":"pago","metodo":"Pix"}}'
```

## 7. Regras de negócio

- o e-mail é único (é a credencial de login);
- o aluno só pode ter **uma matrícula ativa por treino** (pode ter vários treinos);
- o treino precisa estar na lista fixa e os preços são definidos no servidor: Musculação/Cross
  Fit R$ 60; Muay Thai/Karatê/Boxe R$ 120;
- `dataFim` é obrigatória na API; o painel a calcula a partir da data de início e da duração;
- matrícula ativa gera mensalidades de `dataInicio` até `dataFim`, incluindo a data final, com
  ajuste para o último dia de meses curtos. A matrícula e suas mensalidades são gravadas juntas;
- mensalidades pendentes usam `metodo` vazio e `dataPagamento` nula; registros antigos com status
  `atrasado` são apresentados como `pendente`;
- os novos preços não atualizam pagamentos antigos automaticamente;
- **o dono de matrículas e pagamentos vem sempre do token** — ninguém mexe no que é de outro aluno
  (**403**);
- cada pagamento pertence a uma matrícula; ao excluir a matrícula, as mensalidades dela somem
  junto (`ON DELETE CASCADE`);
- pagamento começa **pendente**; ao marcar como **pago**, exige método válido e preenche a data
  atual se ela não for enviada; ao voltar para `pendente`, limpa método e data;
- o painel só permite registrar pagamentos de mensalidades pendentes existentes;
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
    ├── domain/               lista fixa dos 5 treinos
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
| `Unknown database 'academia_db'` | banco não criado | crie um banco vazio ou configure `DB_NAME`; só execute o script SQL se puder apagar o schema |
| `Address already in use` | porta 8081 ocupada | feche o outro processo ou troque a porta em `app.py` |
| `ModuleNotFoundError: flask` | ambiente virtual/dependências ausentes | ative `.venv` e rode `python -m pip install -r requirements.txt` |
| `token inválido` | sessão expirada (8 h) | faça login de novo |
