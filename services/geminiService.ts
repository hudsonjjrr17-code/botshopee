
import { GoogleGenAI, Type } from "@google/genai";
import { Product, DealContent } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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

  const products = extractJsonFromText(response.text || "[]");
  if (!products || !Array.isArray(products)) {
    throw new Error("A IA não retornou uma lista válida de produtos.");
  }

  return products.map((p: any) => ({
    ...p,
    id: p.id || Math.random().toString(36).substr(2, 9),
    imageUrls: p.imageUrls || [p.imageUrl],
    specifications: {}
  }));
};

export const analyzeProductFromUrl = async (url: string): Promise<Product> => {
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: `Analise este link da Shopee: ${url}. 
    Retorne um objeto JSON com: title, price, originalPrice, trendMetric, imageUrl, imageUrls (array).
    Se não conseguir extrair dados reais, pesquise no Google pelo título aproximado do produto no link.`,
    config: {
      tools: [{ googleSearch: {} }],
    }
  });

  const data = extractJsonFromText(response.text || "{}");
  if (!data) throw new Error("Não foi possível extrair dados estruturados deste link.");

  return {
    ...data,
    id: Math.random().toString(36).substr(2, 9),
    productUrl: url,
    imageUrls: data.imageUrls || [data.imageUrl],
    category: "Manual"
  };
};

export const generateWhatsAppCopy = async (product: Product): Promise<DealContent> => {
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
          caption: { type: Type.STRING },
          hashtags: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["caption", "hashtags"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
};
