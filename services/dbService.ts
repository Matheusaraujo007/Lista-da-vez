
import { neon } from '@neondatabase/serverless';
import { Seller, SellerStatus, ServiceRecord } from '../types';

// Usando a URL fornecida pelo usuário
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_zFVtX8GByY1v@ep-divine-fog-ah845yt9-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';
const sql = neon(DATABASE_URL);

export const dbService = {
  isMockMode: !DATABASE_URL.includes('neon.tech'),

  async initDatabase() {
    try {
      await sql`
        DO $$ BEGIN
          CREATE TYPE seller_status AS ENUM ('AVAILABLE', 'IN_SERVICE', 'BREAK', 'LUNCH', 'AWAY');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS vendedores (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          nome TEXT NOT NULL,
          avatar_url TEXT,
          status seller_status DEFAULT 'AVAILABLE',
          posicao_fila INTEGER,
          ultimo_atendimento TIMESTAMPTZ,
          criado_em TIMESTAMPTZ DEFAULT NOW()
        );
      `;

      await sql`
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
      `;

      return { success: true, message: 'Banco de dados Neon sincronizado!' };
    } catch (error: any) {
      console.error('Erro ao inicializar banco:', error);
      return { success: false, message: error.message };
    }
  },

  async getSellers(): Promise<Seller[]> {
    try {
      const rows = await sql`SELECT id, nome as name, avatar_url as avatar, status, posicao_fila as "queuePosition" FROM vendedores ORDER BY posicao_fila ASC NULLS LAST`;
      return rows.map(r => ({
        id: r.id,
        name: r.name,
        avatar: r.avatar,
        status: r.status as SellerStatus,
        queuePosition: r.queuePosition
      }));
    } catch (e) {
      console.error('Erro ao buscar vendedores:', e);
      return [];
    }
  },

  async createSeller(name: string, avatar: string) {
    try {
      const maxPosRes = await sql`SELECT COALESCE(MAX(posicao_fila), 0) as max FROM vendedores`;
      const nextPos = (maxPosRes[0].max || 0) + 1;
      
      await sql`
        INSERT INTO vendedores (nome, avatar_url, status, posicao_fila)
        VALUES (${name}, ${avatar}, 'AVAILABLE', ${nextPos})
      `;
      return { success: true };
    } catch (e) {
      console.error('Erro ao criar vendedor:', e);
      return { success: false, error: e };
    }
  },

  async deleteSeller(id: string) {
    try {
      await sql`DELETE FROM vendedores WHERE id = ${id}`;
      return { success: true };
    } catch (e) {
      return { success: false, error: e };
    }
  },

  async saveService(service: Partial<ServiceRecord>) {
    try {
      const res = await sql`
        INSERT INTO atendimentos (vendedor_id, cliente_nome, cliente_whatsapp, tipo_atendimento, venda_realizada, motivo_perda, observacoes)
        VALUES (${service.sellerId}, ${service.clientName}, ${service.clientWhatsApp}, ${service.serviceType}, ${service.isSale || false}, ${service.lossReason || null}, ${service.observations || null})
        RETURNING id;
      `;
      
      if (service.status === 'COMPLETED') {
        const maxPosRes = await sql`SELECT MAX(posicao_fila) as max FROM vendedores`;
        const nextPos = (maxPosRes[0].max || 0) + 1;
        await sql`UPDATE vendedores SET status = 'AVAILABLE', posicao_fila = ${nextPos}, ultimo_atendimento = NOW() WHERE id = ${service.sellerId}`;
      }

      return { success: true, id: res[0].id };
    } catch (e) {
      console.error('Erro ao salvar atendimento:', e);
      return { success: false, error: e };
    }
  },

  async updateSeller(sellerId: string, data: any) {
    try {
      // Se tiver nome ou avatar, é uma edição de perfil
      if (data.nome || data.avatar_url) {
        await sql`
          UPDATE vendedores 
          SET nome = COALESCE(${data.nome}, nome), 
              avatar_url = COALESCE(${data.avatar_url}, avatar_url)
          WHERE id = ${sellerId}
        `;
      } 
      
      // Se tiver status, é uma atualização de fila
      if (data.status) {
        if (data.status === SellerStatus.AVAILABLE) {
          const maxPosRes = await sql`SELECT MAX(posicao_fila) as max FROM vendedores`;
          const nextPos = (maxPosRes[0].max || 0) + 1;
          await sql`UPDATE vendedores SET status = ${data.status}, posicao_fila = ${nextPos} WHERE id = ${sellerId}`;
        } else {
          await sql`UPDATE vendedores SET status = ${data.status}, posicao_fila = NULL WHERE id = ${sellerId} `;
        }
      }
      return { success: true };
    } catch (e) {
      console.error('Erro ao atualizar vendedor:', e);
      return { success: false, error: e };
    }
  }
};
