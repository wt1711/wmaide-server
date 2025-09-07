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
    const prompt = createConsultationPrompt_EN(
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
    const prompt = createRomanticResponsePrompt_EN(context, message);

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
    const prompt = createRomanticResponsePromptFromHistory_EN(context);

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

app.post('/api/grade-response', async (req, res) => {
  const { context, response } = req.body;

  if (!context) {
    return res.status(400).json({ error: 'Missing context' });
  }

  if (!response) {
    return res.status(400).json({ error: 'Missing response to grade' });
  }

  try {
    const prompt = createGradeResponsePrompt_EN(context, response);

    const openAIResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
    });

    const gradeText = openAIResponse.choices[0].message.content || '0';
    const grade = parseInt(gradeText.trim(), 10);

    if (isNaN(grade)) {
      res.json({ grade: 0 });
    } else {
      res.json({ grade });
    }
  } catch (error) {
    console.error('Error grading response:', error);
    res.status(500).json({ error: 'Failed to grade response' });
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

function createConsultationPrompt_EN(
  context,
  selectedMessage,
  question
) {
  const conversationHistory = context
    .map((msg) => `${msg.is_from_me ? 'You' : 'Them'}: ${msg.text}`)
    .join('\\n');

  let prompt = `You are an expert in flirting and women's psychology. Your task is to advise the user on the other person's psychology in the story based on the selected context, how the other person perceives the user based on the context, and how to successfully achieve the dating goals set by the user. Your personality is frank, humorous, and slightly sarcastic. You will answer concisely, to the point, without going into too much detail unless requested, and be honest with the user about the actual situation instead of coddling their feelings.
---
${conversationHistory}
---
`;

  if (selectedMessage) {
    prompt += `The user has selected the following message: "${selectedMessage.text}"\n\nYour task is to advise the user on the other person's psychology and the relationship between the two based on the context.`;
  } else {
    prompt += `Your task is to advise the user on flirting, analyzing women's psychology, and dating.`;
  }

  if (question) {
    prompt += `\n\n The user's specific question: "${question}"`;
  }

  prompt += `\n\n Your answer should not exceed 4 sentences or 1000 characters.`;

  return prompt;
}

function createRomanticResponsePrompt_VI(context, message) {
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

function createRomanticResponsePrompt_EN(context, message) {
  const conversationHistory = context
    .map((msg) => `${msg.is_from_me ? 'You' : 'Them'}: ${msg.text}`)
    .join('\\n');

  const prompt = `You are a bad boy, flirting with a girl. Your personality is confident, charming, a bit naughty, and bold. Your task is to provide responses that create a love-hate feeling, making her want to reply and continue the conversation. Each response should be short, emotionally impactful, not lengthy or detailed, under 1 sentence or 140 characters, and express only one idea:

This is the conversation history:
---
${conversationHistory}
---

Message to reply to: "${message}"

Create a response that is:
- Stimulating and attractive
- Appropriate for the conversation context and the emotion of the original message
- Uses casual, spoken language
- Does not exaggerate emotions
- Creates an emotional response in the other person
- Short but meaningful
- Fits the tone and style of the current conversation

Provide only the content of the reply, without any additional explanation.`;

  return prompt;
}

function createRomanticResponsePromptFromHistory_VI(context) {
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

function createRomanticResponsePromptFromHistory_EN(context) {
  const conversationHistory = context
    .map((msg) => `${msg.is_from_me ? 'You' : 'Them'}: ${msg.text}`)
    .join('\\n');

  const prompt = `You are a bad boy, flirting with a girl. Your personality is confident, charming, a bit naughty, and bold. Your task is to come up with a new topic starter that makes her want to continue the conversation. The topic starter should be short, emotionally impactful, not lengthy or detailed, under 1 sentence or 140 characters, and express only one idea:
This is the conversation history:
---
${conversationHistory}
---

Create a new topic starter that is:
- Stimulating and attractive
- Appropriate for the conversation context, but not necessarily based on her last message to you
- Uses casual, spoken language
- Does not exaggerate emotions
- Creates an emotional response in the other person
- Short but meaningful
- Fits the tone and style of the current conversation

Provide only the content of the reply, without any additional explanation.`;

  return prompt;
}

function createGradeResponsePrompt_EN(context, responseToGrade) {
  const conversationHistory = context
    .map((msg) => `${msg.is_from_me ? 'You' : 'Them'}: ${msg.text}`)
    .join('\\n');

  const prompt = `You are an expert in flirting and women's psychology. Your task is to grade a response in a conversation based on its context.
The grade should be an integer between -100 and 100.
A high positive score (e.g., 90) means the response is excellent, charismatic, and moves the conversation forward in a positive way.
A high negative score (e.g., -90) means the response is terrible, cringe-worthy, or offensive and will likely end the conversation.
If you cannot understand the content of the response, you must return 0.
For any other case, you must return an integer between -100 and 100, but it cannot be 0.
Only return the integer grade and nothing else. Do not provide any explanation.

---
Conversation History:
${conversationHistory}
---

Response to grade: "${responseToGrade}"

Grade:`;

  return prompt;
}

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}
