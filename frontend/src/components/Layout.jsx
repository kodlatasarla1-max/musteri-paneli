import { Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Video, Image, BarChart3, Globe, ShoppingBag, Users, LogOut, Share2, Calendar, Receipt, Megaphone, Activity, Lock, Bell } from 'lucide-react';
import { getUser, logout } from '../utils/auth';
import { Button } from './ui/button';
import { useState, useEffect } from 'react';
import apiClient from '../utils/api';
import { tr } from '../utils/translations';

export const Layout = ({ role, clientId }) => {
  const navigate = useNavigate();
  const user = getUser();
  const [clientServices, setClientServices] = useState([]);
  const [pendingReceiptsCount, setPendingReceiptsCount] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    if (role === 'client' && clientId) {
      loadClientServices();
      loadUnreadNotifications();
    }
    if (role === 'admin' || role === 'staff') {
      loadPendingReceiptsCount();
    }
  }, [role, clientId]);

  // Refresh pending count every 30 seconds for admin
  useEffect(() => {
    if (role === 'admin' || role === 'staff') {
      const interval = setInterval(loadPendingReceiptsCount, 30000);
      return () => clearInterval(interval);
    }
  }, [role]);

  const loadClientServices = async () => {
    try {
      const response = await apiClient.get(`/client-services/${clientId}`);
      setClientServices(response.data);
    } catch (error) {
      console.error('Error loading client services:', error);
    }
  };

  const loadPendingReceiptsCount = async () => {
    try {
      const response = await apiClient.get('/receipts/pending/count');
      setPendingReceiptsCount(response.data.count || 0);
    } catch (error) {
      console.error('Error loading pending receipts count:', error);
    }
  };

  const loadUnreadNotifications = async () => {
    try {
      const response = await apiClient.get('/notifications/unread-count');
      setUnreadNotifications(response.data.count || 0);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const isServiceActive = (serviceName) => {
    const service = clientServices.find(cs => cs.service_name === serviceName);
    return service ? service.is_active : false;
  };

  const adminNav = [
    { icon: LayoutDashboard, label: tr.sidebar.dashboard, path: '/admin/dashboard' },
    { icon: Users, label: tr.sidebar.clients, path: '/admin/clients' },
    { icon: Users, label: tr.sidebar.staff, path: '/admin/staff' },
    { icon: Video, label: tr.sidebar.content, path: '/admin/content' },
    { icon: Calendar, label: tr.sidebar.calendar, path: '/admin/calendar' },
    { icon: BarChart3, label: tr.sidebar.adsReports, path: '/admin/ads-reports' },
    { icon: Receipt, label: tr.sidebar.receipts, path: '/admin/receipts', badge: pendingReceiptsCount },
    { icon: Megaphone, label: tr.sidebar.campaigns, path: '/admin/campaigns' },
    { icon: Activity, label: tr.sidebar.activityLogs, path: '/admin/logs' },
  ];

  const clientNav = [
    { icon: LayoutDashboard, label: tr.sidebar.dashboard, path: '/client/dashboard', active: true },
    { icon: Video, label: tr.sidebar.videoProduction, path: '/client/videos', active: isServiceActive('Video Çekimi & Prodüksiyon') },
    { icon: Share2, label: tr.sidebar.socialMedia, path: '/client/social-media', active: isServiceActive('Sosyal Medya Yönetimi') },
    { icon: BarChart3, label: tr.sidebar.metaAds, path: '/client/ads', active: isServiceActive('Meta Reklamları Yönetimi') },
    { icon: Image, label: tr.sidebar.graphicDesign, path: '/client/designs', active: isServiceActive('Grafik Tasarım') },
    { icon: Globe, label: tr.sidebar.websiteSetup, path: '/client/website', active: isServiceActive('Web Sitesi Kurulumu') },
    { icon: ShoppingBag, label: tr.sidebar.ecommerce, path: '/client/ecommerce', active: isServiceActive('E-ticaret Yönetimi') },
  ];

  const staffNav = [
    { icon: LayoutDashboard, label: tr.sidebar.dashboard, path: '/staff/dashboard' },
    { icon: Users, label: tr.sidebar.clients, path: '/staff/clients' },
    { icon: Video, label: tr.sidebar.content, path: '/staff/content' },
    { icon: Calendar, label: tr.sidebar.calendar, path: '/staff/calendar' },
  ];

  const navItems = role === 'admin' ? adminNav : role === 'staff' ? staffNav : clientNav;

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen" data-testid="layout-container">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-64 bg-gradient-to-b from-blue-900 to-blue-950 text-blue-100 flex flex-col border-r border-blue-800/50 z-50 shadow-xl" data-testid="sidebar">
        <div className="p-6 border-b border-blue-800/50">
          <h1 className="text-xl font-semibold text-white" data-testid="sidebar-title">{tr.sidebar.agencyOS}</h1>
          <p className="text-xs text-blue-300 mt-1" data-testid="user-role">{user?.full_name || role}</p>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto" data-testid="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = window.location.pathname === item.path;
            const isLocked = role === 'client' && item.active === false && item.path !== '/client/dashboard';

            return (
              <button
                key={item.path}
                data-testid={`nav-item-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-800/50 text-white shadow-lg backdrop-blur-sm'
                    : isLocked
                    ? 'text-blue-400 hover:text-blue-300'
                    : 'text-blue-200 hover:bg-blue-800/30 hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center animate-pulse">
                    {item.badge}
                  </span>
                )}
                {isLocked && <Lock className="h-4 w-4" />}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-blue-800/50">
          <Button
            data-testid="logout-button"
            onClick={handleLogout}
            variant="ghost"
            className="w-full justify-start text-blue-200 hover:text-white hover:bg-blue-800/30 rounded-lg"
          >
            <LogOut className="h-5 w-5 mr-3" />
            {tr.auth.logout}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64 min-h-screen bg-slate-50" data-testid="main-content">
        <Outlet />
      </div>
    </div>
  );
};
