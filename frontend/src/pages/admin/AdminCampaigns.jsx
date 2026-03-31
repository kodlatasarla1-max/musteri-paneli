import { useState, useEffect } from 'react';
import { Plus, Megaphone, Calendar } from 'lucide-react';
import apiClient from '../../utils/api';
import { toast } from 'sonner';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Checkbox } from '../../components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { tr } from '../../utils/translations';

export const AdminCampaigns = () => {
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  
  const [campaignForm, setCampaignForm] = useState({
    title: '',
    content: '',
    campaign_type: 'popup',
    start_date: '',
    end_date: '',
    target_service_missing: [],
    target_specific_clients: [],
    cta_type: 'form',
    cta_link: '',
    is_active: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [clientsRes, servicesRes, campaignsRes] = await Promise.all([
        apiClient.get('/clients'),
        apiClient.get('/services'),
        apiClient.get('/campaigns')
      ]);
      setClients(clientsRes.data);
      setServices(servicesRes.data);
      setCampaigns(campaignsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/campaigns', {
        ...campaignForm,
        start_date: new Date(campaignForm.start_date).toISOString(),
        end_date: new Date(campaignForm.end_date).toISOString()
      });
      toast.success('Kampanya başarıyla oluşturuldu');
      setShowDialog(false);
      resetForm();
      loadData();
    } catch (error) {
      toast.error('Kampanya oluşturulamadı');
    }
  };

  const resetForm = () => {
    setCampaignForm({
      title: '',
      content: '',
      campaign_type: 'popup',
      start_date: '',
      end_date: '',
      target_service_missing: [],
      target_specific_clients: [],
      cta_type: 'form',
      cta_link: '',
      is_active: true
    });
  };

  const toggleServiceTarget = (serviceName) => {
    const current = campaignForm.target_service_missing || [];
    if (current.includes(serviceName)) {
      setCampaignForm({
        ...campaignForm,
        target_service_missing: current.filter(s => s !== serviceName)
      });
    } else {
      setCampaignForm({
        ...campaignForm,
        target_service_missing: [...current, serviceName]
      });
    }
  };

  if (loading) {
    return <div className="p-8">{tr.common.loading}</div>;
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto" data-testid="admin-campaigns-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-medium text-slate-900">{tr.admin.campaigns.title}</h1>
          <p className="text-slate-600 mt-2">Hedefli kampanyalar ve pop-up'lar oluşturun</p>
        </div>
        <Button onClick={() => setShowDialog(true)} className="bg-slate-900 hover:bg-black" data-testid="create-campaign-button">
          <Plus className="h-4 w-4 mr-2" />
          {tr.admin.campaigns.createCampaign}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {campaigns.length === 0 ? (
          <Card className="p-12 col-span-2 text-center border-slate-200">
            <Megaphone className="h-16 w-16 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600">Henüz kampanya yok</p>
          </Card>
        ) : (
          campaigns.map((campaign) => (
            <Card key={campaign.id} className="p-6 border-slate-200 shadow-sm hover:shadow-md transition-shadow" data-testid={`campaign-card-${campaign.id}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-slate-100 rounded-lg">
                    <Megaphone className="h-6 w-6 text-slate-900" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-slate-900">{campaign.title}</h3>
                    <span className="text-xs text-slate-500">{campaign.campaign_type}</span>
                  </div>
                </div>
                {campaign.is_active ? (
                  <span className="px-3 py-1 text-xs rounded-full bg-green-100 text-green-800">Aktif</span>
                ) : (
                  <span className="px-3 py-1 text-xs rounded-full bg-slate-100 text-slate-800">Pasif</span>
                )}
              </div>

              <p className="text-sm text-slate-600 mb-4">{campaign.content}</p>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(campaign.start_date).toLocaleDateString('tr-TR')} - {new Date(campaign.end_date).toLocaleDateString('tr-TR')}</span>
                </div>

                {campaign.target_service_missing && campaign.target_service_missing.length > 0 && (
                  <div className="p-3 bg-slate-50 rounded text-xs">
                    <p className="font-medium text-slate-900 mb-1">Hedef:</p>
                    <p className="text-slate-700">Şu hizmetleri olmayan müşteriler: {campaign.target_service_missing.join(', ')}</p>
                  </div>
                )}

                <div className="pt-3 border-t">
                  <span className="text-xs font-medium text-slate-700">Eylem: </span>
                  <span className="text-xs text-slate-600">{campaign.cta_type}</span>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Create Campaign Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => {
        setShowDialog(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="campaign-dialog">
          <DialogHeader>
            <DialogTitle>{tr.admin.campaigns.createCampaign}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">{tr.admin.campaigns.campaignTitle}</Label>
                <Input
                  id="title"
                  value={campaignForm.title}
                  onChange={(e) => setCampaignForm({ ...campaignForm, title: e.target.value })}
                  required
                  className="border-slate-300"
                  placeholder="Örn: Web Sitesi Özel Teklifi"
                  data-testid="campaign-title-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">{tr.admin.campaigns.campaignContent}</Label>
                <Textarea
                  id="content"
                  value={campaignForm.content}
                  onChange={(e) => setCampaignForm({ ...campaignForm, content: e.target.value })}
                  required
                  className="border-slate-300"
                  rows={4}
                  placeholder="Kampanya mesajınızı yazın..."
                  data-testid="campaign-content-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{tr.admin.campaigns.campaignType}</Label>
                  <Select value={campaignForm.campaign_type} onValueChange={(value) => setCampaignForm({ ...campaignForm, campaign_type: value })}>
                    <SelectTrigger className="border-slate-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="popup">{tr.admin.campaigns.popup}</SelectItem>
                      <SelectItem value="banner">{tr.admin.campaigns.banner}</SelectItem>
                      <SelectItem value="modal">{tr.admin.campaigns.modal}</SelectItem>
                      <SelectItem value="fullscreen">{tr.admin.campaigns.fullscreen}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{tr.admin.campaigns.ctaType}</Label>
                  <Select value={campaignForm.cta_type} onValueChange={(value) => setCampaignForm({ ...campaignForm, cta_type: value })}>
                    <SelectTrigger className="border-slate-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="form">{tr.admin.campaigns.form}</SelectItem>
                      <SelectItem value="whatsapp">{tr.admin.campaigns.whatsapp}</SelectItem>
                      <SelectItem value="call">{tr.admin.campaigns.call}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">{tr.admin.campaigns.startDate}</Label>
                  <Input
                    id="start_date"
                    type="datetime-local"
                    value={campaignForm.start_date}
                    onChange={(e) => setCampaignForm({ ...campaignForm, start_date: e.target.value })}
                    required
                    className="border-slate-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_date">{tr.admin.campaigns.endDate}</Label>
                  <Input
                    id="end_date"
                    type="datetime-local"
                    value={campaignForm.end_date}
                    onChange={(e) => setCampaignForm({ ...campaignForm, end_date: e.target.value })}
                    required
                    className="border-slate-300"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Hedefleme: Hizmeti Olmayan Müşteriler</Label>
                <div className="p-4 border border-slate-300 rounded-lg space-y-2">
                  {services.map((service) => (
                    <div key={service.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`service-${service.id}`}
                        checked={campaignForm.target_service_missing?.includes(service.name)}
                        onCheckedChange={() => toggleServiceTarget(service.name)}
                      />
                      <label htmlFor={`service-${service.id}`} className="text-sm cursor-pointer">
                        {service.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {campaignForm.cta_type !== 'form' && (
                <div className="space-y-2">
                  <Label htmlFor="cta_link">{tr.admin.campaigns.ctaLink}</Label>
                  <Input
                    id="cta_link"
                    value={campaignForm.cta_link}
                    onChange={(e) => setCampaignForm({ ...campaignForm, cta_link: e.target.value })}
                    className="border-slate-300"
                    placeholder="https:// veya telefon numarası"
                  />
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_active"
                  checked={campaignForm.is_active}
                  onCheckedChange={(checked) => setCampaignForm({ ...campaignForm, is_active: checked })}
                />
                <label htmlFor="is_active" className="text-sm">Kampanya aktif</label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                {tr.common.cancel}
              </Button>
              <Button type="submit" className="bg-slate-900 hover:bg-black" data-testid="submit-campaign-button">
                <Plus className="h-4 w-4 mr-2" />
                Oluştur
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
