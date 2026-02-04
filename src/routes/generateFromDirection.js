import { Router } from 'express';
import { kv } from '@vercel/kv';
import { createGenerateFromDirectionPrompt } from '../prompts/index.js';
import { generateResponse } from '../services/llmService.js';
import { KV_KEYS, ADMIN_USERS, PREMIUM_USERS, CREDIT_LIMITS } from '../config/index.js';

function isAdmin(userId) {
  return ADMIN_USERS.includes(userId);
}

function isPremium(userId) {
  return PREMIUM_USERS.includes(userId);
}

async function getAllUserCredits() {
  const credits = await kv.get(KV_KEYS.userCredits);
  return credits || {};
}

async function getUserCredits(userId) {
  const allCredits = await getAllUserCredits();
  return allCredits[userId] || 0;
}

async function incrementUserCredits(userId) {
  const allCredits = await getAllUserCredits();
  const current = allCredits[userId] || 0;
  allCredits[userId] = current + 1;
  await kv.set(KV_KEYS.userCredits, allCredits);
  return current + 1;
}

function getCreditLimit(userId) {
  if (isAdmin(userId)) return Infinity;
  if (isPremium(userId)) return CREDIT_LIMITS.premiumCredits;
  return CREDIT_LIMITS.freeCredits;
}

async function checkCredits(userId) {
  if (isAdmin(userId)) {
    return { allowed: true, remaining: Infinity };
  }
  const used = await getUserCredits(userId);
  const limit = getCreditLimit(userId);
  const remaining = limit - used;
  return {
    allowed: remaining > 0,
    remaining: Math.max(0, remaining),
    used,
  };
}

function parseJsonResponse(text) {
  try {
    return JSON.parse(text);
  } catch {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

const router = Router();

router.post('/generate-from-direction', async (req, res) => {
  const requestStartTime = Date.now();
  console.log('Starting /api/generate-from-direction request at:', new Date().toISOString());

  const { direction, messageText, context, userId } = req.body;

  if (!direction) {
    return res.status(400).json({ error: 'Missing direction' });
  }

  if (!direction.label || !direction.tone) {
    return res.status(400).json({ error: 'Direction must have label and tone' });
  }

  if (!messageText) {
    return res.status(400).json({ error: 'Missing messageText' });
  }

  if (!context) {
    return res.status(400).json({ error: 'Missing context' });
  }

  if (userId) {
    const creditCheck = await checkCredits(userId);
    if (!creditCheck.allowed) {
      return res.json({
        error: 'Credit limit reached',
        result: null,
        creditsRemaining: 0,
      });
    }
  }

  try {
    const prompt = await createGenerateFromDirectionPrompt(context, messageText, direction);

    // Store the prompt for admin viewing
    await kv.set(KV_KEYS.latestGenerateFromDirectionPrompt, {
      prompt,
      timestamp: new Date().toISOString(),
      messageText,
      direction,
    });

    const result = await generateResponse(prompt);

    const requestEndTime = Date.now();
    const totalDuration = requestEndTime - requestStartTime;
    console.log(`Generate from direction completed: ${totalDuration}ms`);

    if (result.error) {
      return res.status(result.status || 500).json({
        error: result.error,
        provider: result.provider,
      });
    }

    const parsed = parseJsonResponse(result.text);

    if (!parsed) {
      return res.status(500).json({
        error: 'Failed to parse LLM response as JSON',
        rawResponse: result.text,
      });
    }

    let creditsRemaining = null;
    if (userId) {
      if (!isAdmin(userId)) {
        await incrementUserCredits(userId);
      }
      const updatedCredits = await checkCredits(userId);
      creditsRemaining = updatedCredits.remaining;
    }

    res.json({
      result: {
        message: parsed.message || '',
        reasoning: parsed.reasoning || '',
        emotion: parsed.emotion || '',
      },
      ...(creditsRemaining !== null && { creditsRemaining }),
    });
  } catch (error) {
    console.error('Failed to generate from direction:', error);
    res.status(500).json({ error: 'Error from LLM provider' });
  }
});

export default router;
