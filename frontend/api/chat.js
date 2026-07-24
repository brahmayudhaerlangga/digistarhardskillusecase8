import { GoogleGenerativeAI } from '@google/generative-ai';

const SYSTEM_PROMPT = `Anda adalah "AI Financial Assistant FPIS" (Financial Performance & Insight System) untuk eksekutif Telkom.
Tugas Anda:
1. Jawab pertanyaan seputar keuangan, metrik bisnis (EBITDA, Net Income, ROE, dll), dan tren makro.
2. Anda bisa memberikan saran efisiensi budget, marketing, atau operasional.
3. Selalu bersikap profesional, singkat, dan berwawasan data.
4. JANGAN menjawab pertanyaan yang tidak ada hubungannya sama sekali dengan keuangan, bisnis, teknologi, atau perusahaan (misal: resep masakan, humor, gosip selebriti). Jika ditanya demikian, tolak dengan sopan dan kembalikan topik ke analisis finansial.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API Key belum dipasang di Vercel.' });
  }

  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Format pesan tidak valid.' });
    }

    // Initialize the SDK inside the handler to ensure env vars are loaded
    const genAI = new GoogleGenerativeAI(apiKey);

    // Map messages to standard Gemini format
    let formattedMessages = messages.map(m => ({
      role: m.role === 'bot' ? 'model' : 'user',
      parts: [{ text: m.text }]
    }));

    // Gemini API STRICTLY requires the first message in the history to be from the 'user'
    if (formattedMessages.length > 0 && formattedMessages[0].role === 'model') {
      formattedMessages.shift(); // Remove the first message if it's from the model
    }

    // User requested gemini-1.5-flash-latest
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash-latest',
      systemInstruction: SYSTEM_PROMPT,
    });

    const result = await model.generateContent({ contents: formattedMessages });
    const responseText = result.response.text();

    return res.status(200).json({ response: responseText });

  } catch (error) {
    console.error('Gemini API Error:', error);
    return res.status(500).json({ 
      error: 'Gagal memproses permintaan AI.', 
      details: error.message 
    });
  }
}
