import { useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { Login } from "./pages/Login";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/Layout";
import { PermissionsProvider } from "./contexts/PermissionsContext";
import { ClientDashboard } from "./pages/client/ClientDashboard";
import { ClientVideos } from "./pages/client/ClientVideos";
import { ClientDesigns } from "./pages/client/ClientDesigns";
import { ClientReceipts } from "./pages/client/ClientReceipts";
import { ClientFinance } from "./pages/client/ClientFinance";
import { ClientProfile } from "./pages/client/ClientProfile";
import { ClientRevisions } from "./pages/client/ClientRevisions";
import { LockedService } from "./pages/client/LockedService";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { AdminClients } from "./pages/admin/AdminClients";
import { AdminStaff } from "./pages/admin/AdminStaff";
import { AdminContent } from "./pages/admin/AdminContent";
import { AdminCalendar } from "./pages/admin/AdminCalendar";
import { AdminAdsReports } from "./pages/admin/AdminAdsReports";
import { AdminMetaIntegration } from "./pages/admin/AdminMetaIntegration";
import { AdminReceipts } from "./pages/admin/AdminReceipts";
import { AdminRevisions } from "./pages/admin/AdminRevisions";
import { AdminCampaigns } from "./pages/admin/AdminCampaigns";
import { AdminLogs } from "./pages/admin/AdminLogs";
import AdminMailSettings from "./pages/admin/AdminMailSettings";
import { NotificationCenter } from "./pages/shared/NotificationCenter";
import { NoPermission } from "./pages/shared/NoPermission";
import { getUser } from "./utils/auth";
import { tr } from "./utils/translations";

function App() {
  const user = getUser();

  return (
    <div className="App">
      <Toaster position="top-right" />
      <BrowserRouter>
        <PermissionsProvider>
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
            <Route path="designs" element={<ClientDesigns />} />
            <Route path="receipts" element={<ClientReceipts />} />
            <Route path="finance" element={<ClientFinance />} />
            <Route path="profile" element={<ClientProfile />} />
            <Route path="revisions" element={<ClientRevisions />} />
            <Route path="notifications" element={<NotificationCenter userRole="client" />} />
            <Route
              path="social-media"
              element={<LockedService serviceName={tr.services.socialMedia} description={tr.services.socialMediaDesc} />}
            />
            <Route
              path="ads"
              element={<LockedService serviceName={tr.services.metaAds} description={tr.services.metaAdsDesc} />}
            />
            <Route
              path="website"
              element={<LockedService serviceName={tr.services.websiteSetup} description={tr.services.websiteSetupDesc} />}
            />
            <Route
              path="ecommerce"
              element={<LockedService serviceName={tr.services.ecommerce} description={tr.services.ecommerceDesc} />}
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
            <Route path="staff" element={<AdminStaff />} />
            <Route path="content" element={<AdminContent />} />
            <Route path="calendar" element={<AdminCalendar />} />
            <Route path="ads-reports" element={<AdminAdsReports />} />
            <Route path="meta-integration" element={<AdminMetaIntegration />} />
            <Route path="receipts" element={<AdminReceipts />} />
            <Route path="revisions" element={<AdminRevisions />} />
            <Route path="campaigns" element={<AdminCampaigns />} />
            <Route path="logs" element={<AdminLogs />} />
            <Route path="notifications" element={<NotificationCenter userRole="admin" />} />
            <Route path="mail-settings" element={<AdminMailSettings />} />
          </Route>

          {/* Staff Routes - Permission-based access */}
          <Route
            path="/staff"
            element={
              <ProtectedRoute allowedRoles={['staff']}>
                <Layout role="staff" />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="clients" element={<AdminClients />} />
            <Route path="content" element={<AdminContent />} />
            <Route path="calendar" element={<AdminCalendar />} />
            <Route path="receipts" element={<AdminReceipts />} />
            <Route path="revisions" element={<AdminRevisions />} />
            <Route path="ads-reports" element={<AdminAdsReports />} />
            <Route path="notifications" element={<NotificationCenter userRole="staff" />} />
            <Route path="no-permission" element={<NoPermission />} />
          </Route>
        </Routes>
        </PermissionsProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
