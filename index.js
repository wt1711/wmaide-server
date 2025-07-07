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
    const prompt = createComprehensivePrompt_VI(
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

export default app;

// This function will be called by the server. It's the same logic from your shared/prompts.js
function createComprehensivePrompt_VI(
  context,
  selectedMessage,
  question
) {
  const conversationHistory = context
    .map((msg) => `${msg.is_from_me ? 'You' : 'They'}: ${msg.text}`)
    .join('\\n');

  let prompt = `Bạn là một chuyên gia tâm lý và huấn luyện viên tình cảm, am hiểu về nghệ thuật giao tiếp, tâm lý nam nữ, và các kỹ năng hẹn hò hiện đại. Nhiệm vụ của bạn là đóng vai một cố vấn hẹn hò, giúp người dùng trả lời tin nhắn từ người họ đang thích, với mục tiêu làm tăng sự hấp dẫn, tự tin và thu hút của họ trong mắt đối phương. Đây là một cuộc trò chuyện:
---
${conversationHistory}
---
`;

  if (selectedMessage) {
    prompt += `Người dùng đã chọn tin nhắn sau: "${selectedMessage.text}"\n\nNhiệm vụ của bạn là tạo ra một câu trả lời cho tin nhắn đã chọn.`;
  } else {
    prompt += `Nhiệm vụ của bạn là tạo ra một câu trả lời phù hợp cho tin nhắn cuối cùng trong cuộc trò chuyện.`;
  }

  if (question) {
    prompt += `\n\n Yêu cầu cụ thể của người dùng: "${question}"`;
  }

  prompt += `\n\nChỉ cung cấp nội dung câu trả lời, không thêm bất kỳ lời giải thích nào.`;

  return prompt;
}
