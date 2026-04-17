import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { AppWrapper } from "@/common";
import AppPage from "@/pages/app";
import "@/styles/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppWrapper>
      <AppPage />
    </AppWrapper>
  </StrictMode>,
);
