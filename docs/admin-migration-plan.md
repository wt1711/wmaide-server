# Admin Panel Migration Plan

## Overview

Migrate from monolithic `admin.html` (835 lines) to a modular Alpine.js + multi-file architecture.

**Goal**: Improve maintainability while keeping zero build step requirement.

---

## Current State Analysis

### File Breakdown (`public/admin.html`)

| Section | Lines | Purpose |
|---------|-------|---------|
| CSS (inline) | 1-246 | All styles in `<style>` tag |
| HTML | 248-343 | Layout structure |
| JavaScript | 345-833 | All logic in `<script>` tag |

### Current Features

1. **Model/Provider Selection** - Select LLM provider and model
2. **Prompt Configuration** - System prompt + response criteria
3. **Version Management** - Save/restore configuration snapshots
4. **Prompt Preview** - Debug mode showing full prompts + analysis

### Missing Features (to be added)

1. **Credits Management** - View/manage user credits
2. **User Management** - Admin user list
3. **Response Testing** - Test generate endpoints
4. **Analytics** - Usage statistics

---

## Target Architecture

### File Structure

```
public/
├── admin.html              # DEPRECATED - redirect to /admin/
├── admin/
│   ├── index.html          # Main shell with Alpine.js setup
│   │
│   ├── css/
│   │   ├── base.css        # Reset, typography, variables
│   │   ├── layout.css      # Grid, sidebar, containers
│   │   ├── components.css  # Buttons, inputs, cards
│   │   └── pages.css       # Page-specific styles
│   │
│   ├── js/
│   │   ├── app.js          # Alpine.js init + global store
│   │   ├── api.js          # API wrapper functions
│   │   ├── stores/
│   │   │   ├── config.js   # Model/provider/prompt state
│   │   │   ├── versions.js # Version history state
│   │   │   ├── credits.js  # Credits management state
│   │   │   └── debug.js    # Prompt preview state
│   │   └── utils.js        # Helpers (escapeHtml, etc.)
│   │
│   └── pages/              # Optional: separate page content
│       ├── config.html     # Prompt configuration
│       ├── credits.html    # Credits management
│       └── debug.html      # Debug tools
```

### Technology Stack

| Component | Technology | CDN URL |
|-----------|------------|---------|
| Reactivity | Alpine.js 3.x | `https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js` |
| Persistence | Alpine Persist | `https://cdn.jsdelivr.net/npm/@alpinejs/persist@3.x.x/dist/cdn.min.js` |
| Icons (optional) | Heroicons | Via inline SVG or CDN |

---

## Migration Steps

### Phase 1: Extract CSS (Day 1)

**Goal**: Move all styles to external files without changing functionality.

#### Step 1.1: Create CSS directory structure

```bash
mkdir -p public/admin/css
```

#### Step 1.2: Extract and organize styles

Create `public/admin/css/admin.css` with all current styles from lines 7-245.

Organize into sections:
```css
/* ==========================================================================
   Base Styles
   ========================================================================== */
* { box-sizing: border-box; }
body { ... }

/* ==========================================================================
   Layout
   ========================================================================== */
.container { ... }
.sidebar { ... }
.main-content { ... }

/* ==========================================================================
   Components
   ========================================================================== */
button { ... }
textarea { ... }
select { ... }

/* ==========================================================================
   Sections
   ========================================================================== */
.version-panel { ... }
.prompt-panel { ... }
```

#### Step 1.3: Link external CSS

Replace `<style>...</style>` with:
```html
<link rel="stylesheet" href="/admin/css/admin.css">
```

#### Step 1.4: Test

Verify all styles still work correctly.

---

### Phase 2: Extract JavaScript (Day 1-2)

**Goal**: Move JS to external files, introduce Alpine.js for reactivity.

#### Step 2.1: Create JS directory structure

```bash
mkdir -p public/admin/js/stores
```

#### Step 2.2: Create API wrapper (`public/admin/js/api.js`)

```javascript
// API wrapper with consistent error handling
const API = {
  async get(endpoint) {
    const res = await fetch(`/api${endpoint}`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  },

  async post(endpoint, data) {
    const res = await fetch(`/api${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  },

  async delete(endpoint) {
    const res = await fetch(`/api${endpoint}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  }
};

export default API;
```

#### Step 2.3: Create config store (`public/admin/js/stores/config.js`)

```javascript
// Config store for model/provider/prompts
export default () => ({
  // State
  providers: [],
  selectedProvider: 'openai',
  selectedModel: 'gpt-4o',
  systemPrompt: '',
  responseCriteria: '',
  loading: false,

  // Computed
  get currentModels() {
    const provider = this.providers.find(p => p.id === this.selectedProvider);
    return provider?.models || [];
  },

  get currentPrice() {
    const model = this.currentModels.find(m => m.id === this.selectedModel);
    return model?.input_price ? `$${model.input_price}` : '-';
  },

  // Actions
  async init() {
    this.loading = true;
    try {
      const [providers, provider, model, systemPrompt, criteria] = await Promise.all([
        API.get('/models'),
        API.get('/llm-provider'),
        API.get('/llm-model'),
        API.get('/system-prompt'),
        API.get('/response-criteria')
      ]);

      this.providers = providers;
      this.selectedProvider = provider.provider || 'openai';
      this.selectedModel = model.modelName || 'gpt-4o';
      this.systemPrompt = systemPrompt.prompt || '';
      this.responseCriteria = criteria.prompt || '';
    } catch (err) {
      console.error('Failed to load config:', err);
    } finally {
      this.loading = false;
    }
  },

  async saveModel() {
    this.loading = true;
    try {
      await Promise.all([
        API.post('/llm-provider', { provider: this.selectedProvider }),
        API.post('/llm-model', { modelName: this.selectedModel })
      ]);
      alert('Provider & Model saved!');
    } catch (err) {
      alert('Failed to save: ' + err.message);
    } finally {
      this.loading = false;
    }
  },

  async saveSystemPrompt() {
    this.loading = true;
    try {
      await API.post('/system-prompt', { prompt: this.systemPrompt });
      alert('Persona saved!');
    } catch (err) {
      alert('Failed to save: ' + err.message);
    } finally {
      this.loading = false;
    }
  },

  async saveResponseCriteria() {
    this.loading = true;
    try {
      await API.post('/response-criteria', { prompt: this.responseCriteria });
      alert('Response Criteria saved!');
    } catch (err) {
      alert('Failed to save: ' + err.message);
    } finally {
      this.loading = false;
    }
  }
});
```

#### Step 2.4: Create versions store (`public/admin/js/stores/versions.js`)

```javascript
export default () => ({
  versions: [],
  description: '',
  loading: false,

  async init() {
    await this.loadHistory();
  },

  async loadHistory() {
    try {
      this.versions = await API.get('/versions/history');
    } catch (err) {
      console.error('Failed to load versions:', err);
      this.versions = [];
    }
  },

  async save(configData) {
    this.loading = true;
    try {
      await API.post('/versions/save', {
        description: this.description || 'No description',
        configData
      });
      this.description = '';
      await this.loadHistory();
      alert('Version saved!');
    } catch (err) {
      alert('Failed to save version: ' + err.message);
    } finally {
      this.loading = false;
    }
  },

  async restore(version) {
    if (!confirm('Restore this version?')) return;
    // Emit event for config store to handle
    window.dispatchEvent(new CustomEvent('restore-version', { detail: version.configData }));
  },

  async delete(versionId) {
    if (!confirm('Delete this version?')) return;
    try {
      await API.delete(`/versions/${versionId}`);
      await this.loadHistory();
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  }
});
```

#### Step 2.5: Create debug store (`public/admin/js/stores/debug.js`)

```javascript
export default () => ({
  enabled: false,
  prompt: '',
  analysis: '',
  loading: false,

  async init() {
    try {
      const data = await API.get('/log-prompt');
      this.enabled = data.enabled;
      if (this.enabled) await this.refresh();
    } catch (err) {
      console.error('Failed to load debug status:', err);
    }
  },

  async toggle() {
    this.loading = true;
    try {
      await API.post('/log-prompt', { enabled: !this.enabled });
      this.enabled = !this.enabled;
      if (this.enabled) await this.refresh();
    } catch (err) {
      alert('Failed to toggle: ' + err.message);
    } finally {
      this.loading = false;
    }
  },

  async refresh() {
    try {
      const [promptData, analysisData] = await Promise.all([
        API.get('/full-prompt-preview'),
        API.get('/current-analysis')
      ]);
      this.prompt = promptData.prompt || 'No prompt stored yet.';
      this.analysis = analysisData.analysis || 'No analysis stored yet.';
    } catch (err) {
      console.error('Failed to refresh:', err);
    }
  }
});
```

#### Step 2.6: Create main app file (`public/admin/js/app.js`)

```javascript
import API from './api.js';
import configStore from './stores/config.js';
import versionsStore from './stores/versions.js';
import debugStore from './stores/debug.js';

// Make API globally available
window.API = API;

// Register Alpine stores
document.addEventListener('alpine:init', () => {
  Alpine.store('config', configStore());
  Alpine.store('versions', versionsStore());
  Alpine.store('debug', debugStore());

  // Initialize all stores
  Alpine.store('config').init();
  Alpine.store('versions').init();
  Alpine.store('debug').init();

  // Handle version restore events
  window.addEventListener('restore-version', (e) => {
    const config = Alpine.store('config');
    const data = e.detail;
    config.selectedProvider = data.LLM_PROVIDER || 'openai';
    config.selectedModel = data.LLM_MODEL_NAME || 'gpt-4o';
    config.systemPrompt = data.SYSTEM_PROMPT || '';
    config.responseCriteria = data.RESPONSE_CRITERIA || '';
    // Save to KV
    config.saveModel();
    config.saveSystemPrompt();
    config.saveResponseCriteria();
  });
});
```

---

### Phase 3: Convert HTML to Alpine.js (Day 2-3)

**Goal**: Replace imperative DOM manipulation with declarative Alpine.js templates.

#### Step 3.1: Create new index.html shell

Create `public/admin/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WMAide Admin</title>
  <link rel="stylesheet" href="/admin/css/admin.css">
  <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
  <script type="module" src="/admin/js/app.js"></script>
</head>
<body>
  <div class="container" x-data>

    <!-- Left Sidebar: Version History -->
    <div class="sidebar">
      <div class="version-panel">
        <h3>Version History</h3>
        <div class="version-list">
          <template x-if="$store.versions.versions.length === 0">
            <p class="empty-state">No versions saved yet.</p>
          </template>
          <template x-for="version in $store.versions.versions" :key="version.id">
            <div class="version-item">
              <div class="version-description" x-text="version.description || '(No description)'"></div>
              <div class="version-meta" x-text="new Date(version.timestamp).toLocaleString()"></div>
              <div class="version-model" x-text="'Model: ' + (version.configData?.LLM_MODEL_NAME || 'N/A')"></div>
              <button class="restore-btn" @click="$store.versions.restore(version)">Restore</button>
              <button class="delete-btn" @click="$store.versions.delete(version.id)">Delete</button>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="main-content">
      <div class="header">
        <h1>Prompt Builder</h1>
        <div class="header-actions">
          <button class="store-btn"
                  @click="$store.versions.save({
                    SYSTEM_PROMPT: $store.config.systemPrompt,
                    RESPONSE_CRITERIA: $store.config.responseCriteria,
                    LLM_MODEL_NAME: $store.config.selectedModel,
                    LLM_PROVIDER: $store.config.selectedProvider
                  })"
                  :disabled="$store.versions.loading">
            <span x-text="$store.versions.loading ? 'Saving...' : 'Save this version'"></span>
          </button>
          <input type="text"
                 x-model="$store.versions.description"
                 placeholder="Version description...">
        </div>
      </div>

      <!-- Model Selection -->
      <div class="section">
        <div style="display: flex; gap: 20px; align-items: flex-end; flex-wrap: wrap;">
          <button @click="$store.config.saveModel()" :disabled="$store.config.loading">
            Save Model
          </button>
          <div>
            <label style="display: block; margin-bottom: 5px; font-weight: 500;">Provider:</label>
            <select x-model="$store.config.selectedProvider">
              <template x-for="provider in $store.config.providers" :key="provider.id">
                <option :value="provider.id" x-text="provider.name"></option>
              </template>
            </select>
          </div>
          <div>
            <label style="display: block; margin-bottom: 5px; font-weight: 500;">Model:</label>
            <select x-model="$store.config.selectedModel">
              <template x-for="model in $store.config.currentModels" :key="model.id">
                <option :value="model.id" x-text="model.id"></option>
              </template>
            </select>
          </div>
          <div>
            <label style="display: block; margin-bottom: 5px; font-weight: 500;">1M price:</label>
            <span x-text="$store.config.currentPrice"
                  style="display: inline-block; padding: 10px; background: #e9ecef; border-radius: 4px; min-width: 80px;">
            </span>
          </div>
        </div>
      </div>

      <hr>

      <!-- System Prompt -->
      <div class="section">
        <h2>Part 1: AI Persona</h2>
        <textarea x-model="$store.config.systemPrompt" placeholder="Loading..."></textarea>
        <br>
        <button @click="$store.config.saveSystemPrompt()" :disabled="$store.config.loading">
          <span x-text="$store.config.loading ? 'Saving...' : 'Save Persona'"></span>
        </button>
      </div>

      <hr>

      <!-- Response Criteria -->
      <div class="section">
        <h2>Part 3: Response Criteria</h2>
        <textarea x-model="$store.config.responseCriteria" placeholder="Loading..."></textarea>
        <br>
        <button @click="$store.config.saveResponseCriteria()" :disabled="$store.config.loading">
          <span x-text="$store.config.loading ? 'Saving...' : 'Save Response Criteria'"></span>
        </button>
      </div>
    </div>

    <!-- Right Sidebar: Debug -->
    <div class="right-sidebar">
      <!-- Toggle (when disabled) -->
      <div class="prompt-toggle-container" x-show="!$store.debug.enabled">
        <button class="prompt-toggle-btn" @click="$store.debug.toggle()" :disabled="$store.debug.loading">
          SHOW PROMPT
        </button>
        <p class="toggle-hint">Click to enable prompt logging</p>
      </div>

      <!-- Panel (when enabled) -->
      <div class="prompt-panel" x-show="$store.debug.enabled">
        <h3>
          <span>Full Prompt</span>
          <div>
            <button class="restore-btn" @click="$store.debug.refresh()">Refresh</button>
            <button class="close-btn" @click="$store.debug.toggle()">Close</button>
          </div>
        </h3>
        <div class="prompt-content" x-text="$store.debug.prompt"></div>
        <h4 style="margin-top: 15px; margin-bottom: 8px; color: #666;">Model Analysis</h4>
        <div class="prompt-content" x-text="$store.debug.analysis" style="background: #2d2d2d; max-height: 200px;"></div>
      </div>
    </div>

  </div>
</body>
</html>
```

#### Step 3.2: Add redirect from old path

Update `index.js` to redirect `/admin.html` to `/admin/`:

```javascript
// Redirect old admin path
app.get('/admin.html', (req, res) => {
  res.redirect('/admin/');
});

// Serve new admin
app.use('/admin', express.static('public/admin'));
```

---

### Phase 4: Add New Features (Day 3-4)

**Goal**: Add credits management page using the new architecture.

#### Step 4.1: Create credits store (`public/admin/js/stores/credits.js`)

```javascript
export default () => ({
  users: {},
  searchQuery: '',
  loading: false,

  get filteredUsers() {
    if (!this.searchQuery) return Object.entries(this.users);
    return Object.entries(this.users).filter(([userId]) =>
      userId.toLowerCase().includes(this.searchQuery.toLowerCase())
    );
  },

  async loadCredits() {
    this.loading = true;
    try {
      // Note: You'll need to add this endpoint
      const data = await API.get('/admin/credits');
      this.users = data.users || {};
    } catch (err) {
      console.error('Failed to load credits:', err);
    } finally {
      this.loading = false;
    }
  },

  async resetCredits(userId) {
    if (!confirm(`Reset credits for ${userId}?`)) return;
    try {
      await API.post('/admin/credits/reset', { userId });
      await this.loadCredits();
    } catch (err) {
      alert('Failed to reset credits: ' + err.message);
    }
  }
});
```

#### Step 4.2: Add navigation tabs

Add tab navigation to switch between Config, Credits, and Debug views.

---

### Phase 5: Testing & Cleanup (Day 4-5)

#### Step 5.1: Test all functionality

- [ ] Model/provider selection saves correctly
- [ ] System prompt saves correctly
- [ ] Response criteria saves correctly
- [ ] Version save/restore/delete works
- [ ] Debug toggle and refresh works
- [ ] Redirect from `/admin.html` works

#### Step 5.2: Remove old file

After confirming everything works:

```bash
rm public/admin.html
```

#### Step 5.3: Update documentation

Update `docs/brownfield-architecture.md` to reflect new admin structure.

---

## Backend Changes Required

### New Endpoints for Credits Management

Add to `src/routes/config.js` or create `src/routes/admin.js`:

```javascript
// GET /api/admin/credits - List all user credits
router.get('/admin/credits', async (req, res) => {
  try {
    const credits = await kv.get(KV_KEYS.userCredits) || {};
    res.json({ users: credits });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load credits' });
  }
});

// POST /api/admin/credits/reset - Reset user credits
router.post('/admin/credits/reset', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  try {
    const credits = await kv.get(KV_KEYS.userCredits) || {};
    delete credits[userId];
    await kv.set(KV_KEYS.userCredits, credits);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset credits' });
  }
});
```

---

## Rollback Plan

If issues arise during migration:

1. Keep `public/admin.html` until Phase 5 is complete
2. Both `/admin.html` and `/admin/` can coexist
3. Revert redirect in `index.js` if needed

---

## Summary

| Phase | Effort | Risk | Changes |
|-------|--------|------|---------|
| 1. Extract CSS | Low | Low | Move styles to external file |
| 2. Extract JS | Medium | Medium | Create stores, introduce Alpine |
| 3. Convert HTML | Medium | Medium | Rewrite with Alpine directives |
| 4. Add Features | Medium | Low | Credits management page |
| 5. Cleanup | Low | Low | Remove old file, update docs |

**Total Estimated Effort**: 3-5 focused sessions

---

## Next Steps

When ready to implement, start with **Phase 1** (CSS extraction) as it's low-risk and provides immediate benefit.
