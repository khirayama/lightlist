import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { AppWrapper } from "@/common";
import SharecodesPage from "@/pages/sharecodes";
import "@/styles/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppWrapper>
      <SharecodesPage />
    </AppWrapper>
  </StrictMode>,
);
