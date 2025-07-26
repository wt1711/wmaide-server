import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

const app = express();
const port = 3000;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use(cors());
app.use(express.json());

app.post('/api/suggestion', async (req, res) => {
  const { context, selectedMessage, question } = req.body;

  if (!context) {
    return res.status(400).json({ error: 'Missing context' });
  }

  try {
    const prompt = createConsultationPrompt_VI(
      context,
      selectedMessage,
      question
    );

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
    });

    const suggestion = response.choices[0].message.content || 'Không có gợi ý nào.';
    res.json({ suggestion });
  } catch (error) {
    console.error('Error getting suggestion:', error);
    res.status(500).json({ error: 'Failed to get suggestion' });
  }
});

app.post('/api/generate-response', async (req, res) => {
  const { context, message } = req.body;

  if (!context) {
    return res.status(400).json({ error: 'Missing context' });
  }

  if (!message) {
    return res.status(400).json({ error: 'Missing message' });
  }

  try {
    const prompt = createRomanticResponsePrompt(context, message);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
    });

    const romanticResponse = response.choices[0].message.content || 'Không thể tạo phản hồi.';
    res.json({ response: romanticResponse });
  } catch (error) {
    console.error('Error generating romantic response:', error);
    res.status(500).json({ error: 'Failed to generate romantic response' });
  }
});

export default app;

// This function will be called by the server. It's the same logic from your shared/prompts.js
function createConsultationPrompt_VI(
  context,
  selectedMessage,
  question
) {
  const conversationHistory = context
    .map((msg) => `${msg.is_from_me ? 'Bạn' : 'Đối Phương'}: ${msg.text}`)
    .join('\\n');

  let prompt = `Bạn là một chuyên gia tâm lý và huấn luyện viên tình cảm, am hiểu về nghệ thuật giao tiếp, tâm lý nam nữ, và các kỹ năng hẹn hò hiện đại. Nhiệm vụ của bạn là đóng vai một cố vấn hẹn hò, giúp người dùng trả lời tin nhắn từ người họ đang thích, với mục tiêu làm tăng sự hấp dẫn, tự tin và thu hút của họ trong mắt đối phương. Đây là một cuộc trò chuyện:
---
${conversationHistory}
---
`;

  if (selectedMessage) {
    prompt += `Người dùng đã chọn tin nhắn sau: "${selectedMessage.text}"\n\nNhiệm vụ của bạn là tư vấn cho người dùng về cách giao tiếp và hẹn hò`;
  } else {
    prompt += `Nhiệm vụ của bạn tư vấn cho người dùng về cách giao tiếp và hẹn hò`;
  }

  if (question) {
    prompt += `\n\n Câu hỏi cụ thể của người dùng: "${question}"`;
  }

  prompt += `\n\n Câu trả lời của bạn không nên quá 5 câu hoặc 100 từ`;

  return prompt;
}

function createRomanticResponsePrompt(context, message) {
  const conversationHistory = context
    .map((msg) => `${msg.is_from_me ? 'Bạn' : 'Đối phương'}: ${msg.text}`)
    .join('\\n');

  const prompt = `Bạn là một chuyên gia về tình cảm và giao tiếp lãng mạn. Nhiệm vụ của bạn là tạo ra một câu trả lời lãng mạn, chân thành và hấp dẫn cho tin nhắn sau đây.

Đây là lịch sử cuộc trò chuyện:
---
${conversationHistory}
---

Tin nhắn cần trả lời: "${message}"

Hãy tạo một câu trả lời:
- Lãng mạn và chân thành
- Phù hợp với ngữ cảnh cuộc trò chuyện và cảm xúc của tin nhắn gốc
- Tự nhiên và không quá cường điệu
- Có thể tạo ra sự kết nối cảm xúc
- Ngắn gọn nhưng ý nghĩa
- Phù hợp với tone và style của cuộc trò chuyện hiện tại

Chỉ cung cấp nội dung câu trả lời, không thêm bất kỳ lời giải thích nào.`;

  return prompt;
}
