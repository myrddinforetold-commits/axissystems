import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Companies from "./pages/Companies";
import CreateCompany from "./pages/CreateCompany";
import CompanyShell from "./pages/CompanyShell";
import RoleChatPage from "./pages/RoleChatPage";
import CoSReportPage from "./pages/CoSReportPage";
import AcceptInvitation from "./pages/AcceptInvitation";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/invite/:token" element={<AcceptInvitation />} />
            <Route
              path="/companies"
              element={
                <ProtectedRoute>
                  <Companies />
                </ProtectedRoute>
              }
            />
            <Route
              path="/companies/new"
              element={
                <ProtectedRoute>
                  <CreateCompany />
                </ProtectedRoute>
              }
            />
            <Route
              path="/companies/:id"
              element={
                <ProtectedRoute>
                  <CompanyShell />
                </ProtectedRoute>
              }
            />
            <Route
              path="/companies/:id/roles/:roleId/chat"
              element={
                <ProtectedRoute>
                  <RoleChatPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/companies/:id/roles/:roleId/dashboard"
              element={
                <ProtectedRoute>
                  <CoSReportPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
