import { useState, useEffect } from 'react';
import { Plus, Video, Image, Upload, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import apiClient from '../../utils/api';
import { toast } from 'sonner';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { tr } from '../../utils/translations';

export const AdminContent = () => {
  const [clients, setClients] = useState([]);
  const [videos, setVideos] = useState([]);
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showVideoDialog, setShowVideoDialog] = useState(false);
  const [showDesignDialog, setShowDesignDialog] = useState(false);
  const [selectedClient, setSelectedClient] = useState('');
  
  const [videoForm, setVideoForm] = useState({
    project_name: '',
    file_name: '',
    file_url: '',
    file_size: 0,
    month: new Date().toISOString().slice(0, 7),
    status: 'uploaded',
    notes: ''
  });

  const [designForm, setDesignForm] = useState({
    project_name: '',
    file_name: '',
    file_url: '',
    file_size: 0,
    version: 1,
    status: 'uploaded',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [clientsRes, allVideos, allDesigns] = await Promise.all([
        apiClient.get('/clients'),
        loadAllVideos(),
        loadAllDesigns()
      ]);
      setClients(clientsRes.data);
      setVideos(allVideos);
      setDesigns(allDesigns);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const loadAllVideos = async () => {
    try {
      const clientsRes = await apiClient.get('/clients');
      const allVideos = [];
      for (const client of clientsRes.data) {
        const videosRes = await apiClient.get(`/videos/${client.id}`);
        allVideos.push(...videosRes.data.map(v => ({ ...v, client_name: client.company_name })));
      }
      return allVideos;
    } catch (error) {
      return [];
    }
  };

  const loadAllDesigns = async () => {
    try {
      const clientsRes = await apiClient.get('/clients');
      const allDesigns = [];
      for (const client of clientsRes.data) {
        const designsRes = await apiClient.get(`/designs/${client.id}`);
        allDesigns.push(...designsRes.data.map(d => ({ ...d, client_name: client.company_name })));
      }
      return allDesigns;
    } catch (error) {
      return [];
    }
  };

  const handleVideoSubmit = async (e) => {
    e.preventDefault();
    if (!selectedClient) {
      toast.error('Lütfen bir müşteri seçin');
      return;
    }

    try {
      await apiClient.post('/videos', {
        ...videoForm,
        client_id: selectedClient
      });
      toast.success('Video başarıyla yüklendi');
      setShowVideoDialog(false);
      resetVideoForm();
      loadData();
    } catch (error) {
      toast.error('Video yüklenemedi');
    }
  };

  const handleDesignSubmit = async (e) => {
    e.preventDefault();
    if (!selectedClient) {
      toast.error('Lütfen bir müşteri seçin');
      return;
    }

    try {
      await apiClient.post('/designs', {
        ...designForm,
        client_id: selectedClient
      });
      toast.success('Tasarım başarıyla yüklendi');
      setShowDesignDialog(false);
      resetDesignForm();
      loadData();
    } catch (error) {
      toast.error('Tasarım yüklenemedi');
    }
  };

  const resetVideoForm = () => {
    setVideoForm({
      project_name: '',
      file_name: '',
      file_url: '',
      file_size: 0,
      month: new Date().toISOString().slice(0, 7),
      status: 'uploaded',
      notes: ''
    });
    setSelectedClient('');
  };

  const resetDesignForm = () => {
    setDesignForm({
      project_name: '',
      file_name: '',
      file_url: '',
      file_size: 0,
      version: 1,
      status: 'uploaded',
      notes: ''
    });
    setSelectedClient('');
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'revision_requested':
        return <AlertCircle className="h-4 w-4 text-amber-600" />;
      default:
        return <Clock className="h-4 w-4 text-slate-600" />;
    }
  };

  const getStatusText = (status) => {
    return tr.status[status] || status;
  };

  if (loading) {
    return <div className="p-8">{tr.common.loading}</div>;
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto" data-testid="admin-content-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-medium text-slate-900" data-testid="content-title">{tr.admin.content.title}</h1>
          <p className="text-slate-600 mt-2">Video ve tasarım dosyalarını yönetin</p>
        </div>
      </div>

      <Tabs defaultValue="videos" className="w-full">
        <TabsList className="mb-6 bg-slate-100">
          <TabsTrigger value="videos" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
            <Video className="h-4 w-4 mr-2" />
            {tr.admin.content.videos}
          </TabsTrigger>
          <TabsTrigger value="designs" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
            <Image className="h-4 w-4 mr-2" />
            {tr.admin.content.designs}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="videos">
          <div className="flex justify-end mb-4">
            <Button onClick={() => setShowVideoDialog(true)} className="bg-slate-900 hover:bg-black" data-testid="upload-video-button">
              <Plus className="h-4 w-4 mr-2" />
              {tr.admin.content.uploadVideo}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {videos.length === 0 ? (
              <Card className="p-8 col-span-3 text-center border-slate-200">
                <Video className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">Henüz video yüklenmedi</p>
              </Card>
            ) : (
              videos.map((video) => (
                <Card key={video.id} className="overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition-shadow" data-testid={`video-item-${video.id}`}>
                  <div className="aspect-video bg-slate-200 relative flex items-center justify-center">
                    <Video className="h-12 w-12 text-slate-400" />
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium text-slate-900 mb-1">{video.file_name}</h3>
                    <p className="text-sm text-slate-600 mb-2">{video.project_name}</p>
                    <p className="text-xs text-slate-500 mb-3">{video.client_name}</p>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(video.status)}
                      <span className="text-sm">{getStatusText(video.status)}</span>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="designs">
          <div className="flex justify-end mb-4">
            <Button onClick={() => setShowDesignDialog(true)} className="bg-slate-900 hover:bg-black" data-testid="upload-design-button">
              <Plus className="h-4 w-4 mr-2" />
              {tr.admin.content.uploadDesign}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {designs.length === 0 ? (
              <Card className="p-8 col-span-4 text-center border-slate-200">
                <Image className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">Henüz tasarım yüklenmedi</p>
              </Card>
            ) : (
              designs.map((design) => (
                <Card key={design.id} className="overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition-shadow" data-testid={`design-item-${design.id}`}>
                  <div className="aspect-square bg-slate-200 relative flex items-center justify-center">
                    <Image className="h-12 w-12 text-slate-400" />
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium text-slate-900 mb-1 text-sm">{design.file_name}</h3>
                    <p className="text-xs text-slate-600 mb-2">{design.project_name}</p>
                    <p className="text-xs text-slate-500 mb-3">{design.client_name}</p>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(design.status)}
                      <span className="text-xs">{getStatusText(design.status)}</span>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Video Upload Dialog */}
      <Dialog open={showVideoDialog} onOpenChange={(open) => {
        setShowVideoDialog(open);
        if (!open) resetVideoForm();
      }}>
        <DialogContent className="max-w-2xl" data-testid="video-upload-dialog">
          <DialogHeader>
            <DialogTitle>{tr.admin.content.uploadVideo}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleVideoSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{tr.admin.content.client}</Label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger className="border-blue-200">
                    <SelectValue placeholder="Müşteri seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="project_name">{tr.admin.content.projectName}</Label>
                <Input
                  id="project_name"
                  value={videoForm.project_name}
                  onChange={(e) => setVideoForm({ ...videoForm, project_name: e.target.value })}
                  required
                  className="border-slate-300"
                  placeholder="Örn: Ürün Tanıtım Videosu"
                  data-testid="video-project-name-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="file_name">{tr.admin.content.fileName}</Label>
                <Input
                  id="file_name"
                  value={videoForm.file_name}
                  onChange={(e) => setVideoForm({ ...videoForm, file_name: e.target.value })}
                  required
                  className="border-slate-300"
                  placeholder="video.mp4"
                  data-testid="video-file-name-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="file_url">Dosya URL</Label>
                <Input
                  id="file_url"
                  value={videoForm.file_url}
                  onChange={(e) => setVideoForm({ ...videoForm, file_url: e.target.value })}
                  required
                  className="border-slate-300"
                  placeholder="https://..."
                  data-testid="video-file-url-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="file_size">Dosya Boyutu (bytes)</Label>
                  <Input
                    id="file_size"
                    type="number"
                    value={videoForm.file_size}
                    onChange={(e) => setVideoForm({ ...videoForm, file_size: parseInt(e.target.value) })}
                    required
                    className="border-slate-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="month">Ay</Label>
                  <Input
                    id="month"
                    type="month"
                    value={videoForm.month}
                    onChange={(e) => setVideoForm({ ...videoForm, month: e.target.value })}
                    required
                    className="border-slate-300"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notlar (İsteğe bağlı)</Label>
                <Textarea
                  id="notes"
                  value={videoForm.notes}
                  onChange={(e) => setVideoForm({ ...videoForm, notes: e.target.value })}
                  className="border-slate-300"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowVideoDialog(false)}>
                {tr.common.cancel}
              </Button>
              <Button type="submit" className="bg-slate-900 hover:bg-black" data-testid="submit-video-button">
                <Upload className="h-4 w-4 mr-2" />
                Yükle
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Design Upload Dialog */}
      <Dialog open={showDesignDialog} onOpenChange={(open) => {
        setShowDesignDialog(open);
        if (!open) resetDesignForm();
      }}>
        <DialogContent className="max-w-2xl" data-testid="design-upload-dialog">
          <DialogHeader>
            <DialogTitle>{tr.admin.content.uploadDesign}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleDesignSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{tr.admin.content.client}</Label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger className="border-blue-200">
                    <SelectValue placeholder="Müşteri seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="design_project_name">{tr.admin.content.projectName}</Label>
                <Input
                  id="design_project_name"
                  value={designForm.project_name}
                  onChange={(e) => setDesignForm({ ...designForm, project_name: e.target.value })}
                  required
                  className="border-slate-300"
                  placeholder="Örn: Logo Tasarımı"
                  data-testid="design-project-name-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="design_file_name">{tr.admin.content.fileName}</Label>
                <Input
                  id="design_file_name"
                  value={designForm.file_name}
                  onChange={(e) => setDesignForm({ ...designForm, file_name: e.target.value })}
                  required
                  className="border-slate-300"
                  placeholder="design.jpg"
                  data-testid="design-file-name-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="design_file_url">Dosya URL</Label>
                <Input
                  id="design_file_url"
                  value={designForm.file_url}
                  onChange={(e) => setDesignForm({ ...designForm, file_url: e.target.value })}
                  required
                  className="border-slate-300"
                  placeholder="https://..."
                  data-testid="design-file-url-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="design_file_size">Dosya Boyutu (bytes)</Label>
                  <Input
                    id="design_file_size"
                    type="number"
                    value={designForm.file_size}
                    onChange={(e) => setDesignForm({ ...designForm, file_size: parseInt(e.target.value) })}
                    required
                    className="border-slate-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="version">Versiyon</Label>
                  <Input
                    id="version"
                    type="number"
                    value={designForm.version}
                    onChange={(e) => setDesignForm({ ...designForm, version: parseInt(e.target.value) })}
                    required
                    className="border-slate-300"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="design_notes">Notlar (İsteğe bağlı)</Label>
                <Textarea
                  id="design_notes"
                  value={designForm.notes}
                  onChange={(e) => setDesignForm({ ...designForm, notes: e.target.value })}
                  className="border-slate-300"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDesignDialog(false)}>
                {tr.common.cancel}
              </Button>
              <Button type="submit" className="bg-slate-900 hover:bg-black" data-testid="submit-design-button">
                <Upload className="h-4 w-4 mr-2" />
                Yükle
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
