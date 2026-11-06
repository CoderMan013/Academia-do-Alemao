# Especificação das alterações do Node para a API Flask

Este documento descreve o comportamento implementado na API Node para servir de referência ao
adaptar a API Flask. Primeiro inspecione a estrutura Flask existente e siga seus padrões; replique
as regras e os contratos abaixo, não a arquitetura ou o código JavaScript literalmente.

## Resumo

As alterações funcionais foram:

1. Preços mensais definidos pelo servidor conforme o treino.
2. Criação automática das mensalidades quando uma matrícula ativa é criada.
3. Pagamento registrado em uma área separada, escolhendo uma mensalidade pendente existente.
4. Edição do e-mail e da senha pelo aluno autenticado, confirmada pela senha atual.
5. As rotas de treinos e autenticação foram organizadas dentro dos módulos MVC existentes.
6. A API Node conecta ao MySQL local na porta `3306`.

## Banco de dados

**Não foram adicionadas nem alteradas tabelas ou colunas.** A adaptação Flask deve continuar
usando as tabelas `Aluno`, `Matricula` e `Pagamento` e seus campos existentes. Não execute novamente
o seed de `docs/Banco.sql` em um banco preenchido.

O campo `Pagamento.metodo` é `NOT NULL`. Portanto, mensalidades pendentes são gravadas com string
vazia (`''`) no campo método e `NULL` em `dataPagamento`. A interface mostra `—` para o método
enquanto a cobrança está pendente.

Registros antigos com status `atrasado` são apresentados como `pendente`; a tabela não precisa ser
alterada. A interface atual só trabalha com os status `pendente` e `pago`.

Os preços novos não foram aplicados retroativamente aos pagamentos já existentes. A API deve calcular
o preço para novas mensalidades e ao atualizar pagamentos, mas não se deve atualizar em lote os dados
antigos sem uma migração deliberada.

## 1. Preço por treino

O preço é decidido exclusivamente no servidor; ignore qualquer `valor` enviado pelo cliente:

| Treino | Mensalidade |
| --- | ---: |
| Musculação | R$ 60 |
| Cross Fit | R$ 60 |
| Muay Thai | R$ 120 |
| Karatê | R$ 120 |
| Boxe | R$ 120 |

Aceite os nomes canônicos acima. A comparação pode ignorar maiúsculas/minúsculas e acentos; grave
e devolva os nomes canônicos.

### Endpoint de treinos

`GET /api/v1/modalidades` é público e responde com a lista de treinos, preço e durações:

```json
{
  "success": true,
  "message": "Busca realizada com sucesso",
  "data": {
    "modalidades": [
      { "nome": "Musculação", "valorMensalidade": 60 },
      { "nome": "Cross Fit", "valorMensalidade": 60 },
      { "nome": "Muay Thai", "valorMensalidade": 120 },
      { "nome": "Karatê", "valorMensalidade": 120 },
      { "nome": "Boxe", "valorMensalidade": 120 }
    ],
    "duracoes": [1, 3, 6, 12]
  }
}
```

## 2. Mensalidades geradas junto com a matrícula

Ao receber uma matrícula **ativa**, criar automaticamente uma mensalidade pendente para cada
vencimento mensal entre `dataInicio` e `dataFim`, incluindo o início, desde que o vencimento não
ultrapasse a data final.

- Use como dia de vencimento o dia de `dataInicio`.
- Se um mês não tiver esse dia, use o último dia daquele mês, sem perder o dia original nos meses
  seguintes. Exemplo: início em 31/01 gera vencimentos em 31/01, 28/02 e 31/03.
- A data final é inclusiva: se um vencimento cair exatamente em `dataFim`, inclua-o.
- `dataInicio` pode ser omitida (usa hoje); `dataFim` é obrigatória e não pode ser anterior ao início.
- Cada mensalidade recebe o preço fixo do treino, status `pendente`, `dataPagamento = NULL` e
  método `''`.
- Matrícula não ativa não gera mensalidades automaticamente.
- Se já houver matrícula ativa do aluno no mesmo treino, rejeite a criação; outros treinos
  são permitidas.
- A geração automática é feita ao criar uma matrícula ativa. Atualizar uma matrícula existente não
  regenera nem reajusta mensalidades já criadas.

Criação do plano pelo painel:

```http
POST /api/v1/matriculas
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "matricula": {
    "modalidade": "Boxe",
    "dataInicio": "2026-01-31",
    "dataFim": "2026-03-31"
  }
}
```

O dono da matrícula vem do `idAluno` autenticado, não de um ID enviado pelo navegador. A resposta
esperada mantém o formato:

```json
{
  "success": true,
  "message": "Matrícula realizada com sucesso",
  "data": { "matriculas": [{ "idMatricula": 1, "modalidade": "Boxe" }] }
}
```

**Consistência:** se a matrícula for gravada e a criação das mensalidades falhar, remova a matrícula
incompleta (rollback) ou use uma transação que grave matrícula e mensalidades atomicamente.

## 3. Registro de pagamento separado

O painel tem duas áreas distintas:

- **Minhas mensalidades:** tabela com treino, vencimento, valor, método, status, data paga e ação
  de exclusão.
- **Registrar pagamento:** seletor que lista apenas mensalidades pendentes, escolha do método
  (`Pix`, `Cartão` ou `Dinheiro`) e botão para confirmar.

O painel consulta:

- `GET /api/v1/matriculas/minhas`
- `GET /api/v1/pagamentos/minhas`

Ambos exigem token e retornam listas sob `data.matriculas` e `data.pagamentos`, respectivamente.
Mensalidades devem incluir os dados aninhados usados pela interface:

```json
{
  "idPagamento": 10,
  "valor": 120,
  "dataVencimento": "2026-12-31",
  "dataPagamento": null,
  "metodo": "",
  "status": "pendente",
  "matricula": {
    "idMatricula": 2,
    "modalidade": "Boxe",
    "aluno": { "idAluno": 1, "nomeAluno": "Ana Souza", "email": "ana@academia.com" }
  }
}
```

Para registrar como pago, o cliente envia somente o status e o método:

```http
PUT /api/v1/pagamentos/10
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "pagamento": {
    "status": "pago",
    "metodo": "Pix"
  }
}
```

O servidor deve:

- conferir que a mensalidade pertence a uma matrícula do aluno autenticado;
- obter o valor pelo treino, não confiar em `valor` recebido;
- exigir um método permitido ao marcar como pago;
- preencher `dataPagamento` com a data atual se não for informada;
- ao voltar para `pendente`, limpar `dataPagamento` para `NULL` e `metodo` para `''`;
- permitir excluir a mensalidade somente ao seu dono; após exclusão, atualizar as listas no cliente.

O endpoint de criação manual `POST /api/v1/pagamentos` ainda existe para uso de API, mas não é usado
no fluxo normal do painel. Se for mantido na API Flask, aplicar as mesmas regras de dono, status e
preço fixo. A tela não oferece criação manual de mensalidade.

`atrasado` não é gerado nem selecionado nesta versão. Ao ler dados antigos com esse status, devolva
`pendente` para a interface.

## 4. Edição dos dados da conta

O cabeçalho do painel tem um botão com ícone de lápis, ao lado de **Atualizar** e **Sair**. O formulário
permite mudar o e-mail e, opcionalmente, a senha. Para qualquer salvamento é necessário informar a
senha atual. Para manter a senha, `novaSenha` pode ser enviada vazia.

Endpoint autenticado:

```http
PUT /api/v1/auth/perfil
Authorization: Bearer <token>
Content-Type: application/json
```

Corpo:

```json
{
  "email": "novo-email@exemplo.com",
  "senhaAtual": "SenhaAtual@1",
  "novaSenha": "NovaSenha@2"
}
```

Para trocar somente o e-mail, envie `"novaSenha": ""`. O ID do aluno deve vir do token; não aceite um
ID de aluno do corpo ou da URL nesta operação. Regras:

- verificar a senha atual com o hash armazenado;
- normalizar o e-mail removendo espaços e convertendo para minúsculas;
- validar o formato e limite de 64 caracteres;
- rejeitar e-mail já usado por outra conta;
- se uma senha nova for enviada, validar mínimo de 6 caracteres, uma letra maiúscula, um número e um
  caractere especial;
- armazenar senha somente com hash bcrypt, nunca em texto puro;
- nunca devolver senha/hash nas respostas;
- em senha atual incorreta, responder HTTP 401; em campos inválidos ou e-mail duplicado, HTTP 400.

Em sucesso, devolver o usuário atualizado e um token JWT renovado, no mesmo formato do login:

```json
{
  "success": true,
  "message": "Dados atualizados com sucesso",
  "data": {
    "tipo": "aluno",
    "usuario": {
      "idAluno": 1,
      "nomeAluno": "Ana Souza",
      "email": "novo-email@exemplo.com",
      "ativo": 1
    },
    "token": "<novo-token>"
  }
}
```

O cliente substitui o token e os dados da sessão armazenados após o sucesso.

## 5. Autenticação e contratos preservados

Login e cadastro continuam nas rotas:

- `POST /api/v1/auth/login` — corpo `{ "email": "...", "senha": "..." }`.
- `POST /api/v1/auth/registrar` — corpo `{ "nome": "...", "email": "...", "senha": "..." }`.
- `GET /api/v1/auth/sessao` — token obrigatório.

Login/cadastro devolvem `success`, `message` e `data` com `tipo`, `usuario` (sem senha) e `token`.
Rotas protegidas devem obter o aluno por `idAluno` no JWT. Requisição sem token válido retorna
HTTP 401. Tentativa de consultar, alterar ou excluir matrícula/pagamento de outro aluno retorna
HTTP 403.

As rotas de matrícula e pagamento usadas pelo painel são:

| Método | Rota | Uso |
| --- | --- | --- |
| GET | `/api/v1/matriculas/minhas` | listar matrículas do aluno logado |
| POST | `/api/v1/matriculas` | iniciar plano e gerar mensalidades |
| DELETE | `/api/v1/matriculas/:idMatricula` | remover matrícula própria |
| GET | `/api/v1/pagamentos/minhas` | listar mensalidades próprias |
| PUT | `/api/v1/pagamentos/:idPagamento` | registrar ou atualizar pagamento próprio |
| DELETE | `/api/v1/pagamentos/:idPagamento` | excluir mensalidade própria |

Respostas de erro seguem o formato `{ "success": false, "message": "...", "error": { "message": "..." } }`.

## 6. Alterações estruturais feitas apenas no Node

Estas mudanças não são requisitos de arquitetura para Flask, mas explicam diferenças entre as versões:

- A rota pública de treinos, antes registrada diretamente no `Server.js`, passou a usar
  `ModalidadeRouter`, `ModalidadeController` e `ModalidadeService`.
- Login, cadastro e sessão foram integrados às camadas do módulo `Aluno`; as URLs `/api/v1/auth/...`
  foram preservadas.
- A conexão Node usa MySQL local na porta `3306`, com credenciais configuráveis por ambiente.
- A tabela SQL não foi modificada para implementar mensalidades automáticas nem edição do perfil.

## Checklist para adaptar e validar a API Flask

- [ ] Conferir a estrutura Flask existente e manter seus padrões.
- [ ] Implementar preços no servidor e expor preços em `GET /api/v1/modalidades`.
- [ ] Gerar todas as mensalidades pendentes em nova matrícula ativa, com ajuste de fim de mês e sem
  ultrapassar a data final.
- [ ] Garantir rollback/transação se a criação das mensalidades falhar.
- [ ] Implementar leitura, registro, retorno a pendente e exclusão com verificação de proprietário.
- [ ] Implementar `PUT /api/v1/auth/perfil`, validação da senha atual, hash bcrypt e token atualizado.
- [ ] Preservar os contratos JSON e caminhos consumidos pelo painel.
- [ ] Não alterar esquema do banco nem sobrescrever registros existentes.
- [ ] Testar pelo menos: 31/jan → fev → mar; fim inclusivo; preço por treino; mensalidade
  pendente/paga; senha atual errada; e-mail duplicado; senha nova inválida; acesso a dados de outro
  aluno e rollback em falha.
