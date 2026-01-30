
import { neon } from '@neondatabase/serverless';
import { Seller, SellerStatus, ServiceRecord, CustomStatus } from '../types';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_zFVtX8GByY1v@ep-divine-fog-ah845yt9-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';
const sql = neon(DATABASE_URL);

export const dbService = {
  async initDatabase() {
    try {
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
          venda_realizada BOOLEAN,
          valor_venda NUMERIC(15,2) DEFAULT 0,
          itens_venda INTEGER DEFAULT 0,
          motivo_perda TEXT,
          observacoes TEXT,
          status TEXT DEFAULT 'PENDING',
          criado_em TIMESTAMPTZ DEFAULT NOW(),
          finalizado_em TIMESTAMPTZ
        );
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS status_rh (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          label TEXT NOT NULL,
          icon TEXT NOT NULL,
          color TEXT NOT NULL,
          behavior TEXT NOT NULL,
          criado_em TIMESTAMPTZ DEFAULT NOW()
        );
      `;

      await sql`ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'PENDING'`;
      await sql`ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS valor_venda NUMERIC(15,2) DEFAULT 0`;
      await sql`ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS itens_venda INTEGER DEFAULT 0`;
      
      await sql`ALTER TABLE atendimentos ALTER COLUMN venda_realizada DROP NOT NULL`;

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
    } catch (e) { return null; }
  },

  async searchClients(query: string) {
    if (!query || query.length < 2) return [];
    const searchTerm = `%${query}%`;
    try {
      return await sql`
        SELECT c.*, v.nome as nome_vendedor 
        FROM clientes c
        LEFT JOIN vendedores v ON v.id = c.ultimo_vendedor_id
        WHERE c.nome ILIKE ${searchTerm} OR c.whatsapp ILIKE ${searchTerm}
        ORDER BY c.atualizado_em DESC
        LIMIT 5
      `;
    } catch (e) { return []; }
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

  async createCustomStatus(data: { label: string; icon: string; color: string; behavior: 'INACTIVE' | 'ACTIVE' }) {
    await sql`
      INSERT INTO status_rh (label, icon, color, behavior)
      VALUES (${data.label}, ${data.icon}, ${data.color}, ${data.behavior})
    `;
    return { success: true };
  },

  async deleteCustomStatus(id: string) {
    await sql`DELETE FROM status_rh WHERE id = ${id}`;
    return { success: true };
  },

  async getSellers(): Promise<(Seller & { activeClientName?: string; activeServiceId?: string; activeServiceStart?: string })[]> {
    try {
      const rows = await sql`
        SELECT 
          v.id, 
          v.nome as name, 
          v.avatar_url as avatar, 
          v.status, 
          v.posicao_fila as "queuePosition",
          (
            SELECT a.cliente_nome 
            FROM atendimentos a 
            WHERE a.vendedor_id = v.id AND a.status = 'PENDING' 
            ORDER BY a.criado_em DESC LIMIT 1
          ) as "activeClientName",
          (
            SELECT a.id 
            FROM atendimentos a 
            WHERE a.vendedor_id = v.id AND a.status = 'PENDING' 
            ORDER BY a.criado_em DESC LIMIT 1
          ) as "activeServiceId",
          (
            SELECT a.criado_em 
            FROM atendimentos a 
            WHERE a.vendedor_id = v.id AND a.status = 'PENDING' 
            ORDER BY a.criado_em DESC LIMIT 1
          ) as "activeServiceStart"
        FROM vendedores v 
        ORDER BY v.posicao_fila ASC NULLS LAST, v.nome ASC
      `;
      return rows.map(r => ({
        id: r.id,
        name: r.name,
        avatar: r.avatar,
        status: r.status,
        queuePosition: r.queuePosition,
        activeClientName: r.activeClientName || undefined,
        activeServiceId: r.activeServiceId || undefined,
        activeServiceStart: r.activeServiceStart || undefined
      }));
    } catch (e) { return []; }
  },

  async updateSeller(sellerId: string, data: any) {
    if (!sellerId) return { success: false };
    if (data.nome || data.avatar_url) {
       await sql`UPDATE vendedores SET nome = COALESCE(${data.nome}, nome), avatar_url = COALESCE(${data.avatar_url}, avatar_url) WHERE id = ${sellerId}`;
    }
    if (data.status) {
      const isSystemActive = data.status === 'AVAILABLE' || data.status === 'IN_SERVICE' || data.status === 'BREAK' || data.status === 'LUNCH';
      if (!isSystemActive) {
        await sql`UPDATE vendedores SET status = ${data.status}, posicao_fila = NULL WHERE id = ${sellerId}`;
      } else {
        const currentRes = await sql`SELECT posicao_fila FROM vendedores WHERE id = ${sellerId}`;
        const current = currentRes[0];
        if (current && current.posicao_fila === null && data.status === 'AVAILABLE') {
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

  async saveService(service: Partial<ServiceRecord>) {
    try {
      const cleanWhatsapp = service.clientWhatsApp?.replace(/\D/g, '') || '';
      if (cleanWhatsapp && service.clientName) {
        await sql`
          INSERT INTO clientes (nome, whatsapp, ultimo_vendedor_id, atualizado_em)
          VALUES (${service.clientName}, ${cleanWhatsapp}, ${service.sellerId}, NOW())
          ON CONFLICT (whatsapp) DO UPDATE SET 
            nome = EXCLUDED.nome,
            ultimo_vendedor_id = EXCLUDED.ultimo_vendedor_id,
            atualizado_em = NOW();
        `;
      }
      if (service.id && service.status === 'COMPLETED') {
        await sql`
          UPDATE atendimentos SET 
            venda_realizada = ${service.isSale || false},
            valor_venda = ${service.saleValue || 0},
            itens_venda = ${service.itemsCount || 0},
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
    } catch (e: any) { throw e; }
  },

  async getServiceHistory(sellerId?: string) {
    try {
      const query = sellerId 
        ? sql`
            SELECT a.*, v.nome as vendedor_nome, v.avatar_url as vendedor_avatar
            FROM atendimentos a
            JOIN vendedores v ON v.id = a.vendedor_id
            WHERE a.vendedor_id = ${sellerId}
            ORDER BY a.status DESC, a.criado_em DESC
          `
        : sql`
            SELECT a.*, v.nome as vendedor_nome, v.avatar_url as vendedor_avatar
            FROM atendimentos a
            JOIN vendedores v ON v.id = a.vendedor_id
            ORDER BY a.status DESC, a.criado_em DESC
          `;
      return query;
    } catch (e) {
      console.error("Erro ao buscar histórico:", e);
      return [];
    }
  },

  async createSeller(name: string, avatar: string) {
    const maxPosRes = await sql`SELECT COALESCE(MAX(posicao_fila), 0) as max FROM vendedores`;
    const nextPos = Number(maxPosRes[0].max || 0) + 1;
    await sql`INSERT INTO vendedores (nome, avatar_url, status, posicao_fila) VALUES (${name}, ${avatar}, 'AVAILABLE', ${nextPos})`;
    return { success: true };
  },

  async getAdvancedStats(sellerId?: string) {
    return sellerId 
      ? sql`SELECT vendedor_id, tipo_atendimento, venda_realizada, valor_venda, itens_venda, motivo_perda, status FROM atendimentos WHERE vendedor_id = ${sellerId}` 
      : sql`SELECT vendedor_id, tipo_atendimento, venda_realizada, valor_venda, itens_venda, motivo_perda, status FROM atendimentos`;
  }
};
