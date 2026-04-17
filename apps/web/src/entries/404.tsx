import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { AppWrapper } from "@/common";
import NotFoundPage from "@/pages/404";
import "@/styles/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppWrapper>
      <NotFoundPage />
    </AppWrapper>
  </StrictMode>,
);
