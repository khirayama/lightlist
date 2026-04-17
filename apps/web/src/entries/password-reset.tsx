import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { AppWrapper } from "@/common";
import PasswordResetPage from "@/pages/password_reset";
import "@/styles/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppWrapper>
      <PasswordResetPage />
    </AppWrapper>
  </StrictMode>,
);
