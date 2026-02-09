import { useState, useEffect } from 'react';
import { Video, Image, BarChart3, Calendar, TrendingUp, Clock } from 'lucide-react';
import apiClient from '../../utils/api';
import { getUser } from '../../utils/auth';
import { toast } from 'sonner';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { tr } from '../../utils/translations';

export const ClientDashboard = () => {
  const user = getUser();
  const clientId = user?.client_id;
  const [client, setClient] = useState(null);
  const [services, setServices] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [summary, setSummary] = useState({
    videosDelivered: 0,
    designsDelivered: 0,
    postsPublished: 0,
    monthlyAdSpend: 0
  });
  const [loading, setLoading] = useState(true);
  const [showCampaign, setShowCampaign] = useState(null);

  useEffect(() => {
    if (clientId) {
      loadData();
    }
  }, [clientId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [clientRes, servicesRes, campaignsRes] = await Promise.all([
        apiClient.get(`/clients/${clientId}`),
        apiClient.get(`/client-services/${clientId}`),
        apiClient.get('/campaigns')
      ]);

      setClient(clientRes.data);
      setServices(servicesRes.data);
      setCampaigns(campaignsRes.data);

      if (campaignsRes.data.length > 0) {
        setShowCampaign(campaignsRes.data[0]);
      }

      const now = new Date();
      const currentMonth = now.toISOString().slice(0, 7);

      const [videosRes, designsRes, postsRes, adsRes] = await Promise.all([
        apiClient.get(`/videos/${clientId}`),
        apiClient.get(`/designs/${clientId}`),
        apiClient.get(`/social-media-posts/${clientId}`),
        apiClient.get(`/ads-reports/${clientId}`)
      ]);

      setSummary({
        videosDelivered: videosRes.data.filter(v => v.status === 'approved').length,
        designsDelivered: designsRes.data.filter(d => d.status === 'approved').length,
        postsPublished: postsRes.data.filter(p => p.status === 'published').length,
        monthlyAdSpend: adsRes.data
          .filter(r => r.report_date.startsWith(currentMonth))
          .reduce((sum, r) => sum + r.daily_spend, 0)
      });
    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast.error(tr.client.dashboard.welcomeBack + ' yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const calculateDaysRemaining = () => {
    if (!client?.access_expires_at) return 0;
    const now = new Date();
    const expiry = new Date(client.access_expires_at);
    const diffTime = expiry - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const daysRemaining = calculateDaysRemaining();
  const isExpiringSoon = daysRemaining <= 7;
  const isExpired = daysRemaining === 0;

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-blue-100 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-blue-50 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto" data-testid="client-dashboard">
      <div className="mb-8">
        <h1 className="text-4xl font-medium text-slate-900 mb-2" data-testid="dashboard-title">
          {tr.client.dashboard.welcomeBack}, {user?.full_name}
        </h1>
        <p className="text-slate-600">{tr.client.dashboard.activityOverview}</p>
      </div>

      {(isExpiringSoon || isExpired) && (
        <div className={`mb-6 p-4 rounded-lg border ${
          isExpired ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
        }`} data-testid="access-status-banner">
          <div className="flex items-center gap-3">
            <Clock className={`h-5 w-5 ${isExpired ? 'text-red-600' : 'text-amber-600'}`} />
            <div className="flex-1">
              <p className={`font-medium ${isExpired ? 'text-red-900' : 'text-amber-900'}`}>
                {isExpired ? tr.client.dashboard.accessExpired : tr.client.dashboard.accessExpiringSoon.replace('{{days}}', daysRemaining)}
              </p>
              <p className={`text-sm ${isExpired ? 'text-red-700' : 'text-amber-700'}`}>
                {isExpired ? tr.client.dashboard.pleaseRenew : tr.client.dashboard.renewSoon}
              </p>
            </div>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700" data-testid="renew-button">
              {tr.client.dashboard.renewNow}
            </Button>
          </div>
        </div>
      )}

      {showCampaign && (
        <div className="mb-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-xl relative shadow-lg" data-testid="campaign-banner">
          <button
            onClick={() => setShowCampaign(null)}
            className="absolute top-4 right-4 text-white/80 hover:text-white text-2xl"
            data-testid="close-campaign-button"
          >
            ×
          </button>
          <h3 className="text-xl font-medium mb-2">{showCampaign.title}</h3>
          <p className="mb-4 text-blue-100">{showCampaign.content}</p>
          <Button variant="secondary" size="sm" className="bg-white text-blue-600 hover:bg-blue-50" data-testid="campaign-cta-button">
            {showCampaign.cta_type === 'whatsapp' ? 'WhatsApp ile Sohbet Et' : 
             showCampaign.cta_type === 'call' ? 'Arama Talebi' : 'Daha Fazla Bilgi'}
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-white border-blue-100 shadow-sm hover:shadow-md transition-shadow" data-testid="stat-videos">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Video className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-semibold text-blue-900">{summary.videosDelivered}</p>
            <p className="text-sm text-slate-600 mt-1">{tr.client.dashboard.videosDelivered}</p>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-indigo-50 to-white border-indigo-100 shadow-sm hover:shadow-md transition-shadow" data-testid="stat-designs">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-indigo-100 rounded-lg">
              <Image className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-semibold text-indigo-900">{summary.designsDelivered}</p>
            <p className="text-sm text-slate-600 mt-1">{tr.client.dashboard.designsDelivered}</p>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-cyan-50 to-white border-cyan-100 shadow-sm hover:shadow-md transition-shadow" data-testid="stat-posts">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-cyan-100 rounded-lg">
              <Calendar className="h-6 w-6 text-cyan-600" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-semibold text-cyan-900">{summary.postsPublished}</p>
            <p className="text-sm text-slate-600 mt-1">{tr.client.dashboard.contentPublished}</p>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-violet-50 to-white border-violet-100 shadow-sm hover:shadow-md transition-shadow" data-testid="stat-ad-spend">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-violet-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-violet-600" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-semibold text-violet-900">${summary.monthlyAdSpend.toFixed(2)}</p>
            <p className="text-sm text-slate-600 mt-1">{tr.client.dashboard.monthlyAdSpend}</p>
          </div>
        </Card>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-medium text-slate-900 mb-6" data-testid="active-services-title">
          {tr.client.dashboard.yourActiveServices}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {services.filter(s => s.is_active).length === 0 ? (
            <Card className="p-8 col-span-3 text-center bg-blue-50 border-blue-100" data-testid="no-active-services">
              <p className="text-slate-600">{tr.client.dashboard.noActiveServices}</p>
            </Card>
          ) : (
            services.filter(s => s.is_active).map((service) => (
              <Card key={service.id} className="p-6 bg-white border-blue-100 hover:border-blue-200 shadow-sm hover:shadow-md transition-all" data-testid={`service-card-${service.service_name.toLowerCase().replace(/\s+/g, '-')}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-700 font-medium">{tr.client.dashboard.activeAndRunning}</span>
                </div>
                <h3 className="text-lg font-medium text-slate-900">{service.service_name}</h3>
              </Card>
            ))
          )}
        </div>
      </div>

      <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200" data-testid="access-days-card">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-slate-900">{tr.client.dashboard.accessDaysRemaining}</h3>
            <p className="text-sm text-slate-600 mt-1">
              {tr.client.dashboard.subscriptionExpires}: {client?.access_expires_at ? new Date(client.access_expires_at).toLocaleDateString('tr-TR') : 'N/A'}
            </p>
          </div>
          <div className="text-right">
            <p className={`text-5xl font-semibold ${
              daysRemaining <= 7 ? 'text-red-600' : 'text-blue-600'
            }`}>{daysRemaining}</p>
            <p className="text-sm text-slate-600 mt-1">{tr.client.dashboard.days}</p>
          </div>
        </div>
      </Card>
    </div>
  );
};
