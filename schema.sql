
-- Script para ser executado no Console do Neon
-- Criação das tabelas principais para o sistema Lista da Vez Pro

CREATE TYPE seller_status AS ENUM ('AVAILABLE', 'IN_SERVICE', 'BREAK', 'LUNCH', 'AWAY');

CREATE TABLE IF NOT EXISTS vendedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    avatar_url TEXT,
    status seller_status DEFAULT 'AVAILABLE',
    posicao_fila INTEGER,
    ultimo_atendimento TIMESTAMPTZ,
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS atendimentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendedor_id UUID REFERENCES vendedores(id),
    cliente_nome TEXT NOT NULL,
    cliente_whatsapp TEXT,
    tipo_atendimento TEXT NOT NULL,
    venda_realizada BOOLEAN DEFAULT FALSE,
    motivo_perda TEXT,
    observacoes TEXT,
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    finalizado_em TIMESTAMPTZ
);
