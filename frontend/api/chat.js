import { GoogleGenAI } from '@google/genai';

// Initialize SDK explicitly using the environment variable
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_PROMPT = `Anda adalah "AI Financial Assistant FPIS" (Financial Performance & Insight System) untuk eksekutif Telkom.
Tugas Anda:
1. Jawab pertanyaan seputar keuangan, metrik bisnis (EBITDA, Net Income, ROE, dll), dan tren makro.
2. Anda bisa memberikan saran efisiensi budget, marketing, atau operasional.
3. Selalu bersikap profesional, singkat, dan berwawasan data.
4. JANGAN menjawab pertanyaan yang tidak ada hubungannya sama sekali dengan keuangan, bisnis, teknologi, atau perusahaan (misal: resep masakan, humor, gosip selebriti). Jika ditanya demikian, tolak dengan sopan dan kembalikan topik ke analisis finansial.`;

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { messages } = await req.json();

    // Map messages to Gemini format (user vs model)
    const formattedMessages = messages.map(m => ({
      role: m.role === 'bot' ? 'model' : 'user',
      parts: [{ text: m.text }]
    }));

    // Use models.generateContent for a stateless multi-turn conversation
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: formattedMessages,
      config: {
        systemInstruction: SYSTEM_PROMPT
      }
    });

    return new Response(
      JSON.stringify({ response: response.text }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Gemini API Error:', error);
    return new Response(
      JSON.stringify({ error: 'Gagal memproses permintaan dari AI. Pastikan API Key valid.', details: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
