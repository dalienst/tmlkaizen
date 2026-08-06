# Kaizen Tracker — Initial Setup & Configuration

This guide provides instructions for setting up, configuring, and initializing the Kaizen Tracker application in a local environment.

---

## 📋 Prerequisites
Before you start, ensure you have the following installed:
* **Node.js** (v18.x or v20.x recommended)
* **npm** (v9.x or higher)
* **PostgreSQL** instance (Neon, local, or hosted)

---

## ⚙️ Environment Variables Configuration

Create a `.env.local` file in the project root directory. Populate the file with the following variables:

```ini
# PostgreSQL Database Connection URL (PgBouncer/Serverless pooler supported)
DATABASE_URL="postgres://username:password@hostname:5432/databasename?sslmode=require"

# NextAuth Configuration
# Run `openssl rand -base64 32` to generate a secure secret key
AUTH_SECRET="your-super-secret-key-here"
NEXTAUTH_SECRET="your-super-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# Resend API Key for dispatching transaction emails
RESEND_API_KEY="re_123456789abcdef"

# Cloudinary Config for Uploading Submissions Photos
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="your-cloudinary-cloud-name"
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET="your-unsigned-upload-preset-name"
```

> [!IMPORTANT]
> Ensure your Cloudinary Upload Preset is set to **Unsigned** in your Cloudinary Dashboard under *Settings > Upload Settings > Upload Presets*, otherwise client uploads will fail with unauthorized exceptions.

---

## 📦 Dependency Installation

Run the following command in the project root to pull down package dependencies:
```bash
npm install
```

---

## 🗄️ Database Setup & Schema Migrations

The platform uses **Drizzle ORM** to manage PostgreSQL database migrations. Follow these commands to initialize and sync your database:

### 1. Generate Migrations
Generate SQL migration scripts based on the schema mapping in `src/db/schema.ts`:
```bash
npm run db:generate
```

### 2. Apply Migrations
Apply generated SQL files directly to your live database instance:
```bash
npm run db:migrate
```

---

## 🚀 Running the Development Server

Start Next.js in development mode:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## 🏁 Initializing the System (First-Run Setup)

Once the application is running, follow these steps to initialize the platform configuration:

### 1. Register the System Admin Account
Navigate to: **[http://localhost:3000/setup](http://localhost:3000/setup)**
* Fill in your Name, Email, and password.
* This setup wizard is **only accessible once**. Once a `SYSTEM_ADMIN` user is saved in the database, the route redirects permanently to the login screen.

### 2. Configure the System Hierarchy
Log in to the Admin Dashboard as your newly created System Admin and configure:
1. **Locations**: Add your physical branch locations (e.g. *Mombasa*, *Nairobi*).
2. **Departments**: Create departments and associate them with a location (e.g. *Kitchen (Mombasa)*, *Marketing (Nairobi)*).
3. **Core Values**: Add company values that submissions will target.
4. **Users**: Create your first **HR**, **General Manager (GM)**, or **Department Manager** accounts.

### 3. Build the Staff Roster (HR)
Log in as the **HR** account:
* Go to the **Roster** tab.
* Upload a CSV roster or click **Bulk Add Staff** to input your staff members.
* Staff members must exist in this roster for the public identity verification to permit submission.
