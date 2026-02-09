import { useState, useEffect } from 'react';
import { Users, Video, Image, Calendar, TrendingUp } from 'lucide-react';
import apiClient from '../../utils/api';
import { toast } from 'sonner';
import { Card } from '../../components/ui/card';
import { tr } from '../../utils/translations';

export const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalClients: 0,
    activeClients: 0,
    totalVideos: 0,
    totalDesigns: 0,
    pendingReceipts: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const clientsRes = await apiClient.get('/clients');
      const clients = clientsRes.data;

      setStats({
        totalClients: clients.length,
        activeClients: clients.filter(c => c.status === 'active').length,
        totalVideos: 0,
        totalDesigns: 0,
        pendingReceipts: 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      toast.error('İstatistikler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8">{tr.common.loading}</div>;
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto" data-testid="admin-dashboard">
      <div className="mb-8">
        <h1 className="text-4xl font-medium text-slate-900 mb-2" data-testid="admin-dashboard-title">{tr.admin.dashboard.title}</h1>
        <p className="text-slate-600">Ajans performansınızı ve müşteri aktivitelerini yönetin</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-white border-blue-100 shadow-sm hover:shadow-md transition-shadow" data-testid="stat-total-clients">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-semibold text-blue-900">{stats.totalClients}</p>
            <p className="text-sm text-slate-600 mt-1">{tr.admin.dashboard.totalClients}</p>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-indigo-50 to-white border-indigo-100 shadow-sm hover:shadow-md transition-shadow" data-testid="stat-active-clients">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-indigo-100 rounded-xl">
              <TrendingUp className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-semibold text-indigo-900">{stats.activeClients}</p>
            <p className="text-sm text-slate-600 mt-1">{tr.admin.dashboard.activeClients}</p>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-cyan-50 to-white border-cyan-100 shadow-sm hover:shadow-md transition-shadow" data-testid="stat-videos">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-cyan-100 rounded-xl">
              <Video className="h-6 w-6 text-cyan-600" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-semibold text-cyan-900">{stats.totalVideos}</p>
            <p className="text-sm text-slate-600 mt-1">{tr.admin.dashboard.videosProduced}</p>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-violet-50 to-white border-violet-100 shadow-sm hover:shadow-md transition-shadow" data-testid="stat-designs">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-violet-100 rounded-xl">
              <Image className="h-6 w-6 text-violet-600" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-semibold text-violet-900">{stats.totalDesigns}</p>
            <p className="text-sm text-slate-600 mt-1">{tr.admin.dashboard.designsCreated}</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 border-blue-100">
          <h2 className="text-xl font-medium text-slate-900 mb-4">{tr.admin.dashboard.quickActions}</h2>
          <div className="space-y-3">
            <button className="w-full text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors text-blue-900">
              {tr.admin.dashboard.addNewClient}
            </button>
            <button className="w-full text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors text-blue-900">
              {tr.admin.dashboard.uploadContent}
            </button>
            <button className="w-full text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors text-blue-900">
              {tr.admin.dashboard.reviewPendingReceipts}
            </button>
          </div>
        </Card>

        <Card className="p-6 border-blue-100">
          <h2 className="text-xl font-medium text-slate-900 mb-4">{tr.admin.dashboard.recentActivity}</h2>
          <p className="text-slate-600 text-sm">{tr.admin.dashboard.noRecentActivity}</p>
        </Card>
      </div>
    </div>
  );
};
