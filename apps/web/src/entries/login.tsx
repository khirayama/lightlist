import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { AppWrapper } from "@/common";
import LoginPage from "@/pages/login";
import "@/styles/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppWrapper>
      <LoginPage />
    </AppWrapper>
  </StrictMode>,
);
