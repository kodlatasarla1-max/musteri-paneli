import { useState, useEffect } from 'react';
import { Video, Image, BarChart3, Calendar, TrendingUp, Clock } from 'lucide-react';
import apiClient from '../../utils/api';
import { getUser } from '../../utils/auth';
import { toast } from 'sonner';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

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
      toast.error('Failed to load dashboard data');
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
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto" data-testid="client-dashboard">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-medium text-slate-900 mb-2" data-testid="dashboard-title">Welcome back, {user?.full_name}</h1>
        <p className="text-slate-600">Here's your agency activity overview</p>
      </div>

      {/* Access Status Banner */}
      {(isExpiringSoon || isExpired) && (
        <div className={`mb-6 p-4 rounded-md border ${
          isExpired ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
        }`} data-testid="access-status-banner">
          <div className="flex items-center gap-3">
            <Clock className={`h-5 w-5 ${isExpired ? 'text-red-600' : 'text-amber-600'}`} />
            <div className="flex-1">
              <p className={`font-medium ${isExpired ? 'text-red-900' : 'text-amber-900'}`}>
                {isExpired ? 'Access Expired' : `Access expiring in ${daysRemaining} days`}
              </p>
              <p className={`text-sm ${isExpired ? 'text-red-700' : 'text-amber-700'}`}>
                {isExpired ? 'Please renew your subscription to continue accessing services' : 'Renew soon to continue accessing your services'}
              </p>
            </div>
            <Button size="sm" data-testid="renew-button">Renew Now</Button>
          </div>
        </div>
      )}

      {/* Campaign Popup */}
      {showCampaign && (
        <div className="mb-6 bg-indigo-600 text-white p-6 rounded-lg relative" data-testid="campaign-banner">
          <button
            onClick={() => setShowCampaign(null)}
            className="absolute top-4 right-4 text-white/80 hover:text-white"
            data-testid="close-campaign-button"
          >
            ×
          </button>
          <h3 className="text-xl font-medium mb-2">{showCampaign.title}</h3>
          <p className="mb-4 text-indigo-100">{showCampaign.content}</p>
          <Button variant="secondary" size="sm" data-testid="campaign-cta-button">
            {showCampaign.cta_type === 'whatsapp' ? 'Chat on WhatsApp' : 
             showCampaign.cta_type === 'call' ? 'Request Call' : 'Learn More'}
          </Button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="p-6 card-shadow" data-testid="stat-videos">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-indigo-50 rounded-lg">
              <Video className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-semibold text-slate-900">{summary.videosDelivered}</p>
            <p className="text-sm text-slate-600 mt-1">Videos Delivered</p>
          </div>
        </Card>

        <Card className="p-6 card-shadow" data-testid="stat-designs">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-pink-50 rounded-lg">
              <Image className="h-6 w-6 text-pink-600" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-semibold text-slate-900">{summary.designsDelivered}</p>
            <p className="text-sm text-slate-600 mt-1">Designs Delivered</p>
          </div>
        </Card>

        <Card className="p-6 card-shadow" data-testid="stat-posts">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <Calendar className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-semibold text-slate-900">{summary.postsPublished}</p>
            <p className="text-sm text-slate-600 mt-1">Content Published</p>
          </div>
        </Card>

        <Card className="p-6 card-shadow" data-testid="stat-ad-spend">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-semibold text-slate-900">${summary.monthlyAdSpend.toFixed(2)}</p>
            <p className="text-sm text-slate-600 mt-1">Monthly Ad Spend</p>
          </div>
        </Card>
      </div>

      {/* Active Services */}
      <div className="mb-8">
        <h2 className="text-2xl font-medium text-slate-900 mb-6" data-testid="active-services-title">Your Active Services</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {services.filter(s => s.is_active).length === 0 ? (
            <Card className="p-8 col-span-3 text-center" data-testid="no-active-services">
              <p className="text-slate-600">No active services yet. Contact your account manager to activate services.</p>
            </Card>
          ) : (
            services.filter(s => s.is_active).map((service) => (
              <Card key={service.id} className="p-6 card-shadow" data-testid={`service-card-${service.service_name.toLowerCase().replace(/\s+/g, '-')}`}>
                <h3 className="text-lg font-medium text-slate-900 mb-2">{service.service_name}</h3>
                <p className="text-sm text-slate-600">Active and running</p>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Access Days */}
      <Card className="p-6" data-testid="access-days-card">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-slate-900">Access Days Remaining</h3>
            <p className="text-sm text-slate-600 mt-1">Your subscription expires on {client?.access_expires_at ? new Date(client.access_expires_at).toLocaleDateString() : 'N/A'}</p>
          </div>
          <div className="text-right">
            <p className={`text-4xl font-semibold ${
              daysRemaining <= 7 ? 'text-red-600' : 'text-slate-900'
            }`}>{daysRemaining}</p>
            <p className="text-sm text-slate-600 mt-1">days</p>
          </div>
        </div>
      </Card>
    </div>
  );
};
