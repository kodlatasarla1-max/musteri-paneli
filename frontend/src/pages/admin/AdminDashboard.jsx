import { useState, useEffect } from 'react';
import { Users, Video, Image, Calendar, TrendingUp } from 'lucide-react';
import apiClient from '../../utils/api';
import { toast } from 'sonner';
import { Card } from '../../components/ui/card';

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
      toast.error('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto" data-testid="admin-dashboard">
      <h1 className="text-4xl font-medium text-slate-900 mb-8" data-testid="admin-dashboard-title">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="p-6 card-shadow" data-testid="stat-total-clients">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-indigo-50 rounded-lg">
              <Users className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-semibold text-slate-900">{stats.totalClients}</p>
            <p className="text-sm text-slate-600 mt-1">Total Clients</p>
          </div>
        </Card>

        <Card className="p-6 card-shadow" data-testid="stat-active-clients">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-semibold text-slate-900">{stats.activeClients}</p>
            <p className="text-sm text-slate-600 mt-1">Active Clients</p>
          </div>
        </Card>

        <Card className="p-6 card-shadow" data-testid="stat-videos">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Video className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-semibold text-slate-900">{stats.totalVideos}</p>
            <p className="text-sm text-slate-600 mt-1">Videos Produced</p>
          </div>
        </Card>

        <Card className="p-6 card-shadow" data-testid="stat-designs">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-pink-50 rounded-lg">
              <Image className="h-6 w-6 text-pink-600" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-semibold text-slate-900">{stats.totalDesigns}</p>
            <p className="text-sm text-slate-600 mt-1">Designs Created</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-xl font-medium text-slate-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button className="w-full text-left px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-md text-sm font-medium transition-colors">
              Add New Client
            </button>
            <button className="w-full text-left px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-md text-sm font-medium transition-colors">
              Upload Content
            </button>
            <button className="w-full text-left px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-md text-sm font-medium transition-colors">
              Review Pending Receipts
            </button>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-medium text-slate-900 mb-4">Recent Activity</h2>
          <p className="text-slate-600 text-sm">No recent activity</p>
        </Card>
      </div>
    </div>
  );
};
