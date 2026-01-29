
import { GoogleGenAI } from "@google/genai";

export const getDashboardInsights = async (stats: any) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const prompt = `Como um consultor de vendas sênior, analise estes dados de hoje:
  - Atendimentos: ${stats.totalServicesToday}
  - Taxa de Conversão: ${stats.conversionRate}%
  - Principais perdas: Preço (45%), Estoque (25%), Pesquisa (20%).
  Forneça uma análise curta e motivacional de 2 parágrafos em Português BR para o gerente da loja.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Não foi possível gerar insights no momento. Continue o bom trabalho!";
  }
};
