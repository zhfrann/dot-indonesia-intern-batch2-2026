# Table of Contents

- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Database Setup](#database-setup)
  - [Running the Application](#running-the-application)

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher recommended)
- **npm** or **yarn** or **pnpm**
- **MariaDB** or **MySQL** (v10.6+ for MariaDB, v8.0+ for MySQL)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/nest-contact-management.git
   cd nest-contact-management
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Copy environment file**

   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables** (see [Environment Variables](#environment-variables))

5. **Generate Prisma client**

   ```bash
   npx prisma generate
   ```

### Environment Variables

Create a `.env` file in the root directory with the following variables:

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Application environment | `development` | No |
| `PORT` | Server port | `3000` | No |
| `DATABASE_URL` | Full database connection URL | - | Yes |
| `DATABASE_HOST` | Database host | `localhost` | Yes |
| `DATABASE_PORT` | Database port | `3306` | No |
| `DATABASE_USER` | Database username | - | Yes |
| `DATABASE_PASSWORD` | Database password | - | Yes |
| `DATABASE_NAME` | Database name | - | Yes |
| `JWT_ACCESS_SECRET` | JWT access token secret (min 10 chars) | - | Yes |
| `JWT_REFRESH_SECRET` | JWT refresh token secret (min 10 chars) | - | Yes |
| `JWT_ACCESS_EXPIRES_IN` | Access token expiration | `15m` | No |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiration | `7d` | No |
| `RATE_LIMIT_DEFAULT_TTL_MS` | Rate limit time window (ms) | `60000` | No |
| `RATE_LIMIT_DEFAULT_LIMIT` | Max requests per time window | `120` | No |

**Example `.env` file:**

```env
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL="mysql://user:password@localhost:3306/contact_management"
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USER=your_username
DATABASE_PASSWORD=your_password
DATABASE_NAME=contact_management

# JWT (generate secure random strings for production)
JWT_ACCESS_SECRET=your_access_secret_min_10_chars
JWT_REFRESH_SECRET=your_refresh_secret_min_10_chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Rate Limiting
RATE_LIMIT_DEFAULT_TTL_MS=60000
RATE_LIMIT_DEFAULT_LIMIT=120
```

### Database Setup

1. **Create the database**

   ```sql
   CREATE DATABASE contact_management;
   ```

2. **Run Prisma migrations** (when available)

   ```bash
   npx prisma migrate dev
   ```

3. **Seed the database** (when available)

   ```bash
   npx prisma db seed
   ```

### Running the Application

```bash
# Development mode (with hot reload)
npm run start:dev

# Production mode
npm run build
npm run start:prod

# Debug mode
npm run start:debug
```

The API will be available at `http://localhost:3000` (or your configured PORT).
