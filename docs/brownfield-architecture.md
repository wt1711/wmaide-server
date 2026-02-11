# WMAide Server - Brownfield Architecture Document

## Introduction

This document captures the **CURRENT STATE** of the WMAide Server codebase as of February 2026, including technical debt, code duplication, architectural patterns, and known issues. It serves as the primary reference for an **incremental refactor** aimed at improving maintainability while keeping the Express/Node.js stack.

**Project Purpose**: An AI-powered dating/flirting response assistant that generates conversational responses using multiple LLM providers (OpenAI, Anthropic Claude, Google Gemini, xAI Grok). The system takes conversation context and generates contextually appropriate romantic/flirty responses, with features for intent analysis, response grading, and dating consultation.

### Document Scope

Comprehensive documentation of the entire system, with emphasis on:
- Code duplication patterns that need extraction
- Route handler structure and repetitive patterns
- LLM provider abstraction layer
- Prompt engineering and template system
- Vercel KV configuration management
- Credit/user management system
- Admin interface architecture

### Change Log

| Date       | Version | Description                                    | Author  |
| ---------- | ------- | ---------------------------------------------- | ------- |
| 2024-12-27 | 1.0     | Initial brownfield analysis                    | Analyst |
| 2026-02-11 | 2.0     | Full rewrite-focused analysis, all new modules | Analyst |

---

## Quick Reference - Key Files and Entry Points

### Critical Files for Understanding the System

| Category             | File                                  | Purpose                                       | Lines |
| -------------------- | ------------------------------------- | --------------------------------------------- | ----- |
| **Main Entry**       | `index.js`                            | Express server setup, route mounting           | 69    |
| **Configuration**    | `src/config/index.js`                 | API keys, KV keys, defaults, user lists        | 97    |
| **Models Config**    | `src/config/models.js`                | Available LLM providers and models list        | 72    |
| **Core Service**     | `src/services/llmService.js`          | Main LLM response generation entry point       | 44    |
| **Provider Factory** | `src/services/llm/providerFactory.js` | Provider selection, error handling wrapper      | 178   |
| **Prompt Builder**   | `src/prompts/index.js`                | ALL prompt construction logic (monolithic)      | 555   |
| **Config Cache**     | `src/services/configCache.js`         | In-memory cache for KV config (5-min TTL)      | 65    |
| **Config Routes**    | `src/routes/config.js`                | 40+ CRUD endpoints for KV config (repetitive)  | 426   |
| **Generate Routes**  | `src/routes/generate.js`              | Core generation + credits (largest route file)  | 487   |

### All API Endpoints

#### Core User-Facing Endpoints

| Endpoint                              | Method | Route File                 | Purpose                              |
| ------------------------------------- | ------ | -------------------------- | ------------------------------------ |
| `/api/generate-response`              | POST   | `generate.js`              | Generate flirty response (blocking)  |
| `/api/generate-response-with-idea`    | POST   | `generate.js`              | Generate response incorporating idea |
| `/api/generate-response-stream`       | POST   | `generate.js`              | Generate response with SSE streaming |
| `/api/credits-remaining`              | GET    | `generate.js`              | Check user credit balance            |
| `/api/grade-response`                 | POST   | `grade.js`                 | Grade a response quality (-100..100) |
| `/api/suggestion`                     | POST   | `suggestion.js`            | Get dating advice/consultation       |
| `/api/analyze-intent`                 | POST   | `analyzeIntent.js`         | Analyze message intent & interest    |
| `/api/generate-from-direction`        | POST   | `generateFromDirection.js` | Generate response from direction     |
| `/api/grade-own-message`              | POST   | `gradeOwnMessage.js`       | Grade user's own message             |

#### Admin Configuration Endpoints

| Endpoint                                     | Method   | Route File        | Purpose                              |
| -------------------------------------------- | -------- | ----------------- | ------------------------------------ |
| `/api/system-prompt`                         | GET/POST | `config.js`       | Read/write system prompt             |
| `/api/llm-model`                             | GET/POST | `config.js`       | Read/write LLM model selection       |
| `/api/llm-provider`                          | GET/POST | `config.js`       | Read/write LLM provider selection    |
| `/api/response-criteria`                     | GET/POST | `config.js`       | Read/write response criteria         |
| `/api/analyze-intent-prompt`                 | GET/POST | `config.js`       | Read/write analyze intent prompt     |
| `/api/analyze-intent-message-format`         | GET/POST | `config.js`       | Read/write analyze intent format     |
| `/api/generate-from-direction-prompt`        | GET/POST | `config.js`       | Read/write direction prompt          |
| `/api/generate-from-direction-message-format`| GET/POST | `config.js`       | Read/write direction format          |
| `/api/grade-own-message-prompt`              | GET/POST | `config.js`       | Read/write grade own prompt          |
| `/api/grade-own-message-message-format`      | GET/POST | `config.js`       | Read/write grade own format          |
| `/api/suggestion-prompt`                     | GET/POST | `config.js`       | Read/write suggestion prompt         |
| `/api/suggestion-message-format`             | GET/POST | `config.js`       | Read/write suggestion format         |
| `/api/generate-response-format`              | GET/POST | `config.js`       | Read/write generate response format  |
| `/api/latest-analyze-intent-prompt`          | GET      | `config.js`       | View last analyze intent prompt      |
| `/api/latest-generate-from-direction-prompt` | GET      | `config.js`       | View last direction prompt           |
| `/api/latest-grade-own-message-prompt`       | GET      | `config.js`       | View last grade own prompt           |
| `/api/latest-suggestion-prompt`              | GET      | `config.js`       | View last suggestion prompt          |
| `/api/models`                                | GET      | `config.js`       | List available providers/models      |
| `/api/preview-prompt`                        | POST     | `previewPrompt.js`| Raw prompt testing                   |
| `/api/log-prompt`                            | GET/POST | `promptPreview.js`| Toggle debug logging                 |
| `/api/full-prompt-preview`                   | GET      | `promptPreview.js`| View last stored full prompt         |
| `/api/current-analysis`                      | GET      | `promptPreview.js`| View last reasoning output           |
| `/api/versions/save`                         | POST     | `versions.js`     | Save config version snapshot         |
| `/api/versions/history`                      | GET      | `versions.js`     | List saved versions                  |
| `/api/versions/:id`                          | DELETE   | `versions.js`     | Delete a saved version               |

---

## High Level Architecture

### Technical Summary

WMAide Server is a Node.js Express API that serves as a backend for generating AI-powered conversational responses. It features:

1. **Multi-provider LLM abstraction** - Supports OpenAI, Anthropic Claude, Google Gemini, and xAI Grok
2. **Dynamic configuration via Vercel KV** - Runtime-configurable prompts, models, and providers
3. **Template-based prompt system** - Prompts loaded from KV with `{{placeholder}}` substitution
4. **Credit system** - Free (5 credits), premium (200 credits), and admin (unlimited) tiers
5. **Admin interface** - Multiple standalone HTML pages for configuration management
6. **Version control** - Snapshot versioning of prompt configurations

### Actual Tech Stack (from package.json)

| Category        | Technology           | Version  | Notes                                    |
| --------------- | -------------------- | -------- | ---------------------------------------- |
| Runtime         | Node.js              | ES Modules | Uses `"type": "module"` in package.json |
| Framework       | Express              | 5.1.0    | Latest Express 5.x                       |
| LLM - OpenAI    | openai               | 5.8.2    | Official OpenAI SDK                      |
| LLM - Anthropic | @anthropic-ai/sdk    | 0.39.0   | Official Anthropic SDK                   |
| LLM - Gemini    | openai               | 5.8.2    | Uses OpenAI SDK with custom baseURL      |
| LLM - Grok      | openai               | 5.8.2    | Uses OpenAI SDK with custom baseURL      |
| Key-Value Store | @vercel/kv           | 3.0.0    | Upstash Redis via Vercel                 |
| Environment     | dotenv               | 17.0.1   | Environment variable loading             |
| CORS            | cors                 | 2.8.5    | Cross-origin request handling            |
| Dev Tools       | nodemon              | 3.1.10   | Development auto-reload                  |

### Deployment

| Aspect     | Configuration                          |
| ---------- | -------------------------------------- |
| Platform   | Vercel                                 |
| Build      | `@vercel/node` serverless function     |
| Config     | `vercel.json` - all routes to index.js |
| KV Store   | Upstash Redis via Vercel KV            |

---

## Source Tree and Module Organization

### Project Structure (Actual)

```text
wmaide-server/
├── index.js                         # Express app entry point, route mounting (69 lines)
├── package.json                     # Dependencies (ES modules enabled)
├── vercel.json                      # Vercel deployment config
├── .env.example                     # Required environment variables template
├── public/
│   ├── admin.html                   # Main admin config interface (monolithic)
│   ├── admin-analyze-intent.html    # Analyze intent admin page
│   ├── admin-generate-direction.html# Generate from direction admin page
│   ├── admin-generate-response.html # Generate response admin page
│   ├── admin-grade-own.html         # Grade own message admin page
│   ├── admin-suggestion.html        # Suggestion admin page
│   └── test-idea.html               # Test idea page
├── src/
│   ├── config/
│   │   ├── index.js                 # API keys, defaults, KV keys, user lists (97 lines)
│   │   └── models.js                # Provider/model definitions with pricing (72 lines)
│   ├── prompts/
│   │   └── index.js                 # ALL prompt construction (555 lines - MONOLITHIC)
│   ├── routes/
│   │   ├── generate.js              # /generate-response endpoints + credits (487 lines)
│   │   ├── grade.js                 # /grade-response (35 lines - clean)
│   │   ├── suggestion.js            # /suggestion (41 lines)
│   │   ├── config.js                # 40+ CRUD endpoints for KV config (426 lines - REPETITIVE)
│   │   ├── versions.js              # Version snapshot management (51 lines - clean)
│   │   ├── analyzeIntent.js         # /analyze-intent + DUPLICATED credits (153 lines)
│   │   ├── generateFromDirection.js # /generate-from-direction + DUPLICATED credits (161 lines)
│   │   ├── gradeOwnMessage.js       # /grade-own-message + DUPLICATED credits (153 lines)
│   │   ├── previewPrompt.js         # /preview-prompt (32 lines)
│   │   └── promptPreview.js         # /log-prompt, /full-prompt-preview, /current-analysis (88 lines)
│   └── services/
│       ├── llmService.js            # Main generateResponse() entry point (44 lines)
│       ├── configCache.js           # In-memory config cache (65 lines)
│       ├── versionService.js        # Version snapshot CRUD (99 lines)
│       └── llm/
│           ├── baseProvider.js      # Abstract base class for providers (143 lines)
│           ├── providerFactory.js   # Provider selection + error handling (178 lines)
│           ├── openaiProvider.js    # OpenAI implementation (90 lines)
│           ├── claudeProvider.js    # Anthropic Claude implementation (104 lines)
│           ├── grokProvider.js      # xAI Grok via OpenAI SDK (90 lines)
│           └── geminiProvider.js    # Google Gemini via OpenAI SDK (92 lines)
├── docs/
│   ├── brownfield-architecture.md   # This document
│   └── admin-migration-plan.md      # Planned Alpine.js admin migration
└── .bmad-core/                      # BMAD methodology (ignore)
```

---

## CRITICAL: Code Duplication Analysis

This is the **#1 maintainability problem** in the codebase. The same code is copy-pasted across multiple files.

### 1. Credit System Functions - Duplicated 4x

The following **7 functions** are **identically copy-pasted** in these files:
- `src/routes/generate.js` (lines 12-74)
- `src/routes/analyzeIntent.js` (lines 8-52)
- `src/routes/generateFromDirection.js` (lines 7-51)
- `src/routes/gradeOwnMessage.js` (lines 8-52)

```javascript
// These 7 functions are duplicated verbatim:
function isAdmin(userId) { ... }
function isPremium(userId) { ... }
async function getAllUserCredits() { ... }
async function getUserCredits(userId) { ... }
async function incrementUserCredits(userId) { ... }
function getCreditLimit(userId) { ... }
async function checkCredits(userId) { ... }
```

**Refactor target**: Extract to `src/services/creditService.js` or better yet, create Express middleware.

### 2. JSON Response Parser - Duplicated 3x

The `parseJsonResponse()` function is copy-pasted in:
- `src/routes/analyzeIntent.js` (lines 54-68)
- `src/routes/generateFromDirection.js` (lines 53-67)
- `src/routes/gradeOwnMessage.js` (lines 54-68)

A slightly different version `parseReasoningResponse()` exists in `src/routes/generate.js` (lines 110-131).

**Refactor target**: Extract to `src/utils/jsonParser.js`.

### 3. Credit Check + Increment Pattern - Duplicated 4x

Every credit-consuming route has this identical pattern:

```javascript
// Pre-check
if (userId) {
  const creditCheck = await checkCredits(userId);
  if (!creditCheck.allowed) {
    return res.json({ ... limitReachedMessage ... });
  }
}
// ... do work ...
// Post-increment
if (userId) {
  if (!isAdmin(userId)) {
    await incrementUserCredits(userId);
  }
  const updatedCredits = await checkCredits(userId);
  creditsRemaining = updatedCredits.remaining;
}
```

**Refactor target**: Express middleware that wraps credit-consuming routes.

### 4. Config CRUD Endpoints - Repetitive Pattern in config.js

`src/routes/config.js` (426 lines) contains 20+ nearly identical GET/POST pairs. Each follows this pattern:

```javascript
router.get('/some-config', async (req, res) => {
  try {
    const value = await kv.get(KV_KEYS.someConfig);
    res.json({ prompt: value || DEFAULT_VALUE });
  } catch (error) {
    console.error('Failed to fetch from KV:', error);
    res.json({ prompt: DEFAULT_VALUE });
  }
});
router.post('/some-config', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (prompt === undefined) return res.status(400).json({ error: 'Missing prompt' });
    await kv.set(KV_KEYS.someConfig, prompt);
    configCache.invalidate();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save' });
  }
});
```

**Refactor target**: Generic config CRUD factory function or dynamic route generator.

### 5. Prompt Defaults Duplication

In `src/prompts/index.js`, each feature has BOTH a `DEFAULT_*_PROMPT` and a `DEFAULT_*_MESSAGE_FORMAT` that contain largely the same text. The "prompt" constant is the system instruction, and the "message format" includes the same text PLUS template placeholders. For example, `DEFAULT_ANALYZE_INTENT_PROMPT` (lines 332-338) is literally a subset of `DEFAULT_ANALYZE_INTENT_MESSAGE_FORMAT` (lines 340-386).

### 6. Provider Implementations (OpenAI-Compatible) - Near-Identical 3x

`openaiProvider.js`, `grokProvider.js`, and `geminiProvider.js` are nearly identical (~90 lines each). They all use the OpenAI SDK with only the constructor differing (API key and optional baseURL). The `generate()` and `generateStream()` methods are verbatim copies.

**Refactor target**: Create an `OpenAICompatibleProvider` base class that accepts config in constructor.

---

## Key Modules Detail

### LLM Provider Layer (`src/services/llm/`)

The provider abstraction follows the **Strategy Pattern** with a Factory:

| File                  | Purpose                                                    |
| --------------------- | ---------------------------------------------------------- |
| `baseProvider.js`     | Abstract base class (well-designed, 143 lines)             |
| `providerFactory.js`  | Factory + error handling wrappers (178 lines)              |
| `openaiProvider.js`   | OpenAI GPT models (90 lines)                               |
| `claudeProvider.js`   | Anthropic Claude - different SDK (104 lines)               |
| `grokProvider.js`     | xAI Grok - uses OpenAI SDK with custom baseURL (90 lines) |
| `geminiProvider.js`   | Google Gemini - uses OpenAI SDK with custom baseURL (92 lines) |

**Provider Interface** (from `baseProvider.js`):
- `generate(config, prompt)` - Blocking response
- `generateStream(config, prompt, onChunk)` - Streaming response
- `createResponse(text, usage, durationMs)` - Standardized response builder
- `createErrorResponse(errorMessage, status, durationMs)` - Error builder

**Provider Aliases** (in `providerFactory.js`):
- `anthropic` and `claude` both map to `claudeProvider`
- `xai` and `grok` both map to `grokProvider`

**Key Observation**: `grokProvider.js`, `geminiProvider.js`, and `openaiProvider.js` share 95%+ identical code. Only `claudeProvider.js` is truly different (uses Anthropic SDK with different message/streaming API).

### Prompt Engineering (`src/prompts/index.js`)

This is a **555-line monolithic file** that handles all prompt construction. Key structure:

| Section | Lines | Functions |
| ------- | ----- | --------- |
| Utility functions (formatting) | 1-97 | `formatElapsedTime`, `groupMessagesIntoTurns`, `formatTurns`, `getConversationHistory` |
| Default constants | 99-144 | `DEFAULT_SYSTEM_PROMPT`, `DEFAULT_RESPONSE_CRITERIA`, `DEFAULT_SUGGESTION_*`, `DEFAULT_GENERATE_RESPONSE_FORMAT` |
| Consultation prompt builder | 146-181 | `createConsultationPrompt_EN` |
| Generate response prompt builder | 183-239 | `createRomanticResponsePrompt_EN` |
| Generate with idea prompt builder | 241-304 | `createRomanticResponsePromptWithIdea_EN` (95% duplicate of above) |
| Grade response prompt builder | 306-328 | `createGradeResponsePrompt_EN` |
| Analyze intent defaults + builder | 330-409 | `DEFAULT_ANALYZE_INTENT_*`, `createAnalyzeIntentPrompt` |
| Generate from direction defaults + builder | 411-478 | `DEFAULT_GENERATE_FROM_DIRECTION_*`, `createGenerateFromDirectionPrompt` |
| Grade own message defaults + builder | 480-554 | `DEFAULT_GRADE_OWN_MESSAGE_*`, `createGradeOwnMessagePrompt` |

**Template Pattern**: All prompt builders follow this pattern:
1. Format conversation history from context
2. Fetch message format template from KV (fall back to default)
3. Replace `{{placeholder}}` tokens in template
4. Return the assembled prompt string

**Duplication Note**: `createRomanticResponsePrompt_EN` and `createRomanticResponsePromptWithIdea_EN` are 95% identical. The only difference is the `{{idea}}` placeholder replacement and `spec.idea` handling.

### Configuration System

#### Config Constants (`src/config/index.js`)

Contains:
- `API_KEYS` - LLM provider API keys from env vars
- `ASSISTANT_ID` - OpenAI assistant ID (appears unused)
- `KV_CONFIG` - Vercel KV connection details
- `DEFAULTS` - Default model/provider/port
- `KV_KEYS` - 25+ KV key name constants
- `ADMIN_USERS` - Hardcoded admin user list (Instagram Matrix IDs)
- `PREMIUM_USERS` - Hardcoded premium user list (Instagram Matrix IDs)
- `CREDIT_LIMITS` - Free (5) and premium (200) credit limits
- `PROVIDER_URLS` - Custom API base URLs for Grok and Gemini

**Security Concern**: Admin/premium user lists are hardcoded in source code. Changing tiers requires a code deploy.

#### Config Cache (`src/services/configCache.js`)

- In-memory `Map` with 5-minute TTL
- Caches: model, provider, systemPrompt, responseCriteria, logPrompt
- Prevents concurrent refresh (uses promise deduplication)
- Manual invalidation when config changes via API
- **Note**: Only used by the streaming endpoint; the non-streaming path fetches directly from KV via `llmService.js`

#### Config Routes (`src/routes/config.js`)

426 lines of repetitive GET/POST CRUD endpoints. Each config value has a near-identical pair. The file handles:
- System prompt, response criteria
- LLM model, provider selection
- Analyze intent prompt + message format
- Generate from direction prompt + message format
- Grade own message prompt + message format
- Suggestion prompt + message format
- Generate response format
- "Latest" prompt viewing for each feature
- Available models listing

### Credit System

Currently scattered across 4 route files as duplicated functions. The logic:

| Tier    | Credits | Determined By                                |
| ------- | ------- | -------------------------------------------- |
| Admin   | Unlimited | Hardcoded list in `src/config/index.js`    |
| Premium | 200     | Hardcoded list in `src/config/index.js`      |
| Free    | 5       | Everyone else                                |

**Storage**: All user credits stored as a single JSON object in KV key `USER_CREDITS`:
```json
{ "userId1": 3, "userId2": 5, ... }
```

**Race Condition**: `incrementUserCredits` does a read-modify-write on the entire credits object. Concurrent requests could lose credit increments.

**No Reset Mechanism**: There's no endpoint to reset credits (the admin migration plan proposes one, but it's not implemented).

---

## Data Models and APIs

### Vercel KV Data Structure

All configuration is stored in Vercel KV (Upstash Redis):

| KV Key                                  | Type    | Purpose                                    |
| --------------------------------------- | ------- | ------------------------------------------ |
| `SYSTEM_PROMPT`                         | string  | The system instruction for the LLM         |
| `RESPONSE_CRITERIA`                     | string  | Criteria for good responses                |
| `LLM_MODEL_NAME`                        | string  | Currently selected model                   |
| `LLM_PROVIDER`                          | string  | Currently selected provider                |
| `LOG_PROMPT`                            | boolean | Enable reasoning/debug mode                |
| `CURRENT_FULL_PROMPT`                   | object  | Last generated prompt (debug)              |
| `CURRENT_ANALYSIS`                      | object  | Last reasoning output (debug)              |
| `USER_CREDITS`                          | object  | All user credit counts (single JSON blob)  |
| `ANALYZE_INTENT_PROMPT`                 | string  | Analyze intent system prompt               |
| `ANALYZE_INTENT_MESSAGE_FORMAT`         | string  | Analyze intent template with placeholders  |
| `GENERATE_FROM_DIRECTION_PROMPT`        | string  | Direction-based generation system prompt    |
| `GENERATE_FROM_DIRECTION_MESSAGE_FORMAT`| string  | Direction template with placeholders       |
| `GRADE_OWN_MESSAGE_PROMPT`              | string  | Grade own message system prompt            |
| `GRADE_OWN_MESSAGE_MESSAGE_FORMAT`      | string  | Grade own message template                 |
| `SUGGESTION_PROMPT`                     | string  | Suggestion/consultation system prompt      |
| `SUGGESTION_MESSAGE_FORMAT`             | string  | Suggestion template with placeholders      |
| `GENERATE_RESPONSE_FORMAT`              | string  | Main generate response template            |
| `LATEST_ANALYZE_INTENT_PROMPT`          | object  | Last assembled analyze intent prompt       |
| `LATEST_GENERATE_FROM_DIRECTION_PROMPT` | object  | Last assembled direction prompt            |
| `LATEST_GRADE_OWN_MESSAGE_PROMPT`       | object  | Last assembled grade own prompt            |
| `LATEST_SUGGESTION_PROMPT`              | object  | Last assembled suggestion prompt           |
| `PROMPT_VERSIONS`                       | array   | Saved configuration version snapshots      |

### Core Request/Response Formats

#### POST /api/generate-response

**Request**:
```json
{
  "context": [
    { "is_from_me": true, "text": "Hey, how are you?" },
    { "is_from_me": false, "text": "I'm good! Just got back from the gym" }
  ],
  "message": "The message to reply to",
  "spec": { "filter": "Main Character", "spiciness": 50, "boldness": 50 },
  "lastMsgTimeStamp": "2025-12-27T16:10:35.973Z",
  "userId": "@instagram_xxx:matrix.lvbrd.xyz"
}
```

**Response**:
```json
{
  "response": "Generated flirty response here",
  "usage": { "promptTokens": 150, "completionTokens": 20, "totalTokens": 170 },
  "provider": "openai",
  "creditsRemaining": 4,
  "timing": {
    "totalDuration": 1234,
    "totalDurationSeconds": "1.23",
    "providerDuration": 1100
  }
}
```

#### POST /api/analyze-intent

**Request**:
```json
{
  "message": { "text": "hey what are you up to?", "sender": "Her", "timestamp": "..." },
  "context": [ ... ],
  "userId": "..."
}
```

**Response** (JSON from LLM):
```json
{
  "analysis": {
    "interestLevel": { "score": 75, "label": "High", "indicators": ["..."] },
    "emotionalTone": { "primary": "curious", "secondary": null, "confidence": 80 },
    "stateRead": "She's showing genuine interest...",
    "recommendedDirection": { "label": "...", "tone": "playful", "emoji": "...", "description": "..." },
    "alternativeDirections": [ ... ],
    "analysisTimestamp": "...",
    "messageId": "uuid"
  },
  "creditsRemaining": 3
}
```

#### POST /api/generate-response-stream (SSE)

Same request format as `/api/generate-response`, returns Server-Sent Events:
```
data: {"type": "chunk", "content": "Hey"}
data: {"type": "chunk", "content": " there"}
data: {"type": "done", "usage": {...}, "timing": {...}, "creditsRemaining": 3}
```

#### POST /api/generate-from-direction

**Request**:
```json
{
  "direction": { "label": "Playful tease", "tone": "playful", "emoji": "😏", "description": "..." },
  "messageText": "The message to reply to",
  "context": [ ... ],
  "userId": "..."
}
```

**Response**:
```json
{
  "result": { "message": "...", "reasoning": "...", "emotion": "..." },
  "creditsRemaining": 3
}
```

#### POST /api/grade-own-message & POST /api/grade-response

Grade own message returns structured JSON analysis (same format as analyze-intent).
Grade response returns a simple integer: `{ "grade": 75 }`.

---

## Technical Debt and Known Issues

### Critical Technical Debt (Prioritized for Refactor)

#### 1. Massive Code Duplication (HIGHEST PRIORITY)
- **What**: Credit system (7 functions) duplicated across 4 route files
- **Impact**: ~200 lines of identical code. Any bug fix or feature change must be applied 4 times
- **Where**: `generate.js`, `analyzeIntent.js`, `generateFromDirection.js`, `gradeOwnMessage.js`
- **Fix**: Extract to `src/services/creditService.js` + create credit middleware

#### 2. Monolithic Prompts File (HIGH)
- **What**: `src/prompts/index.js` is 555 lines containing all defaults and builders
- **Impact**: Hard to find/modify specific feature prompts; `createRomanticResponsePrompt_EN` and `createRomanticResponsePromptWithIdea_EN` are 95% identical
- **Fix**: Split into per-feature prompt files; merge the two romantic prompt builders into one with optional idea param

#### 3. Repetitive Config CRUD Routes (HIGH)
- **What**: `src/routes/config.js` has 20+ near-identical GET/POST endpoint pairs (426 lines)
- **Impact**: Adding a new configurable prompt requires adding ~30 lines of boilerplate
- **Fix**: Create a generic config CRUD factory: `createConfigEndpoints(router, path, kvKey, defaultValue, fieldName)`

#### 4. Near-Identical Provider Implementations (MEDIUM)
- **What**: `openaiProvider.js`, `grokProvider.js`, `geminiProvider.js` are 95%+ identical
- **Impact**: Bug fixes or SDK changes must be applied 3 times
- **Fix**: Create `OpenAICompatibleProvider` class; instantiate with different config

#### 5. Hardcoded User Lists (MEDIUM)
- **What**: Admin and premium users hardcoded in `src/config/index.js`
- **Impact**: Adding/removing users requires code deploy
- **Fix**: Move to KV or database

#### 6. No Authentication (MEDIUM)
- **What**: All endpoints are public, no auth middleware
- **Impact**: Anyone can change system prompts, view debug data, modify config
- **Where**: Entire API

#### 7. No Tests (HIGH for refactor)
- **What**: Zero test coverage - unit, integration, or e2e
- **Impact**: Makes refactoring risky; no way to verify changes don't break things
- **Fix**: Add at minimum: provider tests (mocked), credit service tests, prompt builder tests

#### 8. Credit System Race Condition (LOW)
- **What**: Read-modify-write on single KV JSON object for all user credits
- **Impact**: Concurrent requests could lose credit increments
- **Fix**: Use Redis INCR or per-user KV keys

### Workarounds and Gotchas

| Area | Gotcha | Notes |
| ---- | ------ | ----- |
| Grok/Gemini | Use OpenAI SDK | Set custom `baseURL` (xAI: `api.x.ai/v1`, Gemini: `generativelanguage.googleapis.com/v1beta/openai/`) |
| Provider Aliases | `anthropic`/`claude` both work | Same for `xai`/`grok` |
| Config Cache | Only used by streaming | Non-streaming path reads KV directly via `llmService.js` |
| Config Cache | 5-minute TTL | Config changes may take up to 5 min to reflect for streaming |
| ES Modules | `"type": "module"` | Must use `import`/`export`, no `require()` |
| Entry Point | Conditional server start | `index.js` exports app but only starts server when run directly |
| `spec` object | Mostly unused | Fields like `spiciness`, `boldness`, `thirst`, `energy`, `toxicity`, `humour`, `emojiUse` are defined but never used in prompt construction |
| `ASSISTANT_ID` | Appears unused | Referenced in .env.example but no code uses it |
| `parseBanterResponse` | Commented out | In `generate.js` (lines 204, 311) - called but commented out |
| Admin HTML files | Multiple standalone files | 7 separate HTML files, each likely monolithic with inline JS/CSS |
| `previewPrompt.js` vs `promptPreview.js` | Confusing names | Different purposes but names are nearly identical |

---

## Integration Points and External Dependencies

### External Services

| Service      | Purpose           | Integration Type | Key Files                              |
| ------------ | ----------------- | ---------------- | -------------------------------------- |
| OpenAI API   | GPT models        | Official SDK     | `src/services/llm/openaiProvider.js`   |
| Anthropic API| Claude models     | Official SDK     | `src/services/llm/claudeProvider.js`   |
| xAI API      | Grok models       | OpenAI SDK       | `src/services/llm/grokProvider.js`     |
| Google AI    | Gemini models     | OpenAI SDK       | `src/services/llm/geminiProvider.js`   |
| Vercel KV    | Config + Credits  | Official SDK     | Throughout `src/`                       |

### Environment Variables Required

```
OPENAI_API_KEY=sk-proj-...
ANTHROPIC_API_KEY=sk-ant-...
XAI_API_KEY=xai-...
GOOGLE_API_KEY=...
ASSISTANT_ID=asst_...           # Appears unused
KV_REST_API_URL=https://...upstash.io
KV_REST_API_TOKEN=...
```

### Client Integration

The server is consumed by a Matrix/Instagram bridge bot. User IDs follow the pattern `@instagram_XXXXXXX:matrix.lvbrd.xyz`. The client sends conversation context as arrays of `{ is_from_me, text }` message objects.

---

## Admin Interface

### Current State

7 standalone HTML files in `public/`, each monolithic with inline CSS/JS:

| File | Purpose | Accessible Via |
| ---- | ------- | -------------- |
| `admin.html` | Main config: model/provider, prompts, versions | `/admin.html` |
| `admin-analyze-intent.html` | Analyze intent prompt config + testing | `/admin-analyze-intent.html` |
| `admin-generate-direction.html` | Direction generation prompt config | `/admin-generate-direction.html` |
| `admin-generate-response.html` | Response generation prompt config | `/admin-generate-response.html` |
| `admin-grade-own.html` | Grade own message prompt config | `/admin-grade-own.html` |
| `admin-suggestion.html` | Suggestion prompt config | `/admin-suggestion.html` |
| `test-idea.html` | Test idea generation | `/test-idea.html` |

**Note**: A migration plan to Alpine.js modular architecture exists at `docs/admin-migration-plan.md` but has not been implemented.

---

## Development and Deployment

### Local Development Setup

1. Clone repository
2. Copy `.env.example` to `.env` and fill in API keys
3. `yarn install` (or `npm install`)
4. `npm start` (or use `nodemon` for auto-reload)
5. Server runs on `http://localhost:3000`
6. Admin UI at `http://localhost:3000/admin.html`

### Build and Deployment Process

| Step | Command/Action |
| ---- | -------------- |
| Build | No build step (native ES modules) |
| Deploy | Push to Vercel-connected branch |
| Config | All via Vercel KV (no env file changes needed for prompts) |

### Useful Commands

```bash
npm start           # Start production server
npm run test        # NOT IMPLEMENTED - exits with error
```

---

## Testing Reality

| Type | Status |
| ---- | ------ |
| Unit Tests | None |
| Integration Tests | None |
| E2E Tests | None |
| Manual Testing | Primary QA method via admin HTML pages |

---

## Architecture Patterns Summary

### Patterns Used
1. **Strategy Pattern** - LLM providers are interchangeable strategies
2. **Factory Pattern** - `providerFactory.js` creates appropriate provider
3. **Singleton Pattern** - Each provider exported as single instance
4. **Template Method Pattern** - `BaseProvider` defines structure, subclasses implement
5. **Template String Pattern** - Prompts use `{{placeholder}}` substitution

### Code Style Observations
- Consistent ES module usage
- JSDoc comments for public functions in services/providers
- Emoji-based console logging
- Error responses follow structure: `{ error: string, status: number }`
- Async/await used consistently (no callbacks)
- Inconsistent quoting: some files use single quotes, others double quotes
- No linting configuration (no .eslintrc)

---

## Refactoring Recommendations (Prioritized)

### Phase 1: Extract Shared Code (Highest Impact, Lowest Risk)

1. **Create `src/services/creditService.js`** - Extract all 7 credit functions from route files
2. **Create `src/middleware/creditMiddleware.js`** - Wrap credit check + increment as middleware
3. **Create `src/utils/jsonParser.js`** - Extract `parseJsonResponse` / `parseReasoningResponse`
4. **Delete duplicated code** from all 4 route files

### Phase 2: Consolidate Providers

1. **Create `src/services/llm/openaiCompatibleProvider.js`** - Shared base for OpenAI, Grok, Gemini
2. **Reduce 3 files to config-only instantiation** - Each provider becomes ~10 lines

### Phase 3: Simplify Config Routes

1. **Create route factory** - `createConfigCrudRoutes(router, routePath, kvKey, defaultValue)`
2. **Reduce `config.js`** from 426 lines to ~50

### Phase 4: Split Prompts

1. **Split `src/prompts/index.js`** into per-feature files
2. **Merge `createRomanticResponsePrompt_EN` and `WithIdea`** - Single function with optional idea param
3. **Eliminate prompt/message_format duplication** - Generate one from the other

### Phase 5: Add Type Safety and Tests

1. **Add JSDoc types or TypeScript** for interfaces (StandardResponse, ErrorResponse, etc.)
2. **Add unit tests** for: credit service, JSON parser, prompt builders, provider factory
3. **Add integration tests** for core endpoints (mock LLM providers)

---

## Appendix - Adding a New LLM Feature

Currently, adding a new LLM-powered feature (e.g., "tone analyzer") requires touching **6+ files**:

1. `src/config/index.js` - Add 3+ new KV_KEYS
2. `src/prompts/index.js` - Add DEFAULT_*_PROMPT, DEFAULT_*_MESSAGE_FORMAT, createPrompt function
3. `src/routes/newFeature.js` - Create route with DUPLICATED credit functions + parseJsonResponse
4. `src/routes/config.js` - Add 4+ new GET/POST endpoints for prompt/format config
5. `index.js` - Import and mount the new router
6. `public/admin-newfeature.html` - Create admin HTML page

After the refactor, this should reduce to:
1. `src/prompts/newFeature.js` - Prompt template + builder
2. `src/routes/newFeature.js` - Route handler (uses shared credit middleware + JSON parser)
3. `index.js` - Mount router
4. Config routes auto-generated from KV key definitions
