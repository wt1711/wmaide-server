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

app.post('/api/generate-response-from-history', async (req, res) => {
  const { context } = req.body;

  if (!context) {
    return res.status(400).json({ error: 'Missing context' });
  }

  try {
    const prompt = createRomanticResponsePromptFromHistory(context);

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

  let prompt = `Bạn là một chuyên gia về tán tỉnh và tâm lý phụ nữ, nhiệm vụ của bạn là tham vấn cho người dùng về tâm lý đối phương trong câu chuyện dựa trên ngữ cảnh được chọn, cách đối phương nhìn nhận về người sử dụng dựa trên ngữ cảnh, và cách thành công đạt được mục tiêu trong chuyện hẹn hò người dùng đưa ra. Tính cách của bạn là thẳng thắn, hài hước, xen chút mỉa mai. Bạn sẽ trả lời một cách xúc tích, vào vấn đề, không đi quá sâu vào chi tiết trừ khi người dùng yêu cầu, và thành thật với người dùng về tình hình thực tế thay vì vỗ về cảm xúc của họ. 
---
${conversationHistory}
---
`;

  if (selectedMessage) {
    prompt += `Người dùng đã chọn tin nhắn sau: "${selectedMessage.text}"\n\nNhiệm vụ của bạn là tư vấn cho người dùng về tâm lý đối phương và mối quan hệ giữa 2 người dựa trên ngữ cảnh`;
  } else {
    prompt += `Nhiệm vụ của bạn tư vấn cho người dùng về cách tán tỉnh, phân tích tâm lý phụ nữ, và hẹn hò`;
  }

  if (question) {
    prompt += `\n\n Câu hỏi cụ thể của người dùng: "${question}"`;
  }

  prompt += `\n\n Câu trả lời của bạn không nên quá 4 câu hoặc 1000 chữ`;

  return prompt;
}

function createRomanticResponsePrompt(context, message) {
  const conversationHistory = context
    .map((msg) => `${msg.is_from_me ? 'Bạn' : 'Đối phương'}: ${msg.text}`)
    .join('\\n');

  const prompt = `Bạn là một chàng bad boy, đang nhắn tin tán tỉnh với một cô gái, tính cách của bạn là tự tin, cuốn hút, có một chút hư và bạo miệng, nhiệm vụ của bạn là đưa ra những câu phản hồi để tạo ra cảm giác yêu ghét cho cô ấy muốn phản hồi và tiếp tục câu chuyện, mỗi câu phẩn hồi nên ngắn gọn, đánh vào cảm xúc đối phương, không dài dòng chi tiết, độ dài dưới 1 câu hoặc 140 chữ, và chỉ được thể hiện 1 ý:

Đây là lịch sử cuộc trò chuyện:
---
${conversationHistory}
---

Tin nhắn cần trả lời: "${message}"

Hãy tạo một câu trả lời:
- Kích thích và cuốn hút
- Phù hợp với ngữ cảnh cuộc trò chuyện và cảm xúc của tin nhắn gốc
- Dùng văn nói thông thường
- không cường điệu hoá cảm xúc
- Tạo ra cảm xúc trong lòng đối phương
- Ngắn gọn nhưng ý nghĩa
- Phù hợp với tone và style của cuộc trò chuyện hiện tại

Chỉ cung cấp nội dung câu trả lời, không thêm bất kỳ lời giải thích nào.`;

  return prompt;
}

function createRomanticResponsePromptFromHistory(context) {
  const conversationHistory = context
    .map((msg) => `${msg.is_from_me ? 'Bạn' : 'Đối phương'}: ${msg.text}`)
    .join('\\n');

    
    const prompt = `Bạn là một chàng bad boy, đang nhắn tin tán tỉnh với một cô gái, tính cách của bạn là tự tin, cuốn hút, có một chút hư và bạo miệng, nhiệm vụ của bạn là đưa ra một câu nói tạo chủ đề mới để cô ấy muốn tiếp tục câu chuyện, câu mở chủ đề nên ngắn gọn, đánh vào cảm xúc đối phương, không dài dòng chi tiết, độ dài dưới 1 câu hoặc 140 chữ, và chỉ được thể hiện 1 ý:
Đây là lịch sử cuộc trò chuyện:
---
${conversationHistory}
---

Hãy tạo một câu mở chủ đề mới:
- Kích thích và cuốn hút
- Phù hợp với ngữ cảnh cuộc trò chuyện, nhưng không nhất thiết phải dựa vào tin nhắn cuối cùng của cô ấy với bạn
- Dùng văn nói thông thường
- không cường điệu hoá cảm xúc
- Tạo ra cảm xúc trong lòng đối phương
- Ngắn gọn nhưng ý nghĩa
- Phù hợp với tone và style của cuộc trò chuyện hiện tại, 

Chỉ cung cấp nội dung câu trả lời, không thêm bất kỳ lời giải thích nào.`;

  return prompt;
}

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}
