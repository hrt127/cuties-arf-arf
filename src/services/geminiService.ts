import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Attachment } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const geminiService = {
  async generateInitialDraft(prompt: string, attachments: Attachment[], style: string = 'Standard', audience: string = 'General', format: string = 'Essay', customVibe: string = ''): Promise<string> {
    const styleMap = {
      'Standard': 'You are a world-class writing partner. Write a high-quality draft.',
      'Academic Overachiever': 'You are an academic overachiever. Use unnecessarily complex vocabulary, passive voice where possible, and extremely long, winding sentences. Be imperceptibly condescending about the simplicity of the topic.',
      'Passive-Aggressive Assistant': 'You are a helpful assistant, but you are clearly annoyed. Use phrases like "as you probably already know" or "for your convenience, though it was quite clear". Your trolling should be so subtle it might just be seen as "very thorough".',
      'The Over-Explainer': 'You are a writing partner who assumes the reader knows nothing. Explain even the most basic concepts in excruciating detail, often using analogies that are slightly too simple.',
      'Custom': `You are a writing partner with this specific vibe: ${customVibe}`
    };
    const styleInstructions = styleMap[style as keyof typeof styleMap] || styleMap['Standard'];

    const contextPrompt = `
      Style: ${styleInstructions}
      Audience: ${audience}
      Format: ${format}
      
      Based on the following prompt and attachments, write a high-quality initial draft. 
      Prompt: ${prompt}
    `;

    const parts: any[] = [{ text: contextPrompt }];
    
    attachments.forEach(att => {
      parts.push({
        inlineData: {
          mimeType: att.mimeType,
          data: att.data
        }
      });
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: { parts },
    });

    return response.text || "";
  },

  async iterateOnSelection(fullContent: string, selection: string, feedback: string, style: string = 'Standard'): Promise<string> {
    const styleMap = {
      'Standard': 'Rewrite the selection to incorporate feedback.',
      'Academic Overachiever': 'Rewrite the selection using the most obscure synonyms possible. Ensure the tone is slightly superior.',
      'Passive-Aggressive Assistant': 'Rewrite the selection. Make it technically perfect but include a subtle hint that the user should have been able to do this themselves.',
      'The Over-Explainer': 'Rewrite the selection, but add a brief, unnecessary explanation of one of the words or concepts used.'
    };
    const styleInstructions = styleMap[style as keyof typeof styleMap] || styleMap['Standard'];

    const prompt = `
      Context: ${fullContent}
      Style Instruction: ${styleInstructions}
      
      The user wants to iterate on this specific part: "${selection}"
      User Feedback: ${feedback}
      
      Rewrite ONLY the selected part. Return ONLY the rewritten text.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
    });

    return response.text || "";
  },

  async getProactiveFeedback(content: string): Promise<{ feedback: string; suggestion?: string; targetText?: string }[]> {
    if (content.length < 100) return [];

    const prompt = `
      You are a proactive writing coach. Analyze the following text and provide 1-2 specific, actionable suggestions for improvement.
      Focus on clarity, tone, flow, or impact.
      
      Text: "${content}"
      
      Return the response as a JSON array of objects with:
      - feedback: A short explanation of why this change is suggested.
      - suggestion: The improved version of the text (if applicable).
      - targetText: The exact snippet of text from the original that this applies to.
    `;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      return JSON.parse(response.text || "[]");
    } catch (e) {
      console.error("Failed to get proactive feedback", e);
      return [];
    }
  }
};
