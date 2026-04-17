import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { AppWrapper } from "@/common";
import ServerErrorPage from "@/pages/500";
import "@/styles/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppWrapper>
      <ServerErrorPage />
    </AppWrapper>
  </StrictMode>,
);
