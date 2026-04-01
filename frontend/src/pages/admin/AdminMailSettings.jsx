import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { Mail, Settings, FileText, Send, CheckCircle, AlertCircle, Eye, Save, TestTube } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminMailSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settings, setSettings] = useState({
    provider: 'smtp',
    smtp_host: '',
    smtp_port: 587,
    smtp_username: '',
    smtp_password: '',
    smtp_use_tls: true,
    smtp_from_email: '',
    smtp_from_name: 'Mova Dijital',
    resend_api_key: '',
    resend_from_email: ''
  });
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [showTestDialog, setShowTestDialog] = useState(false);

  const templateTypes = {
    'welcome': 'Hoş Geldin E-postası',
    'receipt_approved': 'Makbuz Onaylandı',
    'content_uploaded': 'Yeni İçerik Yüklendi',
    'event_created': 'Yeni Etkinlik Planlandı'
  };

  useEffect(() => {
    fetchSettings();
    fetchTemplates();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/mail/settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.settings) {
        setSettings(prev => ({ ...prev, ...data.settings }));
      }
    } catch (error) {
      console.error('Fetch settings error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/mail/templates`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Fetch templates error:', error);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/mail/settings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Mail ayarları kaydedildi');
      } else {
        toast.error('Ayarlar kaydedilemedi');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!selectedTemplate) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/mail/templates`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(selectedTemplate)
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Şablon kaydedildi');
        fetchTemplates();
      } else {
        toast.error('Şablon kaydedilemedi');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmail) {
      toast.error('Lütfen bir e-posta adresi girin');
      return;
    }
    setTesting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/mail/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ to_email: testEmail })
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Test e-postası gönderildi');
        setShowTestDialog(false);
      } else {
        toast.error(data.detail || 'E-posta gönderilemedi');
      }
    } catch (error) {
      toast.error('E-posta gönderilemedi');
    } finally {
      setTesting(false);
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
    <div className="space-y-6" data-testid="mail-settings-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">E-posta Ayarları</h1>
          <p className="text-slate-600 mt-1">Mail sunucusu ve şablon ayarlarını yapılandırın</p>
        </div>
        <Button 
          onClick={() => setShowTestDialog(true)} 
          variant="outline"
          className="border-slate-300"
          data-testid="test-email-button"
        >
          <TestTube className="h-4 w-4 mr-2" />
          Test E-postası Gönder
        </Button>
      </div>

      <Tabs defaultValue="server" className="w-full">
        <TabsList className="mb-6 bg-slate-100">
          <TabsTrigger value="server" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
            <Settings className="h-4 w-4 mr-2" />
            Sunucu Ayarları
          </TabsTrigger>
          <TabsTrigger value="templates" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
            <FileText className="h-4 w-4 mr-2" />
            E-posta Şablonları
          </TabsTrigger>
        </TabsList>

        {/* Server Settings Tab */}
        <TabsContent value="server">
          <Card className="p-6 border-slate-200">
            <div className="space-y-6">
              {/* Provider Selection */}
              <div className="space-y-2">
                <Label>E-posta Sağlayıcı</Label>
                <Select value={settings.provider} onValueChange={(val) => setSettings({ ...settings, provider: val })}>
                  <SelectTrigger className="border-slate-300 w-full max-w-xs" data-testid="provider-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="smtp">SMTP (Gmail, Yandex, vb.)</SelectItem>
                    <SelectItem value="resend">Resend API</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {settings.provider === 'smtp' ? (
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <h3 className="font-medium text-slate-900">SMTP Ayarları</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>SMTP Sunucu</Label>
                      <Input
                        value={settings.smtp_host}
                        onChange={(e) => setSettings({ ...settings, smtp_host: e.target.value })}
                        placeholder="smtp.gmail.com"
                        className="border-slate-300"
                        data-testid="smtp-host-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Port</Label>
                      <Input
                        type="number"
                        value={settings.smtp_port}
                        onChange={(e) => setSettings({ ...settings, smtp_port: parseInt(e.target.value) })}
                        placeholder="587"
                        className="border-slate-300"
                        data-testid="smtp-port-input"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Kullanıcı Adı (E-posta)</Label>
                      <Input
                        value={settings.smtp_username}
                        onChange={(e) => setSettings({ ...settings, smtp_username: e.target.value })}
                        placeholder="ornek@gmail.com"
                        className="border-slate-300"
                        data-testid="smtp-username-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Şifre / Uygulama Şifresi</Label>
                      <Input
                        type="password"
                        value={settings.smtp_password}
                        onChange={(e) => setSettings({ ...settings, smtp_password: e.target.value })}
                        placeholder="••••••••"
                        className="border-slate-300"
                        data-testid="smtp-password-input"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Gönderen E-posta</Label>
                      <Input
                        value={settings.smtp_from_email}
                        onChange={(e) => setSettings({ ...settings, smtp_from_email: e.target.value })}
                        placeholder="noreply@sirket.com"
                        className="border-slate-300"
                        data-testid="smtp-from-email-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Gönderen Adı</Label>
                      <Input
                        value={settings.smtp_from_name}
                        onChange={(e) => setSettings({ ...settings, smtp_from_name: e.target.value })}
                        placeholder="Mova Dijital"
                        className="border-slate-300"
                        data-testid="smtp-from-name-input"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Switch
                      checked={settings.smtp_use_tls}
                      onCheckedChange={(val) => setSettings({ ...settings, smtp_use_tls: val })}
                      data-testid="smtp-tls-switch"
                    />
                    <Label>TLS Kullan (Önerilen)</Label>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-lg">
                    <h4 className="font-medium text-slate-900 mb-2">Gmail için Ayarlar</h4>
                    <ul className="text-sm text-slate-600 space-y-1">
                      <li>• SMTP Sunucu: smtp.gmail.com</li>
                      <li>• Port: 587</li>
                      <li>• Gmail "Uygulama Şifresi" oluşturmanız gerekir</li>
                      <li>• 2 Adımlı Doğrulama aktif olmalıdır</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <h3 className="font-medium text-slate-900">Resend API Ayarları</h3>
                  
                  <div className="space-y-2">
                    <Label>API Anahtarı</Label>
                    <Input
                      type="password"
                      value={settings.resend_api_key}
                      onChange={(e) => setSettings({ ...settings, resend_api_key: e.target.value })}
                      placeholder="re_xxxxxxxxxxxx"
                      className="border-slate-300"
                      data-testid="resend-api-key-input"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Gönderen E-posta</Label>
                    <Input
                      value={settings.resend_from_email}
                      onChange={(e) => setSettings({ ...settings, resend_from_email: e.target.value })}
                      placeholder="noreply@yourdomain.com"
                      className="border-slate-300"
                      data-testid="resend-from-email-input"
                    />
                    <p className="text-xs text-slate-500">Resend'de doğrulanmış domain'inizden bir adres kullanın</p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-lg">
                    <h4 className="font-medium text-slate-900 mb-2">Resend Kurulumu</h4>
                    <ul className="text-sm text-slate-600 space-y-1">
                      <li>• <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-slate-900 underline">resend.com</a> adresinden hesap oluşturun</li>
                      <li>• Domain'inizi doğrulayın</li>
                      <li>• API anahtarı oluşturun</li>
                    </ul>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100">
                <Button 
                  onClick={handleSaveSettings} 
                  className="bg-slate-900 hover:bg-black"
                  disabled={saving}
                  data-testid="save-settings-button"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Template List */}
            <Card className="p-4 border-slate-200 lg:col-span-1">
              <h3 className="font-medium text-slate-900 mb-4">Şablonlar</h3>
              <div className="space-y-2">
                {Object.entries(templateTypes).map(([type, name]) => {
                  const template = templates.find(t => t.template_type === type);
                  return (
                    <div
                      key={type}
                      onClick={() => setSelectedTemplate(template || { template_type: type, subject: '', body_html: '' })}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedTemplate?.template_type === type 
                          ? 'bg-slate-900 text-white' 
                          : 'bg-slate-50 hover:bg-slate-100'
                      }`}
                      data-testid={`template-${type}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{name}</span>
                        {template?.id && (
                          <Badge variant="secondary" className={selectedTemplate?.template_type === type ? 'bg-slate-700' : 'bg-slate-200'}>
                            Düzenlendi
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Template Editor */}
            <Card className="p-6 border-slate-200 lg:col-span-2">
              {selectedTemplate ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-slate-900">
                      {templateTypes[selectedTemplate.template_type]}
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPreview(true)}
                      className="border-slate-300"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Önizle
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label>E-posta Konusu</Label>
                    <Input
                      value={selectedTemplate.subject}
                      onChange={(e) => setSelectedTemplate({ ...selectedTemplate, subject: e.target.value })}
                      className="border-slate-300"
                      data-testid="template-subject-input"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>E-posta İçeriği (HTML)</Label>
                    <Textarea
                      value={selectedTemplate.body_html}
                      onChange={(e) => setSelectedTemplate({ ...selectedTemplate, body_html: e.target.value })}
                      className="border-slate-300 min-h-[300px] font-mono text-sm"
                      data-testid="template-body-input"
                    />
                  </div>

                  <div className="p-4 bg-slate-50 rounded-lg">
                    <h4 className="font-medium text-slate-900 mb-2">Kullanılabilir Değişkenler</h4>
                    <div className="flex flex-wrap gap-2">
                      {['{{client_name}}', '{{email}}', '{{password}}', '{{login_url}}', '{{expiry_date}}', '{{content_type}}', '{{content_title}}', '{{event_title}}', '{{event_date}}', '{{event_location}}'].map(v => (
                        <code key={v} className="px-2 py-1 bg-slate-200 rounded text-xs">{v}</code>
                      ))}
                    </div>
                  </div>

                  <Button 
                    onClick={handleSaveTemplate} 
                    className="bg-slate-900 hover:bg-black"
                    disabled={saving}
                    data-testid="save-template-button"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Kaydediliyor...' : 'Şablonu Kaydet'}
                  </Button>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                  <p>Düzenlemek için bir şablon seçin</p>
                </div>
              )}
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Test Email Dialog */}
      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test E-postası Gönder</DialogTitle>
            <DialogDescription>
              Mail ayarlarınızı test etmek için bir e-posta adresi girin
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>E-posta Adresi</Label>
              <Input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@ornek.com"
                className="border-slate-300"
                data-testid="test-email-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTestDialog(false)}>
              İptal
            </Button>
            <Button 
              onClick={handleSendTestEmail} 
              className="bg-slate-900 hover:bg-black"
              disabled={testing}
              data-testid="send-test-button"
            >
              <Send className="h-4 w-4 mr-2" />
              {testing ? 'Gönderiliyor...' : 'Gönder'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>E-posta Önizleme</DialogTitle>
          </DialogHeader>
          <div className="border rounded-lg overflow-hidden">
            <div className="p-2 bg-slate-100 text-sm text-slate-600">
              Konu: {selectedTemplate?.subject}
            </div>
            <div 
              className="p-4 bg-white"
              dangerouslySetInnerHTML={{ __html: selectedTemplate?.body_html || '' }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminMailSettings;
