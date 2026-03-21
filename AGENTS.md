## Python Style

- **Formatter**: Black (line length 100). Run `black <file>` after editing any `.py` file.
- **Type annotations**: Required on all function parameters and return types.
- **Docstrings**: Required on all functions, classes, and FastAPI route handlers. Use Google style:

  ```python
  def my_function(param: str) -> dict:
      """Short one-line summary.

      Args:
          param: Description of param.

      Returns:
          Description of return value.
      """
  ```

- FastAPI endpoints must include a docstring describing the endpoint's purpose, expected inputs, and return value.

## Code Formatting

After modifying any `.js`, `.jsx`, `.ts`, `.tsx`, `.json`, `.css`, `.scss`, `.html`, or `.md` file, run:

```bash
npx prettier --write <file>
```

Always format files you create or edit before finishing a task.

## Project Overview

**Kuteera Kitchen** is a home-style Indian meal prep and delivery service. The brand is built around wholesome, home-cooked food delivered fresh — not a restaurant, not a cloud kitchen, but a subscription/daily-order meal service. This context matters for naming, copy, and UX decisions.

kk_v1 is the platform: Next.js frontend, FastAPI backend, MySQL database. Supports multi-city operations, daily menu management, production planning, packing, and customer ordering.

## Development Commands

### Start Everything

```bash
npm run dev  # Runs both frontend (Next.js) and backend (uvicorn) concurrently
```

### Frontend Only

```bash
npm run next-dev   # Next.js with turbopack on :3000
npm run build      # Production build
npm run lint       # ESLint
```

### Backend Only

```bash
npm run backend    # uvicorn backend.main:app --reload on :8000
# OR directly:
uvicorn backend.main:app --reload
```

Backend API docs available at `http://localhost:8000/docs`.

### Database

MySQL database `kk_v1`. Schema at `backend/DB/structure_v1.sql`, migrations in `backend/DB/` (dated SQL files). Apply migrations manually in date order.

## Architecture

### API Rule: FastAPI Only

**All backend logic and API endpoints must live in FastAPI (`backend/`). Never create Next.js API routes (`src/app/api/`) for business logic.** Next.js is purely a frontend — it has no server-side API layer. The only server-side Next.js code is `middleware.ts` for auth route guarding.

### Frontend → Backend Connection

- Next.js (`src/`) runs on `:3000`, FastAPI (`backend/`) runs on `:8000`
- `next.config.ts` rewrites `/api/backend/*` → `http://127.0.0.1:8000/*`
- Frontend always calls `/api/backend/` paths — never directly to `:8000`
- `src/lib/http.ts` is the central HTTP client: injects JWT Bearer tokens and auto-refreshes on 401

### Authentication

- JWT access + refresh tokens stored in `localStorage`
- Zustand store (`src/store/store.ts`) manages auth state: `user`, `roles`, `hasRole()`, persisted as `auth_user`, `access_token`, `refresh_token`, `auth_roles`, `auth_role_codes`, `admin_city_code`
- `middleware.ts` guards all `/admin/*` routes by calling `/api/backend/auth/me`
- Backend: `backend/config.py` (token settings), `backend/hashing.py` (bcrypt), `backend/utils/rbac.py` (role checks)

### Product Model (3 Types)

Products are modeled in three distinct ways — this is a core complexity of the domain:

1. **Regular items** (`items` table) — simple products with meal-type-specific pricing (breakfast/lunch/dinner/condiments/festival)
2. **Combos** (`item_combos`) — bundles of items or categories; logic in `backend/utils/combos.py`
3. **Plated items** (`plated_items`, `plated_item_components`) — pre-assembled products with component breakdown; logic in `backend/utils/plated_items.py`
   All types support add-ons (`item_add_ons` — optional or mandatory extras).

### Multi-City Support (Always Required)

**Every feature must be city-aware.** `city_code` is a mandatory filter on all data — items, menus, orders, addresses, production, packing, and reports are all city-scoped. Never write a query or endpoint that returns cross-city data unless explicitly building a super-admin/aggregate view.

- Frontend: admin's active city is `admin_city_code` in the Zustand store / localStorage; customer city comes from their profile/address
- Backend: all endpoints must accept and filter by `city_code`; `backend/city_config.py` handles normalization
- UI: `src/config/cities.ts` defines valid cities for dropdowns and routing

### Customer-Facing UI (Two Versions)

- `src/app/customer/` — v1 (older)
- `src/app/customer-v2/` — v2 (current)
- `src/app/mobile/` — mobile-specific pages

### Backend Structure

- `backend/main.py` — monolithic FastAPI app with most endpoints
- `backend/models.py` — SQLAlchemy ORM models
- `backend/routers/` — modular routers for admin logs, reports, NL queries
- `backend/customer/customer_crud.py` — customer, address, and order CRUD operations

### Key Data Flows

- **Daily menu**: `menu` + `menu_items` tables → `src/app/admin/dailymenusetup/`
- **Orders**: placed by customers via `customer-v2/new-order/` and `cart/`, processed by admin in `admin/`
- **Production planning**: uses buffer percentages and UOM conversions (customer vs production vs packing rates) — `admin/production/`
- **Packing & trip sheets**: downstream of production — `admin/packing/`, `admin/trip-sheet/`

## Environment Variables

Backend reads from `backend/.env`:

```
DATABASE_URL=mysql+pymysql://user:password@localhost/kk_v1
SECRET_KEY=...
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
GEMINI_API_KEY=...   # Used for NL query features
COOKIE_SECURE=false
COOKIE_SAMESITE=Lax
```

## Path Alias

TypeScript: `@/*` maps to `./src/*` (configured in `tsconfig.json`).
