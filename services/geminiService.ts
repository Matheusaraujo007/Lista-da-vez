
import { GoogleGenAI } from "@google/genai";

// Cache simples para evitar chamadas repetitivas e erro 429
let lastInsight = "";
let lastStatsHash = "";
let lastRequestTime = 0;
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutos de intervalo mínimo entre análises idênticas

export const getDashboardInsights = async (stats: any) => {
  if (!process.env.API_KEY) {
    return "Mantenha o foco na conversão! O atendimento ágil é o segredo para bater as metas de hoje.";
  }

  // Criar um hash simples dos dados para comparar
  const currentStatsHash = `${stats.totalServicesToday}-${stats.conversionRate}`;
  const now = Date.now();

  // Se os dados não mudaram ou estamos no período de cooldown, retorna o cache
  if (lastInsight && currentStatsHash === lastStatsHash && (now - lastRequestTime) < COOLDOWN_MS) {
    return lastInsight;
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `Como um consultor de vendas sênior, analise estes dados de hoje de uma loja:
  - Atendimentos Totais: ${stats.totalServicesToday}
  - Taxa de Conversão: ${stats.conversionRate}%
  - Principais motivos de perda: Preço e Estoque.
  Forneça uma análise curta (máximo 2 parágrafos), profissional e motivacional em Português BR para o gerente da loja. Não use formatação markdown complexa.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    const text = response.text || "Continue o bom trabalho com a equipe!";
    
    // Atualiza cache
    lastInsight = text;
    lastStatsHash = currentStatsHash;
    lastRequestTime = now;

    return text;
  } catch (error: any) {
    console.error("Gemini Error:", error);

    // Tratamento específico para erro de cota (429)
    if (error?.message?.includes('429') || error?.status === 429) {
      return lastInsight || "O limite de análises por minuto foi atingido. Foco total na qualidade do atendimento enquanto a IA descansa!";
    }

    return lastInsight || "A análise inteligente está temporariamente indisponível. Continue monitorando as métricas de conversão!";
  }
};
