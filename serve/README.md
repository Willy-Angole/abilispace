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

# JWT
JWT_ACCESS_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Hasura
HASURA_GRAPHQL_URL=http://localhost:8080/v1/graphql
HASURA_GRAPHQL_ADMIN_SECRET=your-admin-secret
```

## 🛡️ Security Features

- **Argon2id** password hashing (memory-hard, timing-safe)
- **JWT** with short-lived access tokens and refresh rotation
- **Rate limiting** using Token Bucket algorithm
- **Zod validation** on all inputs
- **Parameterized queries** preventing SQL injection
- **CORS** and helmet middleware
- **Request logging** with sensitive data filtering

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
# Run tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run specific test file
pnpm test -- auth.service.test.ts
```

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
