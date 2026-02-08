import { useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { Login } from "./pages/Login";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/Layout";
import { ClientDashboard } from "./pages/client/ClientDashboard";
import { ClientVideos } from "./pages/client/ClientVideos";
import { LockedService } from "./pages/client/LockedService";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { AdminClients } from "./pages/admin/AdminClients";
import { getUser } from "./utils/auth";

function App() {
  const user = getUser();

  return (
    <div className="App">
      <Toaster position="top-right" />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route
            path="/"
            element={
              user?.role === 'admin' ? <Navigate to="/admin/dashboard" replace /> :
              user?.role === 'staff' ? <Navigate to="/staff/dashboard" replace /> :
              user?.role === 'client' ? <Navigate to="/client/dashboard" replace /> :
              <Navigate to="/login" replace />
            }
          />

          {/* Client Routes */}
          <Route
            path="/client"
            element={
              <ProtectedRoute allowedRoles={['client']}>
                <Layout role="client" clientId={user?.client_id} />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<ClientDashboard />} />
            <Route path="videos" element={<ClientVideos />} />
            <Route
              path="social-media"
              element={<LockedService serviceName="Social Media Management" description="Manage your social media content calendar and posts" />}
            />
            <Route
              path="ads"
              element={<LockedService serviceName="Meta Ads Management" description="Track and optimize your Facebook and Instagram ad campaigns" />}
            />
            <Route
              path="designs"
              element={<LockedService serviceName="Graphic Design" description="Access your design files and request revisions" />}
            />
            <Route
              path="website"
              element={<LockedService serviceName="Website Setup" description="Professional website development and setup services" />}
            />
            <Route
              path="ecommerce"
              element={<LockedService serviceName="E-commerce Management" description="Complete e-commerce store management and optimization" />}
            />
          </Route>

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Layout role="admin" />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="clients" element={<AdminClients />} />
            <Route path="staff" element={<div className="p-8">Staff Management - Coming Soon</div>} />
            <Route path="content" element={<div className="p-8">Content Management - Coming Soon</div>} />
            <Route path="calendar" element={<div className="p-8">Calendar - Coming Soon</div>} />
            <Route path="ads-reports" element={<div className="p-8">Ads Reports - Coming Soon</div>} />
            <Route path="receipts" element={<div className="p-8">Receipt Management - Coming Soon</div>} />
            <Route path="campaigns" element={<div className="p-8">Campaign Generator - Coming Soon</div>} />
            <Route path="logs" element={<div className="p-8">Activity Logs - Coming Soon</div>} />
          </Route>

          {/* Staff Routes */}
          <Route
            path="/staff"
            element={
              <ProtectedRoute allowedRoles={['staff']}>
                <Layout role="staff" />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<div className="p-8">Staff Dashboard - Coming Soon</div>} />
            <Route path="clients" element={<AdminClients />} />
            <Route path="content" element={<div className="p-8">Content Management - Coming Soon</div>} />
            <Route path="calendar" element={<div className="p-8">Calendar - Coming Soon</div>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
