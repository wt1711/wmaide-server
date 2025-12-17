# VIXX AI Dating Server - Brownfield Architecture Document

## Introduction

This document captures the **CURRENT STATE** of the VIXX AI Dating Server codebase, including technical patterns, integrations, and architectural decisions. It serves as a reference for AI agents working on enhancements, bug fixes, and new features.

### Project Overview

**VIXX AI Dating** is a cross-platform mobile application that serves as an intelligent dating conversation assistant. This repository contains the **backend server** that powers the AI features, providing:

- Real-time AI-powered conversation analysis
- Contextual response suggestions for dating app conversations
- Strategic dating advice and coaching
- Response quality grading

### Document Scope

Comprehensive documentation of the entire backend system.

### Change Log

| Date       | Version | Description                 | Author |
| ---------- | ------- | --------------------------- | ------ |
| 2024-12-17 | 1.0     | Initial brownfield analysis | Mary   |

---

## Quick Reference - Key Files and Entry Points

### Critical Files for Understanding the System

| File | Purpose |
|------|---------|
| `index.js` | **Main Entry Point** - Express server, OpenAI integration, all API routes |
| `prompts.js` | Prompt templates for AI response generation, grading, and consultation |
| `promptVersionController.js` | Version control system for prompt configurations |
| `utils.js` | Utility functions (conversation history formatting) |
| `.env.example` | Required environment variables template |
| `vercel.json` | Vercel deployment configuration |

### Route Files

| File | Purpose |
|------|---------|
| `routes/grade.js` | Response grading endpoint |
| `routes/suggestion.js` | Dating advice/consultation endpoint |
| `routes/generate-response2.js` | Alternative response generation endpoint |
| `routes/preview-prompt.js` | Prompt preview/testing endpoint |

### Deprecated Files

| File | Status | Notes |
|------|--------|-------|
| `server.js` | **DEPRECATED** | Legacy implementation using OpenAI Assistants API with threading. Do not use or modify. |

---

## High Level Architecture

### Technical Summary

This is a **serverless Express.js API** deployed on Vercel that:
1. Receives conversation context from the VIXX mobile app
2. Constructs prompts using configurable templates
3. Calls OpenAI's Chat Completions API
4. Returns AI-generated responses, grades, or advice

### Architecture Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  VIXX Mobile    │────▶│  Vercel Edge    │────▶│  OpenAI API     │
│  App (Client)   │◀────│  (Express.js)   │◀────│  (GPT Models)   │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │  Vercel KV      │
                        │  (Upstash)      │
                        │  - Prompts      │
                        │  - Model Config │
                        │  - Versions     │
                        └─────────────────┘
```

### Actual Tech Stack (from package.json)

| Category | Technology | Version | Notes |
|----------|------------|---------|-------|
| Runtime | Node.js | ES Modules | `"type": "module"` in package.json |
| Framework | Express | 5.1.0 | Latest Express 5.x |
| AI Provider | OpenAI SDK | 5.8.2 | Chat Completions API |
| Key-Value Store | @vercel/kv | 3.0.0 | Upstash Redis backend |
| Environment | dotenv | 17.0.1 | Environment variable management |
| CORS | cors | 2.8.5 | Cross-origin requests |
| Dev Tool | nodemon | 3.1.10 | Development hot-reload |

### Repository Structure

- **Type**: Single repository (not monorepo)
- **Package Manager**: Yarn (yarn.lock present)
- **Module System**: ES Modules (import/export)

---

## Source Tree and Module Organization

### Project Structure (Actual)

```text
wmaide-server/
├── index.js                    # Main entry point - Express server & routes
├── server.js                   # DEPRECATED - Do not use
├── prompts.js                  # AI prompt templates
├── promptVersionController.js  # Version control for prompts
├── utils.js                    # Utility functions
├── package.json                # Dependencies & scripts
├── yarn.lock                   # Dependency lock file
├── vercel.json                 # Vercel deployment config
├── .env                        # Environment variables (gitignored)
├── .env.example                # Environment template
├── .gitignore                  # Git ignore rules
├── routes/                     # API route modules
│   ├── grade.js                # POST /api/grade-response
│   ├── suggestion.js           # POST /api/suggestion
│   ├── generate-response2.js   # POST /api/generate-response2
│   └── preview-prompt.js       # POST /api/preview-prompt
├── public/                     # Static files
│   └── admin.html              # Prompt Builder admin UI
├── docs/                       # Documentation
├── .bmad-core/                 # BMAD framework config
├── .claude/                    # Claude AI config
└── .vercel/                    # Vercel deployment cache
```

### Key Modules and Their Purpose

#### Core Application (`index.js`)

The main server file handles:
- Express app initialization with CORS and JSON parsing
- OpenAI client setup
- Central `callOpenAI()` helper function with timing/logging
- All API route mounting
- Static file serving for admin UI

**Important Pattern**: Routes are created as factory functions that receive `callOpenAI` as a parameter:
```javascript
app.use('/api', createGradeRoute(callOpenAI));
```

#### Prompt Templates (`prompts.js`)

Contains all AI prompt construction logic:
- `createRomanticResponsePrompt_EN()` - Main response generation (async, fetches config from KV)
- `createConsultationPrompt_EN()` - Dating advice/psychology analysis
- `createGradeResponsePrompt_EN()` - Response quality scoring (-100 to 100)
- `DEFAULT_SYSTEM_PROMPT` - Fallback system prompt
- `DEFAULT_RESPONSE_CRITERIA` - Fallback response criteria

#### Version Controller (`promptVersionController.js`)

Manages prompt configuration snapshots:
- `saveNewVersion()` - Create new version snapshot
- `getVersionHistory()` - Retrieve all versions
- `deleteVersion()` - Remove a version
- Stores: SYSTEM_PROMPT, RESPONSE_CRITERIA, LLM_MODEL_NAME, LLM_PROVIDER

#### Utilities (`utils.js`)

Single utility function:
- `getConversationHistory()` - Formats conversation context array into "You/Them" format

---

## API Specifications

### Base URL

- **Local**: `http://localhost:3000`
- **Production**: Deployed on Vercel (URL from Vercel dashboard)

### API Endpoints

#### Response Generation

**POST `/api/generate-response`** (Main endpoint in `index.js`)
```json
Request:
{
  "context": [{"text": "Hey!", "is_from_me": false}, ...],
  "message": "The message to reply to",
  "spec": {
    "filter": "Main Character",
    "spiciness": 50,
    "boldness": 50,
    "thirst": 50,
    "energy": 50,
    "toxicity": 50,
    "humour": 50,
    "emojiUse": 50
  }
}

Response:
{
  "response": "AI-generated reply text",
  "timing": {
    "totalDuration": 1234,
    "totalDurationSeconds": "1.23"
  }
}
```

**POST `/api/generate-response2`** (Alternative in `routes/generate-response2.js`)
- Same request format as above
- Response without timing info

#### Response Grading

**POST `/api/grade-response`**
```json
Request:
{
  "context": [{"text": "...", "is_from_me": true/false}, ...],
  "response": "The response to grade"
}

Response:
{
  "grade": 75  // Integer from -100 to 100
}
```

#### Dating Advice

**POST `/api/suggestion`**
```json
Request:
{
  "context": [{"text": "...", "is_from_me": true/false}, ...],
  "selectedMessage": {"text": "Optional specific message"},
  "question": "Optional specific question"
}

Response:
{
  "suggestion": "AI dating advice text"
}
```

#### Prompt Preview

**POST `/api/preview-prompt`**
```json
Request:
{
  "prompt": "Raw prompt string to test"
}

Response:
{
  "response": "AI response to the prompt"
}
```

### Configuration APIs

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/system-prompt` | Get current system prompt |
| POST | `/api/system-prompt` | Update system prompt |
| GET | `/api/llm-model` | Get current LLM model name |
| POST | `/api/llm-model` | Update LLM model |
| GET | `/api/response-criteria` | Get response criteria |
| POST | `/api/response-criteria` | Update response criteria |

### Version Management APIs

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/versions/save` | Save current config as version |
| GET | `/api/versions/history` | Get all version snapshots |
| DELETE | `/api/versions/:id` | Delete a version |

---

## Data Models

### Conversation Context

The primary data structure passed from the mobile app:

```javascript
// Array of message objects
[
  { "text": "Hey there!", "is_from_me": false },
  { "text": "Hi! How are you?", "is_from_me": true },
  { "text": "Good! Want to grab coffee?", "is_from_me": false }
]
```

### Response Spec (Optional Personality Tuning)

```javascript
{
  "filter": "Main Character",  // Personality filter
  "spiciness": 50,   // 0-100 scale
  "boldness": 50,
  "thirst": 50,
  "energy": 50,
  "toxicity": 50,
  "humour": 50,
  "emojiUse": 50
}
```

**Note**: The `spec` parameter is defined in the prompt function signature but not currently used in prompt construction.

### Version Snapshot

```javascript
{
  "id": "v_1702828800000_abc123",
  "description": "User-provided description",
  "timestamp": "2024-12-17T12:00:00.000Z",
  "configData": {
    "SYSTEM_PROMPT": "...",
    "RESPONSE_CRITERIA": "...",
    "LLM_MODEL_NAME": "gpt-4o",
    "LLM_PROVIDER": "openai"
  }
}
```

---

## Integration Points and External Dependencies

### External Services

| Service | Purpose | Integration Type | Configuration |
|---------|---------|------------------|---------------|
| OpenAI | AI response generation | REST API via SDK | `OPENAI_API_KEY` env var |
| Vercel KV | Configuration storage | SDK | `KV_REST_API_URL`, `KV_REST_API_TOKEN` |
| Vercel | Hosting & deployment | Serverless | `vercel.json` config |

### Vercel KV Keys Used

| Key | Purpose | Default Value |
|-----|---------|---------------|
| `SYSTEM_PROMPT` | AI persona/system instructions | `DEFAULT_SYSTEM_PROMPT` in prompts.js |
| `RESPONSE_CRITERIA` | Response generation guidelines | `DEFAULT_RESPONSE_CRITERIA` in prompts.js |
| `LLM_MODEL_NAME` | OpenAI model to use | `gpt-4o` |
| `PROMPT_VERSIONS` | Array of version snapshots | `[]` |

### Internal Integration Points

- **Mobile App Communication**: REST API with JSON payloads, CORS enabled
- **Admin UI**: Static HTML served from `/public/admin.html`, accessible at `/admin.html`

---

## Development and Deployment

### Environment Variables

Required environment variables (see `.env.example`):

```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-proj-...        # OpenAI API key
ASSISTANT_ID=asst_...             # DEPRECATED - Only for server.js

# Vercel KV (Upstash Redis)
KV_REST_API_URL="https://..."     # Upstash REST API URL
KV_REST_API_TOKEN="..."           # Upstash REST API token
```

### Local Development Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   yarn install
   ```
3. Copy environment template:
   ```bash
   cp .env.example .env
   ```
4. Fill in actual values in `.env`
5. Start the development server:
   ```bash
   yarn start
   # or with hot-reload:
   npx nodemon index.js
   ```

### Available Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `start` | `node index.js` | Start production server |
| `test` | (not configured) | No tests currently |

### Deployment Process

**Platform**: Vercel (Serverless)

The `vercel.json` configuration:
```json
{
  "version": 2,
  "builds": [{ "src": "index.js", "use": "@vercel/node" }],
  "routes": [{ "src": "/(.*)", "dest": "index.js" }]
}
```

**Deployment Steps**:
1. Push to main branch (if Vercel Git integration is set up)
2. Or use Vercel CLI: `vercel --prod`

**Environment Variables**: Must be configured in Vercel dashboard (Settings > Environment Variables)

---

## Testing Reality

### Current Test Coverage

- **Unit Tests**: None
- **Integration Tests**: None
- **E2E Tests**: None
- **Test Framework**: Not configured (`"test": "echo \"Error: no test specified\" && exit 1"`)

### Manual Testing

- Use the admin UI at `/admin.html` to test prompt configurations
- Use tools like Postman or curl to test API endpoints

---

## Technical Debt and Known Issues

### Technical Debt

1. **Deprecated `server.js`**: Legacy file using OpenAI Assistants API still in repository. Should be removed or archived.

2. **No Test Coverage**: No automated tests exist. Adding tests would improve reliability.

3. **Unused `spec` Parameter**: The personality tuning parameters (spiciness, boldness, etc.) are accepted but not used in prompt construction.

4. **Hardcoded Port**: Server port is hardcoded to 3000 in `index.js` (though Vercel handles this in production).

5. **Console Logging**: Extensive console.log statements for debugging. Consider using a proper logging library for production.

### Code Patterns to Note

1. **Factory Pattern for Routes**: Routes are created via factory functions that receive the `callOpenAI` helper:
   ```javascript
   const createGradeRoute = (callOpenAI) => { ... }
   ```

2. **Async KV Fetching in Prompts**: The `createRomanticResponsePrompt_EN` function is async because it fetches configuration from KV store.

3. **Default Fallbacks**: All KV reads have hardcoded defaults if the fetch fails.

4. **ES Modules**: Use `import/export` syntax, not `require()`.

---

## Admin UI Reference

The **Prompt Builder** admin interface (`public/admin.html`) provides:

### Features

1. **AI Model Selection**: Dropdown to select OpenAI model (gpt-4o, gpt-3.5-turbo, etc.)
2. **System Prompt Editor**: Configure the AI persona/instructions
3. **Response Criteria Editor**: Define how responses should be crafted
4. **Version Management**:
   - Save current configuration as a named version
   - View version history
   - Restore previous versions
   - Delete versions

### Accessing the Admin UI

- **Local**: `http://localhost:3000/admin.html`
- **Production**: `https://your-vercel-url/admin.html`

---

## Appendix - Useful Commands and Scripts

### Development Commands

```bash
# Install dependencies
yarn install

# Start server
yarn start

# Start with hot-reload
npx nodemon index.js

# Deploy to Vercel
vercel --prod
```

### Testing API Endpoints

```bash
# Generate a response
curl -X POST http://localhost:3000/api/generate-response \
  -H "Content-Type: application/json" \
  -d '{"context":[{"text":"Hey!","is_from_me":false}],"message":"Hey!"}'

# Grade a response
curl -X POST http://localhost:3000/api/grade-response \
  -H "Content-Type: application/json" \
  -d '{"context":[{"text":"Hey!","is_from_me":false}],"response":"Hey yourself!"}'

# Get current model
curl http://localhost:3000/api/llm-model
```

### Debugging

- Check server logs in terminal for timing information and errors
- All OpenAI API calls log duration and success/failure status
- Look for emoji prefixes: `🚀` (start), `✅` (success), `❌` (error), `📦` (model info), `🎯` (timing)
