## NL→SQL AI POC Playbook

### 1. Environment
- Install new backend deps: `pip install -r requirements.txt` (adds `google-generativeai`, `sqlparse`).
- Export a Gemini API key (AI Studio free tier works):
  ```
  export GEMINI_API_KEY="your-key"
  ```
- Ensure backend timezone on prompts is IST; server date is injected automatically.

### 2. Endpoint
- `POST /api/nl/sql` with body `{ "q": "<phrase>" }`.
- Successful SELECT payload:
  ```json
  {
    "intent": "GET_MENU",
    "sql": "SELECT ...",
    "rows": [ { "date": "...", "item_name": "...", ... } ]
  }
  ```
- Buffer update payload:
  ```json
  {
    "intent": "SET_MENU_BUFFER",
    "sql": "UPDATE ...",
    "affected": 1,
    "row": { "date": "...", "item_name": "...", "buffer_qty": 20 }
  }
  ```
- Errors return `{ "error": "...", "sql": "..." , "examples": [...] }`.

### 3. Safety
- Validator enforces: single statement, only whitelisted tables/columns, SELECT-only except `menu_items.buffer_qty` updates.
- Rejected SQL returns suggestions; no DB writes occur unless validation passes.
- On UPDATE success, service re-fetches the row for Ask dialog display.

### 4. Frontend
- Dashboard search icon opens Ask dialog.
- Results render as tidy table, IDs hidden; SQL snippet available via “View generated SQL”.

### 5. Observability
- Check backend logs for Gemini failures or validation messages; the service surfaces API/key issues as 503 errors.
