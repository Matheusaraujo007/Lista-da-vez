
-- Script para ser executado no Console do Neon

CREATE TABLE IF NOT EXISTS vendedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    avatar_url TEXT,
    status TEXT DEFAULT 'AVAILABLE',
    posicao_fila INTEGER,
    ultimo_atendimento TIMESTAMPTZ,
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    whatsapp TEXT UNIQUE NOT NULL,
    ultimo_vendedor_id UUID REFERENCES vendedores(id) ON DELETE SET NULL,
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS atendimentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendedor_id UUID REFERENCES vendedores(id) ON DELETE CASCADE,
    cliente_nome TEXT NOT NULL,
    cliente_whatsapp TEXT,
    tipo_atendimento TEXT NOT NULL,
    venda_realizada BOOLEAN DEFAULT FALSE,
    motivo_perda TEXT,
    observacoes TEXT,
    status TEXT DEFAULT 'PENDING',
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    finalizado_em TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS status_rh (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label TEXT NOT NULL,
    icon TEXT DEFAULT 'info',
    color TEXT DEFAULT '#6c757d',
    behavior TEXT DEFAULT 'INACTIVE',
    criado_em TIMESTAMPTZ DEFAULT NOW()
);
