import unittest
from contextlib import contextmanager
from unittest.mock import patch

import bcrypt
from flask import Flask

from api.control.auth_control import AuthControl
from api.dao.aluno_dao import AlunoDAO
from api.domain.modalidades import preco_mensalidade, validar_modalidade
from api.http.meu_token_jwt import MeuTokenJWT
from api.middleware.auth_middleware import AuthMiddleware
from api.middleware.jwt_middleware import JwtMiddleware
from api.router.auth_roteador import AuthRoteador
from server import Server
from api.service.auth_service import AuthService
from api.service.matricula_service import MatriculaService
from api.service.pagamento_service import PagamentoService
from api.utils.error_response import ErrorResponse


class FakeAlunoDAO:
    def findById(self, id_aluno):
        return {
            "idAluno": id_aluno,
            "nomeAluno": "Ana Souza",
            "email": "ana@example.com",
            "ativo": 1,
        }


class FakePagamentoDAO:
    def __init__(self, matricula_dao=None, failing=False):
        self.matricula_dao = matricula_dao
        self.failing = failing
        self.registros = []
        self.pagamento = {
            "idPagamento": 10,
            "valor": 999,
            "dataVencimento": "2026-03-31",
            "dataPagamento": "2026-03-30",
            "metodo": "Pix",
            "status": "pago",
            "matricula": {
                "idMatricula": 2,
                "modalidade": "Musculação",
                "aluno": {"idAluno": 1, "nomeAluno": "Ana", "email": "ana@example.com"},
            },
        }

    def create(self, pagamento, conn=None):
        if self.failing:
            raise RuntimeError("falha simulada ao criar pagamento")
        if conn is not None:
            conn["pagamentos"].append(pagamento)
        else:
            self.registros.append(pagamento)
        return 10

    def findById(self, id_pagamento):
        return self.pagamento

    def update(self, pagamento):
        self.atualizado = pagamento
        self.pagamento["valor"] = pagamento.valor
        self.pagamento["dataPagamento"] = pagamento.dataPagamento
        self.pagamento["metodo"] = pagamento.metodo
        self.pagamento["status"] = pagamento.status
        return True


class FakeMatriculaDAO:
    def __init__(self):
        self.registros = []
        self.rolled_back = False

    @contextmanager
    def transaction(self):
        transacao = {"matriculas": [], "pagamentos": []}
        try:
            yield transacao
        except Exception:
            self.rolled_back = True
            raise
        else:
            self.registros.extend(transacao["matriculas"])
            self.pagamentos = transacao["pagamentos"]

    def countByAlunoModalidade(self, *args):
        return 0

    def create(self, matricula, conn=None):
        matricula_id = 20
        if conn is not None:
            conn["matriculas"].append((matricula_id, matricula))
        else:
            self.registros.append((matricula_id, matricula))
        return matricula_id

    def findById(self, id_matricula):
        return {
            "idMatricula": id_matricula,
            "modalidade": "Musculação",
            "aluno": {"idAluno": 1, "nomeAluno": "Ana", "email": "ana@example.com"},
        }


class FakePerfilDAO:
    def __init__(self, senha_correta=True, existentes=None):
        self.senha_correta = senha_correta
        self.existentes = existentes or []
        self.email = "ana@example.com"
        self.senha_atualizada = None

    def verificarSenha(self, id_aluno, senha):
        return self.senha_correta

    def findByField(self, campo, valor):
        return self.existentes

    def updatePerfil(self, id_aluno, email, nova_senha=None):
        self.email = email
        self.senha_atualizada = nova_senha
        return True

    def findById(self, id_aluno):
        return {
            "idAluno": id_aluno,
            "nomeAluno": "Ana Souza",
            "email": self.email,
            "ativo": 1,
        }


class FakeCursor:
    def __init__(self, database):
        self.database = database
        self.lastrowid = 30
        self.rowcount = 1

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        return False

    def execute(self, query, params=()):
        self.database.executed.append((query, params))

    def fetchall(self):
        return self.database.rows


class FakeConnection:
    def __init__(self, database):
        self.database = database

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        return False

    def cursor(self, **kwargs):
        return FakeCursor(self.database)

    def commit(self):
        self.database.commits += 1

    def rollback(self):
        self.database.rollbacks += 1

    def close(self):
        self.database.closes += 1


class FakeDatabase:
    def __init__(self, rows=None):
        self.rows = rows or []
        self.executed = []
        self.commits = 0
        self.rollbacks = 0
        self.closes = 0

    def get_connection(self):
        return FakeConnection(self)


class BusinessRulesTests(unittest.TestCase):
    def test_modalidades_use_server_side_prices(self):
        self.assertEqual(preco_mensalidade("musculacao"), 60)
        self.assertEqual(preco_mensalidade("CROSS FIT"), 60)
        self.assertEqual(preco_mensalidade("muay thai"), 120)
        self.assertEqual(validar_modalidade("karate"), "Karatê")
        self.assertEqual(preco_mensalidade("Boxe"), 120)

    def test_public_modalities_endpoint_includes_prices_and_durations(self):
        server = Server()
        server._Server__setup_modalidades()
        response = server._Server__app.test_client().get("/api/v1/modalidades")

        self.assertEqual(response.status_code, 200)
        modalidades = response.json["data"]["modalidades"]
        self.assertEqual(
            modalidades,
            [
                {"nome": "Musculação", "valorMensalidade": 60},
                {"nome": "Cross Fit", "valorMensalidade": 60},
                {"nome": "Muay Thai", "valorMensalidade": 120},
                {"nome": "Karatê", "valorMensalidade": 120},
                {"nome": "Boxe", "valorMensalidade": 120},
            ],
        )
        self.assertEqual(response.json["data"]["duracoes"], [1, 3, 6, 12])

    def test_server_module_setup_registers_the_same_api_routes(self):
        with patch("server.MysqlDatabase") as database_class:
            server = Server()
            server.init()

        database_class.return_value.connect.assert_called_once_with()
        routes = {
            (rule.rule, method)
            for rule in server._Server__app.url_map.iter_rules()
            for method in rule.methods
            if method in {"GET", "POST", "PUT", "DELETE"}
        }
        expected_routes = {
            ("/api/v1/auth/login", "POST"),
            ("/api/v1/auth/registrar", "POST"),
            ("/api/v1/auth/sessao", "GET"),
            ("/api/v1/auth/perfil", "PUT"),
            ("/api/v1/alunos/", "GET"),
            ("/api/v1/alunos/", "POST"),
            ("/api/v1/matriculas/minhas", "GET"),
            ("/api/v1/matriculas/", "POST"),
            ("/api/v1/pagamentos/minhas", "GET"),
            ("/api/v1/pagamentos/", "POST"),
            ("/api/v1/modalidades", "GET"),
        }
        self.assertTrue(expected_routes.issubset(routes))

    def test_monthly_dates_keep_original_day_after_short_month(self):
        self.assertEqual(
            MatriculaService.gerarVencimentos("2026-01-31", "2026-03-31"),
            ["2026-01-31", "2026-02-28", "2026-03-31"],
        )

    def test_monthly_dates_include_end_date_but_do_not_pass_it(self):
        self.assertEqual(
            MatriculaService.gerarVencimentos("2026-01-31", "2026-02-28"),
            ["2026-01-31", "2026-02-28"],
        )
        self.assertEqual(
            MatriculaService.gerarVencimentos("2026-01-31", "2026-02-27"),
            ["2026-01-31"],
        )

    def test_active_enrollment_creates_fixed_price_installments_atomically(self):
        matricula_dao = FakeMatriculaDAO()
        pagamento_dao = FakePagamentoDAO(matricula_dao)
        service = MatriculaService(matricula_dao, FakeAlunoDAO(), pagamento_dao)

        service.createMatricula(
            {
                "modalidade": "Boxe",
                "dataInicio": "2026-01-31",
                "dataFim": "2026-03-31",
                "valor": 1,
            },
            {"idAluno": 1},
        )

        self.assertEqual(len(matricula_dao.registros), 1)
        self.assertEqual(
            [item.dataVencimento for item in matricula_dao.pagamentos],
            ["2026-01-31", "2026-02-28", "2026-03-31"],
        )
        self.assertTrue(all(item.valor == 120 for item in matricula_dao.pagamentos))
        self.assertTrue(all(item.status == "pendente" for item in matricula_dao.pagamentos))
        self.assertTrue(all(item.metodo == "" and item.dataPagamento is None
                            for item in matricula_dao.pagamentos))

    def test_installment_failure_rolls_back_the_enrollment(self):
        matricula_dao = FakeMatriculaDAO()
        pagamento_dao = FakePagamentoDAO(matricula_dao, failing=True)
        service = MatriculaService(matricula_dao, FakeAlunoDAO(), pagamento_dao)

        with self.assertRaisesRegex(RuntimeError, "falha simulada"):
            service.createMatricula(
                {
                    "modalidade": "Boxe",
                    "dataInicio": "2026-01-31",
                    "dataFim": "2026-02-28",
                },
                {"idAluno": 1},
            )

        self.assertTrue(matricula_dao.rolled_back)
        self.assertEqual(matricula_dao.registros, [])

    def test_inactive_enrollment_does_not_create_installments(self):
        matricula_dao = FakeMatriculaDAO()
        pagamento_dao = FakePagamentoDAO(matricula_dao)
        service = MatriculaService(matricula_dao, FakeAlunoDAO(), pagamento_dao)

        service.createMatricula(
            {
                "modalidade": "Boxe",
                "dataInicio": "2026-01-31",
                "dataFim": "2026-02-28",
                "status": "cancelada",
            },
            {"idAluno": 1},
        )

        self.assertEqual(len(matricula_dao.registros), 1)
        self.assertEqual(pagamento_dao.registros, [])

    def test_enrollment_requires_end_date(self):
        service = MatriculaService(FakeMatriculaDAO(), FakeAlunoDAO(), FakePagamentoDAO())

        with self.assertRaises(ErrorResponse) as erro:
            service.createMatricula({"modalidade": "Boxe"}, {"idAluno": 1})
        self.assertEqual(erro.exception.httpCode, 400)

    def test_marking_payment_pending_clears_method_and_date_and_reprices(self):
        pagamento_dao = FakePagamentoDAO()
        service = PagamentoService(pagamento_dao, FakeMatriculaDAO())

        service.updatePagamento(10, {"status": "pendente"}, {"idAluno": 1})

        self.assertEqual(pagamento_dao.atualizado.valor, 60)
        self.assertEqual(pagamento_dao.atualizado.metodo, "")
        self.assertIsNone(pagamento_dao.atualizado.dataPagamento)

    def test_marking_payment_paid_requires_method_and_uses_fixed_price(self):
        pagamento_dao = FakePagamentoDAO()
        service = PagamentoService(pagamento_dao, FakeMatriculaDAO())

        service.updatePagamento(
            10,
            {"status": "pago", "metodo": "Cartao", "valor": 1},
            {"idAluno": 1},
        )

        self.assertEqual(pagamento_dao.atualizado.valor, 60)
        self.assertEqual(pagamento_dao.atualizado.metodo, "Cartão")
        self.assertIsNotNone(pagamento_dao.atualizado.dataPagamento)

        with self.assertRaises(ErrorResponse) as erro:
            service.updatePagamento(10, {"status": "pago"}, {"idAluno": 1})
        self.assertEqual(erro.exception.httpCode, 400)

    def test_manual_payment_ignores_client_price_and_starts_pending(self):
        pagamento_dao = FakePagamentoDAO()
        service = PagamentoService(pagamento_dao, FakeMatriculaDAO())

        service.createPagamento(
            {
                "valor": 1,
                "dataVencimento": "2026-03-31",
                "status": "pendente",
                "matricula": {"idMatricula": 2},
            },
            {"idAluno": 1},
        )

        criado = pagamento_dao.registros[0]
        self.assertEqual(criado.valor, 60)
        self.assertEqual(criado.metodo, "")
        self.assertEqual(criado.status, "pendente")
        self.assertIsNone(criado.dataPagamento)

    def test_payment_cannot_be_read_or_changed_by_another_student(self):
        service = PagamentoService(FakePagamentoDAO(), FakeMatriculaDAO())

        with self.assertRaises(ErrorResponse) as erro:
            service.updatePagamento(10, {"status": "pendente"}, {"idAluno": 2})
        self.assertEqual(erro.exception.httpCode, 403)

    def test_enrollment_cannot_be_read_by_another_student(self):
        service = MatriculaService(FakeMatriculaDAO(), FakeAlunoDAO(), FakePagamentoDAO())

        with self.assertRaises(ErrorResponse) as erro:
            service.findById(20, {"idAluno": 2})
        self.assertEqual(erro.exception.httpCode, 403)

    def test_profile_requires_current_password(self):
        service = AuthService(FakePerfilDAO(senha_correta=False), None)

        with self.assertRaises(ErrorResponse) as erro:
            service.atualizarPerfil(
                {"idAluno": 1},
                {"email": "novo@example.com", "senhaAtual": "errada"},
            )
        self.assertEqual(erro.exception.httpCode, 401)

    def test_profile_dao_checks_and_stores_only_bcrypt_password_hashes(self):
        senha_atual = "SenhaAtual@1"
        hash_atual = bcrypt.hashpw(senha_atual.encode(), bcrypt.gensalt(rounds=4)).decode()
        database = FakeDatabase(rows=[{"senha": hash_atual}])
        dao = AlunoDAO(database)

        self.assertTrue(dao.verificarSenha(1, senha_atual))
        self.assertFalse(dao.verificarSenha(1, "incorreta"))
        self.assertTrue(dao.updatePerfil(1, "novo@example.com", "NovaSenha@2"))

        sql, params = database.executed[-1]
        self.assertIn("senha = %s", sql)
        self.assertNotEqual(params[1], "NovaSenha@2")
        self.assertTrue(bcrypt.checkpw(b"NovaSenha@2", params[1].encode()))
        self.assertEqual(database.commits, 1)

    def test_matricula_dao_transaction_commits_or_rolls_back(self):
        from api.dao.matricula_dao import MatriculaDAO

        database = FakeDatabase()
        dao = MatriculaDAO(database)

        with dao.transaction():
            pass
        self.assertEqual(database.commits, 1)

        with self.assertRaisesRegex(RuntimeError, "erro de mensalidade"):
            with dao.transaction():
                raise RuntimeError("erro de mensalidade")
        self.assertEqual(database.rollbacks, 1)
        self.assertEqual(database.closes, 2)

    def test_matricula_dao_uses_treino_column_and_keeps_api_field(self):
        from api.dao.matricula_dao import MatriculaDAO
        from api.dao.pagamento_dao import PagamentoDAO

        self.assertIn("m.treino AS modalidade", PagamentoDAO.SELECT_BASE)
        database = FakeDatabase(rows=[{
            "idMatricula": 3,
            "modalidade": "Boxe",
            "dataInicio": "2026-01-01",
            "dataFim": "2026-04-01",
            "status": "ativa",
            "idAluno": 1,
            "nomeAluno": "Ana Souza",
            "emailAluno": "ana@example.com",
        }])
        dao = MatriculaDAO(database)

        matriculas = dao.findByField("modalidade", "Boxe")

        self.assertEqual(matriculas[0]["modalidade"], "Boxe")
        query, params = database.executed[-1]
        self.assertIn("m.treino AS modalidade", query)
        self.assertIn("WHERE m.treino = %s", query)
        self.assertEqual(params, ("Boxe",))

        database.rows = [{"total": 1}]
        self.assertEqual(dao.countByAlunoModalidade(1, "Boxe"), 1)
        query, params = database.executed[-1]
        self.assertIn("treino = %s", query)
        self.assertEqual(params, (1, "Boxe"))

    def test_profile_normalizes_email_and_returns_no_password(self):
        dao = FakePerfilDAO()
        service = AuthService(dao, None)

        resposta = service.atualizarPerfil(
            {"idAluno": 1},
            {
                "email": "  NOVO@Example.COM ",
                "senhaAtual": "SenhaAtual@1",
                "novaSenha": "",
            },
        )

        self.assertEqual(dao.email, "novo@example.com")
        self.assertIsNone(dao.senha_atualizada)
        self.assertEqual(resposta["usuario"]["email"], "novo@example.com")
        self.assertNotIn("senha", resposta["usuario"])
        self.assertNotIn("hash", resposta["usuario"])

    def test_profile_rejects_duplicate_email_and_invalid_new_password(self):
        dao = FakePerfilDAO(
            existentes=[{"idAluno": 2, "email": "duplicado@example.com"}]
        )
        service = AuthService(dao, None)

        with self.assertRaises(ErrorResponse) as erro:
            service.atualizarPerfil(
                {"idAluno": 1},
                {
                    "email": "duplicado@example.com",
                    "senhaAtual": "SenhaAtual@1",
                },
            )
        self.assertEqual(erro.exception.httpCode, 400)

    def test_profile_route_is_jwt_protected_and_returns_refreshed_token(self):
        app = Flask(__name__)
        control = AuthControl(AuthService(FakePerfilDAO(), None))
        router = AuthRoteador(JwtMiddleware(), AuthMiddleware(), control)
        app.register_blueprint(router.create_routes(), url_prefix="/api/v1/auth")
        client = app.test_client()

        sem_token = client.put(
            "/api/v1/auth/perfil",
            json={"email": "novo@example.com", "senhaAtual": "SenhaAtual@1"},
        )
        self.assertEqual(sem_token.status_code, 401)

        token = MeuTokenJWT().gerarToken({"idAluno": 1, "email": "ana@example.com"})
        resposta = client.put(
            "/api/v1/auth/perfil",
            headers={"Authorization": token},
            json={"email": "novo@example.com", "senhaAtual": "SenhaAtual@1"},
        )

        self.assertEqual(resposta.status_code, 200)
        self.assertTrue(resposta.json["success"])
        self.assertIn("token", resposta.json["data"])
        self.assertNotIn("senha", resposta.json["data"]["usuario"])

        with self.assertRaises(ErrorResponse) as erro:
            AuthService(FakePerfilDAO(), None).atualizarPerfil(
                {"idAluno": 1},
                {
                    "email": "novo@example.com",
                    "senhaAtual": "SenhaAtual@1",
                    "novaSenha": "fraca",
                },
            )
        self.assertEqual(erro.exception.httpCode, 400)


if __name__ == "__main__":
    unittest.main()
