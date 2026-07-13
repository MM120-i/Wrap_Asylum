import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { RootLayout } from "./layouts/root-layout";
import { createMemoryRouter, RouterProvider } from "react-router";
import { Home } from "./screens/home";
import { NewSession } from "./screens/new-session";
import { Session } from "./screens/session";

const router = createMemoryRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: "sessions/new",
        element: <NewSession />,
      },
      {
        path: "sessions/:id",
        element: <Session />,
      },
    ],
  },
]);

const App = () => {
  return <RouterProvider router={router} />;
};

const renderer = await createCliRenderer({
  targetFps: 60,
  exitOnCtrlC: false,
});

createRoot(renderer).render(<App />);
