import { useState, useEffect } from 'react';
import { MessageSquare, Plus, CheckCircle, Clock, AlertCircle, XCircle, Video, Image } from 'lucide-react';
import apiClient from '../../utils/api';
import { toast } from 'sonner';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
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
import { getUser } from '../../utils/auth';

export const ClientRevisions = () => {
  const user = getUser();
  const [revisions, setRevisions] = useState([]);
  const [videos, setVideos] = useState([]);
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    content_type: '',
    content_id: '',
    message: ''
  });

  useEffect(() => {
    if (user?.client_id) {
      loadData();
    }
  }, [user?.client_id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [revisionsRes, videosRes, designsRes] = await Promise.all([
        apiClient.get(`/revisions/client/${user.client_id}`),
        apiClient.get(`/videos/${user.client_id}`),
        apiClient.get(`/designs/${user.client_id}`)
      ]);
      setRevisions(revisionsRes.data);
      setVideos(videosRes.data);
      setDesigns(designsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.content_type || !formData.content_id || !formData.message.trim()) {
      toast.error('Lütfen tüm alanları doldurun');
      return;
    }
    
    setSubmitting(true);
    try {
      await apiClient.post('/revisions', formData);
      toast.success('Revizyon talebi gönderildi');
      setShowDialog(false);
      setFormData({ content_type: '', content_id: '', message: '' });
      loadData();
    } catch (error) {
      toast.error('Revizyon talebi gönderilemedi');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-800"><Clock className="h-3 w-3 mr-1" />Bekliyor</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800"><AlertCircle className="h-3 w-3 mr-1" />İşlemde</Badge>;
      case 'resolved':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Tamamlandı</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Reddedildi</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getContentOptions = () => {
    if (formData.content_type === 'video') {
      return videos.map(v => ({ id: v.id, name: v.file_name || v.title }));
    } else if (formData.content_type === 'design') {
      return designs.map(d => ({ id: d.id, name: d.file_name || d.title }));
    }
    return [];
  };

  const pendingCount = revisions.filter(r => r.status === 'pending').length;
  const inProgressCount = revisions.filter(r => r.status === 'in_progress').length;

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto" data-testid="client-revisions-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-medium text-slate-900" data-testid="revisions-title">
            Revizyon Taleplerim
          </h1>
          <p className="text-slate-600 mt-2 text-sm sm:text-base">
            Video ve tasarım içerikleriniz için revizyon talebinde bulunun
          </p>
        </div>
        <Button 
          onClick={() => setShowDialog(true)} 
          className="bg-slate-900 hover:bg-black w-full sm:w-auto"
          disabled={videos.length === 0 && designs.length === 0}
          data-testid="new-revision-button"
        >
          <Plus className="h-4 w-4 mr-2" />
          Yeni Talep
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card className="p-4 sm:p-6 bg-gradient-to-br from-amber-50 to-white border-amber-100">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-3 bg-amber-100 rounded-xl">
              <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-semibold text-amber-900">{pendingCount}</p>
              <p className="text-xs sm:text-sm text-slate-600">Bekleyen</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 sm:p-6 bg-gradient-to-br from-slate-50 to-white border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-3 bg-slate-900 rounded-xl">
              <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-semibold text-slate-900">{inProgressCount}</p>
              <p className="text-xs sm:text-sm text-slate-600">İşlemde</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 sm:p-6 bg-gradient-to-br from-slate-50 to-white border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-3 bg-slate-100 rounded-xl">
              <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 text-slate-600" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-semibold text-slate-900">{revisions.length}</p>
              <p className="text-xs sm:text-sm text-slate-600">Toplam</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Revisions List */}
      {revisions.length === 0 ? (
        <Card className="p-12 text-center border-slate-200">
          <MessageSquare className="h-16 w-16 mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">Revizyon Talebi Yok</h3>
          <p className="text-slate-600 mb-4">Henüz revizyon talebiniz bulunmuyor.</p>
          {(videos.length > 0 || designs.length > 0) && (
            <Button onClick={() => setShowDialog(true)} className="bg-slate-900 hover:bg-black">
              <Plus className="h-4 w-4 mr-2" />
              İlk Talebinizi Oluşturun
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {revisions.map((revision) => (
            <Card key={revision.id} className="p-4 sm:p-6 border-slate-200" data-testid={`revision-card-${revision.id}`}>
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <div className={`p-3 rounded-xl shrink-0 ${
                  revision.content_type === 'video' ? 'bg-purple-100' : 'bg-pink-100'
                }`}>
                  {revision.content_type === 'video' 
                    ? <Video className="h-6 w-6 text-purple-600" />
                    : <Image className="h-6 w-6 text-pink-600" />
                  }
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Badge variant="outline" className={
                      revision.content_type === 'video' 
                        ? 'border-purple-200 text-purple-700' 
                        : 'border-pink-200 text-pink-700'
                    }>
                      {revision.content_type === 'video' ? 'Video' : 'Tasarım'}
                    </Badge>
                    {getStatusBadge(revision.status)}
                    <span className="text-xs text-slate-400">
                      {new Date(revision.created_at).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                  
                  <div className="p-3 bg-slate-50 rounded-lg mb-3">
                    <p className="text-sm font-medium text-slate-700 mb-1">Talebiniz:</p>
                    <p className="text-sm text-slate-600">{revision.message}</p>
                  </div>
                  
                  {revision.admin_response && (
                    <div className={`p-3 rounded-lg ${
                      revision.status === 'resolved' ? 'bg-green-50' : 
                      revision.status === 'rejected' ? 'bg-red-50' : 'bg-blue-50'
                    }`}>
                      <p className="text-sm font-medium text-slate-700 mb-1">Yanıt:</p>
                      <p className="text-sm text-slate-600">{revision.admin_response}</p>
                      {revision.resolved_at && (
                        <p className="text-xs text-slate-400 mt-2">
                          {new Date(revision.resolved_at).toLocaleString('tr-TR')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* New Revision Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg" aria-describedby="new-revision-desc">
          <DialogHeader>
            <DialogTitle>Yeni Revizyon Talebi</DialogTitle>
            <DialogDescription id="new-revision-desc">
              Düzeltilmesini istediğiniz içeriği seçin ve talebinizi açıklayın.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">İçerik Türü</label>
                <Select 
                  value={formData.content_type} 
                  onValueChange={(val) => setFormData({ ...formData, content_type: val, content_id: '' })}
                >
                  <SelectTrigger className="border-slate-300" data-testid="content-type-select">
                    <SelectValue placeholder="Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {videos.length > 0 && <SelectItem value="video">Video</SelectItem>}
                    {designs.length > 0 && <SelectItem value="design">Tasarım</SelectItem>}
                  </SelectContent>
                </Select>
              </div>

              {formData.content_type && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">İçerik</label>
                  <Select 
                    value={formData.content_id} 
                    onValueChange={(val) => setFormData({ ...formData, content_id: val })}
                  >
                    <SelectTrigger className="border-slate-300" data-testid="content-select">
                      <SelectValue placeholder="İçerik seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {getContentOptions().map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Revizyon Talebiniz</label>
                <Textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Hangi değişiklikleri istediğinizi detaylı açıklayın..."
                  className="min-h-[120px] border-slate-300"
                  data-testid="revision-message-input"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                İptal
              </Button>
              <Button 
                type="submit"
                className="bg-slate-900 hover:bg-black"
                disabled={submitting || !formData.content_type || !formData.content_id || !formData.message.trim()}
                data-testid="submit-revision-button"
              >
                {submitting ? 'Gönderiliyor...' : 'Talep Gönder'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
