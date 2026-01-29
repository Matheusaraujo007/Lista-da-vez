
import { neon } from '@neondatabase/serverless';
import { Seller, SellerStatus, ServiceRecord, CustomStatus } from '../types';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_zFVtX8GByY1v@ep-divine-fog-ah845yt9-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';
const sql = neon(DATABASE_URL);

export const dbService = {
  async initDatabase() {
    try {
      // 1. Criar tabelas se não existirem
      await sql`
        CREATE TABLE IF NOT EXISTS vendedores (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          nome TEXT NOT NULL,
          avatar_url TEXT,
          status TEXT DEFAULT 'AVAILABLE',
          posicao_fila INTEGER,
          ultimo_atendimento TIMESTAMPTZ,
          criado_em TIMESTAMPTZ DEFAULT NOW()
        );
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS status_rh (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          label TEXT NOT NULL,
          icon TEXT DEFAULT 'info',
          color TEXT DEFAULT '#6c757d',
          behavior TEXT DEFAULT 'INACTIVE',
          criado_em TIMESTAMPTZ DEFAULT NOW()
        );
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS clientes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          nome TEXT NOT NULL,
          whatsapp TEXT UNIQUE NOT NULL,
          ultimo_vendedor_id UUID REFERENCES vendedores(id) ON DELETE SET NULL,
          criado_em TIMESTAMPTZ DEFAULT NOW(),
          atualizado_em TIMESTAMPTZ DEFAULT NOW()
        );
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS atendimentos (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          vendedor_id UUID REFERENCES vendedores(id) ON DELETE CASCADE,
          cliente_nome TEXT NOT NULL,
          cliente_whatsapp TEXT,
          tipo_atendimento TEXT NOT NULL,
          venda_realizada BOOLEAN DEFAULT FALSE,
          motivo_perda TEXT,
          observacoes TEXT,
          criado_em TIMESTAMPTZ DEFAULT NOW(),
          finalizado_em TIMESTAMPTZ
        );
      `;

      // 2. Migração Crítica: Adicionar coluna status se não existir (evita erro 400/500)
      await sql`ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'PENDING'`;

      return { success: true };
    } catch (error: any) {
      console.error('Erro ao inicializar banco:', error);
      return { success: false, message: error.message };
    }
  },

  async getClientByWhatsApp(whatsapp: string) {
    if (!whatsapp) return null;
    const cleanWhatsapp = whatsapp.replace(/\D/g, '');
    try {
      const res = await sql`
        SELECT c.*, v.nome as nome_vendedor 
        FROM clientes c
        LEFT JOIN vendedores v ON v.id = c.ultimo_vendedor_id
        WHERE c.whatsapp = ${cleanWhatsapp}
        LIMIT 1
      `;
      return res[0] || null;
    } catch (e) {
      return null;
    }
  },

  async getCustomStatuses(): Promise<CustomStatus[]> {
    try {
      const rows = await sql`SELECT id, label, icon, color, behavior FROM status_rh ORDER BY criado_em ASC`;
      return rows.map(r => ({
        id: r.id,
        label: r.label,
        icon: r.icon,
        color: r.color,
        behavior: r.behavior as 'INACTIVE' | 'ACTIVE'
      }));
    } catch (e) { return []; }
  },

  async createCustomStatus(status: Partial<CustomStatus>) {
    await sql`INSERT INTO status_rh (label, icon, color, behavior) VALUES (${status.label}, ${status.icon}, ${status.color}, ${status.behavior})`;
    return { success: true };
  },

  async deleteCustomStatus(id: string) {
    await sql`DELETE FROM status_rh WHERE id = ${id}`;
    return { success: true };
  },

  async getSellers(): Promise<(Seller & { activeClientName?: string })[]> {
    try {
      const rows = await sql`
        SELECT 
          v.id, v.nome as name, v.avatar_url as avatar, v.status, v.posicao_fila as "queuePosition",
          (SELECT cliente_nome FROM atendimentos WHERE vendedor_id = v.id AND status = 'PENDING' ORDER BY criado_em DESC LIMIT 1) as "activeClientName"
        FROM vendedores v 
        ORDER BY v.posicao_fila ASC NULLS LAST
      `;
      return rows.map(r => ({
        id: r.id,
        name: r.name,
        avatar: r.avatar,
        status: r.status,
        queuePosition: r.queuePosition,
        activeClientName: r.activeClientName || undefined
      }));
    } catch (e) {
      console.error("Erro ao buscar vendedores:", e);
      return [];
    }
  },

  async createSeller(name: string, avatar: string) {
    const maxPosRes = await sql`SELECT COALESCE(MAX(posicao_fila), 0) as max FROM vendedores`;
    const nextPos = Number(maxPosRes[0].max || 0) + 1;
    await sql`INSERT INTO vendedores (nome, avatar_url, status, posicao_fila) VALUES (${name}, ${avatar}, 'AVAILABLE', ${nextPos})`;
    return { success: true };
  },

  async updateSeller(sellerId: string, data: any) {
    if (!sellerId) return { success: false };
    
    if (data.nome) await sql`UPDATE vendedores SET nome = ${data.nome} WHERE id = ${sellerId}`;
    if (data.avatar_url) await sql`UPDATE vendedores SET avatar_url = ${data.avatar_url} WHERE id = ${sellerId}`;
    if (data.status) {
      const isSystemActive = data.status === 'AVAILABLE' || data.status === 'IN_SERVICE' || data.status === 'BREAK' || data.status === 'LUNCH';
      if (!isSystemActive) {
        await sql`UPDATE vendedores SET status = ${data.status}, posicao_fila = NULL WHERE id = ${sellerId}`;
      } else {
        const current = await sql`SELECT posicao_fila FROM vendedores WHERE id = ${sellerId}`;
        if (current[0].posicao_fila === null && data.status === 'AVAILABLE') {
           const maxPosRes = await sql`SELECT COALESCE(MAX(posicao_fila), 0) as max FROM vendedores`;
           const nextPos = Number(maxPosRes[0].max || 0) + 1;
           await sql`UPDATE vendedores SET status = ${data.status}, posicao_fila = ${nextPos} WHERE id = ${sellerId}`;
        } else {
           await sql`UPDATE vendedores SET status = ${data.status} WHERE id = ${sellerId}`;
        }
      }
    }
    return { success: true };
  },

  async deleteSeller(id: string) {
    await sql`DELETE FROM atendimentos WHERE vendedor_id = ${id}`;
    await sql`DELETE FROM vendedores WHERE id = ${id}`;
    return { success: true };
  },

  async saveService(service: Partial<ServiceRecord>) {
    try {
      const cleanWhatsapp = service.clientWhatsApp?.replace(/\D/g, '') || '';
      
      // 1. Upsert no Cliente (CRM)
      if (cleanWhatsapp) {
        await sql`
          INSERT INTO clientes (nome, whatsapp, ultimo_vendedor_id, atualizado_em)
          VALUES (${service.clientName}, ${cleanWhatsapp}, ${service.sellerId}, NOW())
          ON CONFLICT (whatsapp) DO UPDATE SET 
            nome = EXCLUDED.nome,
            ultimo_vendedor_id = EXCLUDED.ultimo_vendedor_id,
            atualizado_em = NOW();
        `;
      }

      // 2. Salvar Atendimento
      if (service.id && service.status === 'COMPLETED') {
        await sql`
          UPDATE atendimentos SET 
            venda_realizada = ${service.isSale || false},
            motivo_perda = ${service.lossReason || null},
            observacoes = ${service.observations || null},
            status = 'COMPLETED',
            finalizado_em = NOW()
          WHERE id = ${service.id}
        `;
        
        const maxPosRes = await sql`SELECT COALESCE(MAX(posicao_fila), 0) as max FROM vendedores`;
        const nextPos = Number(maxPosRes[0].max || 0) + 1;
        await sql`UPDATE vendedores SET status = 'AVAILABLE', posicao_fila = ${nextPos}, ultimo_atendimento = NOW() WHERE id = ${service.sellerId}`;
      } else {
        const res = await sql`
          INSERT INTO atendimentos (vendedor_id, cliente_nome, cliente_whatsapp, tipo_atendimento, status)
          VALUES (${service.sellerId}, ${service.clientName}, ${cleanWhatsapp}, ${service.serviceType}, 'PENDING')
          RETURNING id;
        `;
        return { success: true, id: res[0].id };
      }
      return { success: true };
    } catch (e: any) {
      console.error("Erro crítico ao salvar serviço:", e);
      throw e;
    }
  },

  async getAdvancedStats(sellerId?: string) {
    try {
      return sellerId 
        ? sql`SELECT tipo_atendimento, venda_realizada, motivo_perda FROM atendimentos WHERE vendedor_id = ${sellerId}` 
        : sql`SELECT tipo_atendimento, venda_realizada, motivo_perda FROM atendimentos`;
    } catch (e) {
      return [];
    }
  }
};
