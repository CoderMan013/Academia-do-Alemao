# Rodar o projeto

1. Inicie o MySQL.
2. No terminal do VS Code, rode:

```powershell
cd "C:\Users\mateu\Downloads\Academia.node"
npm start
```

Se for a primeira vez, rode `npm install` antes.

O banco local já foi atualizado para usar a coluna `Matricula.treino`; não precisa rodar migração.

## Se der erro de conexão com o MySQL

1. No XAMPP, confirme que o MySQL está iniciado.
2. Pare a API antiga com **Ctrl+C** no terminal onde ela está rodando.
3. No PowerShell, confira a conexão e configure as variáveis:

```powershell
Test-NetConnection localhost -Port 3306
$env:DB_HOST = "localhost"
$env:DB_USER = "root"
$env:DB_NAME = "academia_db"
$s = Read-Host "Senha do MySQL (Enter se nao houver)" -AsSecureString
$env:DB_PASSWORD = (New-Object System.Net.NetworkCredential("", $s)).Password
npm start
```

Confira se `TcpTestSucceeded` aparece como `True`. Se aparecer `False`, inicie o MySQL no XAMPP e
tente de novo. Digite a senha do MySQL quando for solicitada; se o `root` não tiver senha, pressione
Enter. Não rode `docs/Banco.sql` de novo se o banco já tiver dados.

Abra: http://localhost:8080/Login.html

**Teste:** `ana@academia.com` / `Senha@123`

Pare o servidor com **Ctrl+C**.
