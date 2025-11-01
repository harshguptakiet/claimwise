import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import UploadPage from "./pages/UploadPage";
import UploadConfirmation from "./pages/UploadConfirmation";
import TeamClaimsPage from "./pages/TeamClaimsPage";
import ClaimDetailPage from "./pages/ClaimDetailPage";
import DashboardPage from "./pages/DashboardPage";
import RulesPage from "./pages/RulesPage";
import QueuesPage from "./pages/QueuesPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/upload-confirmation" element={<UploadConfirmation />} />
          <Route path="/team" element={<TeamClaimsPage />} />
          <Route path="/team/claims/:id" element={<ClaimDetailPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/rules" element={<RulesPage />} />
          <Route path="/queues" element={<QueuesPage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
