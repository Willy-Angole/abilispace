# Shiriki Backend API Server

A robust, accessible-first backend API for the Shiriki platform - empowering people with disabilities through technology.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                       │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Hasura GraphQL Engine                         │
│  • Real-time subscriptions                                       │
│  • Role-based access control                                     │
│  • Auto-generated CRUD                                           │
└─────────────────┬────────────────────────────────┬──────────────┘
                  │                                │
                  ▼                                ▼
┌─────────────────────────┐          ┌────────────────────────────┐
│   Express API Server    │          │       PostgreSQL           │
│  • Custom business logic │◄────────│  • Optimized schema        │
│  • Authentication       │          │  • Full-text search        │
│  • File uploads         │          │  • UUID primary keys       │
└─────────────────────────┘          └────────────────────────────┘
```

## 📁 Project Structure

```
serve/
├── hasura/                  # Hasura configuration
│   ├── config.yaml         # Hasura CLI config
│   └── metadata/           # Table tracking, permissions, actions
│
├── src/
│   ├── config/             # Environment configuration
│   ├── database/           # Schema, seeds, connection pool
│   ├── middleware/         # Auth, rate limiting, logging
│   ├── routes/             # API route handlers
│   ├── services/           # Business logic layer
│   ├── utils/              # Helpers and utilities
│   └── index.ts            # Application entry point
│
├── docker-compose.yaml     # Docker services
├── Dockerfile              # Production container
└── package.json            # Dependencies
```

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- pnpm 8+
- Docker & Docker Compose
- PostgreSQL 16+ (or use Docker)

### Quick Start with Docker

```bash
# 1. Clone and navigate
cd serve

# 2. Create environment file
cp .env.example .env

# 3. Start all services
docker-compose up -d

# 4. Access services
# - API Server: http://localhost:3000
# - Hasura Console: http://localhost:8080
# - PostgreSQL: localhost:5432
```

### Local Development

```bash
# 1. Install dependencies
pnpm install

# 2. Start PostgreSQL and Hasura
docker-compose up -d postgres hasura

# 3. Run development server
pnpm run dev
```

## 📚 API Documentation

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Create new account |
| `/api/auth/login` | POST | Authenticate user |
| `/api/auth/refresh` | POST | Refresh access token |
| `/api/auth/logout` | POST | Revoke tokens |
| `/api/auth/me` | GET | Get current user |

### Users

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/users/profile` | GET | Get user profile |
| `/api/users/profile` | PUT | Update profile |
| `/api/users/accessibility-settings` | GET | Get accessibility settings |
| `/api/users/accessibility-settings` | PUT | Update settings |

### Events

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/events` | GET | List events (with filters) |
| `/api/events/:id` | GET | Get event details |
| `/api/events/register` | POST | Register for event |
| `/api/events/:id/registration` | DELETE | Cancel registration |

### Messaging

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/messaging/conversations` | GET | List conversations |
| `/api/messaging/conversations` | POST | Create conversation |
| `/api/messaging/messages` | POST | Send message |
| `/api/messaging/conversations/:id/messages` | GET | Get messages |

### Articles

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/articles` | GET | List articles (with filters) |
| `/api/articles/:id` | GET | Get article details |
| `/api/articles/:id/bookmark` | POST | Bookmark article |
| `/api/articles/:id/bookmark` | DELETE | Remove bookmark |

## 🔧 Configuration

### Environment Variables

```env
# Server
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgres://user:pass@localhost:5432/shiriki

# JWT (single secret; access default 15m, refresh default 7d)
JWT_SECRET=your-secret-key-at-least-32-characters
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Hasura
HASURA_GRAPHQL_URL=http://localhost:8080/v1/graphql
HASURA_GRAPHQL_ADMIN_SECRET=your-admin-secret
```

## 🛡️ Security Features

- **bcrypt** password hashing (adaptive cost; default 12 rounds)
- **JWT** with short-lived access tokens (default **15m**) and refresh rotation (default **7d**)
- **httpOnly cookies** for access/refresh (plus in-memory Bearer on the SPA for XSS resistance)
- **CSRF** protection for cookie-authenticated mutating requests (Bearer exempt)
- **Rate limiting** (token bucket in-memory; Redis when `REDIS_URL` is set)
- **Zod validation** on request inputs
- **Parameterized queries** preventing SQL injection
- **CORS** and helmet middleware + HSTS in production
- **Strict rate limits** on user and admin login
- **Authenticated + rate-limited** AI chat endpoint
- **Allowlisted file uploads** with size and content checks
- **Request logging** with sensitive data filtering

### Messaging privacy note

Peer messaging is **server-mediated over HTTPS**. It is **not** end-to-end encrypted. Do not claim E2E in product copy or AI prompts.

## 🎯 Design Patterns

### Singleton Pattern
Database pool and application instances use singleton pattern to ensure single instance across the application.

### Repository Pattern
Services act as repositories, abstracting database operations from route handlers.

### Chain of Responsibility
Middleware chain for authentication, validation, and error handling.

### Factory Pattern
Connection pool factory for database transactions.

## 📊 Database Schema Highlights

- **UUID primary keys** for distributed systems
- **JSONB columns** for flexible data storage
- **GIN indexes** for full-text search
- **Partial indexes** for optimized queries
- **Soft deletes** for data recovery
- **Audit timestamps** on all tables

## 🧪 Testing

```bash
# Run unit tests (validators, password, cookies)
pnpm test

# Run specific test file
pnpm test -- password.test.ts
```

CI runs lint/typecheck/tests via `.github/workflows/ci.yml`.

## 🗄 Migrations

```bash
# Apply SQL migrations in order (tracked in schema_migrations)
pnpm migrate

# Apply seeds.sql
pnpm seed
```

## Architecture boundary

- **Express API** owns auth, business rules, uploads, admin, and AI chat.
- **Hasura** provides GraphQL/RBAC for selected tables; keep permissions in sync with Express authorization.
- Prefer Express for sensitive write paths when in doubt.

## 📈 Performance Optimizations

1. **Connection Pooling**: Min 2, Max 20 connections
2. **Query Optimization**: Efficient filtering with partial indexes
3. **Cursor Pagination**: For large datasets
4. **Batch Operations**: Bulk inserts and updates
5. **Caching Ready**: Designed for Redis integration

## 🚢 Deployment

### Production Build

```bash
# Build TypeScript
pnpm run build

# Start production server
pnpm start
```

### Docker Production

```bash
# Build and run production container
docker-compose -f docker-compose.yaml up -d api
```

## 📝 License

MIT License - See LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

Built with ❤️ for the disability community.
