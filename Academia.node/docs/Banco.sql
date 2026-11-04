-- =====================================================================
-- Projeto PAW - 4 BIM - contexto: ACADEMIA
-- 3 tabelas relacionadas: Professor 1:N Matricula N:1 Aluno
-- A antiga tabela Plano foi substituída por Professor.
-- Banco: MySQL (XAMPP) - usuario root, senha vazia
-- =====================================================================

DROP SCHEMA IF EXISTS `academia_db`;

CREATE SCHEMA IF NOT EXISTS `academia_db` DEFAULT CHARACTER SET utf8mb4;
USE `academia_db`;

-- A ordem do DROP importa por causa das chaves estrangeiras
DROP TABLE IF EXISTS `Matricula`;
DROP TABLE IF EXISTS `Aluno`;
DROP TABLE IF EXISTS `Professor`;

-- ---------------------------------------------------------------------
-- Tabela Professor (possui email e senha -> é a entidade de login do professor)
-- A coluna modalidades guarda a lista das que ele leciona,
-- separada por vírgula: "Boxe, Muay Thai".
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Professor` (
  `idProfessor` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nomeProfessor` VARCHAR(128) NOT NULL,
  `email` VARCHAR(64) NOT NULL,
  `senha` VARCHAR(64) NOT NULL,
  `modalidades` VARCHAR(255) NOT NULL DEFAULT '',
  `ativo` TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`idProfessor`),
  UNIQUE INDEX `idProfessor_UNIQUE` (`idProfessor` ASC),
  UNIQUE INDEX `emailProfessor_UNIQUE` (`email` ASC)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- Tabela Aluno (possui email e senha -> é a entidade de login do aluno)
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
-- Tabela Matricula (tabela do meio: FK para Aluno e para Professor)
-- modalidade: Musculação | Cross Fit | Muay Thai | Karatê | Boxe
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Matricula` (
  `idMatricula` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `dataInicio` DATE NOT NULL,
  `dataFim` DATE NOT NULL,
  `status` VARCHAR(16) NOT NULL DEFAULT 'ativa',
  `modalidade` VARCHAR(64) NOT NULL,
  `Aluno_idAluno` INT UNSIGNED NOT NULL,
  `Professor_idProfessor` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`idMatricula`),
  UNIQUE INDEX `idMatricula_UNIQUE` (`idMatricula` ASC),
  INDEX `fk_Matricula_Aluno_idx` (`Aluno_idAluno` ASC),
  INDEX `fk_Matricula_Professor_idx` (`Professor_idProfessor` ASC),
  CONSTRAINT `fk_Matricula_Aluno`
    FOREIGN KEY (`Aluno_idAluno`)
    REFERENCES `Aluno` (`idAluno`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_Matricula_Professor`
    FOREIGN KEY (`Professor_idProfessor`)
    REFERENCES `Professor` (`idProfessor`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- Dados iniciais
-- Senha de todos os usuários de teste: Senha@123 (hash bcrypt)
-- ---------------------------------------------------------------------
INSERT INTO `Professor` (`idProfessor`, `nomeProfessor`, `email`, `senha`, `modalidades`, `ativo`) VALUES
  (1, 'Carlos Mendes', 'carlos@academia.com', '$2b$12$J4RXUgst/ThP0rsHElfY6.tEio.P.uAQiTLZgcG4o.VEKPq/ZiAEm', 'Boxe, Muay Thai', 1),
  (2, 'Fernanda Alves', 'fernanda@academia.com', '$2b$12$J4RXUgst/ThP0rsHElfY6.tEio.P.uAQiTLZgcG4o.VEKPq/ZiAEm', 'Musculação, Cross Fit', 1),
  (3, 'Rafael Tanaka', 'rafael@academia.com', '$2b$12$J4RXUgst/ThP0rsHElfY6.tEio.P.uAQiTLZgcG4o.VEKPq/ZiAEm', 'Karatê', 1);

INSERT INTO `Aluno` (`idAluno`, `nomeAluno`, `email`, `senha`, `ativo`) VALUES
  (1, 'Ana Souza', 'ana@academia.com', '$2b$12$J4RXUgst/ThP0rsHElfY6.tEio.P.uAQiTLZgcG4o.VEKPq/ZiAEm', 1),
  (2, 'Bruno Lima', 'bruno@academia.com', '$2b$12$J4RXUgst/ThP0rsHElfY6.tEio.P.uAQiTLZgcG4o.VEKPq/ZiAEm', 1);

INSERT INTO `Matricula` (`dataInicio`, `dataFim`, `status`, `modalidade`, `Aluno_idAluno`, `Professor_idProfessor`) VALUES
  ('2026-10-01', '2027-01-01', 'ativa', 'Muay Thai', 1, 1),
  ('2026-09-15', '2026-12-15', 'ativa', 'Musculação', 2, 2),
  ('2025-01-10', '2025-02-10', 'concluida', 'Karatê', 1, 3),
  ('2026-11-01', '2027-02-01', 'ativa', 'Cross Fit', 1, 2);
