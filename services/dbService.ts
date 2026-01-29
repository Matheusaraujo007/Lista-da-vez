
import { neon } from '@neondatabase/serverless';
import { Seller, ServiceRecord } from '../types';

// Tenta inicializar o cliente Neon apenas se a URL existir
const DATABASE_URL = process.env.DATABASE_URL;
const sql = DATABASE_URL ? neon(DATABASE_URL) : null;

export const dbService = {
  isMockMode: !sql,

  async initDatabase() {
    if (!sql) {
      console.warn('DATABASE_URL não encontrada. O sistema está rodando em MODO SIMULAÇÃO.');
      return { success: false, message: 'URL do banco de dados não configurada no Vercel.' };
    }

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

      return { success: true, message: 'Estrutura do banco sincronizada!' };
    } catch (error: any) {
      console.error('Erro Neon:', error);
      return { success: false, message: error.message };
    }
  },

  async saveService(service: Partial<ServiceRecord>) {
    console.log('--- Ação: Salvar Atendimento ---', service);
    
    if (sql) {
      try {
        const res = await sql`
          INSERT INTO atendimentos (vendedor_id, cliente_nome, cliente_whatsapp, tipo_atendimento, venda_realizada, motivo_perda, observacoes)
          VALUES (${service.sellerId}, ${service.clientName}, ${service.clientWhatsApp}, ${service.serviceType}, ${service.isSale || false}, ${service.lossReason || null}, ${service.observations || null})
          RETURNING id;
        `;
        return { success: true, id: res[0].id };
      } catch (e) {
        console.error('Erro ao salvar no Neon:', e);
        return { success: false, error: e };
      }
    }

    // Fallback Preview
    await new Promise(r => setTimeout(r, 600));
    return { success: true, id: 'mock-' + Math.random().toString(36).substr(2, 5) };
  },

  async updateSeller(sellerId: string, data: any) {
    console.log(`--- Ação: Atualizar Vendedor ${sellerId} ---`, data);
    
    if (sql) {
      try {
        await sql`
          UPDATE vendedores 
          SET status = ${data.status}, 
              posicao_fila = ${data.queuePosition || null} 
          WHERE id = ${sellerId}
        `;
        return { success: true };
      } catch (e) {
        console.error('Erro ao atualizar vendedor no Neon:', e);
        return { success: false, error: e };
      }
    }

    // Fallback Preview
    await new Promise(r => setTimeout(r, 400));
    return { success: true };
  },

  async getStats() {
    if (sql) {
      try {
        const today = new Date().toISOString().split('T')[0];
        const res = await sql`SELECT COUNT(*) as total FROM atendimentos WHERE criado_em::date = ${today}::date`;
        return { totalServicesToday: parseInt(res[0].total), conversionRate: 35 };
      } catch (e) {
        return { totalServicesToday: 0, conversionRate: 0 };
      }
    }
    return { totalServicesToday: 42, conversionRate: 35 };
  }
};
