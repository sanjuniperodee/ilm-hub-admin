# ILM HUB Admin Panel

Admin panel for managing ILM HUB educational content.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```
VITE_API_URL=http://localhost:3000/api/v1
```

3. Start development server:
```bash
npm run dev
```

The admin panel will be available at `http://localhost:3001`

## Features

- User management (view users, user details)
- Course management (CRUD)
- Module management (CRUD)
- Lesson management (CRUD)
- Lesson Block management (CRUD)

## Authentication

Use your admin credentials to login. The JWT token will be stored in localStorage.

## Pages

- `/login` - Login page
- `/dashboard` - Dashboard with statistics
- `/users` - List of users
- `/users/:id` - User details
- `/courses` - List of courses
- `/courses/new` - Create new course
- `/courses/:id` - Edit course
- `/modules` - List of modules
- `/modules/new` - Create new module
- `/modules/:id` - Edit module
- `/lessons` - List of lessons
- `/lessons/new` - Create new lesson
- `/lessons/:id` - Edit lesson
- `/lesson-blocks` - List of lesson blocks
- `/lesson-blocks/new` - Create new lesson block
- `/lesson-blocks/:id` - Edit lesson block
