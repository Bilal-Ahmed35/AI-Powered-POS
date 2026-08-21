# AI-Powered POS System

This repository contains a full-stack, real-time AI-Powered POS system for restaurants and canteens. It features table QR-ordering, role-based dashboards, payment tracking, and inventory forecasting.

## Folder Structure

```text
ai-powered-pos-system/
├── backend/          # Node.js + Express API + Prisma + Socket.io
├── frontend/         # React (Vite) + Tailwind CSS (Dashboards)
├── ai-service/       # Python FastAPI (ML Forecasting)
└── README.md
```

## Running the Backend

1. Navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up database environment variables in `.env`:
   ```env
   DATABASE_URL="postgresql://postgres:password@localhost:5432/pos_db?schema=public"
   ```
4. Run migrations and database seed (which populates demo accounts for all 4 roles):
   ```bash
   npx prisma migrate dev
   npx prisma db seed
   ```
5. Run the dev server:
   ```bash
   npm run dev
   ```

---

## Running the AI Service

1. Navigate to the `ai-service` folder:
   ```bash
   cd ai-service
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI server:
   ```bash
   python main.py
   ```
   The service will run on `http://localhost:8000`.

---

## Demo Credentials (from Seed)

Password for all accounts is: `password123`

- **Admin Dashboard**: `admin@pos.com`
- **Vendor Dashboard**: `vendor@pos.com`
- **Kitchen Dashboard**: `kitchen@pos.com`
- **User Mobile App**: `customer@pos.com`
