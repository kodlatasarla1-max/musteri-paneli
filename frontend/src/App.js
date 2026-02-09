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
import { AdminStaff } from "./pages/admin/AdminStaff";
import { getUser } from "./utils/auth";
import { tr } from "./utils/translations";

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
              element={<LockedService serviceName={tr.services.socialMedia} description={tr.services.socialMediaDesc} />}
            />
            <Route
              path="ads"
              element={<LockedService serviceName={tr.services.metaAds} description={tr.services.metaAdsDesc} />}
            />
            <Route
              path="designs"
              element={<LockedService serviceName={tr.services.graphicDesign} description={tr.services.graphicDesignDesc} />}
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
            <Route path="content" element={<div className="p-8"><h1 className="text-3xl font-medium text-slate-900 mb-4">İçerik Yönetimi</h1><p className="text-slate-600">Video ve tasarım yükleme sistemi yakında eklenecek...</p></div>} />
            <Route path="calendar" element={<div className="p-8"><h1 className="text-3xl font-medium text-slate-900 mb-4">Takvim</h1><p className="text-slate-600">Etkinlik ve çekim takvimi yakında eklenecek...</p></div>} />
            <Route path="ads-reports" element={<div className="p-8"><h1 className="text-3xl font-medium text-slate-900 mb-4">Reklam Raporları</h1><p className="text-slate-600">Reklam performans raporları yakında eklenecek...</p></div>} />
            <Route path="receipts" element={<div className="p-8"><h1 className="text-3xl font-medium text-slate-900 mb-4">Makbuz Yönetimi</h1><p className="text-slate-600">Ödeme makbuzu onay sistemi yakında eklenecek...</p></div>} />
            <Route path="campaigns" element={<div className="p-8"><h1 className="text-3xl font-medium text-slate-900 mb-4">Kampanya Oluşturucu</h1><p className="text-slate-600">Kampanya ve pop-up oluşturma sistemi yakında eklenecek...</p></div>} />
            <Route path="logs" element={<div className="p-8"><h1 className="text-3xl font-medium text-slate-900 mb-4">Aktivite Logları</h1><p className="text-slate-600">Sistem aktivite logları yakında eklenecek...</p></div>} />
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
            <Route path="dashboard" element={<div className="p-8"><h1 className="text-3xl font-medium text-slate-900 mb-4">Personel Paneli</h1><p className="text-slate-600">Personel gösterge paneli yakında eklenecek...</p></div>} />
            <Route path="clients" element={<AdminClients />} />
            <Route path="content" element={<div className="p-8"><h1 className="text-3xl font-medium text-slate-900 mb-4">İçerik Yönetimi</h1><p className="text-slate-600">İçerik yükleme sistemi yakında eklenecek...</p></div>} />
            <Route path="calendar" element={<div className="p-8"><h1 className="text-3xl font-medium text-slate-900 mb-4">Takvim</h1><p className="text-slate-600">Takvim sistemi yakında eklenecek...</p></div>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
