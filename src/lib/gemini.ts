import { GoogleGenAI } from '@google/genai';

export interface GeminiCard {
  member: string;
  group: string;
  album: string;
  era?: string | null;
  version?: string | null;
  boundingBox: { x: number; y: number; w: number; h: number };
}

const PROMPT = `This is a K-pop photocard template image with multiple photocards arranged in a grid.

Identify every individual photocard in the image. For each photocard return:
- member: the idol's name (e.g. "Karina", "Jungkook")
- group: the K-pop group (e.g. "aespa", "BTS")
- album: the album or comeback title (e.g. "Savage", "Butter")
- era: the era name — often same as album, null if unknown
- version: the photocard version label (e.g. "A ver.", "Digipack ver."), null if unknown
- boundingBox: the photocard's position as fractions of the full image { x, y, w, h } where x,y is the top-left corner (0–1 range)

Rules:
- Include EVERY photocard cell, even if you cannot read the text
- If you cannot identify a member/group, use your best guess from visual cues, or "Unknown"
- BoundingBox must be tight around the photocard, not the whole image
- Return ONLY a valid JSON array — no markdown fences, no explanation

Example output:
[{"member":"Karina","group":"aespa","album":"Savage","era":"Hallucination Quest","version":"Hallucination ver.","boundingBox":{"x":0.0,"y":0.0,"w":0.5,"h":0.5}},{"member":"Winter","group":"aespa","album":"Savage","era":"Hallucination Quest","version":"Real World ver.","boundingBox":{"x":0.5,"y":0.0,"w":0.5,"h":0.5}}]`;

export async function detectPhotocardsInTemplate(dataUrl: string): Promise<GeminiCard[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set. Add it to your .env.local file.');

  const [header, base64] = dataUrl.split(',');
  const mimeType = header.split(':')[1].split(';')[0] as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

  const ai = new GoogleGenAI({ apiKey });
  const result = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: [
      {
        role: 'user',
        parts: [
          { text: PROMPT },
          { inlineData: { mimeType, data: base64 } },
        ],
      },
    ],
  });

  const text = result.text ?? '';
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('Gemini returned an unexpected response. Try again or use manual grid mode.');

  const cards = JSON.parse(match[0]) as GeminiCard[];
  if (!Array.isArray(cards) || cards.length === 0) {
    throw new Error('No photocards detected. Try a clearer template image.');
  }
  return cards;
}
