# Quiz Platform

This project is a full-stack web application for managing quizzes and live sessions. It provides user authentication, quiz creation and participation, live session hosting and viewing, and detailed results tracking. The backend is built with Node.js and Express, while the frontend uses React.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Backend](#backend)
- [Frontend](#frontend)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- User registration and login with authentication and authorization
- Role-based access control (e.g., instructors and students)
- Create, edit, and delete quizzes
- Take quizzes and view results
- Host and join live sessions with real-time interaction
- View detailed session and instructor results
- Toast notifications and loading overlays for better UX

---

## Tech Stack

**Backend:**

- Node.js
- Express.js
- Passport.js for authentication
- MongoDB (assumed from typical stack, confirm if needed)
- Jest & Supertest for API testing

**Frontend:**

- React.js with hooks and context API
- React Router for routing and protected routes
- CSS for styling
- Custom hooks and context for auth and toast notifications

---

## Getting Started

### Prerequisites

- Node.js (v14+ recommended)
- npm or yarn
- MongoDB instance (cloud)

### Installation

1. Clone the repository:

   ```
   git clone https://github.com/furkan-ylcn/QuizMaster.git
   cd <repository-folder>
   ```
2. Install backend dependencies:

    ```
    cd backend
    npm install
    ```
3. Install frontend dependencies:

    ```
    cd quiz-master-react
    npm install
    ```
4. Start backend server:

    ```
    npm start
    ```
5. Start frontend server:

    ```
    npm start
    ```
6. Open your browser and navigate to http://localhost:3000

---

## Backend
- `server.js` — Entry point for the backend server.
- `auth.js` and `passport.js` — Handle authentication and session management.
- API routes for users, quizzes, live sessions, and authentication.
- Tests for API endpoints using Jest and Supertest.

---

## Frontend
- React components for user interface including registration, login, dashboard, quizzes, live sessions, and results.
- Context providers for authentication and toast notifications.
- Custom hooks for API calls and state management.
- Protected routes to restrict access based on authentication.
- Styling with `App.css`.

---

## Testing
Backend API tests are located in files like:

- `auth.api.test.js`
- `db.test.js`
- `quizzes.api.test.js`
- `live-sessions.api.test.js`
- `users.api.test.js`

Run tests with:

```
    npm test
```

---

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request.

---

## License

MIT License