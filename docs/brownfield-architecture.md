# WMAide Server - Brownfield Architecture Document

## Introduction

This document captures the **CURRENT STATE** of the WMAide Server codebase, including technical patterns, architecture decisions, and known technical debt. It serves as a reference for developers and AI agents working on enhancements.

**Project Purpose**: An AI-powered dating/flirting response assistant that generates conversational responses using multiple LLM providers (OpenAI, Anthropic Claude, xAI Grok). The system takes conversation context and generates contextually appropriate romantic/flirty responses.

### Document Scope

Comprehensive documentation of the entire system, with emphasis on:
- LLM provider abstraction layer
- Prompt engineering patterns
- Vercel KV admin configuration system

### Change Log

| Date       | Version | Description                 | Author  |
| ---------- | ------- | --------------------------- | ------- |
| 2024-12-27 | 1.0     | Initial brownfield analysis | Analyst |

---

## Quick Reference - Key Files and Entry Points

### Critical Files for Understanding the System

| Category            | File                                  | Purpose                                      |
| ------------------- | ------------------------------------- | -------------------------------------------- |
| **Main Entry**      | `index.js`                            | Express server setup, route mounting         |
| **Configuration**   | `src/config/index.js`                 | API keys, KV keys, defaults                  |
| **Models Config**   | `src/config/models.js`                | Available LLM providers and models list      |
| **Core Service**    | `src/services/llmService.js`          | Main LLM response generation entry point     |
| **Provider Factory**| `src/services/llm/providerFactory.js` | Provider selection, error handling wrapper   |
| **Prompt Builder**  | `src/prompts/index.js`                | All prompt construction logic                |
| **Config Cache**    | `src/services/configCache.js`         | In-memory cache for KV config (5-min TTL)    |

### Primary API Endpoints

| Endpoint                        | Method | Purpose                                |
| ------------------------------- | ------ | -------------------------------------- |
| `/api/generate-response`        | POST   | Generate flirty response (blocking)    |
| `/api/generate-response-stream` | POST   | Generate response with SSE streaming   |
| `/api/grade-response`           | POST   | Grade a response quality (-100 to 100) |
| `/api/suggestion`               | POST   | Get dating advice/consultation         |
| `/api/system-prompt`            | GET/POST | Read/write system prompt config      |
| `/api/llm-model`                | GET/POST | Read/write LLM model selection       |
| `/api/llm-provider`             | GET/POST | Read/write LLM provider selection    |

---

## High Level Architecture

### Technical Summary

WMAide Server is a Node.js Express API that serves as a backend for generating AI-powered conversational responses. It features:

1. **Multi-provider LLM abstraction** - Supports OpenAI, Anthropic Claude, and xAI Grok
2. **Dynamic configuration via Vercel KV** - Runtime-configurable prompts, models, and providers
3. **Admin interface** - HTML-based admin panel for configuration management
4. **Version control** - Snapshot versioning of prompt configurations

### Actual Tech Stack (from package.json)

| Category        | Technology           | Version  | Notes                                    |
| --------------- | -------------------- | -------- | ---------------------------------------- |
| Runtime         | Node.js              | ES Modules | Uses `"type": "module"` in package.json |
| Framework       | Express              | 5.1.0    | Latest Express 5.x                       |
| LLM - OpenAI    | openai               | 5.8.2    | Official OpenAI SDK                      |
| LLM - Anthropic | @anthropic-ai/sdk    | 0.39.0   | Official Anthropic SDK                   |
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
├── index.js                    # Express app entry point, route mounting
├── package.json                # Dependencies (ES modules enabled)
├── vercel.json                 # Vercel deployment config
├── .env.example                # Required environment variables template
├── public/
│   └── admin.html              # Admin configuration interface (26KB)
├── src/
│   ├── config/
│   │   ├── index.js            # API keys, defaults, KV key constants
│   │   └── models.js           # Provider/model definitions with pricing
│   ├── prompts/
│   │   └── index.js            # All prompt construction functions
│   ├── routes/
│   │   ├── generate.js         # /generate-response, /generate-response-stream
│   │   ├── grade.js            # /grade-response
│   │   ├── suggestion.js       # /suggestion (dating advice)
│   │   ├── config.js           # System prompt, model, provider CRUD
│   │   ├── versions.js         # Version snapshot management
│   │   ├── previewPrompt.js    # /preview-prompt (raw prompt testing)
│   │   └── promptPreview.js    # /log-prompt, /full-prompt-preview, /current-analysis
│   └── services/
│       ├── llmService.js       # Main generateResponse() entry point
│       ├── configCache.js      # In-memory config cache (5-min TTL)
│       ├── versionService.js   # Version snapshot CRUD operations
│       └── llm/
│           ├── baseProvider.js     # Abstract base class for providers
│           ├── providerFactory.js  # Provider selection, error handling
│           ├── openaiProvider.js   # OpenAI implementation
│           ├── claudeProvider.js   # Anthropic Claude implementation
│           └── grokProvider.js     # xAI Grok implementation
├── .bmad-core/                 # BMAD methodology configuration (ignore)
└── .claude/                    # Claude Code configuration (ignore)
```

### Key Modules and Their Purpose

#### LLM Provider Layer (`src/services/llm/`)

The provider abstraction follows the **Strategy Pattern**:

| File                  | Purpose                                                    |
| --------------------- | ---------------------------------------------------------- |
| `baseProvider.js`     | Abstract base class defining the interface                 |
| `providerFactory.js`  | Factory for provider selection + error handling wrappers   |
| `openaiProvider.js`   | OpenAI GPT models implementation                           |
| `claudeProvider.js`   | Anthropic Claude implementation                            |
| `grokProvider.js`     | xAI Grok (uses OpenAI SDK with custom baseURL)             |

**Key Pattern**: All providers must implement:
- `generate(config, prompt)` - Blocking response
- `generateStream(config, prompt, onChunk)` - Streaming response

**Standardized Response Object**:
```javascript
{
  text: string,           // Generated response
  usage: {
    promptTokens: number,
    completionTokens: number,
    totalTokens: number
  },
  provider: string,       // Provider name
  durationMs: number      // Request duration
}
```

#### Prompt Engineering (`src/prompts/index.js`)

| Function                          | Purpose                                          |
| --------------------------------- | ------------------------------------------------ |
| `createRomanticResponsePrompt_EN` | Main prompt for generating flirty responses      |
| `createGradeResponsePrompt_EN`    | Prompt for grading response quality              |
| `createConsultationPrompt_EN`     | Prompt for dating advice/consultation            |

**Conversation Formatting**:
- Messages are grouped into "turns" (consecutive messages from same sender)
- Limited to last 20 turns for context
- Formatted as `You: message` or `Her: message`

**Dynamic Prompt Loading**:
- System prompt and response criteria loaded from Vercel KV
- Falls back to `DEFAULT_SYSTEM_PROMPT` and `DEFAULT_RESPONSE_CRITERIA`
- Optional reasoning mode (`logPromptEnabled`) that returns JSON with reasoning

#### Configuration Cache (`src/services/configCache.js`)

- **In-memory cache** with 5-minute TTL
- Reduces KV reads for high-traffic scenarios
- Automatically refreshes on expiry
- Manual invalidation via `configCache.invalidate()` when config changes

---

## Data Models and APIs

### Vercel KV Data Structure

All configuration is stored in Vercel KV (Upstash Redis):

| KV Key               | Type    | Purpose                                    |
| -------------------- | ------- | ------------------------------------------ |
| `SYSTEM_PROMPT`      | string  | The system instruction for the LLM         |
| `RESPONSE_CRITERIA`  | string  | Criteria for what makes a good response    |
| `LLM_MODEL_NAME`     | string  | Currently selected model (e.g., "gpt-4o")  |
| `LLM_PROVIDER`       | string  | Currently selected provider (e.g., "openai") |
| `LOG_PROMPT`         | boolean | Enable reasoning/debug mode                |
| `CURRENT_FULL_PROMPT`| object  | Last generated prompt (for debugging)      |
| `CURRENT_ANALYSIS`   | object  | Last reasoning output (for debugging)      |
| `VERSION_LIST`       | array   | Saved configuration version snapshots      |

### API Request/Response Formats

#### POST /api/generate-response

**Request**:
```json
{
  "context": [
    { "is_from_me": true, "text": "Hey, how are you?" },
    { "is_from_me": false, "text": "I'm good! Just got back from the gym" }
  ],
  "message": "The message to reply to",
  "spec": {
    "filter": "Main Character",
    "spiciness": 50,
    "boldness": 50
  }
}
```

**Response**:
```json
{
  "response": "Generated flirty response here",
  "usage": { "promptTokens": 150, "completionTokens": 20, "totalTokens": 170 },
  "provider": "openai",
  "timing": {
    "totalDuration": 1234,
    "totalDurationSeconds": "1.23",
    "providerDuration": 1100
  }
}
```

#### POST /api/generate-response-stream (SSE)

Same request format, but returns Server-Sent Events:
```
data: {"type": "chunk", "content": "Hey"}
data: {"type": "chunk", "content": " there"}
data: {"type": "done", "usage": {...}, "timing": {...}}
```

---

## Technical Debt and Known Issues

### Critical Technical Debt

1. **Debug Streaming to Admin Page** (User-identified)
   - **Issue**: All LLM interactions stream debug info (full prompts, reasoning) to the admin page via KV storage
   - **Location**: `src/routes/generate.js` lines 82-88 and 174-177
   - **Impact**: This is acceptable for admin but problematic for regular users
   - **Suggested Fix**: Create separate admin vs user flows, or add authentication check before storing debug data

2. **Duplicate Route Files**
   - **Issue**: `previewPrompt.js` and `promptPreview.js` - confusing naming
   - **Location**: `src/routes/`
   - **Impact**: Maintenance confusion
   - **Note**: They serve different purposes but names are too similar

3. **No Authentication**
   - **Issue**: All endpoints are public, no auth middleware
   - **Location**: Entire API
   - **Impact**: Anyone can change system prompts, access debug data
   - **Note**: Critical if opening to users

4. **Hardcoded max_tokens**
   - **Issue**: Claude provider has `max_tokens: 1024` hardcoded
   - **Location**: `src/services/llm/claudeProvider.js` lines 23 and 58
   - **Impact**: Cannot be configured per-request

### Workarounds and Gotchas

| Area | Gotcha | Notes |
| ---- | ------ | ----- |
| Grok Provider | Uses OpenAI SDK | Set custom `baseURL` to `https://api.x.ai/v1` |
| Provider Aliases | `anthropic` and `claude` both work | Same for `xai` and `grok` |
| Config Cache | 5-minute TTL | Config changes may take up to 5 min to reflect |
| ES Modules | `"type": "module"` | Must use `import`/`export`, no `require()` |
| Entry Point | Conditional server start | `index.js` exports app but only starts server when run directly |

---

## Integration Points and External Dependencies

### External Services

| Service      | Purpose           | Integration Type | Key Files                          |
| ------------ | ----------------- | ---------------- | ---------------------------------- |
| OpenAI API   | GPT models        | Official SDK     | `src/services/llm/openaiProvider.js` |
| Anthropic API| Claude models     | Official SDK     | `src/services/llm/claudeProvider.js` |
| xAI API      | Grok models       | OpenAI SDK       | `src/services/llm/grokProvider.js`   |
| Vercel KV    | Configuration DB  | Official SDK     | Throughout `src/`                    |

### Environment Variables Required

See `.env.example`:
```
OPENAI_API_KEY=sk-proj-...
ANTHROPIC_API_KEY=sk-ant-...
XAI_API_KEY=xai-...
ASSISTANT_ID=asst_...  # OpenAI Assistant (currently unused?)
KV_REST_API_URL=https://...upstash.io
KV_REST_API_TOKEN=...
```

---

## Development and Deployment

### Local Development Setup

1. Clone repository
2. Copy `.env.example` to `.env` and fill in API keys
3. Install dependencies: `npm install` or `yarn`
4. Start dev server: `npm start` (or use `nodemon` for auto-reload)
5. Server runs on `http://localhost:3000`
6. Admin UI at `http://localhost:3000/admin.html`

### Build and Deployment Process

| Step | Command/Action |
| ---- | -------------- |
| Build | No build step (native ES modules) |
| Deploy | Push to Vercel-connected branch |
| Config | All via Vercel KV (no env file changes needed) |

### Useful Commands

```bash
npm start           # Start production server
npm run test        # (Not implemented - exits with error)
```

---

## Testing Reality

### Current Test Coverage

| Type | Status |
| ---- | ------ |
| Unit Tests | None |
| Integration Tests | None |
| E2E Tests | None |
| Manual Testing | Primary QA method via admin.html |

### Testing Notes

- The `npm test` script just echoes an error - no tests implemented
- Admin UI (`/admin.html`) serves as manual testing interface
- Debug mode (`LOG_PROMPT=true`) stores prompts and reasoning for inspection

---

## Architecture Patterns Summary

### Patterns Used

1. **Strategy Pattern** - LLM providers are interchangeable strategies
2. **Factory Pattern** - `providerFactory.js` creates appropriate provider
3. **Singleton Pattern** - Each provider exported as single instance
4. **Template Method Pattern** - `BaseProvider` defines structure, subclasses implement

### Code Style Observations

- Consistent ES module usage
- JSDoc comments for public functions
- Emoji-based console logging (e.g., `console.log('Starting...')`)
- Error responses follow consistent structure: `{ error: string, status: number }`
- Async/await used consistently (no callbacks)

---

## Appendix - Adding a New LLM Provider

To add a new provider (e.g., Google Gemini):

1. **Create provider class** in `src/services/llm/geminiProvider.js`:
   ```javascript
   import BaseProvider from './baseProvider.js';

   class GeminiProvider extends BaseProvider {
     constructor() { super('gemini'); }
     initClient() { /* return SDK client */ }
     async generate(config, prompt) { /* implement */ }
     async generateStream(config, prompt, onChunk) { /* implement */ }
   }
   export default new GeminiProvider();
   ```

2. **Register in factory** (`src/services/llm/providerFactory.js`):
   ```javascript
   import geminiProvider from './geminiProvider.js';
   const providers = {
     // ...existing
     gemini: geminiProvider,
   };
   ```

3. **Add to models list** (`src/config/models.js`):
   ```javascript
   { id: 'gemini', name: 'Google Gemini', models: [...] }
   ```

4. **Add API key** to `src/config/index.js` and `.env`

---

## Future Considerations

Based on user-identified needs:

1. **User vs Admin Flow Separation**
   - Add authentication middleware
   - Create separate endpoints or add auth checks
   - Stop storing debug data for non-admin requests

2. **Testing Infrastructure**
   - Add Jest or Vitest
   - Mock LLM providers for unit tests
   - Integration tests for API endpoints

3. **Configuration Improvements**
   - Make `max_tokens` configurable
   - Add request-level config overrides
   - Consider environment-based defaults
