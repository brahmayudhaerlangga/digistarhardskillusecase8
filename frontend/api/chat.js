import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the standard, stable Gemini SDK
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

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

  if (!process.env.GEMINI_API_KEY) {
    return new Response(JSON.stringify({ error: 'API Key belum dipasang di Vercel.' }), { status: 500 });
  }

  try {
    const { messages } = await req.json();

    // Map messages to standard Gemini format
    const formattedMessages = messages.map(m => ({
      role: m.role === 'bot' ? 'model' : 'user',
      parts: [{ text: m.text }]
    }));

    // Use gemini-1.5-flash (most stable and widely available free model)
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: SYSTEM_PROMPT,
    });

    const result = await model.generateContent({ contents: formattedMessages });
    const responseText = result.response.text();

    return new Response(
      JSON.stringify({ response: responseText }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Gemini API Error:', error);
    return new Response(
      JSON.stringify({ error: 'Gagal memproses permintaan AI.', details: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
