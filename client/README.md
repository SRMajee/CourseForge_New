# Welcome to React Router!

A modern, production-ready template for building full-stack React applications using React Router.

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/remix-run/react-router-templates/tree/main/default)

## Features

- 🚀 Server-side rendering
- ⚡️ Hot Module Replacement (HMR)
- 📦 Asset bundling and optimization
- 🔄 Data loading and mutations
- 🔒 TypeScript by default
- 🎉 TailwindCSS for styling
- 📖 [React Router docs](https://reactrouter.com/)

## Getting Started

### Installation

Install the dependencies:

```bash
npm install
```

### Development

Start the development server with HMR:

```bash
npm run dev
```

Your application will be available at `http://localhost:5173`.

## Building for Production

Create a production build:

```bash
npm run build
```

## Deployment

### Docker Deployment

To build and run using Docker:

```bash
docker build -t my-app .

# Run the container
docker run -p 3000:3000 my-app
```

The containerized application can be deployed to any platform that supports Docker, including:

- AWS ECS
- Google Cloud Run
- Azure Container Apps
- Digital Ocean App Platform
- Fly.io
- Railway

### DIY Deployment

If you're familiar with deploying Node applications, the built-in app server is production-ready.

Make sure to deploy the output of `npm run build`

```
├── package.json
├── package-lock.json (or pnpm-lock.yaml, or bun.lockb)
├── build/
│   ├── client/    # Static assets
│   └── server/    # Server-side code
```

## Styling

This template comes with [Tailwind CSS](https://tailwindcss.com/) already configured for a simple default starting experience. You can use whatever CSS framework you prefer.

---

Built with ❤️ using React Router.







Here is the implementation roadmap divided into phases, structured logically from **Foundation** to **Feature Completion**.

### **Phase 1: Foundation & Infrastructure**

* **Goal:** Get the app running with the correct configuration and design system.
* **Tasks:**
1. **Project Setup:** Initialize Vite + React + TypeScript.
2. **Dependency Install:** Add `@chakra-ui/react`, `@emotion/react`, `react-router`, `axios`, etc.
3. **Directory Structure:** Create the `app`, `features`, `routes` folders as planned.
4. **Theming (Chakra UI):**
* Create `theme/index.ts`, `colors.ts`, and `typography.ts`.
* Define global styles and font imports.


5. **Entry Point:** Configure `root.tsx` with `<ChakraProvider>`, `<Meta>`, and `<Links>`.



### **Phase 2: Routing Shell & Layouts**

* **Goal:** Create the navigable skeleton of the application.
* **Tasks:**
1. **Global Layout:** Build `components/layout/Navbar.tsx` and `Sidebar.tsx`.
2. **Root Route:** Implement the persistent layout in `routes/root.tsx` (Sidebar + Outlet).
3. **Route Definitions:** Create empty placeholder files for key routes:
* `routes/_index.tsx` (Landing)
* `routes/dashboard.tsx`
* `routes/course.$courseId.tsx`


4. **Navigation:** Wire up links in the Navbar to these routes.
5. **Error Handling:** Create a generic `ErrorBoundary` in `root.tsx` and a 404 page in `routes/$.tsx`.



### **Phase 3: Authentication Feature**

* **Goal:** Secure the application and handle user identity.
* **Tasks:**
1. **API Services:** Set up `services/api.ts` (Axios instance) and `services/authService.ts`.
2. **Auth Components:** Build `features/auth/components/LoginButton.tsx`.
3. **Auth Route:** Implement `routes/login.tsx` (if using a custom page) or Auth0 redirection logic.
4. **Protected Route Logic:** Create a utility to check auth status in RR7 `loaders`.



### **Phase 4: Course Management (Core Domain)**

* **Goal:** Allow users to view and manage their courses.
* **Tasks:**
1. **Types:** Define `Course`, `Module` interfaces in `types/course.ts`.
2. **Mock Data/API:** Create `services/courseService.ts` with fetch functions.
3. **UI Components:** Build `features/course/components/CourseCard.tsx` and `CourseList.tsx`.
4. **Dashboard Route:** Connect `routes/dashboard.tsx` to the course service using a **Loader**.
5. **Course Detail:** Implement `routes/course.$courseId.tsx` to show modules and metadata.



### **Phase 5: Lesson Rendering Engine**

* **Goal:** The complex interactive part where users learn.
* **Tasks:**
1. **Block Components:** Build atomic block renderers in `features/lesson/blocks/` (e.g., `HeadingBlock`, `MCQBlock`, `CodeBlock`).
2. **Renderer:** Build `features/lesson/components/LessonRenderer.tsx` that maps JSON data to Block components.
3. **Lesson Route:** Implement `routes/lesson.$lessonId.tsx`.
4. **State Management:** Use local state or a hook (`useLessonProgress`) to track completion of blocks.



### **Phase 6: Advanced Features & Polish**

* **Goal:** Add "delighters" and robustness.
* **Tasks:**
1. **PDF Export:** Implement `features/export/components/LessonPDFExporter.tsx`.
2. **Loading States:** Add Skeleton loaders (`components/common/SkeletonLoader.tsx`) for data fetching transitions.
3. **Interactive Feedback:** Add Toast notifications for success/error actions.
4. **Mobile Responsiveness:** Tweak Chakra responsive props (e.g., `w={{ base: '100%', md: '50%' }}`) across all views.


It is definitely time to connect the backend. Since you have the Mongoose schemas ready, we can move from "Mock Data" to "Real Data."

Here is the **Backend Integration Roadmap** (Phases), ensuring we fill the gaps (Settings, My Courses) as we go.

### **Phase 1: Real Authentication (Auth0 + MongoDB)**

* **Goal:** Replace the "Demo User" with real Auth0 login and sync it to your MongoDB `User` collection.
* **Frontend Tasks:**
1. Install Auth0 SDK (`@auth0/auth0-react`).
2. Replace `authStore` mock logic with Auth0 hooks.
3. Create an **Axios Interceptor**: This automatically attaches the JWT Token (`Authorization: Bearer xyz`) to every request.
4. **Sync:** Call your backend `POST /auth/sync` on login to ensure the user is saved in MongoDB.



### **Phase 2: "My Courses" & Read Operations**

* **Goal:** Users only see *their* courses from the database.
* **Frontend Tasks:**
1. **Build UI:** Create the missing `routes/my-courses.tsx` page (reuse `CourseCard`).
2. **API:** Update `courseService.ts` to hit `GET /api/courses` (using the Axios client from Phase 1).
3. **Detail View:** Update `GET /api/courses/:id` to fetch the real modules and lessons.



### **Phase 3: The AI Generator (Write Operations)**

* **Goal:** Send a prompt to the backend and receive a generated course.
* **Frontend Tasks:**
1. **Build UI:** Create the "Create Course" Modal/Form (Input for topic, difficulty).
2. **API:** Connect `POST /api/courses/generate`.
3. **Loading State:** Handle the long wait time (AI generation) with a nice progress UI or Polling.
4. **Credits:** Update the UI to show/deduct "Credits" (from your User schema) when a course is generated.



### **Phase 4: Settings & User Profile**

* **Goal:** Manage account details.
* **Frontend Tasks:**
1. **Build UI:** Create `routes/settings.tsx`.
2. **API:** Connect `PUT /api/users/me` to update name/avatar.
3. **Manage:** Show Credit usage or subscription status.



---

### **Immediate Next Step**

Since **Settings** and **My Courses** pages are missing, I recommend we **scaffold them now (Phase 0)** using the existing mocks. This ensures the entire UI shell is complete *before* we complicate things with API debugging.

**Shall we create the "My Courses" and "Settings" pages now?**