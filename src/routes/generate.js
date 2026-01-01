import { Router } from 'express';
import { kv } from '@vercel/kv';
import { createRomanticResponsePrompt_EN } from '../prompts/index.js';
import { generateResponse } from '../services/llmService.js';
import { generateStreamWithErrorHandling } from '../services/llm/providerFactory.js';
import configCache from '../services/configCache.js';
import { KV_KEYS, ADMIN_USERS, CREDIT_LIMITS } from '../config/index.js';

/**
 * Check if user is an admin (bypasses credit limits)
 */
function isAdmin(userId) {
  return ADMIN_USERS.includes(userId);
}

/**
 * Get user's current credit usage
 */
async function getUserCredits(userId) {
  const used = await kv.get(KV_KEYS.userCredits(userId));
  return used || 0;
}

/**
 * Increment user's credit usage
 */
async function incrementUserCredits(userId) {
  const key = KV_KEYS.userCredits(userId);
  const current = await kv.get(key) || 0;
  await kv.set(key, current + 1);
  return current + 1;
}

/**
 * Check if user has credits remaining
 */
async function checkCredits(userId) {
  if (isAdmin(userId)) {
    return { allowed: true, remaining: Infinity };
  }
  const used = await getUserCredits(userId);
  const remaining = CREDIT_LIMITS.freeCredits - used;
  return {
    allowed: remaining > 0,
    remaining: Math.max(0, remaining),
    used,
  };
}

const router = Router();

/**
 * Parse JSON response from LLM, handling potential formatting issues
 */
function parseReasoningResponse(text) {
  try {
    // Try direct JSON parse first
    return JSON.parse(text);
  } catch {
    // Try to extract JSON from the text (in case there's extra text around it)
    // Match any JSON object containing both "response" and "reasoning" keys
    const jsonMatch = text.match(/\{[\s\S]*?"response"[\s\S]*?\}|\{[\s\S]*?"reasoning"[\s\S]*?\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        // Verify it has both keys
        if (parsed.response !== undefined) {
          return parsed;
        }
      } catch {
        return null;
      }
    }
    return null;
  }
}

router.post('/generate-response', async (req, res) => {
  const requestStartTime = Date.now();
  console.log('📝 Starting /api/generate-response request at:', new Date().toISOString());

  const { context, message, spec, lastMsgTimeStamp, userId } = req.body;

  if (!context) {
    return res.status(400).json({ error: 'Missing context' });
  }

  if (!message) {
    return res.status(400).json({ error: 'Missing message' });
  }

  // Check credit limit for non-admin users (only if userId is provided)
  if (userId) {
    const creditCheck = await checkCredits(userId);
    if (!creditCheck.allowed) {
      return res.status(403).json({
        error: CREDIT_LIMITS.limitReachedMessage,
        creditsRemaining: 0,
      });
    }
  }

  try {
    const { prompt, expectsReasoning } = await createRomanticResponsePrompt_EN(context, message, spec, lastMsgTimeStamp);
    const result = await generateResponse(prompt);

    const requestEndTime = Date.now();
    const totalDuration = requestEndTime - requestStartTime;
    console.log(`🎯 Total request time: ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}s)`);

    // Handle error response from provider
    if (result.error) {
      return res.status(result.status || 500).json({
        error: result.error,
        provider: result.provider,
        timing: {
          totalDuration,
          totalDurationSeconds: (totalDuration / 1000).toFixed(2),
        },
      });
    }

    let responseText = result.text || 'Cannot get response from LLM';

    // If reasoning was requested, parse the JSON response
    if (expectsReasoning && result.text) {
      const parsed = parseReasoningResponse(result.text);

      if (parsed && parsed.response) {
        responseText = parsed.response;

        // Store the reasoning in KV
        try {
          await kv.set(KV_KEYS.currentAnalysis, {
            analysis: parsed.reasoning || 'No reasoning provided',
            timestamp: new Date().toISOString(),
          });
        } catch (err) {
          console.error('Failed to store reasoning:', err);
        }
      } else {
        // JSON parsing failed, use raw text and log warning
        console.warn('Failed to parse reasoning JSON, using raw response');
        responseText = result.text;
      }
    }

    // Increment credit usage for non-admin users (only if userId is provided)
    let creditsRemaining = null;
    if (userId) {
      if (!isAdmin(userId)) {
        await incrementUserCredits(userId);
      }
      const updatedCredits = await checkCredits(userId);
      creditsRemaining = updatedCredits.remaining;
    }

    res.json({
      response: responseText,
      usage: result.usage,
      provider: result.provider,
      ...(creditsRemaining !== null && { creditsRemaining }),
      timing: {
        totalDuration,
        totalDurationSeconds: (totalDuration / 1000).toFixed(2),
        providerDuration: result.durationMs,
      },
    });
  } catch (error) {
    console.error('Failed to generate response:', error);
    res.status(500).json({ error: 'Error from LLM provider' });
  }
});

/**
 * SSE streaming endpoint for faster time-to-first-byte
 */
router.post('/generate-response-stream', async (req, res) => {
  const requestStartTime = Date.now();
  console.log('📝 Starting streaming /api/generate-response-stream at:', new Date().toISOString());

  const { context, message, spec, userId } = req.body;

  if (!context) {
    return res.status(400).json({ error: 'Missing context' });
  }

  if (!message) {
    return res.status(400).json({ error: 'Missing message' });
  }

  // Check credit limit for non-admin users (only if userId is provided)
  if (userId) {
    const creditCheck = await checkCredits(userId);
    if (!creditCheck.allowed) {
      return res.status(403).json({
        error: CREDIT_LIMITS.limitReachedMessage,
        creditsRemaining: 0,
      });
    }
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  res.flushHeaders();

  try {
    // Get config from cache (fast path)
    const cachedConfig = await configCache.getAll();

    // Create the prompt
    const { prompt, expectsReasoning } = await createRomanticResponsePrompt_EN(context, message, spec);

    let fullText = '';

    // Stream the response
    const result = await generateStreamWithErrorHandling(
      cachedConfig.provider,
      { model: cachedConfig.model },
      prompt,
      (chunk) => {
        fullText += chunk;
        // If reasoning mode, buffer internally (don't stream partial JSON)
        if (!expectsReasoning) {
          res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
        }
      }
    );

    const totalDuration = Date.now() - requestStartTime;

    // Handle error response
    if (result.error) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: result.error })}\n\n`);
      res.end();
      return;
    }

    // Handle reasoning mode - parse and send final response
    if (expectsReasoning) {
      const parsed = parseReasoningResponse(fullText);
      if (parsed && parsed.response) {
        res.write(`data: ${JSON.stringify({ type: 'complete', content: parsed.response })}\n\n`);
        // Store reasoning async (don't block)
        kv.set(KV_KEYS.currentAnalysis, {
          analysis: parsed.reasoning || 'No reasoning provided',
          timestamp: new Date().toISOString(),
        }).catch((err) => console.error('Failed to store reasoning:', err));
      } else {
        res.write(`data: ${JSON.stringify({ type: 'complete', content: fullText })}\n\n`);
      }
    }

    // Increment credit usage for non-admin users (only if userId is provided)
    let creditsRemaining = null;
    if (userId) {
      if (!isAdmin(userId)) {
        await incrementUserCredits(userId);
      }
      const updatedCredits = await checkCredits(userId);
      creditsRemaining = updatedCredits.remaining;
    }

    // Send completion event with metadata
    res.write(
      `data: ${JSON.stringify({
        type: 'done',
        usage: result.usage,
        provider: result.provider,
        ...(creditsRemaining !== null && { creditsRemaining }),
        timing: {
          totalDuration,
          totalDurationSeconds: (totalDuration / 1000).toFixed(2),
          providerDuration: result.durationMs,
        },
      })}\n\n`
    );

    console.log(`🎯 Streaming request completed: ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}s)`);
    res.end();
  } catch (error) {
    console.error('Streaming error:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
    res.end();
  }
});

/**
 * Get remaining credits for a user
 */
router.get('/credits-remaining', async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId query parameter' });
  }

  try {
    const creditInfo = await checkCredits(userId);

    res.json({
      userId,
      isAdmin: isAdmin(userId),
      creditsRemaining: creditInfo.remaining,
      creditsUsed: creditInfo.used || 0,
      totalCredits: isAdmin(userId) ? 'unlimited' : CREDIT_LIMITS.freeCredits,
    });
  } catch (error) {
    console.error('Failed to get credits:', error);
    res.status(500).json({ error: 'Failed to retrieve credit information' });
  }
});

export default router;
