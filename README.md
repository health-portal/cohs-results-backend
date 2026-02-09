# COHS Results Backend

A robust backend service built with [NestJS](https://nestjs.com/) for managing academic results at the College of Health Sciences (COHS). This system handles student data processing, result computations via expressions, and automated notifications.

## 🚀 Features

- **Authentication & Authorization**: Secure JWT-based authentication using Passport.js and Argon2 hashing.
- **Database Management**: Type-safe database interactions using **Prisma ORM**.
- **Background Tasks**: High-performance job queuing using **pg-boss**.
- **Email Service**: Transactional email integration via **SMTPExpress**.
- **Data Processing**: Support for large-scale data imports using **CSV (Papaparse)** and **Excel (XLSX)**.
- **Dynamic Calculations**: Arithmetic result evaluation using `expr-eval`.

## 🛠 Tech Stack

- **Framework**: NestJS (Node.js)
- **Database**: PostgreSQL + Prisma ORM
- **Task Queue**: pg-boss (Postgres-based)
- **Mailing**: SMTPExpress
- **Environment Management**: dotenv-cli & envalid

---

## 📋 Prerequisites

- **Node.js**: v18 or higher (v20+ recommended)
- **Docker**: For running the database locally.
- **Package Manager**: npm

---

## ⚙️ Installation & Environment

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd cohs-results-backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Setup Environment Variables:**
   Copy the example environment file and fill in your values:
   ```bash
   cp .env.example .env
   ```

### Environment Variables Breakdown
| Variable | Description |
| :--- | :--- |
| `DATABASE_URL` | The PostgreSQL connection URI (`postgres` for local Docker). |
| `DEFAULT_ADMINS` | A JSON string array `[{"name":"...", "email":"..."}]` for seed data. |
| `FRONTEND_BASE_URL` | The URL of the frontend app (for CORS and email links). |
| `JWT_SECRET` | Secret key for signing authentication tokens. |
| `PORT` | The port the server listens on (e.g., 5000). |
| `SMTPEXPRESS_*` | Project ID, Secret, and Verified Email from SMTPExpress. |

---

## 🗄 Database Setup

### Local Development (Docker)
To quickly start a PostgreSQL instance locally:
```bash
docker run --name cohs-db -e POSTGRES_USER=user -e POSTGRES_PASSWORD=password -e POSTGRES_DB=db -p 5432:5432 -d postgres
```
*Note: Ensure your `DATABASE_URL` in `.env` matches these credentials.*

### Prisma Workflow
1. **Generate Prisma Client:**
   ```bash
   npm run generate
   ```
2. **Run Migrations:**
   ```bash
   npm run migrate:dev
   ```
3. **Seed the Database:**
   ```bash
   npm run seed
   ```

---

## 🏃‍♂️ Running the Application

### Development
```bash
# Start API, Workers, and Cron concurrently
npm run start:all

# Or start individually
npm run start:dev      # API only
npm run start:workers  # Background jobs
npm run start:cron     # Scheduled tasks
```

### Staging & Production
When running commands for specific environments, use `dotenv-cli` to load the correct configuration file:

```bash
# Run migrations for staging
npx dotenv -e .env.staging -- npm run migrate:deploy

# Seed production database
npx dotenv -e .env.production -- npm run seed:prod

# Start the production build
npx dotenv -e .env.production -- npm run start
```

---

## 📂 Project Structure

- `src/prisma/`: Database schema, migrations, and seeders.
- `src/workers.ts`: Entry point for pg-boss job consumers.
- `src/cron.ts`: Entry point for scheduled system tasks.
- `src/main.ts`: Main API entry point.
