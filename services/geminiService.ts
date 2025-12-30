
import { GoogleGenAI, Type } from "@google/genai";
import { Product, DealContent } from "../types";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Executes a function with exponential backoff retry logic specifically for 429 errors.
 */
const withRetry = async <T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> => {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      // Check for rate limit error (429) or overloaded model (503)
      const errorMsg = error?.message || "";
      const isRateLimit = errorMsg.includes("429") || errorMsg.includes("RESOURCE_EXHAUSTED");
      const isOverloaded = errorMsg.includes("503") || errorMsg.includes("overloaded");

      if ((isRateLimit || isOverloaded) && i < maxRetries - 1) {
        const waitTime = Math.pow(2, i) * 2000 + Math.random() * 1000;
        console.warn(`Gemini API: Rate limit hit. Retrying in ${Math.round(waitTime)}ms... (Attempt ${i + 1}/${maxRetries})`);
        await delay(waitTime);
        continue;
      }
      throw error;
    }
  }
  throw lastError;
};

const extractJsonFromText = (text: string) => {
  try {
    const jsonMatch = text.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error("Failed to parse extracted JSON:", e);
  }
  return null;
};

export const findTrendingProducts = async (category: string): Promise<Product[]> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `PESQUISE NO GOOGLE: "Melhores Ofertas Shopee Brasil categoria ${category} hoje". 
      Foque em produtos que são tendência de vendas ou 'Mais Vendidos'. 
      RETORNE APENAS UM ARRAY JSON contendo 8 objetos com:
      - id: string única (ex: SHP123)
      - title: Título curto e chamativo
      - price: número real (ex: 45.90)
      - originalPrice: número real maior que o preço
      - trendMetric: ex: "1.000+ vendidos"
      - productUrl: LINK DIRETO PARA O PRODUTO NA SHOPEE BRASIL (DOMÍNIO shopee.com.br)
      - imageUrl: URL de imagem real do produto
      - imageUrls: array com mais 2 URLs de imagens.
      
      Atenção: Não invente links. Use links reais da Shopee encontrados na busca.`,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });

    // Extracting website URLs from groundingChunks as required by Gemini API guidelines
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const searchSources = groundingChunks
      .map((chunk: any) => ({
        uri: chunk.web?.uri,
        title: chunk.web?.title
      }))
      .filter((s: any) => s.uri);

    const products = extractJsonFromText(response.text || "[]");
    if (!products || !Array.isArray(products)) {
      throw new Error("A IA não retornou uma lista válida de produtos.");
    }

    return products.map((p: any) => ({
      ...p,
      id: p.id || Math.random().toString(36).substr(2, 9),
      imageUrls: p.imageUrls || [p.imageUrl],
      specifications: {},
      sources: searchSources
    }));
  });
};

export const analyzeProductFromUrl = async (url: string): Promise<Product> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Analise este link da Shopee: ${url}. 
      Retorne um objeto JSON com: title, price, originalPrice, trendMetric, imageUrl, imageUrls (array).
      Se não conseguir extrair dados reais, pesquise no Google pelo título aproximado do produto no link.`,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });

    // Extracting website URLs from groundingChunks as required by Gemini API guidelines
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const searchSources = groundingChunks
      .map((chunk: any) => ({
        uri: chunk.web?.uri,
        title: chunk.web?.title
      }))
      .filter((s: any) => s.uri);

    const data = extractJsonFromText(response.text || "{}");
    if (!data) throw new Error("Não foi possível extrair dados estruturados deste link.");

    return {
      ...data,
      id: Math.random().toString(36).substr(2, 9),
      productUrl: url,
      imageUrls: data.imageUrls || [data.imageUrl],
      category: "Manual",
      sources: searchSources
    };
  });
};

export const generateWhatsAppCopy = async (product: Product): Promise<DealContent> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Crie uma copy curta e agressiva para WhatsApp. 
      Produto: ${product.title}
      Preço: R$ ${product.price}
      Métrica: ${product.trendMetric}
      Link: ${product.affiliateUrl || product.productUrl}
      
      Formato JSON: { "caption": "texto da legenda", "hashtags": ["tag1", "tag2"] }`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            caption: {
              type: Type.STRING,
            },
            hashtags: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
              },
            },
          },
          required: ["caption", "hashtags"],
        },
      },
    });

    const text = response.text;
    return JSON.parse(text || "{}");
  });
};