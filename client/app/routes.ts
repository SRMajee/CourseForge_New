import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),

  // 1. Auth Group (Uses Auth Layout)
  layout("routes/auth_layout.tsx", [
    route("login", "routes/login.tsx"),
    route("signup", "routes/signup.tsx"),
  ]),

  // 2. App Group (Uses App Layout)
  layout("routes/layout.tsx", [
    route("dashboard", "routes/dashboard.tsx"),
    route("courses", "routes/courses.tsx"),
    route("settings", "routes/settings.tsx"),
    route("course/:courseId", "routes/course.$courseId.tsx"),
    route(
      "course/:courseId/lesson/:lessonId",
      "routes/course.$courseId.lesson.$lessonId.tsx",
    ),
  ]),
] satisfies RouteConfig;
