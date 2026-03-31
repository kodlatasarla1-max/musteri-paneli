import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Image, BarChart3, Calendar, TrendingUp, Clock, AlertCircle, CheckCircle, Receipt, Wallet } from 'lucide-react';
import apiClient from '../../utils/api';
import { getUser } from '../../utils/auth';
import { toast } from 'sonner';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { tr } from '../../utils/translations';

export const ClientDashboard = () => {
  const navigate = useNavigate();
  const user = getUser();
  const clientId = user?.client_id;
  const [client, setClient] = useState(null);
  const [services, setServices] = useState([]);
  const [accessInfo, setAccessInfo] = useState(null);
  const [stats, setStats] = useState({
    videosDelivered: 0,
    designsDelivered: 0,
    contentPublished: 0,
    monthlyAdSpend: 0,
    pendingReceipts: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (clientId) {
      loadData();
    }
  }, [clientId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [clientRes, servicesRes, statsRes] = await Promise.all([
        apiClient.get(`/clients/${clientId}`),
        apiClient.get(`/client-services/${clientId}`),
        apiClient.get(`/stats/client-dashboard/${clientId}`)
      ]);

      setClient(clientRes.data);
      setServices(servicesRes.data);
      setAccessInfo(statsRes.data.access_info || clientRes.data.access_info);
      setStats({
        videosDelivered: statsRes.data.videos_delivered || 0,
        designsDelivered: statsRes.data.designs_delivered || 0,
        contentPublished: statsRes.data.content_published || 0,
        monthlyAdSpend: statsRes.data.monthly_ad_spend || 0,
        pendingReceipts: statsRes.data.pending_receipts || 0
      });
    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast.error('Dashboard yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const hasAccess = accessInfo?.has_access;
  const hasPendingReceipt = accessInfo?.has_pending_receipt || stats.pendingReceipts > 0;
  const daysRemaining = accessInfo?.days_remaining || 0;
  const accessUntil = accessInfo?.active_until;
  const isExpiringSoon = hasAccess && daysRemaining <= 7;

  if (loading) {
    return (
      <div className="p-4 lg:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-blue-100 rounded w-1/4"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-blue-50 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-[1600px] mx-auto" data-testid="client-dashboard">
      {/* Header */}
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-4xl font-medium text-slate-900 mb-2" data-testid="dashboard-title">
          Hoş Geldiniz, {user?.full_name}
        </h1>
        <p className="text-sm lg:text-base text-slate-600">Hesabınızın genel durumu</p>
      </div>

      {/* Access Status Banner */}
      {!hasAccess && hasPendingReceipt && (
        <div className="mb-6 p-4 lg:p-6 rounded-xl border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50" data-testid="pending-approval-banner">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="p-3 bg-orange-100 rounded-full">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-orange-900">Onay Bekleniyor</h3>
              <p className="text-sm text-orange-700 mt-1">
                Yüklediğiniz makbuz admin onayı bekliyor. Onaylandıktan sonra 30 günlük erişiminiz başlayacaktır.
              </p>
            </div>
            <Button 
              onClick={() => navigate('/client/receipts')}
              className="bg-orange-600 hover:bg-orange-700 text-white w-full sm:w-auto"
            >
              Makbuzları Görüntüle
            </Button>
          </div>
        </div>
      )}

      {!hasAccess && !hasPendingReceipt && (
        <div className="mb-6 p-4 lg:p-6 rounded-xl border-2 border-red-200 bg-gradient-to-r from-red-50 to-rose-50" data-testid="no-access-banner">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="p-3 bg-red-100 rounded-full">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-900">Erişim Süresi Doldu</h3>
              <p className="text-sm text-red-700 mt-1">
                Panele tam erişim için lütfen ödeme makbuzunuzu yükleyin. Onaylandıktan sonra 30 günlük erişiminiz başlayacaktır.
              </p>
            </div>
            <Button 
              onClick={() => navigate('/client/receipts')}
              className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto"
            >
              Makbuz Yükle
            </Button>
          </div>
        </div>
      )}

      {hasAccess && (
        <div className={`mb-6 p-4 lg:p-6 rounded-xl border-2 ${
          isExpiringSoon 
            ? 'border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50' 
            : 'border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50'
        }`} data-testid="access-active-banner">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className={`p-3 rounded-full ${isExpiringSoon ? 'bg-amber-100' : 'bg-emerald-100'}`}>
              <CheckCircle className={`h-6 w-6 ${isExpiringSoon ? 'text-amber-600' : 'text-emerald-600'}`} />
            </div>
            <div className="flex-1">
              <h3 className={`text-lg font-semibold ${isExpiringSoon ? 'text-amber-900' : 'text-emerald-900'}`}>
                Erişim Aktif
              </h3>
              <p className={`text-sm mt-1 ${isExpiringSoon ? 'text-amber-700' : 'text-emerald-700'}`}>
                Bitiş Tarihi: {accessUntil ? new Date(accessUntil).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}
              </p>
            </div>
            <div className="text-right">
              <p className={`text-3xl lg:text-4xl font-bold ${isExpiringSoon ? 'text-amber-600' : 'text-emerald-600'}`}>
                {daysRemaining}
              </p>
              <p className={`text-xs ${isExpiringSoon ? 'text-amber-600' : 'text-emerald-600'}`}>gün kaldı</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6 mb-6 lg:mb-8">
        <Card className="p-4 lg:p-6 bg-gradient-to-br from-blue-50 to-white border-blue-100" data-testid="stat-videos">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 lg:p-3 bg-blue-100 rounded-lg">
              <Video className="h-4 w-4 lg:h-6 lg:w-6 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl lg:text-3xl font-semibold text-blue-900">{stats.videosDelivered}</p>
          <p className="text-xs lg:text-sm text-slate-600 mt-1">Teslim Edilen Video</p>
        </Card>

        <Card className="p-4 lg:p-6 bg-gradient-to-br from-indigo-50 to-white border-indigo-100" data-testid="stat-designs">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 lg:p-3 bg-indigo-100 rounded-lg">
              <Image className="h-4 w-4 lg:h-6 lg:w-6 text-indigo-600" />
            </div>
          </div>
          <p className="text-2xl lg:text-3xl font-semibold text-indigo-900">{stats.designsDelivered}</p>
          <p className="text-xs lg:text-sm text-slate-600 mt-1">Teslim Edilen Tasarım</p>
        </Card>

        <Card className="p-4 lg:p-6 bg-gradient-to-br from-cyan-50 to-white border-cyan-100" data-testid="stat-content">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 lg:p-3 bg-cyan-100 rounded-lg">
              <Calendar className="h-4 w-4 lg:h-6 lg:w-6 text-cyan-600" />
            </div>
          </div>
          <p className="text-2xl lg:text-3xl font-semibold text-cyan-900">{stats.contentPublished}</p>
          <p className="text-xs lg:text-sm text-slate-600 mt-1">Toplam İçerik</p>
        </Card>

        <Card className="p-4 lg:p-6 bg-gradient-to-br from-violet-50 to-white border-violet-100" data-testid="stat-ad-spend">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 lg:p-3 bg-violet-100 rounded-lg">
              <TrendingUp className="h-4 w-4 lg:h-6 lg:w-6 text-violet-600" />
            </div>
          </div>
          <p className="text-2xl lg:text-3xl font-semibold text-violet-900">₺{stats.monthlyAdSpend.toLocaleString('tr-TR')}</p>
          <p className="text-xs lg:text-sm text-slate-600 mt-1">Aylık Reklam Harcaması</p>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mb-6 lg:mb-8">
        <Card className="p-4 lg:p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/client/receipts')} data-testid="quick-action-receipts">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-100 rounded-xl">
              <Receipt className="h-6 w-6 text-orange-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-slate-900">Makbuzlarım</h3>
              <p className="text-sm text-slate-600">Ödeme makbuzlarınızı görüntüleyin ve yükleyin</p>
            </div>
            {stats.pendingReceipts > 0 && (
              <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                {stats.pendingReceipts} Bekleyen
              </span>
            )}
          </div>
        </Card>

        <Card className="p-4 lg:p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/client/finance')} data-testid="quick-action-finance">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-100 rounded-xl">
              <Wallet className="h-6 w-6 text-emerald-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-slate-900">Muhasebe</h3>
              <p className="text-sm text-slate-600">Gelir ve giderlerinizi takip edin</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Active Services */}
      <div>
        <h2 className="text-lg lg:text-2xl font-medium text-slate-900 mb-4 lg:mb-6">
          Aktif Hizmetleriniz
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-6">
          {services.filter(s => s.is_active).length === 0 ? (
            <Card className="p-6 lg:p-8 col-span-full text-center bg-slate-50 border-slate-200" data-testid="no-active-services">
              <p className="text-slate-600">Henüz aktif hizmetiniz bulunmuyor.</p>
            </Card>
          ) : (
            services.filter(s => s.is_active).map((service) => (
              <Card key={service.id} className="p-4 lg:p-6 bg-white border-blue-100 hover:border-blue-200 hover:shadow-md transition-all" data-testid={`service-card-${service.service_id}`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-700 font-medium">Aktif</span>
                </div>
                <h3 className="font-medium text-slate-900">{service.service_name}</h3>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
