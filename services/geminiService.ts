
import { GoogleGenAI } from "@google/genai";

export const getDashboardInsights = async (stats: any) => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    return "Mantenha o foco na conversão! O atendimento ágil é o segredo para bater as metas de hoje.";
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `Como um consultor de vendas sênior, analise estes dados de hoje de uma loja:
  - Atendimentos: ${stats.totalServicesToday}
  - Taxa de Conversão: ${stats.conversionRate}%
  - Principais motivos de perda: Preço e Estoque.
  Forneça uma análise curta, profissional e motivacional de 2 parágrafos em Português BR para o gerente da loja.`;

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
    return "A análise inteligente está temporariamente indisponível. Foco total na qualidade do atendimento!";
  }
};
