import { useState, useEffect, useRef } from 'react';
import { User, Mail, Phone, Building2, MapPin, Camera, Save, Loader2 } from 'lucide-react';
import apiClient from '../../utils/api';
import { toast } from 'sonner';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { tr } from '../../utils/translations';
import { createClient } from '@supabase/supabase-js';

// Supabase client for storage
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const ClientProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    company_name: '',
    address: ''
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/profile');
      setProfile(response.data);
      setFormData({
        full_name: response.data.full_name || '',
        phone: response.data.phone || '',
        company_name: response.data.company_name || '',
        address: response.data.address || ''
      });
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Profil yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      await apiClient.put('/profile', formData);
      toast.success('Profil başarıyla güncellendi');
      loadProfile();
    } catch (error) {
      toast.error('Profil güncellenemedi');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast.error('Lütfen bir resim dosyası seçin');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Dosya boyutu 5MB\'dan küçük olmalıdır');
      return;
    }

    setUploading(true);
    
    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}/${Date.now()}.${fileExt}`;
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile with new avatar URL
      await apiClient.put('/profile', {
        avatar_url: urlData.publicUrl
      });

      toast.success('Profil fotoğrafı güncellendi');
      loadProfile();
    } catch (error) {
      console.error('Avatar upload error:', error);
      toast.error('Fotoğraf yüklenemedi');
    } finally {
      setUploading(false);
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
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto" data-testid="client-profile-page">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-medium text-slate-900" data-testid="profile-title">
          Profil Ayarları
        </h1>
        <p className="text-slate-600 mt-2 text-sm sm:text-base">
          Kişisel ve şirket bilgilerinizi güncelleyin
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Avatar Section */}
        <Card className="p-6 border-slate-200 lg:col-span-1">
          <div className="flex flex-col items-center">
            <div className="relative mb-4">
              <div 
                className="w-32 h-32 rounded-full bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg cursor-pointer hover:opacity-90 transition-opacity"
                onClick={handleAvatarClick}
                data-testid="avatar-container"
              >
                {profile?.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt={profile.full_name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="h-16 w-16 text-slate-400" />
                )}
                
                {uploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                  </div>
                )}
              </div>
              
              <button
                type="button"
                onClick={handleAvatarClick}
                className="absolute bottom-0 right-0 p-2 bg-slate-900 rounded-full text-white hover:bg-black transition-colors shadow-lg"
                disabled={uploading}
                data-testid="change-avatar-button"
              >
                <Camera className="h-4 w-4" />
              </button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
                data-testid="avatar-input"
              />
            </div>
            
            <h2 className="text-xl font-semibold text-slate-900">{profile?.full_name}</h2>
            <p className="text-slate-600 text-sm">{profile?.email}</p>
            
            <div className="mt-4 w-full pt-4 border-t border-slate-100">
              <div className="text-xs text-slate-500 text-center">
                Fotoğraf değiştirmek için üzerine tıklayın
              </div>
            </div>
          </div>
        </Card>

        {/* Profile Form */}
        <Card className="p-6 border-slate-200 lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="full_name" className="flex items-center gap-2">
                  <User className="h-4 w-4 text-slate-400" />
                  Ad Soyad
                </Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="border-slate-300 focus:border-slate-900"
                  data-testid="fullname-input"
                  placeholder="Ad Soyad"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-slate-400" />
                  E-posta
                </Label>
                <Input
                  id="email"
                  value={profile?.email || ''}
                  disabled
                  className="bg-slate-50 border-slate-200 text-slate-500"
                  data-testid="email-input"
                />
                <p className="text-xs text-slate-500">E-posta adresi değiştirilemez</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-slate-400" />
                  Telefon
                </Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="border-slate-300 focus:border-slate-900"
                  data-testid="phone-input"
                  placeholder="+90 5XX XXX XX XX"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="company_name" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  Şirket Adı
                </Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  className="border-slate-300 focus:border-slate-900"
                  data-testid="company-input"
                  placeholder="Şirket Adı"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address" className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-slate-400" />
                Adres
              </Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="border-slate-300 focus:border-slate-900 min-h-[100px]"
                data-testid="address-input"
                placeholder="Tam adres"
              />
            </div>
            
            <div className="flex justify-end pt-4 border-t border-slate-100">
              <Button 
                type="submit" 
                className="bg-slate-900 hover:bg-black w-full sm:w-auto"
                disabled={saving}
                data-testid="save-profile-button"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Kaydediliyor...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Değişiklikleri Kaydet
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>

      {/* Account Info */}
      <Card className="mt-6 p-6 border-slate-200">
        <h3 className="text-lg font-medium text-slate-900 mb-4">Hesap Bilgileri</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="p-4 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Hesap Türü</p>
            <p className="text-sm font-medium text-slate-900 mt-1">
              {profile?.role === 'client' ? 'Müşteri' : profile?.role === 'admin' ? 'Yönetici' : 'Personel'}
            </p>
          </div>
          
          <div className="p-4 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Kayıt Tarihi</p>
            <p className="text-sm font-medium text-slate-900 mt-1">
              {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('tr-TR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }) : '-'}
            </p>
          </div>
          
          <div className="p-4 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Hesap Durumu</p>
            <p className="text-sm font-medium text-green-600 mt-1">Aktif</p>
          </div>
        </div>
      </Card>
    </div>
  );
};
