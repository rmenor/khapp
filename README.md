# Next.js SQLite Boilerplate

This is a complete boilerplate for building web applications with Next.js, SQLite, and Authentication. It is designed to be a learning resource and a solid foundation for small to medium projects.

## Features

- **Next.js 15+ (App Router)**: Modern React framework with server-side rendering and static generation.
- **SQLite Database**: Fast, serverless, zero-configuration database using `better-sqlite3`.
- **Authentication**: Custom JWT-based authentication with secure HTTP-only cookies.
- **API Routes**: RESTful API endpoints for handling data and auth.
- **TypeScript**: Type-safe code for better developer experience.
- **Vanilla CSS**: Clean, modern styling without external CSS frameworks (as requested).

## Project Structure

```
├── scripts/
│   └── setup-db.js       # Script to initialize the SQLite database
├── src/
│   ├── app/
│   │   ├── api/          # API Routes (Backend)
│   │   │   ├── auth/     # Auth endpoints (login, register, me)
│   │   │   └── todos/    # Example CRUD endpoint
│   │   ├── dashboard/    # Protected route example
│   │   ├── login/        # Login page
│   │   ├── register/     # Register page
│   │   └── page.tsx      # Landing page
│   ├── lib/
│   │   ├── auth.ts       # JWT and Cookie utilities
│   │   └── db.ts         # Database connection singleton
│   └── middleware.ts     # Route protection middleware
└── database.sqlite       # The SQLite database file (created after setup)
```

## Getting Started

1.  **Install Dependencies**

    ```bash
    npm install
    ```

2.  **Initialize Database**

    Run the setup script to create the `database.sqlite` file and tables.

    ```bash
    node scripts/setup-db.js
    ```

3.  **Run Development Server**

    ```bash
    npm run dev
    ```

    Open [http://localhost:3000](http://localhost:3000) in your browser.

## How it Works

### Database (`src/lib/db.ts`)
We use `better-sqlite3` for synchronous, high-performance SQLite operations. The connection is cached in development to prevent multiple connections during hot-reloading.

### Authentication (`src/lib/auth.ts`)
- **Sign Up**: Hashes the password using `bcryptjs` and stores the user in the DB.
- **Login**: Verifies the password and issues a signed JWT using `jose`.
- **Session**: The JWT is stored in a secure, HTTP-only cookie.
- **Middleware**: `src/middleware.ts` checks for the valid token on protected routes (like `/dashboard`) and redirects if necessary.

### API (`src/app/api/`)
The backend logic resides in Next.js Route Handlers.
- `GET /api/todos`: Fetches todos for the logged-in user.
- `POST /api/todos`: Creates a new todo.

## Customization

- **Styles**: Edit `src/app/globals.css` to change the theme variables.
- **Database**: Modify `scripts/setup-db.js` to add new tables.

## License

MIT
