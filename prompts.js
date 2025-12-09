import { getConversationHistory } from './utils.js';
import { kv } from '@vercel/kv';

export const DEFAULT_SYSTEM_PROMPT = `You are generating a response to a message in a conversation.
Your response should be short, emotionally impactful, not lengthy or detailed, under 1 sentence or 140 characters, and express only one idea.`;

export function createConsultationPrompt_EN(
  context,
  selectedMessage,
  question
) {
  const conversationHistory = getConversationHistory(context);

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

export async function createRomanticResponsePrompt_EN(
  context,
  message,
  spec = {
    filter: 'Main Character',
    spiciness: 50,
    boldness: 50,
    thirst: 50,
    energy: 50,
    toxicity: 50,
    humour: 50,
    emojiUse: 50,
  }
) {

  console.log('createRomanticResponsePrompt_EN', context, message, spec);
  const conversationHistory = getConversationHistory(context);

  const {
    filter,
    spiciness,
    boldness,
    thirst,
    energy,
    toxicity,
    humour,
    emojiUse,
  } = spec;

  // Define filters
  const filterMap = {
    Chad: 'Your persona is Chad: confident, blunt, high-status energy.',
    Rizz: 'Your persona is Rizz: smooth, wordplay, flirty finesse.',
    Simp: 'Your persona is Simp: sweet, wholesome, try-hard vibes.',
    'Main Character':
      'Your persona is Main Character: dramatic, cinematic, larger-than-life tone.',
  };

  const selectedFilter = filterMap[filter] || filterMap['Rizz'];

  // Fetch system prompt from KV, fallback to default
  let systemPrompt = DEFAULT_SYSTEM_PROMPT;
  try {
    const kvPrompt = await kv.get('SYSTEM_PROMPT');
    if (kvPrompt) {
      systemPrompt = kvPrompt;
    }
  } catch (error) {
    console.error('Failed to fetch SYSTEM_PROMPT from KV:', error);
  }

  const prompt = `${selectedFilter}
${systemPrompt}

Fine-tune the response based on the following sliders (0-100 scale):
- Spiciness (${spiciness}): 0 is mild teasing, 100 is heavy innuendo.
- Boldness (${boldness}): 0 is reserved, 100 is alpha assertive.
- Thirst (${thirst}): 0 is subtle interest, 100 is down bad.
- Energy (${energy}): 0 is chill, 100 is hype/excited.
- Toxicity (${toxicity}): 0 is a nice guy, 100 is a villain arc.
- Humour (${humour}): 0 is dry wit, 100 is full clown.
- Emoji Use (${emojiUse}): 0 is clean text, 100 is Gen Z emoji spam.

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

export function createGradeResponsePrompt_EN(context, responseToGrade) {
  const conversationHistory = getConversationHistory(context);

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
