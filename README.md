# Social Media Backend

A scalable, modular backend for a social media application built with **Node.js (TypeScript)**, **Express.js**, **Prisma ORM**, and **PostgreSQL**.

---

## Directory Structure

```
backend-learning/
├── prisma/
│   └── schema.prisma              # Database schema
├── src/
│   ├── config/
│   │   ├── database.ts            # Prisma client singleton
│   │   ├── env.ts                 # Zod-validated environment config
│   │   └── index.ts
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.ts # Route handlers
│   │   │   ├── auth.routes.ts     # Express router
│   │   │   ├── auth.service.ts    # Business logic
│   │   │   ├── auth.validation.ts # Zod schemas
│   │   │   └── index.ts
│   │   ├── post/
│   │   │   ├── post.routes.ts     # Placeholder
│   │   │   └── index.ts
│   │   └── user/
│   │       ├── user.routes.ts     # Placeholder
│   │       └── index.ts
│   ├── shared/
│   │   ├── errors/
│   │   │   └── AppError.ts        # Custom error class
│   │   ├── middleware/
│   │   │   ├── authenticate.ts    # JWT auth guard
│   │   │   └── errorHandler.ts    # Global error handler
│   │   ├── utils/
│   │   │   └── asyncWrapper.ts    # Async/await error catcher
│   │   └── index.ts
│   ├── app.ts                     # Express app setup
│   └── server.ts                  # Entry point
├── .env                           # Local environment variables (git-ignored)
├── .env.example                   # Template for env variables
├── .eslintrc.json
├── .gitignore
├── .prettierrc
├── nodemon.json
├── package.json
├── tsconfig.json
└── README.md
```

---

## Getting Started

### Prerequisites

- **Node.js** >= 18
- **PostgreSQL** running locally or remotely
- **npm** or **yarn**

### Installation

```bash
# Install dependencies
npm install

# Copy environment template and fill in your values
cp .env.example .env

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init
```

### Running the Server

```bash
# Development (with hot-reload)
npm run dev

# Production build & start
npm run build
npm start
```

---

## Environment Configuration

### How it works

The server uses **Zod** to validate all environment variables at startup. If any required variable is missing or malformed, the process exits immediately with a clear error message.

### Switching between Development and Production

| Step | Development | Production |
|------|-------------|------------|
| **Env file** | `.env` (loaded by default) | `.env.production` |
| **Set NODE_ENV** | `NODE_ENV=development` (default) | `NODE_ENV=production` |
| **Start command** | `npm run dev` | `npm run build && npm start` |
| **Logging** | Verbose (morgan `dev`, Prisma query logs) | Minimal (morgan `combined`, errors only) |
| **Error details** | Full stack traces in responses | Generic "Something went wrong" |
| **Cookies** | `sameSite: lax`, `secure: false` | `sameSite: none`, `secure: true` |

#### To run in production:

1. Create a `.env.production` file with your production values:
   ```env
   NODE_ENV=production
   PORT=5000
   DATABASE_URL=postgresql://user:pass@prod-host:5432/mydb
   JWT_ACCESS_SECRET=<strong-random-secret>
   JWT_REFRESH_SECRET=<strong-random-secret>
   JWT_ACCESS_EXPIRES_IN=15m
   JWT_REFRESH_EXPIRES_IN=7d
   GOOGLE_CLIENT_ID=<your-google-client-id>
   GOOGLE_CLIENT_SECRET=<your-google-client-secret>
   CORS_ORIGIN=https://your-app.com
   COOKIE_DOMAIN=your-app.com
   ```

2. Build and start:
   ```bash
   npm run build
   NODE_ENV=production node dist/server.js
   ```

---

## API Endpoints

### Auth (`/api/auth`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | No | Register with email & password |
| POST | `/api/auth/login` | No | Login with email & password |
| POST | `/api/auth/google` | No | Login/register via Google ID token |
| POST | `/api/auth/refresh` | No | Refresh access token (cookie or body) |
| POST | `/api/auth/logout` | Yes | Invalidate refresh token |
| GET | `/api/auth/me` | Yes | Get current user profile |

### Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check + environment info |

---

## Authentication Flow

### Email/Password
1. Client sends `POST /api/auth/register` or `POST /api/auth/login`
2. Server returns `accessToken` in JSON body and sets `refreshToken` as an httpOnly cookie
3. Client includes `Authorization: Bearer <accessToken>` on protected requests
4. When access token expires, client sends `POST /api/auth/refresh` (cookie is sent automatically on web; React Native sends token in body)

### Google OAuth (React Native compatible)
1. React Native app obtains a Google `idToken` via `@react-native-google-signin/google-signin`
2. Client sends `POST /api/auth/google` with `{ "idToken": "..." }`
3. Server verifies token with Google, creates/finds user, returns tokens
4. Same refresh flow as above

---

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server with nodemon + ts-node |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled JS from `dist/` |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |
| `npm run prisma:generate` | Generate Prisma Client |
| `npm run prisma:migrate` | Run pending migrations |
| `npm run prisma:studio` | Open Prisma Studio GUI |

---

## Adding a New Module

1. Create a folder under `src/modules/<name>/`
2. Add these files:
   - `<name>.routes.ts` — Express router
   - `<name>.controller.ts` — Route handlers (use `asyncWrapper`)
   - `<name>.service.ts` — Business logic
   - `<name>.validation.ts` — Zod schemas
   - `index.ts` — Re-export router
3. Import and mount the router in `src/app.ts`

---

## License

ISC
