# wmaide-server Brownfield Architecture Document

## Introduction

This document captures the CURRENT STATE of the wmaide-server codebase, including technical debt, workarounds, and real-world patterns. It serves as a reference for AI agents working on enhancements.

### Document Scope

Comprehensive documentation of entire system - an AI-powered dating/flirting assistant backend server.

### Change Log

| Date       | Version | Description                 | Author |
| ---------- | ------- | --------------------------- | ------ |
| 2024-12-09 | 1.0     | Initial brownfield analysis | Mary   |

---

## Quick Reference - Key Files and Entry Points

### Critical Files for Understanding the System

| File                            | Purpose                                        |
| ------------------------------- | ---------------------------------------------- |
| `index.js`                      | **Main Entry Point** - Express app for Vercel  |
| `server.js`                     | Alternative server with OpenAI Assistants API  |
| `prompts.js`                    | All LLM prompt templates                       |
| `utils.js`                      | Utility functions (conversation formatting)    |
| `routes/grade.js`               | Response grading endpoint                      |
| `routes/suggestion.js`          | Dating advice/consultation endpoint            |
| `routes/generate-response2.js`  | Alternative response generation endpoint       |
| `vercel.json`                   | Vercel deployment configuration                |

### Environment Variables Required

| Variable         | Purpose                           | Used In      |
| ---------------- | --------------------------------- | ------------ |
| `OPENAI_API_KEY` | OpenAI API authentication         | index.js, server.js |
| `ASSISTANT_ID`   | OpenAI Assistant ID (for threads) | server.js    |
| `PORT`           | Server port (default: 3000)       | server.js    |

---

## High Level Architecture

### Technical Summary

wmaide-server is a stateless REST API backend that:
1. Receives conversation context from a client application
2. Constructs specialized prompts for romantic/flirty responses
3. Calls OpenAI API (gpt-4o-mini) to generate responses
4. Returns generated content with timing metrics

### Actual Tech Stack (from package.json)

| Category      | Technology | Version | Notes                              |
| ------------- | ---------- | ------- | ---------------------------------- |
| Runtime       | Node.js    | -       | ES Modules (`"type": "module"`)    |
| Framework     | Express    | 5.1.0   | Latest major version               |
| AI Provider   | OpenAI     | 5.8.2   | Chat Completions + Assistants API  |
| CORS          | cors       | 2.8.5   | Enabled for all origins            |
| Config        | dotenv     | 17.0.1  | Environment variable loading       |
| Dev Tool      | nodemon    | 3.1.10  | Hot reload during development      |

### Repository Structure Reality Check

- **Type:** Single repository (not monorepo)
- **Package Manager:** Yarn (yarn.lock present) or npm
- **Deployment:** Vercel serverless functions
- **Notable:** Two entry points exist (`index.js` for Vercel, `server.js` for local/alternative)

---

## Source Tree and Module Organization

### Project Structure (Actual)

```text
wmaide-server/
├── index.js              # Main entry - Vercel deployment (Express app export)
├── server.js             # Alternative entry - OpenAI Assistants API approach
├── prompts.js            # LLM prompt templates (3 prompt generators)
├── utils.js              # Utility functions
├── routes/
│   ├── grade.js          # POST /api/grade-response
│   ├── suggestion.js     # POST /api/suggestion
│   └── generate-response2.js  # POST /api/generate-response2
├── vercel.json           # Vercel routing config
├── package.json          # Dependencies and scripts
├── yarn.lock             # Dependency lock file
├── .env                  # Environment variables (gitignored)
├── .gitignore            # Git ignore rules
└── .vercel/              # Vercel project config (gitignored)
```

### Key Modules and Their Purpose

#### Core Application (`index.js`)
- Express application setup with CORS and JSON parsing
- OpenAI client initialization
- Central `callOpenAI()` helper function with timing logs
- Route mounting for modular endpoints
- Main endpoint: `POST /api/generate-response`

#### Alternative Server (`server.js`)
- Uses OpenAI **Assistants API** (thread-based conversations)
- Endpoints: `GET /thread`, `POST /message`
- Polling-based status checking (5-second intervals)
- **TECHNICAL DEBT:** Not used in Vercel deployment, potentially legacy code

#### Prompt Engineering (`prompts.js`)
- `createConsultationPrompt_EN()` - Dating psychology advice
- `createRomanticResponsePrompt_EN()` - Main response generator with persona/slider system
- `createGradeResponsePrompt_EN()` - Response quality grading
- **NOTE:** Contains Vietnamese prompt variant (hardcoded, overrides English in `createRomanticResponsePrompt_EN`)

#### Utilities (`utils.js`)
- `getConversationHistory()` - Formats message array into "You/Them" transcript

---

## API Endpoints

### Production Endpoints (index.js - Vercel)

| Method | Endpoint                 | Purpose                          | Required Body                    |
| ------ | ------------------------ | -------------------------------- | -------------------------------- |
| POST   | `/api/generate-response` | Generate romantic response       | `context`, `message`, `spec?`    |
| POST   | `/api/generate-response2`| Same as above (modular route)    | `context`, `message`, `spec?`    |
| POST   | `/api/grade-response`    | Grade a response (-100 to 100)   | `context`, `response`            |
| POST   | `/api/suggestion`        | Get dating advice                | `context`, `selectedMessage?`, `question?` |

### Alternative Endpoints (server.js - Not deployed)

| Method | Endpoint    | Purpose                    | Required Body       |
| ------ | ----------- | -------------------------- | ------------------- |
| GET    | `/thread`   | Create new OpenAI thread   | -                   |
| POST   | `/message`  | Send message to assistant  | `message`, `threadId` |

### Request/Response Formats

#### Context Object (used by all endpoints)
```javascript
// Array of message objects
[
  { is_from_me: true, text: "Hey there!" },
  { is_from_me: false, text: "Hi! How are you?" }
]
```

#### Spec Object (for generate-response endpoints)
```javascript
{
  filter: "Main Character",  // Chad | Rizz | Simp | Main Character
  spiciness: 50,   // 0-100: mild teasing to heavy innuendo
  boldness: 50,    // 0-100: reserved to alpha assertive
  thirst: 50,      // 0-100: subtle interest to "down bad"
  energy: 50,      // 0-100: chill to hype/excited
  toxicity: 50,    // 0-100: nice guy to villain arc
  humour: 50,      // 0-100: dry wit to full clown
  emojiUse: 50     // 0-100: clean text to Gen Z emoji spam
}
```

---

## Technical Debt and Known Issues

### Critical Technical Debt

1. **Duplicate Entry Points**
   - `index.js` and `server.js` both define Express apps
   - `server.js` uses Assistants API but is NOT deployed to Vercel
   - Unclear which is the "source of truth"

2. **Hardcoded Vietnamese Prompt Override**
   - In `prompts.js:101-119`, a Vietnamese prompt overwrites the English `prompt2` variable
   - The function returns `prompt` (Vietnamese) instead of `prompt2` (English with slider system)
   - The slider parameters are constructed but **never used** in the actual returned prompt

3. **No Input Validation Beyond Required Fields**
   - No validation on `spec` slider ranges (could pass 500 or -50)
   - No sanitization of `context` or `message` content

4. **Global Polling Interval**
   - `server.js:20` uses a single global `pollingInterval` variable
   - Would break with concurrent requests

5. **Missing Error Handling**
   - No retry logic for OpenAI API failures
   - No rate limiting
   - No request validation middleware

### Workarounds and Gotchas

- **CORS is fully open** - `app.use(cors())` allows all origins
- **No authentication** - All endpoints are public
- **Vercel-specific:** Entry point must export the Express app, not call `app.listen()`
- **Model hardcoded:** `gpt-4o-mini` is hardcoded in `callOpenAI()`

---

## Integration Points and External Dependencies

### External Services

| Service | Purpose               | Integration Type | Key Files       |
| ------- | --------------------- | ---------------- | --------------- |
| OpenAI  | AI text generation    | REST API (SDK)   | index.js:17-19  |
| Vercel  | Hosting/Deployment    | Serverless       | vercel.json     |

### Expected Client Integration

The server expects a frontend/mobile app that:
1. Captures conversation messages (e.g., from a messaging app)
2. Sends context array to the API
3. Displays generated responses to the user
4. Optionally allows slider adjustments for response style

---

## Development and Deployment

### Local Development Setup

1. Clone repository
2. Copy `.env.example` to `.env` (if exists) or create `.env`:
   ```
   OPENAI_API_KEY=sk-your-key-here
   ASSISTANT_ID=asst_xxx  # Only needed for server.js
   ```
3. Install dependencies: `yarn install` or `npm install`
4. Run development server: `npm start` or `node index.js`
5. Server runs on port 3000

### Available Scripts

```bash
npm start    # Start server (node index.js)
npm test     # Not implemented (exits with error)
```

### Deployment Process

- **Platform:** Vercel
- **Config:** `vercel.json` routes all requests to `index.js`
- **Build:** Uses `@vercel/node` runtime
- **Environment:** Set `OPENAI_API_KEY` in Vercel dashboard

---

## Testing Reality

### Current Test Coverage

- **Unit Tests:** None
- **Integration Tests:** None
- **E2E Tests:** None
- **Manual Testing:** Primary QA method

### Running Tests

```bash
npm test  # Currently outputs "Error: no test specified" and exits 1
```

---

## Appendix - Useful Commands and Scripts

### Frequently Used Commands

```bash
npm start           # Start production server
npx nodemon         # Start with hot reload (dev)
vercel              # Deploy to Vercel
vercel dev          # Run Vercel dev server locally
```

### API Testing Examples

```bash
# Generate a romantic response
curl -X POST http://localhost:3000/api/generate-response \
  -H "Content-Type: application/json" \
  -d '{
    "context": [
      {"is_from_me": false, "text": "Hey, what are you up to?"}
    ],
    "message": "Hey, what are you up to?",
    "spec": {"filter": "Rizz", "boldness": 70}
  }'

# Grade a response
curl -X POST http://localhost:3000/api/grade-response \
  -H "Content-Type: application/json" \
  -d '{
    "context": [{"is_from_me": false, "text": "Hi!"}],
    "response": "Hey beautiful, was just thinking about you"
  }'

# Get dating advice
curl -X POST http://localhost:3000/api/suggestion \
  -H "Content-Type: application/json" \
  -d '{
    "context": [{"is_from_me": false, "text": "I had a great time last night"}],
    "question": "Should I text back immediately?"
  }'
```

### Debugging and Troubleshooting

- **Logs:** Console output includes timing for all OpenAI calls
- **Timing format:** `✅ OpenAI API call completed in Xms`
- **Common Issues:**
  - Missing `OPENAI_API_KEY` → 500 error
  - Invalid context format → 400 error
  - OpenAI rate limits → 500 error (no retry)

---

## Architecture Diagram

```
┌─────────────────┐     ┌──────────────────────────────────────────┐
│   Client App    │────▶│            wmaide-server                 │
│ (Mobile/Web)    │     │                                          │
└─────────────────┘     │  ┌────────────────────────────────────┐  │
                        │  │           index.js                  │  │
                        │  │  • Express app setup                │  │
                        │  │  • CORS, JSON middleware            │  │
                        │  │  • callOpenAI() helper              │  │
                        │  │  • Route mounting                   │  │
                        │  └──────────────┬─────────────────────┘  │
                        │                 │                        │
                        │    ┌────────────┼────────────┐           │
                        │    ▼            ▼            ▼           │
                        │ ┌──────┐  ┌──────────┐  ┌─────────┐     │
                        │ │grade │  │suggestion│  │generate │     │
                        │ │.js   │  │.js       │  │-resp2.js│     │
                        │ └──────┘  └──────────┘  └─────────┘     │
                        │    │            │            │           │
                        │    └────────────┼────────────┘           │
                        │                 ▼                        │
                        │  ┌────────────────────────────────────┐  │
                        │  │          prompts.js                │  │
                        │  │  • createRomanticResponsePrompt    │  │
                        │  │  • createGradeResponsePrompt       │  │
                        │  │  • createConsultationPrompt        │  │
                        │  └──────────────┬─────────────────────┘  │
                        └─────────────────┼────────────────────────┘
                                          │
                                          ▼
                        ┌─────────────────────────────────────────┐
                        │            OpenAI API                   │
                        │         (gpt-4o-mini)                   │
                        └─────────────────────────────────────────┘
```
