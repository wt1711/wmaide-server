import { kv } from '@vercel/kv';
import { KV_KEYS } from '../config/index.js';

/**
 * Format elapsed time from timestamp to now in human-readable form
 * @param {string|null} timestamp - ISO 8601 date string (e.g., '2025-12-27T16:10:35.973Z')
 * @returns {string} Human-readable elapsed time (e.g., "5 minutes ago")
 */
function formatElapsedTime(timestamp) {
  if (!timestamp) return '';

  const msgTime = new Date(timestamp).getTime();
  if (isNaN(msgTime)) return '';

  const now = Date.now();
  const elapsed = now - msgTime;

  if (elapsed < 0) return 'just now';

  const seconds = Math.floor(elapsed / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  if (seconds > 0) return `${seconds} second${seconds > 1 ? 's' : ''} ago`;

  return 'just now';
}

/**
 * Check if two messages are from the same sender
 * @param {Object} msg1 - First message
 * @param {Object} msg2 - Second message
 * @returns {boolean} True if same sender
 */
function isSameSender(msg1, msg2) {
  return msg1.is_from_me === msg2.is_from_me;
}

/**
 * Group consecutive messages from the same sender into turns
 * @param {Array} messages - Array of message objects with is_from_me and text
 * @returns {Array} Array of turn objects { is_from_me, messages[] }
 */
function groupMessagesIntoTurns(messages) {
  const turns = [];
  let currentTurn = null;

  for (const msg of messages) {
    const lastMsg = currentTurn?.messages.at(-1);
    if (!currentTurn || !isSameSender(lastMsg, msg)) {
      currentTurn = { is_from_me: msg.is_from_me, messages: [msg] };
      turns.push(currentTurn);
    } else {
      currentTurn.messages.push(msg);
    }
  }

  return turns;
}

/**
 * Format a single message to display string
 * @param {Object} msg - Message object with is_from_me and text
 * @returns {string} Formatted message string
 */
function formatMessage(msg) {
  return `${msg.is_from_me ? 'You' : 'Her'}: ${msg.text}`;
}

/**
 * Format an array of turns into a conversation string
 * @param {Array} turns - Array of turn objects
 * @returns {string} Formatted conversation string
 */
function formatTurns(turns) {
  return turns.flatMap((turn) => turn.messages.map(formatMessage)).join('\n');
}

/**
 * Get formatted conversation history, limited to last N turns
 * @param {Array} context - Array of message objects
 * @param {number} maxTurns - Maximum number of turns to include
 * @returns {string} Formatted conversation history
 */
function getConversationHistory(context, maxTurns = 20) {
  if (!context || context.length === 0) {
    return '';
  }

  const turns = groupMessagesIntoTurns(context);
  const recentTurns = turns.slice(-maxTurns);
  return formatTurns(recentTurns);
}

export const DEFAULT_SYSTEM_PROMPT = `You are generating a response to a message in a conversation.
Your response should be short, emotionally impactful, not lengthy or detailed, under 1 sentence or 140 characters, and express only one idea.`;

export const DEFAULT_RESPONSE_CRITERIA = `Create a response that is:
- Stimulating and attractive
- Appropriate for the conversation context and the emotion of the original message
- Uses casual, spoken language
- Does not exaggerate emotions
- Creates an emotional response in the other person
- Short but meaningful`;

export function createConsultationPrompt_EN(context, selectedMessage, question) {
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
  },
  lastMsgTimeStamp = '',
) {
  const conversationHistory = getConversationHistory(context);

  // Fetch all config from KV in parallel
  let systemPrompt = DEFAULT_SYSTEM_PROMPT;
  let responseCriteria = DEFAULT_RESPONSE_CRITERIA;
  let logPromptEnabled = false;

  try {
    const [kvPrompt, kvCriteria, kvLogPrompt] = await Promise.all([
      kv.get(KV_KEYS.systemPrompt).catch((err) => {
        console.error('Failed to fetch SYSTEM_PROMPT from KV:', err);
        return null;
      }),
      kv.get(KV_KEYS.responseCriteria).catch((err) => {
        console.error('Failed to fetch RESPONSE_CRITERIA from KV:', err);
        return null;
      }),
      kv.get(KV_KEYS.logPrompt).catch((err) => {
        console.error('Failed to check LOG_PROMPT:', err);
        return false;
      }),
    ]);

    if (kvPrompt) systemPrompt = kvPrompt;
    if (kvCriteria) responseCriteria = kvCriteria;
    if (kvLogPrompt) logPromptEnabled = kvLogPrompt;
  } catch (error) {
    console.error('Failed to fetch config from KV, using defaults:', error);
  }

  // Build the prompt - add reasoning request if LOG_PROMPT is enabled
  let prompt;
  if (logPromptEnabled) {
    prompt = `
${systemPrompt}

This is the very last 10 turns of our conversation context.

Previously sent messages are labelled by sender either [You:] or [Her:]

[context]
---
${conversationHistory}
---

Message to reply to: "${message}"

[message_sent_time: ${formatElapsedTime(lastMsgTimeStamp) || 'unknown'}]

${responseCriteria}`;

    // Store the prompt for debugging
    await kv.set(KV_KEYS.currentFullPrompt, {
      prompt,
      timestamp: new Date().toISOString(),
      message,
    });
  } else {
    prompt = `
${systemPrompt}

This is the very last 10 turns of our conversation context.

Previously sent messages are labelled by sender either [You:] or [Her:]

[context]
---
${conversationHistory}
---

Message to reply to: "${message}"

${responseCriteria}

Provide only the content of the reply, without any additional explanation.`;
  }

  return { prompt, expectsReasoning: logPromptEnabled };
}

export async function createRomanticResponsePromptWithIdea_EN(
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
    idea: '',
  },
  lastMsgTimeStamp = '',
) {
  const conversationHistory = getConversationHistory(context);

  // Fetch all config from KV in parallel
  let systemPrompt = DEFAULT_SYSTEM_PROMPT;
  let responseCriteria = DEFAULT_RESPONSE_CRITERIA;
  let logPromptEnabled = false;

  try {
    const [kvPrompt, kvCriteria, kvLogPrompt] = await Promise.all([
      kv.get(KV_KEYS.systemPrompt).catch((err) => {
        console.error('Failed to fetch SYSTEM_PROMPT from KV:', err);
        return null;
      }),
      kv.get(KV_KEYS.responseCriteria).catch((err) => {
        console.error('Failed to fetch RESPONSE_CRITERIA from KV:', err);
        return null;
      }),
      kv.get(KV_KEYS.logPrompt).catch((err) => {
        console.error('Failed to check LOG_PROMPT:', err);
        return false;
      }),
    ]);

    if (kvPrompt) systemPrompt = kvPrompt;
    if (kvCriteria) responseCriteria = kvCriteria;
    if (kvLogPrompt) logPromptEnabled = kvLogPrompt;
  } catch (error) {
    console.error('Failed to fetch config from KV, using defaults:', error);
  }

  // Build the idea instruction if provided
  const ideaInstruction = spec?.idea
    ? `\n\nIMPORTANT: The user wants to express this idea in the response: "${spec.idea}". Incorporate this idea naturally into your reply while maintaining the conversation's tone and context.`
    : '';

  // Build the prompt - add reasoning request if LOG_PROMPT is enabled
  let prompt;
  if (logPromptEnabled) {
    prompt = `
${systemPrompt}

This is the very last 10 turns of our conversation context.

Previously sent messages are labelled by sender either [You:] or [Her:]

[context]
---
${conversationHistory}
---

Message to reply to: "${message}"

[message_sent_time: ${formatElapsedTime(lastMsgTimeStamp) || 'unknown'}]

${responseCriteria}${ideaInstruction}`;

    // Store the prompt for debugging
    await kv.set(KV_KEYS.currentFullPrompt, {
      prompt,
      timestamp: new Date().toISOString(),
      message,
      idea: spec.idea || null,
    });
  } else {
    prompt = `
${systemPrompt}

This is the very last 10 turns of our conversation context.

Previously sent messages are labelled by sender either [You:] or [Her:]

[context]
---
${conversationHistory}
---

Message to reply to: "${message}"

${responseCriteria}${ideaInstruction}

Provide only the content of the reply, without any additional explanation.`;
  }

  return { prompt, expectsReasoning: logPromptEnabled };
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
