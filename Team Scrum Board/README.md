# Team Scrum Board

A full-stack web application for project and task management with user authentication, project membership, and a drag-and-drop Scrum board.

## Features

- User registration and login
- Project creation with team members
- Task creation with title, description, status, priority, due date, and assigned user
- Scrum board view with `To Do`, `In Progress`, and `Done` columns
- Drag-and-drop status updates
- PostgreSQL database with Prisma ORM
- React + Vite + Tailwind frontend

## Setup

1. Copy the backend `.env.example` to `backend/.env` and update `DATABASE_URL` and `JWT_SECRET`.
2. Install backend dependencies:

```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run dev
```

3. Install frontend dependencies and run the UI server:

```bash
cd ../frontend
npm install
npm run dev
```

4. Open the application at the URL provided by Vite.
