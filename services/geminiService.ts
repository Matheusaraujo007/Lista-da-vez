
import { GoogleGenAI } from "@google/genai";

// Função para gerar insights inteligentes para o gerente da loja
export const getDashboardInsights = async (stats: any) => {
  // Conforme as diretrizes do SDK, a chave da API deve ser obtida exclusivamente de process.env.API_KEY
  if (!process.env.API_KEY) {
    return "Mantenha o foco na conversão! O atendimento ágil é o segredo para bater as metas de hoje.";
  }

  // Inicialização do SDK usando o process.env.API_KEY diretamente
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `Como um consultor de vendas sênior, analise estes dados de hoje de uma loja:
  - Atendimentos: ${stats.totalServicesToday}
  - Taxa de Conversão: ${stats.conversionRate}%
  - Principais motivos de perda: Preço e Estoque.
  Forneça uma análise curta, profissional e motivacional de 2 parágrafos em Português BR para o gerente da loja.`;

  try {
    // Utilizando o modelo gemini-3-flash-preview conforme recomendado para tarefas de texto básicas
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        // Desabilitando o orçamento de pensamento para uma resposta mais rápida em tarefa simples
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    // Acessando a propriedade .text (não é um método) conforme as diretrizes
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "A análise inteligente está temporariamente indisponível. Foco total na qualidade do atendimento!";
  }
};
