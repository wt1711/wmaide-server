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
  const { context, message, tone } = req.body;

  if (!context) {
    return res.status(400).json({ error: 'Missing context' });
  }

  if (!message) {
    return res.status(400).json({ error: 'Missing message' });
  }

  try {
    const prompt = createRomanticResponsePrompt_EN(context, message, tone);

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

function createRomanticResponsePrompt_EN(context, message, tone = "Gentleman") {
  const conversationHistory = context
    .map((msg) => `${msg.is_from_me ? "You" : "Them"}: ${msg.text}`)
    .join("\n");

  // Define persona styles
  const personaMap = {
    "Nice Guy": {
      description: `You are a nice guy, sweet and caring. Your personality is warm, supportive, and considerate. 
Your task is to provide responses that make her feel safe, appreciated, and valued.`,
    },
    "Gentleman": {
      description: `You are a gentleman, confident but respectful. Your personality is charming, witty, and subtly romantic. 
Your task is to provide responses that are smooth, respectful, and make her feel admired.`,
    },
    "Bad Boy": {
      description: `You are a bad boy, flirting with a girl. Your personality is confident, bold, and a bit naughty. 
Your task is to provide responses that create a love-hate feeling, making her want to reply and continue the conversation.`,
    },
  };

  // Fallback if invalid tone is passed
  const persona = personaMap[tone] || personaMap["Gentleman"];

  const prompt = `${persona.description} Each response should be short, emotionally impactful, not lengthy or detailed, under 1 sentence or 140 characters, and express only one idea:

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

Provide only the content of the reply, without any additional explanation.`;

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
Tend to give more positive score, to encourage user, but still gives negative score if the content is offsenive

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
