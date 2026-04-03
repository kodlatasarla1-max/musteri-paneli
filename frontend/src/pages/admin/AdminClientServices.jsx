import { useState, useEffect } from 'react';
import { Clock, Settings, CheckCircle2, XCircle } from 'lucide-react';
import apiClient from '../../utils/api';
import { toast } from 'sonner';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Checkbox } from '../../components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/ui/dialog';

export const AdminClientServices = () => {
  const [clients, setClients] = useState([]);
  const [availableServices, setAvailableServices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Access duration dialog
  const [showAccessDialog, setShowAccessDialog] = useState(false);
  const [selectedClientForAccess, setSelectedClientForAccess] = useState(null);
  const [accessDays, setAccessDays] = useState('');
  const [settingAccess, setSettingAccess] = useState(false);

  // Services dialog
  const [showServicesDialog, setShowServicesDialog] = useState(false);
  const [selectedClientForServices, setSelectedClientForServices] = useState(null);
  const [selectedServices, setSelectedServices] = useState([]);
  const [savingServices, setSavingServices] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [clientsRes, servicesRes] = await Promise.all([
        apiClient.get('/clients'),
        apiClient.get('/services'),
      ]);
      setClients(clientsRes.data);
      setAvailableServices(servicesRes.data);
    } catch (error) {
      toast.error('Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  // ── Access duration ────────────────────────────────────────────
  const openAccessDialog = (client) => {
    setSelectedClientForAccess(client);
    setAccessDays(client.access_days_remaining > 0 ? String(client.access_days_remaining) : '');
    setShowAccessDialog(true);
  };

  const handleSetAccess = async () => {
    const days = parseInt(accessDays, 10);
    if (isNaN(days) || days < 0) {
      toast.error('Geçerli bir gün sayısı girin (0 veya daha fazla)');
      return;
    }
    setSettingAccess(true);
    try {
      const res = await apiClient.post(`/clients/${selectedClientForAccess.id}/set-access`, { days });
      toast.success(res.data.message || `${days} gün erişim ayarlandı`);
      setShowAccessDialog(false);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erişim süresi ayarlanamadı');
    } finally {
      setSettingAccess(false);
    }
  };

  // ── Services ──────────────────────────────────────────────────
  const openServicesDialog = async (client) => {
    setSelectedClientForServices(client);
    try {
      const res = await apiClient.get(`/client-services/${client.id}`);
      const enabledIds = res.data
        .filter(s => s.is_active || s.is_enabled)
        .map(s => s.service_id);
      setSelectedServices(enabledIds);
    } catch {
      setSelectedServices([]);
    }
    setShowServicesDialog(true);
  };

  const toggleService = (serviceId) => {
    setSelectedServices(prev =>
      prev.includes(serviceId) ? prev.filter(id => id !== serviceId) : [...prev, serviceId]
    );
  };

  const handleSaveServices = async () => {
    if (!selectedClientForServices) return;
    setSavingServices(true);
    try {
      for (const service of availableServices) {
        await apiClient.post('/client-services', {
          client_id: selectedClientForServices.id,
          service_id: service.id,
          is_enabled: selectedServices.includes(service.id),
        });
      }
      toast.success('Hizmetler güncellendi');
      setShowServicesDialog(false);
      loadData();
    } catch {
      toast.error('Hizmetler güncellenemedi');
    } finally {
      setSavingServices(false);
    }
  };

  const getDaysColor = (days) => {
    if (days <= 0) return 'text-red-600 bg-red-50';
    if (days <= 7) return 'text-orange-600 bg-orange-50';
    return 'text-green-700 bg-green-50';
  };

  if (loading) {
    return <div className="p-8 text-slate-500">Yükleniyor...</div>;
  }

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-4xl font-medium text-slate-900">Hizmet Yönetimi</h1>
        <p className="text-sm lg:text-base text-slate-600 mt-1 lg:mt-2">
          Müşterilerin hizmetlerini ve erişim sürelerini buradan yönetin
        </p>
      </div>

      {clients.length === 0 ? (
        <Card className="p-8 text-center text-slate-500">Henüz müşteri yok</Card>
      ) : (
        <div className="space-y-3">
          {clients.map((client) => (
            <Card key={client.id} className="p-4 lg:p-5 border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                {/* Client info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 text-base truncate">{client.company_name}</p>
                  <p className="text-sm text-slate-500 truncate">{client.contact_name} · {client.contact_email}</p>
                </div>

                {/* Access badge */}
                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium shrink-0 ${getDaysColor(client.access_days_remaining)}`}>
                  <Clock className="h-3.5 w-3.5" />
                  {client.access_days_remaining > 0
                    ? `${client.access_days_remaining} gün kaldı`
                    : 'Erişim yok'}
                </div>

                {/* Buttons */}
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openAccessDialog(client)}
                    className="border-blue-200 text-blue-700 hover:bg-blue-50 gap-1.5"
                  >
                    <Clock className="h-4 w-4" />
                    Süre Ayarla
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openServicesDialog(client)}
                    className="border-slate-300 text-slate-700 hover:bg-slate-50 gap-1.5"
                  >
                    <Settings className="h-4 w-4" />
                    Hizmetler
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Access Duration Dialog */}
      <Dialog open={showAccessDialog} onOpenChange={setShowAccessDialog}>
        <DialogContent className="max-w-sm" aria-describedby="access-desc">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Erişim Süresi Ayarla
            </DialogTitle>
            <DialogDescription id="access-desc">
              <span className="font-medium text-slate-800">{selectedClientForAccess?.company_name}</span>
              {' '}— şu an {selectedClientForAccess?.access_days_remaining ?? 0} gün kaldı
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="access-days-input">Gün Sayısı (bugünden itibaren)</Label>
              <Input
                id="access-days-input"
                type="number"
                min="0"
                value={accessDays}
                onChange={(e) => setAccessDays(e.target.value)}
                placeholder="Örn: 30"
                className="border-slate-300 text-center text-lg font-semibold"
                onKeyDown={(e) => e.key === 'Enter' && handleSetAccess()}
                autoFocus
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {[7, 14, 30, 60, 90, 180, 365].map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setAccessDays(String(d))}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                    accessDays === String(d)
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {d} gün
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500">
              0 girilirse erişim hemen kapatılır. Mevcut süre <strong>sıfırlanarak</strong> yeni süre başlar.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAccessDialog(false)}>İptal</Button>
            <Button
              onClick={handleSetAccess}
              className="bg-slate-900 hover:bg-black"
              disabled={settingAccess || accessDays === ''}
            >
              {settingAccess ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Services Dialog */}
      <Dialog open={showServicesDialog} onOpenChange={setShowServicesDialog}>
        <DialogContent className="max-w-md" aria-describedby="services-desc">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Hizmet Seçimi
            </DialogTitle>
            <DialogDescription id="services-desc">
              <span className="font-medium text-slate-800">{selectedClientForServices?.company_name}</span>
              {' '}için aktif hizmetleri seçin
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {availableServices.length === 0 ? (
              <p className="text-slate-500 text-sm text-center">Hizmet tanımlanmamış</p>
            ) : (
              <div className="space-y-2">
                {availableServices.map((service) => {
                  const isChecked = selectedServices.includes(service.id);
                  return (
                    <label
                      key={service.id}
                      htmlFor={`svc-${service.id}`}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        isChecked
                          ? 'bg-slate-900 border-slate-900 text-white'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Checkbox
                        id={`svc-${service.id}`}
                        checked={isChecked}
                        onCheckedChange={() => toggleService(service.id)}
                        className={isChecked ? 'border-white' : 'border-slate-400'}
                      />
                      <span className="flex-1 text-sm font-medium">{service.name}</span>
                      {isChecked
                        ? <CheckCircle2 className="h-4 w-4 text-green-400" />
                        : <XCircle className="h-4 w-4 text-slate-300" />
                      }
                    </label>
                  );
                })}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowServicesDialog(false)}>İptal</Button>
            <Button
              onClick={handleSaveServices}
              className="bg-slate-900 hover:bg-black"
              disabled={savingServices}
            >
              {savingServices ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
