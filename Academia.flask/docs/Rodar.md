# Como rodar a API na apresentação

Este projeto usa Flask e MySQL. A API atende na porta `8081` e também serve o site.

## Antes de começar

1. Abra e inicie o serviço MySQL (por exemplo, pelo XAMPP ou pelos serviços instalados).
2. Confira se o banco `academia_db` e as tabelas `Aluno`, `Matricula` e `Pagamento` já existem.
3. **Não execute `install.py` nem `docs/Banco.sql` em um banco com dados que deseja manter.**
   O script SQL apaga e recria o schema.
4. Abra o PowerShell na pasta do projeto, `Academia.flask`.

O padrão configurado é `127.0.0.1:3306`, usuário `root`, senha vazia e banco `academia_db`.
Se o MySQL usa outra configuração, defina as variáveis de ambiente antes de iniciar. Por exemplo:

```powershell
$env:DB_HOST = "127.0.0.1"
$env:DB_PORT = "3306"
$env:DB_USER = "root"
$env:DB_PASSWORD = "SUA_SENHA_DO_MYSQL"
$env:DB_NAME = "academia_db"
```

Digite a senha apenas no seu terminal; não a salve neste arquivo nem a compartilhe.
As variáveis definidas no PowerShell valem para essa janela e seus processos filhos.

## Iniciar pela primeira vez

Se a pasta `.venv` ainda não existir, crie o ambiente virtual:

```powershell
py -m venv .venv
```

Instale as dependências e inicie o servidor:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe app.py
```

## Iniciar nas próximas vezes

1. Inicie o MySQL.
2. Abra o PowerShell na pasta do projeto.
3. Se o MySQL exigir senha ou outra configuração, defina as variáveis de ambiente acima
   novamente nessa janela.
4. Inicie a API:

```powershell
.\.venv\Scripts\python.exe app.py
```

Deixe essa janela aberta enquanto apresenta. Acesse:

- Tela de login: <http://localhost:8081/Login.html>
- Painel: <http://localhost:8081/dashboard.html> (após entrar)

Conta de demonstração incluída no banco de exemplo:

- E-mail: `ana@academia.com`
- Senha: `Senha@123`

Para encerrar o servidor, volte ao PowerShell e pressione `Ctrl+C`.

## Se não iniciar

- **Erro de conexão ou acesso negado ao MySQL:** confirme que o serviço está ativo e que
  host, porta, usuário, senha e nome do banco estão corretos. Redefina as variáveis no mesmo
  PowerShell usado para iniciar o servidor.
- **Banco ou tabela não encontrado:** confira se o schema `academia_db` e as três tabelas
  necessárias existem. Não recrie o banco se ele contiver dados importantes.
- **A porta 8081 já está ocupada:** feche a outra instância do projeto antes de iniciar uma nova.
- **Dependências ausentes:** execute novamente o comando `pip install -r requirements.txt`
  usando o Python de `.venv`.

Quando a inicialização dá certo, o terminal informa que conectou ao MySQL e que o Flask está
rodando em `http://127.0.0.1:8081`.
