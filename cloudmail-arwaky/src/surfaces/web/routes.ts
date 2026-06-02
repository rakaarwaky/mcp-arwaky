import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  route("/", "./routes/public/login.tsx"),
  layout("./components/LayoutWrapper.tsx", [
    route("dashboard", "./routes/protected/dashboard.tsx"),
    route("inbox", "./routes/protected/inbox.tsx"),
    route("inbox/:emailId", "./routes/protected/email.tsx"),
    route("users", "./routes/protected/users.tsx"),
    route("users/:userId", "./routes/protected/user-edit.tsx"),
    route("settings", "./routes/protected/settings.tsx"),
  ]),
] satisfies RouteConfig;
