import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router";

export const NewSession = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { message?: string } | null;

  useEffect(() => {
    if (!state?.message) {
      navigate("/", { replace: true });
    }
  }, [state, navigate]);

  if (!state?.message) {
    return null;
  }

  return (
    <box flexGrow={1} padding={2} flexDirection="column" gap={1}>
      <text>Creating session...</text>
      <text>{state.message}</text>
    </box>
  );
};
