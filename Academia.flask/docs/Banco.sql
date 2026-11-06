-- =====================================================================
-- Projeto PAW - 4 BIM - contexto: ACADEMIA
-- 3 tabelas relacionadas: Aluno 1:N Matricula 1:N Pagamento
-- Banco: MySQL - usuario root, senha vazia (padrao do XAMPP)
-- =====================================================================

DROP SCHEMA IF EXISTS `academia_db`;

CREATE SCHEMA IF NOT EXISTS `academia_db` DEFAULT CHARACTER SET utf8mb4;
USE `academia_db`;

-- A ordem do DROP importa por causa das chaves estrangeiras
DROP TABLE IF EXISTS `Pagamento`;
DROP TABLE IF EXISTS `Matricula`;
DROP TABLE IF EXISTS `Aluno`;

-- ---------------------------------------------------------------------
-- Tabela Aluno (possui email e senha -> é a entidade de login)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Aluno` (
  `idAluno` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nomeAluno` VARCHAR(128) NOT NULL,
  `email` VARCHAR(64) NOT NULL,
  `senha` VARCHAR(64) NOT NULL,
  `ativo` TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`idAluno`),
  UNIQUE INDEX `idAluno_UNIQUE` (`idAluno` ASC),
  UNIQUE INDEX `email_UNIQUE` (`email` ASC)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- Tabela Matricula (tabela do meio: FK para Aluno)
-- treino: Musculação | Cross Fit | Muay Thai | Karatê | Boxe
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Matricula` (
  `idMatricula` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `treino` VARCHAR(64) NOT NULL,
  `dataInicio` DATE NOT NULL,
  `dataFim` DATE NOT NULL,
  `status` VARCHAR(16) NOT NULL DEFAULT 'ativa',
  `Aluno_idAluno` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`idMatricula`),
  UNIQUE INDEX `idMatricula_UNIQUE` (`idMatricula` ASC),
  INDEX `fk_Matricula_Aluno_idx` (`Aluno_idAluno` ASC),
  CONSTRAINT `fk_Matricula_Aluno`
    FOREIGN KEY (`Aluno_idAluno`)
    REFERENCES `Aluno` (`idAluno`)
    ON DELETE RESTRICT
    ON UPDATE NO ACTION
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- Tabela Pagamento (mensalidades de uma matrícula)
-- metodo: Pix | Cartão | Dinheiro
-- status: pendente | pago | atrasado
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Pagamento` (
  `idPagamento` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `valor` DECIMAL(10, 2) NOT NULL,
  `dataVencimento` DATE NOT NULL,
  `dataPagamento` DATE NULL,
  `metodo` VARCHAR(24) NOT NULL DEFAULT 'Pix',
  `status` VARCHAR(16) NOT NULL DEFAULT 'pendente',
  `Matricula_idMatricula` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`idPagamento`),
  UNIQUE INDEX `idPagamento_UNIQUE` (`idPagamento` ASC),
  INDEX `fk_Pagamento_Matricula_idx` (`Matricula_idMatricula` ASC),
  CONSTRAINT `fk_Pagamento_Matricula`
    FOREIGN KEY (`Matricula_idMatricula`)
    REFERENCES `Matricula` (`idMatricula`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- Dados de exemplo
-- Senha de todos os usuários de teste: Senha@123 (hash bcrypt)
-- ---------------------------------------------------------------------
INSERT INTO `Aluno` (`idAluno`, `nomeAluno`, `email`, `senha`, `ativo`) VALUES
  (1, 'Ana Souza', 'ana@academia.com', '$2b$12$J4RXUgst/ThP0rsHElfY6.tEio.P.uAQiTLZgcG4o.VEKPq/ZiAEm', 1),
  (2, 'Bruno Lima', 'bruno@academia.com', '$2b$12$J4RXUgst/ThP0rsHElfY6.tEio.P.uAQiTLZgcG4o.VEKPq/ZiAEm', 1);

INSERT INTO `Matricula` (`idMatricula`, `treino`, `dataInicio`, `dataFim`, `status`, `Aluno_idAluno`) VALUES
  (1, 'Muay Thai', '2026-10-01', '2027-01-01', 'ativa', 1),
  (2, 'Cross Fit', '2026-11-01', '2027-02-01', 'ativa', 1),
  (3, 'Karatê', '2025-01-10', '2025-02-10', 'concluida', 1),
  (4, 'Musculação', '2026-09-15', '2026-12-15', 'ativa', 2);

INSERT INTO `Pagamento` (`valor`, `dataVencimento`, `dataPagamento`, `metodo`, `status`, `Matricula_idMatricula`) VALUES
  (120.00, '2026-10-05', '2026-10-05', 'Pix', 'pago', 1),
  (120.00, '2026-11-05', '2026-11-04', 'Pix', 'pago', 1),
  (120.00, '2026-12-05', NULL, 'Pix', 'pendente', 1),
  (150.00, '2026-11-10', NULL, 'Cartão', 'pendente', 2),
  (90.00, '2025-01-15', '2025-01-15', 'Dinheiro', 'pago', 3),
  (110.00, '2026-09-20', '2026-09-28', 'Cartão', 'pago', 4),
  (110.00, '2026-10-20', NULL, 'Cartão', 'atrasado', 4);
