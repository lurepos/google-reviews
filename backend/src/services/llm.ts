import OpenAI from 'openai';
import type { BackendConfig } from '../config.js';

export interface LlmService {
  isNegativeSentiment: (reviewText: string) => Promise<boolean>;
  generateResponse: (reviewText: string, rating: number, tone: string, language: string) => Promise<string>;
}

export function createLlmService(config: BackendConfig): LlmService {
  const openai = new OpenAI({
    apiKey: config.openaiApiKey,
    baseURL: config.openaiBaseUrl,
  });

  async function isNegativeSentiment(reviewText: string): Promise<boolean> {
    if (!reviewText || !reviewText.trim()) return false;

    // Fast-path / Mock
    if (config.openaiApiKey === 'mock-key') {
      const negativeWords = ["mal", "peor", "basura", "estafa", "robo", "malo", "horrible", "pésimo", "desastre", "sucio", "bad", "worst", "dirty", "terrible", "scam", "disappointed", "rude"];
      const textLower = reviewText.toLowerCase();
      return negativeWords.some(word => textLower.includes(word));
    }

    try {
      const response = await openai.chat.completions.create({
        model: config.openaiModel,
        messages: [
          {
            role: 'system',
            content: 'Analyze the sentiment of this Google review. Reply with exactly "NEGATIVE" if the user is complaining, dissatisfied, or has a bad experience. Otherwise reply with "OTHER".'
          },
          {
            role: 'user',
            content: `Review: ${reviewText}\nSentiment:`
          }
        ],
        max_tokens: 5,
        temperature: 0,
      });

      const sentiment = response.choices[0]?.message?.content?.trim().toUpperCase() ?? '';
      return sentiment.includes('NEGATIVE');
    } catch (e) {
      // Fallback
      const negativeWords = ["mal", "peor", "basura", "estafa", "robo", "malo", "horrible", "pésimo", "desastre", "sucio", "bad", "worst", "dirty", "terrible", "scam", "disappointed", "rude"];
      const textLower = reviewText.toLowerCase();
      return negativeWords.some(word => textLower.includes(word));
    }
  }

  async function generateResponse(reviewText: string, rating: number, tone: string, language: string): Promise<string> {
    if (config.openaiApiKey === 'mock-key') {
      return `¡Hola! Agradecemos tu reseña de ${rating} estrellas. Tomamos nota de tus comentarios.`;
    }

    const langInstruction = language.toLowerCase() !== 'original' ? `in ${language}` : 'in the same language as the review';
    const prompt = `Generate a ${tone} response ${langInstruction} to this ${rating}-star review: "${reviewText}"`;

    try {
      const response = await openai.chat.completions.create({
        model: config.openaiModel,
        messages: [
          {
            role: 'system',
            content: `You are a customer success assistant responding to Google Reviews. Tone should be ${tone}. Keep responses under 3 sentences and polite.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 150,
        temperature: 0.7,
      });

      return response.choices[0]?.message?.content?.trim() ?? 'Gracias por tu comentario.';
    } catch (e) {
      return `Gracias por tu valoración de ${rating} estrellas. Nos ayuda a seguir mejorando.`;
    }
  }

  return { isNegativeSentiment, generateResponse };
}
