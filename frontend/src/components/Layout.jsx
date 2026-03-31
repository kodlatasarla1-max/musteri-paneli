import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Video, Image, BarChart3, Globe, ShoppingBag, Users, 
  LogOut, Share2, Calendar, Receipt, Megaphone, Activity, Lock, Bell, 
  Menu, X, ChevronRight, Wallet, User
} from 'lucide-react';
import { getUser, logout } from '../utils/auth';
import { Button } from './ui/button';
import apiClient from '../utils/api';
import { tr } from '../utils/translations';

export const Layout = ({ role, clientId }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();
  const [clientServices, setClientServices] = useState([]);
  const [pendingReceiptsCount, setPendingReceiptsCount] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Use CSS media queries instead of JS state for reliable responsive behavior
  const getIsMobile = () => typeof window !== 'undefined' && window.innerWidth < 1024;
  const [isMobile, setIsMobile] = useState(getIsMobile());

  useEffect(() => {
    const handleResize = () => {
      const mobile = getIsMobile();
      setIsMobile(mobile);
      // Close sidebar when switching to desktop
      if (!mobile && sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    
    // Check on mount
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarOpen]);

  useEffect(() => {
    if (role === 'client' && clientId) {
      loadClientServices();
      loadUnreadNotifications();
    }
    if (role === 'admin' || role === 'staff') {
      loadPendingReceiptsCount();
    }
  }, [role, clientId]);

  useEffect(() => {
    if (role === 'admin' || role === 'staff') {
      const interval = setInterval(loadPendingReceiptsCount, 30000);
      return () => clearInterval(interval);
    }
  }, [role]);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

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
    { icon: Globe, label: 'Meta Entegrasyonu', path: '/admin/meta-integration' },
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
    { icon: Receipt, label: 'Makbuzlarım', path: '/client/receipts', active: true },
    { icon: Wallet, label: 'Muhasebe', path: '/client/finance', active: true },
    { icon: User, label: 'Profilim', path: '/client/profile', active: true },
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

  const handleNavClick = (path) => {
    navigate(path);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const SidebarContent = () => (
    <>
      <div className="p-4 lg:p-6 border-b border-blue-800/50 flex items-center justify-between">
        <div>
          <h1 className="text-lg lg:text-xl font-semibold text-white" data-testid="sidebar-title">Ajans OS</h1>
          <p className="text-xs text-blue-300 mt-1" data-testid="user-role">{user?.full_name || role}</p>
        </div>
        {isMobile && (
          <button 
            onClick={() => setSidebarOpen(false)}
            className="p-2 text-blue-200 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 p-3 lg:p-4 space-y-1 overflow-y-auto" data-testid="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          const isLocked = role === 'client' && item.active === false && item.path !== '/client/dashboard';

          return (
            <button
              key={item.path}
              data-testid={`nav-item-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={() => handleNavClick(item.path)}
              className={`w-full flex items-center gap-3 px-3 lg:px-4 py-2.5 lg:py-3 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-800/50 text-white shadow-lg backdrop-blur-sm'
                  : isLocked
                  ? 'text-blue-400 hover:text-blue-300'
                  : 'text-blue-200 hover:bg-blue-800/30 hover:text-white'
              }`}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span className="flex-1 text-left truncate">{item.label}</span>
              {item.badge > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center animate-pulse">
                  {item.badge}
                </span>
              )}
              {isLocked && <Lock className="h-4 w-4 flex-shrink-0" />}
            </button>
          );
        })}
      </nav>

      <div className="p-3 lg:p-4 border-t border-blue-800/50">
        <Button
          data-testid="logout-button"
          onClick={handleLogout}
          variant="ghost"
          className="w-full justify-start text-blue-200 hover:text-white hover:bg-blue-800/30 rounded-lg text-sm"
        >
          <LogOut className="h-5 w-5 mr-3" />
          {tr.auth.logout}
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50" data-testid="layout-container">
      {/* Mobile Header - Always visible on mobile */}
      <header 
        className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-gradient-to-r from-blue-900 to-blue-950 z-40 flex items-center justify-between px-4 shadow-lg"
        data-testid="mobile-header"
      >
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 text-white hover:bg-blue-800/50 rounded-lg transition-colors active:scale-95"
          data-testid="mobile-menu-button"
          aria-label="Menüyü aç"
          aria-expanded={sidebarOpen}
        >
          <Menu className="h-6 w-6" />
        </button>
        <h1 className="text-white font-semibold text-lg">Ajans OS</h1>
        <div className="w-10" aria-hidden="true" />
      </header>

      {/* Mobile Sidebar Overlay */}
      <div 
        className={`fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300 ${
          sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside 
        className={`fixed top-0 left-0 h-full bg-gradient-to-b from-blue-900 to-blue-950 text-blue-100 flex flex-col border-r border-blue-800/50 z-50 shadow-xl transition-transform duration-300 ease-in-out
          w-72 lg:w-64
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        data-testid="sidebar"
        role="navigation"
        aria-label="Ana menü"
      >
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main 
        className="min-h-screen transition-all duration-300 pt-14 lg:pt-0 lg:ml-64"
        data-testid="main-content"
      >
        <Outlet />
      </main>
    </div>
  );
};
