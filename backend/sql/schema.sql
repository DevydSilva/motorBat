-- BatMotor — PostgreSQL (Supabase). Executado no arranque se BATMOTOR_RUN_SCHEMA=1 (default) ou via psql.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  CREATE TYPE batmotor_role AS ENUM ('ADMIN', 'GERENTE', 'FUNCIONARIO');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE batmotor_tipo_movimentacao AS ENUM ('ENTRADA', 'SAIDA', 'AJUSTE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS teste (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  senha TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS usuario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  senha TEXT NOT NULL,
  cpf TEXT NOT NULL UNIQUE,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  data_atual TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS modulo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT
);

CREATE TABLE IF NOT EXISTS perfil (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role batmotor_role NOT NULL,
  descricao TEXT
);

-- Apenas um perfil GERENTE (mesma regra de negócio do Mongo).
CREATE UNIQUE INDEX IF NOT EXISTS idx_perfil_unique_gerente
  ON perfil (role)
  WHERE role = 'GERENTE';

CREATE TABLE IF NOT EXISTS materia_prima (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL,
  unidade TEXT NOT NULL,
  estoque_minimo DOUBLE PRECISION NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  observacao TEXT,
  preco_custo DOUBLE PRECISION,
  preco_venda DOUBLE PRECISION
);

CREATE TABLE IF NOT EXISTS fornecedor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cnpj TEXT NOT NULL UNIQUE,
  email TEXT,
  telefone TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  nome_contato TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  categoria TEXT,
  tipo_fornecedor TEXT,
  data_inicio TEXT,
  condicoes_pagamento TEXT,
  observacoes TEXT,
  logo_data_url TEXT
);

CREATE TABLE IF NOT EXISTS usuario_perfil (
  usuario_id UUID NOT NULL REFERENCES usuario (id) ON DELETE CASCADE,
  perfil_id UUID NOT NULL REFERENCES perfil (id) ON DELETE CASCADE,
  PRIMARY KEY (usuario_id, perfil_id)
);

CREATE TABLE IF NOT EXISTS materia_fornecedor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  materia_prima_id UUID NOT NULL REFERENCES materia_prima (id) ON DELETE CASCADE,
  fornecedor_id UUID NOT NULL REFERENCES fornecedor (id) ON DELETE CASCADE,
  UNIQUE (materia_prima_id, fornecedor_id)
);

CREATE INDEX IF NOT EXISTS idx_materia_fornecedor_materia ON materia_fornecedor (materia_prima_id);

CREATE TABLE IF NOT EXISTS permissao_modulo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id UUID NOT NULL REFERENCES perfil (id) ON DELETE CASCADE,
  modulo_id UUID NOT NULL REFERENCES modulo (id) ON DELETE CASCADE,
  pode_ler BOOLEAN NOT NULL DEFAULT FALSE,
  pode_criar BOOLEAN NOT NULL DEFAULT FALSE,
  pode_atualizar BOOLEAN NOT NULL DEFAULT FALSE,
  pode_excluir BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_permissao_modulo_par ON permissao_modulo (perfil_id, modulo_id);

CREATE TABLE IF NOT EXISTS estoque_atual (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  materia_prima_id UUID NOT NULL UNIQUE REFERENCES materia_prima (id) ON DELETE CASCADE,
  quantidade DOUBLE PRECISION NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS movimentacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  materia_prima_id UUID NOT NULL REFERENCES materia_prima (id) ON DELETE CASCADE,
  tipo batmotor_tipo_movimentacao NOT NULL,
  quantidade DOUBLE PRECISION NOT NULL,
  motivo TEXT,
  usuario_id UUID NOT NULL REFERENCES usuario (id),
  data_atual TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_movimentacao_data ON movimentacao (data_atual);
