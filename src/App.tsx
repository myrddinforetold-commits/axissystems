import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Companies from "./pages/Companies";
import CreateCompany from "./pages/CreateCompany";
import CompanyShell from "./pages/CompanyShell";
import RoleChatPage from "./pages/RoleChatPage";
import CoSReportPage from "./pages/CoSReportPage";
import AcceptInvitation from "./pages/AcceptInvitation";
import OutputsLibrary from "./pages/OutputsLibrary";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminCompanies from "./pages/admin/AdminCompanies";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminAccessRequests from "./pages/admin/AdminAccessRequests";
import AdminSettings from "./pages/admin/AdminSettings";
import MaintenancePage from "./pages/MaintenancePage";
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
              path="/companies/:id/outputs"
              element={
                <ProtectedRoute>
                  <OutputsLibrary />
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
              path="/company/:companyId/role/:roleId"
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
            {/* Admin Routes */}
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminLayout />
                </AdminRoute>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="companies" element={<AdminCompanies />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="access-requests" element={<AdminAccessRequests />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>
            <Route path="/maintenance" element={<MaintenancePage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
