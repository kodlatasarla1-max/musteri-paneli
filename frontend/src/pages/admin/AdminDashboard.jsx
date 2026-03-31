import { useState, useEffect } from 'react';
import { Users, Video, Image, Calendar, TrendingUp, Receipt, MessageSquare, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../utils/api';
import { toast } from 'sonner';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { tr } from '../../utils/translations';

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalClients: 0,
    activeClients: 0,
    totalVideos: 0,
    totalDesigns: 0,
    pendingReceipts: 0,
    pendingRevisions: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [clientsRes, receiptsRes, revisionsRes] = await Promise.all([
        apiClient.get('/clients'),
        apiClient.get('/receipts/pending/count').catch(() => ({ data: { count: 0 } })),
        apiClient.get('/revisions/pending/count').catch(() => ({ data: { count: 0 } }))
      ]);
      
      const clients = clientsRes.data;

      setStats({
        totalClients: clients.length,
        activeClients: clients.filter(c => c.access_info?.status === 'active').length,
        totalVideos: 0,
        totalDesigns: 0,
        pendingReceipts: receiptsRes.data.count || 0,
        pendingRevisions: revisionsRes.data.count || 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      toast.error('İstatistikler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto" data-testid="admin-dashboard">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-2" data-testid="admin-dashboard-title">
          {tr.admin.dashboard.title}
        </h1>
        <p className="text-slate-600">Ajans performansınızı ve müşteri aktivitelerini yönetin</p>
      </div>

      {/* Stats Grid - Navy Theme */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
        <Card className="p-4 lg:p-6 bg-white border border-slate-200 hover:border-slate-300 transition-all hover:shadow-lg" data-testid="stat-total-clients">
          <div className="flex items-center gap-4">
            <div className="p-3 lg:p-4 bg-slate-900 rounded-xl">
              <Users className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
            </div>
            <div>
              <p className="text-2xl lg:text-3xl font-bold text-slate-900">{stats.totalClients}</p>
              <p className="text-xs lg:text-sm text-slate-500 mt-0.5">{tr.admin.dashboard.totalClients}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 lg:p-6 bg-white border border-slate-200 hover:border-slate-300 transition-all hover:shadow-lg" data-testid="stat-active-clients">
          <div className="flex items-center gap-4">
            <div className="p-3 lg:p-4 bg-emerald-600 rounded-xl">
              <TrendingUp className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
            </div>
            <div>
              <p className="text-2xl lg:text-3xl font-bold text-slate-900">{stats.activeClients}</p>
              <p className="text-xs lg:text-sm text-slate-500 mt-0.5">{tr.admin.dashboard.activeClients}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 lg:p-6 bg-white border border-slate-200 hover:border-slate-300 transition-all hover:shadow-lg" data-testid="stat-receipts">
          <div className="flex items-center gap-4">
            <div className="p-3 lg:p-4 bg-amber-500 rounded-xl">
              <Receipt className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
            </div>
            <div>
              <p className="text-2xl lg:text-3xl font-bold text-slate-900">{stats.pendingReceipts}</p>
              <p className="text-xs lg:text-sm text-slate-500 mt-0.5">Bekleyen Makbuz</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 lg:p-6 bg-white border border-slate-200 hover:border-slate-300 transition-all hover:shadow-lg" data-testid="stat-revisions">
          <div className="flex items-center gap-4">
            <div className="p-3 lg:p-4 bg-violet-600 rounded-xl">
              <MessageSquare className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
            </div>
            <div>
              <p className="text-2xl lg:text-3xl font-bold text-slate-900">{stats.pendingRevisions}</p>
              <p className="text-xs lg:text-sm text-slate-500 mt-0.5">Bekleyen Revizyon</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 bg-white border border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 mb-4">{tr.admin.dashboard.quickActions}</h2>
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-between border-slate-200 hover:bg-slate-50 hover:border-slate-900 text-slate-900"
              onClick={() => navigate('/admin/clients')}
            >
              <span>{tr.admin.dashboard.addNewClient}</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="w-full justify-between border-slate-200 hover:bg-slate-50 hover:border-slate-900 text-slate-900"
              onClick={() => navigate('/admin/content')}
            >
              <span>{tr.admin.dashboard.uploadContent}</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="w-full justify-between border-slate-200 hover:bg-slate-50 hover:border-slate-900 text-slate-900"
              onClick={() => navigate('/admin/receipts')}
            >
              <span>{tr.admin.dashboard.reviewPendingReceipts}</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="w-full justify-between border-slate-200 hover:bg-slate-50 hover:border-slate-900 text-slate-900"
              onClick={() => navigate('/admin/revisions')}
            >
              <span>Revizyonları İncele</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>

        <Card className="p-6 bg-white border border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 mb-4">{tr.admin.dashboard.recentActivity}</h2>
          <div className="space-y-4">
            {stats.pendingReceipts > 0 && (
              <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Receipt className="h-4 w-4 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{stats.pendingReceipts} makbuz onay bekliyor</p>
                  <p className="text-xs text-slate-500">Makbuzları inceleyip onaylayın</p>
                </div>
              </div>
            )}
            {stats.pendingRevisions > 0 && (
              <div className="flex items-center gap-3 p-3 bg-violet-50 rounded-lg border border-violet-200">
                <div className="p-2 bg-violet-100 rounded-lg">
                  <MessageSquare className="h-4 w-4 text-violet-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{stats.pendingRevisions} revizyon talebi var</p>
                  <p className="text-xs text-slate-500">Müşteri taleplerini yanıtlayın</p>
                </div>
              </div>
            )}
            {stats.pendingReceipts === 0 && stats.pendingRevisions === 0 && (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="h-6 w-6 text-slate-400" />
                </div>
                <p className="text-slate-500 text-sm">{tr.admin.dashboard.noRecentActivity}</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Content Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <Card className="p-4 bg-slate-900 text-white border-0">
          <div className="flex items-center gap-3">
            <Video className="h-5 w-5 text-slate-300" />
            <div>
              <p className="text-xl font-bold">{stats.totalVideos}</p>
              <p className="text-xs text-slate-400">{tr.admin.dashboard.videosProduced}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-slate-900 text-white border-0">
          <div className="flex items-center gap-3">
            <Image className="h-5 w-5 text-slate-300" />
            <div>
              <p className="text-xl font-bold">{stats.totalDesigns}</p>
              <p className="text-xs text-slate-400">{tr.admin.dashboard.designsCreated}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-slate-900 text-white border-0">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-slate-300" />
            <div>
              <p className="text-xl font-bold">0</p>
              <p className="text-xs text-slate-400">Bu Ay Etkinlik</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-slate-900 text-white border-0">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-slate-300" />
            <div>
              <p className="text-xl font-bold">0</p>
              <p className="text-xs text-slate-400">Personel</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
