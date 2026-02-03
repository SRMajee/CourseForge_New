import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),

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
  route("*", "routes/$.tsx"),
] satisfies RouteConfig;
