import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Link2, RefreshCw, Trash2, ExternalLink, CheckCircle, AlertCircle, Settings, Zap, Key } from 'lucide-react';
import apiClient from '../../utils/api';
import { toast } from 'sonner';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { tr } from '../../utils/translations';

export const AdminMetaIntegration = () => {
  const [searchParams] = useSearchParams();
  const [clients, setClients] = useState([]);
  const [metaAccounts, setMetaAccounts] = useState([]);
  const [oauthStatus, setOauthStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showOAuthDialog, setShowOAuthDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [syncingClient, setSyncingClient] = useState(null);
  const [refreshingClient, setRefreshingClient] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [selectedClientForOAuth, setSelectedClientForOAuth] = useState('');
  
  const [formData, setFormData] = useState({
    client_id: '',
    meta_access_token: '',
    ad_account_id: '',
    account_name: ''
  });

  useEffect(() => {
    loadData();
    
    // Check for OAuth callback result
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const accounts = searchParams.get('accounts');
    
    if (success === 'true') {
      toast.success(`Meta hesabı başarıyla bağlandı! ${accounts ? `${accounts} reklam hesabı bulundu.` : ''}`);
    } else if (error) {
      toast.error(`OAuth hatası: ${error}`);
    }
  }, [searchParams]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [clientsRes, accountsRes, statusRes] = await Promise.all([
        apiClient.get('/clients'),
        apiClient.get('/meta-accounts'),
        apiClient.get('/meta/oauth/status').catch(() => ({ data: { configured: false } }))
      ]);
      setClients(clientsRes.data);
      setMetaAccounts(accountsRes.data);
      setOauthStatus(statusRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      await apiClient.post('/meta-accounts', formData);
      toast.success('Meta hesabı başarıyla kaydedildi');
      setShowDialog(false);
      resetForm();
      loadData();
    } catch (error) {
      const message = error.response?.data?.detail || 'İşlem başarısız';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSync = async (clientId) => {
    setSyncingClient(clientId);
    
    try {
      const response = await apiClient.post(`/meta-accounts/${clientId}/fetch-data`);
      toast.success(response.data.message || 'Veriler senkronize edildi');
      loadData();
    } catch (error) {
      const message = error.response?.data?.detail || 'Senkronizasyon başarısız';
      toast.error(message);
    } finally {
      setSyncingClient(null);
    }
  };

  const handleRefreshToken = async (clientId) => {
    setRefreshingClient(clientId);
    
    try {
      const response = await apiClient.post(`/meta/refresh-token/${clientId}`);
      toast.success(response.data.message || 'Token yenilendi');
      loadData();
    } catch (error) {
      const message = error.response?.data?.detail || 'Token yenilenemedi';
      toast.error(message);
    } finally {
      setRefreshingClient(null);
    }
  };

  const handleStartOAuth = async () => {
    if (!selectedClientForOAuth) {
      toast.error('Lütfen bir müşteri seçin');
      return;
    }
    
    try {
      const response = await apiClient.get(`/meta/oauth/start/${selectedClientForOAuth}`);
      // Redirect to Meta authorization URL
      window.location.href = response.data.authorization_url;
    } catch (error) {
      const message = error.response?.data?.detail || 'OAuth başlatılamadı';
      toast.error(message);
    }
  };

  const handleDelete = async () => {
    if (!selectedAccount) return;
    
    setSubmitting(true);
    try {
      await apiClient.delete(`/meta-accounts/${selectedAccount.client_id}`);
      toast.success('Meta hesabı silindi');
      setShowDeleteDialog(false);
      setSelectedAccount(null);
      loadData();
    } catch (error) {
      toast.error('Meta hesabı silinemedi');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      client_id: '',
      meta_access_token: '',
      ad_account_id: '',
      account_name: ''
    });
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.company_name || 'Bilinmeyen';
  };

  const getConnectedClients = () => {
    return metaAccounts.map(acc => acc.client_id);
  };

  const getUnconnectedClients = () => {
    const connectedIds = getConnectedClients();
    return clients.filter(c => !connectedIds.includes(c.id));
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto" data-testid="admin-meta-integration-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-medium text-slate-900" data-testid="meta-title">
            Meta Ads Entegrasyonu
          </h1>
          <p className="text-slate-600 mt-2 text-sm sm:text-base">
            Müşterilerin Meta (Facebook/Instagram) reklam hesaplarını bağlayın
          </p>
        </div>
        <div className="flex gap-2">
          {oauthStatus?.configured && (
            <Button 
              onClick={() => setShowOAuthDialog(true)} 
              className="bg-indigo-600 hover:bg-indigo-700" 
              data-testid="oauth-connect-button"
              disabled={getUnconnectedClients().length === 0}
            >
              <Zap className="h-4 w-4 mr-2" />
              OAuth ile Bağla
            </Button>
          )}
          <Button 
            onClick={() => {
              resetForm();
              setShowDialog(true);
            }} 
            variant={oauthStatus?.configured ? "outline" : "default"}
            className={oauthStatus?.configured ? "border-blue-200 text-blue-600 hover:bg-blue-50" : "bg-blue-600 hover:bg-blue-700"} 
            data-testid="connect-meta-button"
            disabled={getUnconnectedClients().length === 0}
          >
            <Key className="h-4 w-4 mr-2" />
            Manuel Token
          </Button>
        </div>
      </div>

      {/* OAuth Status Banner */}
      {oauthStatus && (
        <Card className={`mb-6 p-4 ${oauthStatus.configured ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className="flex items-center gap-3">
            {oauthStatus.configured ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-900">OAuth Yapılandırıldı</p>
                  <p className="text-sm text-green-700">Meta App ID: {oauthStatus.app_id}</p>
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-900">OAuth Yapılandırılmadı</p>
                  <p className="text-sm text-amber-700">META_APP_ID ve META_APP_SECRET .env dosyasına ekleyin</p>
                </div>
              </>
            )}
          </div>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-white border-blue-100">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-3 bg-blue-100 rounded-xl">
              <Link2 className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-semibold text-blue-900">{metaAccounts.length}</p>
              <p className="text-xs sm:text-sm text-slate-600">Bağlı Hesap</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 sm:p-6 bg-gradient-to-br from-green-50 to-white border-green-100">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-3 bg-green-100 rounded-xl">
              <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-semibold text-green-900">
                {metaAccounts.filter(a => a.is_active).length}
              </p>
              <p className="text-xs sm:text-sm text-slate-600">Aktif</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 sm:p-6 bg-gradient-to-br from-amber-50 to-white border-amber-100">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-3 bg-amber-100 rounded-xl">
              <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-semibold text-amber-900">
                {getUnconnectedClients().length}
              </p>
              <p className="text-xs sm:text-sm text-slate-600">Bağlanmamış</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 sm:p-6 bg-gradient-to-br from-indigo-50 to-white border-indigo-100">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-3 bg-indigo-100 rounded-xl">
              <Settings className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-semibold text-indigo-900">{clients.length}</p>
              <p className="text-xs sm:text-sm text-slate-600">Toplam Müşteri</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Connected Accounts Table */}
      <Card className="border-blue-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <h2 className="font-medium text-slate-900">Bağlı Meta Hesapları</h2>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-blue-50/50">
                <TableHead className="whitespace-nowrap">Müşteri</TableHead>
                <TableHead className="whitespace-nowrap">Hesap Adı</TableHead>
                <TableHead className="whitespace-nowrap hidden sm:table-cell">Ad Account ID</TableHead>
                <TableHead className="whitespace-nowrap hidden md:table-cell">Son Senkronizasyon</TableHead>
                <TableHead className="whitespace-nowrap">Durum</TableHead>
                <TableHead className="text-right whitespace-nowrap">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metaAccounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-slate-600">
                    <Link2 className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                    <p>Henüz bağlı Meta hesabı yok</p>
                    <p className="text-sm mt-2">İlk hesabı bağlamak için yukarıdaki butonu kullanın.</p>
                  </TableCell>
                </TableRow>
              ) : (
                metaAccounts.map((account) => (
                  <TableRow key={account.id} data-testid={`meta-account-${account.id}`}>
                    <TableCell className="font-medium">
                      {account.clients?.company_name || getClientName(account.client_id)}
                    </TableCell>
                    <TableCell>{account.account_name || '-'}</TableCell>
                    <TableCell className="hidden sm:table-cell font-mono text-sm">
                      {account.ad_account_id}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-slate-600">
                      {account.last_sync 
                        ? new Date(account.last_sync).toLocaleString('tr-TR')
                        : 'Henüz senkronize edilmedi'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={account.is_active ? "default" : "secondary"} className={account.is_active ? "bg-green-100 text-green-800" : ""}>
                        {account.is_active ? 'Aktif' : 'Pasif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 sm:gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSync(account.client_id)}
                          disabled={syncingClient === account.client_id}
                          className="border-blue-200 text-blue-600 hover:bg-blue-50"
                          data-testid={`sync-button-${account.client_id}`}
                        >
                          <RefreshCw className={`h-4 w-4 ${syncingClient === account.client_id ? 'animate-spin' : ''}`} />
                          <span className="hidden sm:inline ml-1">Senkronize Et</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedAccount(account);
                            setShowDeleteDialog(true);
                          }}
                          className="border-red-200 text-red-600 hover:bg-red-50"
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
        </div>
      </Card>

      {/* Info Card */}
      <Card className="mt-6 p-6 border-blue-100 bg-blue-50/50">
        <h3 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
          <ExternalLink className="h-5 w-5 text-blue-600" />
          Meta Access Token Nasıl Alınır?
        </h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-slate-700">
          <li>
            <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              Facebook Graph API Explorer
            </a>'a gidin
          </li>
          <li>Facebook hesabınızla giriş yapın ve ilgili uygulamayı seçin</li>
          <li><strong>ads_read</strong> ve <strong>ads_management</strong> izinlerini ekleyin</li>
          <li>Generate Access Token butonuna tıklayın</li>
          <li>Ad Account ID'yi Business Manager &gt; Ad Accounts bölümünden bulabilirsiniz</li>
        </ol>
        <p className="text-xs text-slate-500 mt-4">
          Not: Access token'ın süresi dolabilir. Uzun süreli token için System User oluşturmanız önerilir.
        </p>
      </Card>

      {/* Connect Account Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => {
        setShowDialog(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-lg" data-testid="connect-meta-dialog" aria-describedby="meta-dialog-desc">
          <DialogHeader>
            <DialogTitle>Meta Hesabı Bağla</DialogTitle>
            <DialogDescription id="meta-dialog-desc">
              Müşterinin Meta (Facebook/Instagram) reklam hesabını bağlayarak otomatik rapor alın.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Müşteri</Label>
                <Select value={formData.client_id} onValueChange={(val) => setFormData({ ...formData, client_id: val })}>
                  <SelectTrigger className="border-blue-200" data-testid="client-select">
                    <SelectValue placeholder="Müşteri seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {getUnconnectedClients().map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="account_name">Hesap Adı (İsteğe bağlı)</Label>
                <Input
                  id="account_name"
                  value={formData.account_name}
                  onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                  className="border-blue-200"
                  placeholder="Örn: ABC Şirketi - Ana Hesap"
                  data-testid="account-name-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ad_account_id">Ad Account ID *</Label>
                <Input
                  id="ad_account_id"
                  value={formData.ad_account_id}
                  onChange={(e) => setFormData({ ...formData, ad_account_id: e.target.value })}
                  required
                  className="border-blue-200 font-mono"
                  placeholder="123456789012345"
                  data-testid="ad-account-input"
                />
                <p className="text-xs text-slate-500">act_ öneki olmadan girin, otomatik eklenir</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="meta_access_token">Access Token *</Label>
                <Input
                  id="meta_access_token"
                  value={formData.meta_access_token}
                  onChange={(e) => setFormData({ ...formData, meta_access_token: e.target.value })}
                  required
                  className="border-blue-200 font-mono text-xs"
                  placeholder="EAAxxxxxx..."
                  data-testid="access-token-input"
                />
                <p className="text-xs text-slate-500">Graph API Explorer'dan alınan token</p>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                İptal
              </Button>
              <Button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700" 
                data-testid="submit-meta-button"
                disabled={submitting || !formData.client_id}
              >
                {submitting ? 'Kaydediliyor...' : 'Hesabı Bağla'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent aria-describedby="delete-meta-desc">
          <DialogHeader>
            <DialogTitle>Meta Hesabını Sil</DialogTitle>
            <DialogDescription id="delete-meta-desc">
              <span className="font-medium text-slate-900">
                {selectedAccount?.clients?.company_name || getClientName(selectedAccount?.client_id)}
              </span> için bağlı Meta hesabını silmek istediğinize emin misiniz?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setShowDeleteDialog(false)}>
              İptal
            </Button>
            <Button 
              onClick={handleDelete} 
              variant="destructive"
              disabled={submitting}
            >
              {submitting ? 'Siliniyor...' : 'Sil'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* OAuth Connect Dialog */}
      <Dialog open={showOAuthDialog} onOpenChange={setShowOAuthDialog}>
        <DialogContent aria-describedby="oauth-dialog-desc">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-indigo-600" />
              Meta OAuth ile Bağlan
            </DialogTitle>
            <DialogDescription id="oauth-dialog-desc">
              Facebook hesabınızla giriş yaparak reklam hesaplarınıza otomatik erişim sağlayın.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Müşteri Seçin</Label>
              <Select value={selectedClientForOAuth} onValueChange={setSelectedClientForOAuth}>
                <SelectTrigger className="border-indigo-200">
                  <SelectValue placeholder="Müşteri seçin" />
                </SelectTrigger>
                <SelectContent>
                  {getUnconnectedClients().map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="p-4 bg-indigo-50 rounded-lg">
              <h4 className="font-medium text-indigo-900 mb-2">OAuth Avantajları</h4>
              <ul className="text-sm text-indigo-700 space-y-1">
                <li>• Token manuel girmek yerine otomatik alınır</li>
                <li>• 60 gün geçerli long-lived token</li>
                <li>• Tüm reklam hesapları otomatik listelenir</li>
                <li>• Daha güvenli (şifre paylaşımı yok)</li>
              </ul>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setShowOAuthDialog(false)}>
              İptal
            </Button>
            <Button 
              onClick={handleStartOAuth}
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={!selectedClientForOAuth}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Facebook'a Git
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
