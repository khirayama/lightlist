import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { AppWrapper } from "@/common";
import IndexPage from "@/pages/index";
import "@/styles/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppWrapper>
      <IndexPage />
    </AppWrapper>
  </StrictMode>,
);
