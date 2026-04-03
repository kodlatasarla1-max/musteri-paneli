import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Key, Mail, User, UserPlus, Settings } from 'lucide-react';
import apiClient from '../../utils/api';
import { toast } from 'sonner';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Checkbox } from '../../components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { tr } from '../../utils/translations';

export const AdminClients = () => {
  const [clients, setClients] = useState([]);
  const [availableServices, setAvailableServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showCreateUserDialog, setShowCreateUserDialog] = useState(false);
  const [showServicesDialog, setShowServicesDialog] = useState(false);
  const [selectedClientForPassword, setSelectedClientForPassword] = useState(null);
  const [selectedClientForUser, setSelectedClientForUser] = useState(null);
  const [selectedClientForServices, setSelectedClientForServices] = useState(null);
  const [clientServiceStates, setClientServiceStates] = useState({});
  const [newPassword, setNewPassword] = useState('');
  const [newUserData, setNewUserData] = useState({ email: '', password: '' });
  const [creatingUser, setCreatingUser] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [selectedServices, setSelectedServices] = useState([]);
  const [savingServices, setSavingServices] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    industry: '',
    status: 'active',
    access_days_remaining: 30
  });

  useEffect(() => {
    loadClients();
    loadServices();
  }, []);

  const loadClients = async () => {
    try {
      const response = await apiClient.get('/clients');
      setClients(response.data);
    } catch (error) {
      console.error('Error loading clients:', error);
      toast.error(tr.admin.clients.failedToLoad);
    } finally {
      setLoading(false);
    }
  };

  const loadServices = async () => {
    try {
      const response = await apiClient.get('/services');
      setAvailableServices(response.data);
    } catch (error) {
      console.error('Error loading services:', error);
    }
  };

  const loadClientServices = async (clientId) => {
    try {
      const response = await apiClient.get(`/client-services/${clientId}`);
      const enabledIds = response.data
        .filter(s => s.is_active || s.is_enabled)
        .map(s => s.service_id);
      setSelectedServices(enabledIds);
    } catch (error) {
      console.error('Error loading client services:', error);
      setSelectedServices([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let clientId;
      if (editingClient) {
        await apiClient.put(`/clients/${editingClient.id}`, formData);
        clientId = editingClient.id;
        toast.success(tr.admin.clients.clientUpdated);
      } else {
        const response = await apiClient.post('/clients', formData);
        clientId = response.data.id;
        toast.success(tr.admin.clients.clientCreated);
      }

      // Save selected services
      if (clientId && availableServices.length > 0) {
        for (const service of availableServices) {
          const isEnabled = selectedServices.includes(service.id);
          try {
            await apiClient.post('/client-services', {
              client_id: clientId,
              service_id: service.id,
              is_enabled: isEnabled
            });
          } catch (err) {
            console.error('Error toggling service:', err);
          }
        }
      }

      setShowDialog(false);
      resetForm();
      loadClients();
    } catch (error) {
      toast.error(error.response?.data?.detail || tr.admin.clients.operationFailed);
    }
  };

  const handleDelete = async (clientId) => {
    if (!window.confirm(tr.admin.clients.deleteConfirm)) return;
    try {
      await apiClient.delete(`/clients/${clientId}`);
      toast.success(tr.admin.clients.clientDeleted);
      loadClients();
    } catch (error) {
      toast.error(tr.admin.clients.operationFailed);
    }
  };

  const resetForm = () => {
    setFormData({
      company_name: '',
      contact_name: '',
      contact_email: '',
      contact_phone: '',
      industry: '',
      status: 'active',
      access_days_remaining: 30
    });
    setSelectedServices([]);
    setEditingClient(null);
  };

  const openEditDialog = async (client) => {
    setEditingClient(client);
    setFormData({
      company_name: client.company_name,
      contact_name: client.contact_name,
      contact_email: client.contact_email,
      contact_phone: client.contact_phone,
      industry: client.industry,
      status: client.status,
      access_days_remaining: client.access_days_remaining
    });
    await loadClientServices(client.id);
    setShowDialog(true);
  };

  const openAddDialog = async () => {
    resetForm();
    setShowDialog(true);
  };

  const openServicesDialog = async (client) => {
    setSelectedClientForServices(client);
    await loadClientServices(client.id);
    setShowServicesDialog(true);
  };

  const handleSaveServices = async () => {
    if (!selectedClientForServices) return;
    setSavingServices(true);
    try {
      for (const service of availableServices) {
        const isEnabled = selectedServices.includes(service.id);
        await apiClient.post('/client-services', {
          client_id: selectedClientForServices.id,
          service_id: service.id,
          is_enabled: isEnabled
        });
      }
      toast.success('Hizmetler güncellendi');
      setShowServicesDialog(false);
      loadClients();
    } catch (error) {
      toast.error('Hizmetler güncellenemedi');
    } finally {
      setSavingServices(false);
    }
  };

  const toggleService = (serviceId) => {
    setSelectedServices(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleOpenCreateUserDialog = (client) => {
    setSelectedClientForUser(client);
    setNewUserData({ email: client.contact_email, password: '' });
    setShowCreateUserDialog(true);
  };

  const handleCreateUserWithCredentials = async () => {
    if (!newUserData.email || !newUserData.password) {
      toast.error('E-posta ve şifre gereklidir');
      return;
    }
    if (newUserData.password.length < 6) {
      toast.error('Şifre en az 6 karakter olmalıdır');
      return;
    }
    setCreatingUser(true);
    try {
      const response = await apiClient.post(`/clients/${selectedClientForUser.id}/create-user-manual`, {
        email: newUserData.email,
        password: newUserData.password
      });
      toast.success('Kullanıcı hesabı oluşturuldu!');
      if (response.data.email_sent) {
        toast.success('Giriş bilgileri e-posta ile gönderildi');
      }
      setShowCreateUserDialog(false);
      loadClients();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Kullanıcı oluşturulamadı');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleOpenPasswordDialog = (client) => {
    setSelectedClientForPassword(client);
    setNewPassword('');
    setShowPasswordDialog(true);
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error('Şifre en az 6 karakter olmalıdır');
      return;
    }
    try {
      await apiClient.put(`/clients/${selectedClientForPassword.id}/password`, {
        new_password: newPassword
      });
      toast.success('Şifre güncellendi');
      setShowPasswordDialog(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Şifre güncellenemedi');
    }
  };

  const handleSendCredentials = async (clientId) => {
    try {
      const response = await apiClient.post(`/clients/${clientId}/send-credentials`);
      if (response.data.success) {
        toast.success('Giriş bilgileri e-posta ile gönderildi');
      } else {
        toast.info(`E-posta gönderilemedi. Yeni şifre: ${response.data.new_password}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'İşlem başarısız');
    }
  };

  const handleStatusChange = async (clientId, newStatus) => {
    try {
      await apiClient.put(`/clients/${clientId}`, { status: newStatus });
      toast.success('Müşteri durumu güncellendi');
      loadClients();
    } catch (error) {
      toast.error('Durum güncellenemedi');
    }
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(password);
  };

  if (loading) {
    return <div className="p-4 lg:p-8">Yükleniyor...</div>;
  }

  return (
    <div className="p-4 lg:p-8 max-w-[1600px] mx-auto" data-testid="admin-clients-page">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 lg:mb-8">
        <div>
          <h1 className="text-2xl lg:text-4xl font-medium text-slate-900" data-testid="clients-title">{tr.admin.clients.title}</h1>
          <p className="text-sm lg:text-base text-slate-600 mt-1 lg:mt-2">Müşteri profillerini ve hizmet erişimlerini yönetin</p>
        </div>
        <Button onClick={openAddDialog} className="bg-slate-900 hover:bg-black w-full sm:w-auto" data-testid="add-client-button">
          <Plus className="h-4 w-4 mr-2" />
          {tr.admin.clients.addClient}
        </Button>
      </div>

      {/* Mobile: Card View */}
      <div className="lg:hidden space-y-3">
        {clients.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-slate-600">{tr.admin.clients.noClients}</p>
          </Card>
        ) : (
          clients.map((client) => (
            <Card key={client.id} className="p-4" data-testid={`client-card-${client.id}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-medium text-slate-900">{client.company_name}</h3>
                  <p className="text-sm text-slate-600">{client.contact_name}</p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  client.status === 'active' ? 'bg-green-100 text-green-800' :
                  client.status === 'expired' ? 'bg-red-100 text-red-800' :
                  'bg-slate-100 text-slate-800'
                }`}>
                  {tr.status[client.status] || client.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                <div>
                  <span className="text-slate-500">Sektör:</span>
                  <span className="ml-1">{client.industry}</span>
                </div>
                <div>
                  <span className="text-slate-500">Erişim:</span>
                  <span className="ml-1">{client.access_days_remaining} gün</span>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openEditDialog(client)}
                  className="flex-1 border-slate-300 text-slate-900"
                >
                  <Edit className="h-4 w-4 mr-1" /> Düzenle
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openServicesDialog(client)}
                  className="border-slate-300 text-slate-700"
                >
                  <Settings className="h-4 w-4 mr-1" /> Hizmetler
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(client.id)}
                  className="border-red-200 text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Desktop: Table View */}
      <Card className="border-slate-200 shadow-sm hidden lg:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 border-b border-slate-200">
              <TableHead className="text-slate-900 font-semibold">{tr.admin.clients.companyName}</TableHead>
              <TableHead className="text-slate-900 font-semibold">{tr.admin.clients.contactName}</TableHead>
              <TableHead className="text-slate-900 font-semibold">{tr.admin.clients.industry}</TableHead>
              <TableHead className="text-slate-900 font-semibold">{tr.admin.clients.status}</TableHead>
              <TableHead className="text-slate-900 font-semibold">Hesap</TableHead>
              <TableHead className="text-slate-900 font-semibold">Hizmetler</TableHead>
              <TableHead className="text-slate-900 font-semibold">{tr.admin.clients.accessDays}</TableHead>
              <TableHead className="text-right text-slate-900 font-semibold">{tr.common.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-slate-600">
                  {tr.admin.clients.noClients}
                </TableCell>
              </TableRow>
            ) : (
              clients.map((client) => (
                <TableRow key={client.id} data-testid={`client-row-${client.id}`}>
                  <TableCell className="font-medium">{client.company_name}</TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">{client.contact_name}</p>
                      <p className="text-xs text-slate-600">{client.contact_email}</p>
                    </div>
                  </TableCell>
                  <TableCell>{client.industry}</TableCell>
                  <TableCell>
                    <Select
                      value={client.status}
                      onValueChange={(val) => handleStatusChange(client.id, val)}
                    >
                      <SelectTrigger className="w-28 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Aktif</SelectItem>
                        <SelectItem value="pending">Beklemede</SelectItem>
                        <SelectItem value="expired">Süresi Dolmuş</SelectItem>
                        <SelectItem value="suspended">Askıya Alındı</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {client.has_user_account ? (
                      <div className="flex items-center gap-1">
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          <User className="h-3 w-3 mr-1" />
                          Aktif
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenPasswordDialog(client)}
                          className="h-7 w-7 p-0"
                          title="Şifre Değiştir"
                        >
                          <Key className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSendCredentials(client.id)}
                          className="h-7 w-7 p-0"
                          title="Bilgileri Gönder"
                        >
                          <Mail className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenCreateUserDialog(client)}
                        disabled={creatingUser}
                        className="border-slate-300 text-slate-700 text-xs"
                        data-testid={`create-user-${client.id}`}
                      >
                        <UserPlus className="h-3 w-3 mr-1" />
                        Hesap Oluştur
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openServicesDialog(client)}
                      className="border-slate-300 text-slate-700 text-xs"
                    >
                      <Settings className="h-3 w-3 mr-1" />
                      Düzenle
                    </Button>
                  </TableCell>
                  <TableCell>{client.access_days_remaining} gün</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDialog(client)}
                        className="border-slate-300 text-slate-900 hover:bg-slate-50"
                        data-testid={`edit-client-${client.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(client.id)}
                        className="border-red-200 text-red-600 hover:bg-red-50"
                        data-testid={`delete-client-${client.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Add/Edit Client Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => {
        setShowDialog(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="client-dialog" aria-describedby="client-dialog-description">
          <DialogHeader>
            <DialogTitle>{editingClient ? tr.admin.clients.editClient : tr.admin.clients.addClient}</DialogTitle>
            <DialogDescription id="client-dialog-description">
              {editingClient ? 'Müşteri bilgilerini güncelleyin.' : 'Yeni müşteri bilgilerini girin.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="company_name">{tr.admin.clients.companyName}</Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  required
                  className="border-slate-300"
                  data-testid="company-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_name">{tr.admin.clients.contactName}</Label>
                <Input
                  id="contact_name"
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  required
                  className="border-slate-300"
                  data-testid="contact-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_email">{tr.admin.clients.contactEmail}</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  required
                  className="border-slate-300"
                  data-testid="contact-email-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_phone">{tr.admin.clients.contactPhone}</Label>
                <Input
                  id="contact_phone"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  required
                  className="border-slate-300"
                  data-testid="contact-phone-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">{tr.admin.clients.industry}</Label>
                <Input
                  id="industry"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  required
                  className="border-slate-300"
                  data-testid="industry-input"
                />
              </div>

              {/* Service Selection */}
              {availableServices.length > 0 && (
                <div className="space-y-3 pt-2">
                  <Label className="text-sm font-semibold text-slate-900">Alınan Hizmetler</Label>
                  <div className="grid grid-cols-1 gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    {availableServices.map((service) => (
                      <div key={service.id} className="flex items-center gap-3">
                        <Checkbox
                          id={`service-${service.id}`}
                          checked={selectedServices.includes(service.id)}
                          onCheckedChange={() => toggleService(service.id)}
                          className="border-slate-400"
                        />
                        <label
                          htmlFor={`service-${service.id}`}
                          className="text-sm text-slate-700 cursor-pointer flex-1"
                        >
                          {service.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                {tr.common.cancel}
              </Button>
              <Button type="submit" className="bg-slate-900 hover:bg-black" data-testid="submit-client-button">
                {editingClient ? tr.common.update : tr.common.create}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Services Management Dialog */}
      <Dialog open={showServicesDialog} onOpenChange={setShowServicesDialog}>
        <DialogContent className="max-w-md" aria-describedby="services-dialog-description">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Hizmet Yönetimi
            </DialogTitle>
            <DialogDescription id="services-dialog-description">
              {selectedClientForServices?.company_name} için aktif hizmetleri seçin
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {availableServices.length === 0 ? (
              <p className="text-slate-500 text-sm">Hizmet bulunamadı</p>
            ) : (
              <div className="space-y-2">
                {availableServices.map((service) => (
                  <div key={service.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                    <Checkbox
                      id={`srv-${service.id}`}
                      checked={selectedServices.includes(service.id)}
                      onCheckedChange={() => toggleService(service.id)}
                      className="border-slate-400"
                    />
                    <label
                      htmlFor={`srv-${service.id}`}
                      className="text-sm font-medium text-slate-700 cursor-pointer flex-1"
                    >
                      {service.name}
                    </label>
                    {selectedServices.includes(service.id) && (
                      <span className="text-xs text-green-600 font-medium">Aktif</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowServicesDialog(false)}>
              İptal
            </Button>
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

      {/* Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Müşteri Şifresi Değiştir</DialogTitle>
            <DialogDescription>
              {selectedClientForPassword?.company_name} - {selectedClientForPassword?.contact_email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Yeni Şifre</Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="En az 6 karakter"
                  className="border-slate-300"
                  data-testid="new-password-input"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={generatePassword}
                  className="border-slate-300"
                >
                  Oluştur
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
              İptal
            </Button>
            <Button onClick={handleUpdatePassword} className="bg-slate-900 hover:bg-black">
              Şifreyi Güncelle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={showCreateUserDialog} onOpenChange={setShowCreateUserDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Müşteri Hesabı Oluştur
            </DialogTitle>
            <DialogDescription>
              {selectedClientForUser?.company_name} için giriş bilgilerini belirleyin
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>E-posta Adresi</Label>
              <Input
                type="email"
                value={newUserData.email}
                onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                placeholder="ornek@sirket.com"
                className="border-slate-300"
                data-testid="new-user-email-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Şifre</Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={newUserData.password}
                  onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                  placeholder="En az 6 karakter"
                  className="border-slate-300"
                  data-testid="new-user-password-input"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
                    let pass = '';
                    for (let i = 0; i < 12; i++) {
                      pass += chars.charAt(Math.floor(Math.random() * chars.length));
                    }
                    setNewUserData({ ...newUserData, password: pass });
                  }}
                  className="border-slate-300"
                >
                  Oluştur
                </Button>
              </div>
              <p className="text-xs text-slate-500">Bu bilgiler müşteriye e-posta ile gönderilecektir</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateUserDialog(false)}>
              İptal
            </Button>
            <Button
              onClick={handleCreateUserWithCredentials}
              className="bg-slate-900 hover:bg-black"
              disabled={creatingUser}
            >
              {creatingUser ? 'Oluşturuluyor...' : 'Hesap Oluştur ve Gönder'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
