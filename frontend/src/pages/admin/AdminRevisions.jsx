import { useState, useEffect } from 'react';
import { MessageSquare, CheckCircle, Clock, AlertCircle, XCircle, Send, Eye } from 'lucide-react';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';

export const AdminRevisions = () => {
  const [revisions, setRevisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedRevision, setSelectedRevision] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  
  const [responseData, setResponseData] = useState({
    admin_response: '',
    status: 'in_progress'
  });

  useEffect(() => {
    loadRevisions();
  }, []);

  const loadRevisions = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/revisions');
      setRevisions(response.data);
    } catch (error) {
      console.error('Error loading revisions:', error);
      toast.error('Revizyonlar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async () => {
    if (!selectedRevision || !responseData.admin_response.trim()) {
      toast.error('Lütfen bir yanıt yazın');
      return;
    }
    
    setSubmitting(true);
    try {
      await apiClient.put(`/revisions/${selectedRevision.id}`, responseData);
      toast.success('Revizyon yanıtlandı');
      setShowDialog(false);
      setSelectedRevision(null);
      setResponseData({ admin_response: '', status: 'in_progress' });
      loadRevisions();
    } catch (error) {
      toast.error('Yanıt gönderilemedi');
    } finally {
      setSubmitting(false);
    }
  };

  const openResponseDialog = (revision) => {
    setSelectedRevision(revision);
    setResponseData({
      admin_response: revision.admin_response || '',
      status: revision.status === 'pending' ? 'in_progress' : revision.status
    });
    setShowDialog(true);
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

  const getContentTypeBadge = (type) => {
    return type === 'video' 
      ? <Badge variant="outline" className="border-purple-200 text-purple-700">Video</Badge>
      : <Badge variant="outline" className="border-pink-200 text-pink-700">Tasarım</Badge>;
  };

  const filteredRevisions = filterStatus === 'all' 
    ? revisions 
    : revisions.filter(r => r.status === filterStatus);

  const pendingCount = revisions.filter(r => r.status === 'pending').length;
  const inProgressCount = revisions.filter(r => r.status === 'in_progress').length;
  const resolvedCount = revisions.filter(r => r.status === 'resolved').length;

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto" data-testid="admin-revisions-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-medium text-slate-900" data-testid="revisions-title">
            Revizyon Talepleri
          </h1>
          <p className="text-slate-600 mt-2 text-sm sm:text-base">
            Müşterilerden gelen içerik revizyon taleplerini yönetin
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="p-4 sm:p-6 bg-gradient-to-br from-amber-50 to-white border-amber-100 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilterStatus('pending')}>
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
        
        <Card className="p-4 sm:p-6 bg-gradient-to-br from-slate-50 to-white border-slate-200 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilterStatus('in_progress')}>
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
        
        <Card className="p-4 sm:p-6 bg-gradient-to-br from-green-50 to-white border-green-100 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilterStatus('resolved')}>
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-3 bg-green-100 rounded-xl">
              <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-semibold text-green-900">{resolvedCount}</p>
              <p className="text-xs sm:text-sm text-slate-600">Tamamlanan</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 sm:p-6 bg-gradient-to-br from-slate-50 to-white border-slate-100 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilterStatus('all')}>
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

      {/* Revisions Table */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h2 className="font-medium text-slate-900">
            {filterStatus === 'all' ? 'Tüm Revizyonlar' : `${filterStatus === 'pending' ? 'Bekleyen' : filterStatus === 'in_progress' ? 'İşlemdeki' : 'Tamamlanan'} Revizyonlar`}
          </h2>
          {filterStatus !== 'all' && (
            <Button variant="ghost" size="sm" onClick={() => setFilterStatus('all')}>
              Filtreyi Temizle
            </Button>
          )}
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="whitespace-nowrap">Müşteri</TableHead>
                <TableHead className="whitespace-nowrap">İçerik Türü</TableHead>
                <TableHead className="whitespace-nowrap hidden md:table-cell">Talep Eden</TableHead>
                <TableHead className="whitespace-nowrap">Mesaj</TableHead>
                <TableHead className="whitespace-nowrap">Durum</TableHead>
                <TableHead className="whitespace-nowrap hidden sm:table-cell">Tarih</TableHead>
                <TableHead className="text-right whitespace-nowrap">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRevisions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-slate-600">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                    <p>Revizyon talebi bulunamadı</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRevisions.map((revision) => (
                  <TableRow key={revision.id} data-testid={`revision-row-${revision.id}`}>
                    <TableCell className="font-medium">
                      {revision.clients?.company_name || 'Bilinmeyen'}
                    </TableCell>
                    <TableCell>{getContentTypeBadge(revision.content_type)}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-slate-600">
                      {revision.profiles?.full_name || revision.profiles?.email || '-'}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={revision.message}>
                      {revision.message}
                    </TableCell>
                    <TableCell>{getStatusBadge(revision.status)}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-slate-600">
                      {new Date(revision.created_at).toLocaleDateString('tr-TR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openResponseDialog(revision)}
                        className="border-slate-300 text-slate-900 hover:bg-slate-50"
                        data-testid={`respond-button-${revision.id}`}
                      >
                        <Eye className="h-4 w-4 sm:mr-1" />
                        <span className="hidden sm:inline">Yanıtla</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Response Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg" aria-describedby="revision-dialog-desc">
          <DialogHeader>
            <DialogTitle>Revizyon Talebi</DialogTitle>
            <DialogDescription id="revision-dialog-desc">
              Müşterinin revizyon talebini inceleyin ve yanıtlayın.
            </DialogDescription>
          </DialogHeader>
          
          {selectedRevision && (
            <div className="space-y-4 py-4">
              {/* Original Request */}
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-slate-700">Müşteri Talebi:</span>
                  {getContentTypeBadge(selectedRevision.content_type)}
                </div>
                <p className="text-sm text-slate-600">{selectedRevision.message}</p>
                <p className="text-xs text-slate-400 mt-2">
                  {new Date(selectedRevision.created_at).toLocaleString('tr-TR')}
                </p>
              </div>

              {/* Response Form */}
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Durum</label>
                  <Select 
                    value={responseData.status} 
                    onValueChange={(val) => setResponseData({ ...responseData, status: val })}
                  >
                    <SelectTrigger className="border-slate-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in_progress">İşlemde</SelectItem>
                      <SelectItem value="resolved">Tamamlandı</SelectItem>
                      <SelectItem value="rejected">Reddedildi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Yanıtınız</label>
                  <Textarea
                    value={responseData.admin_response}
                    onChange={(e) => setResponseData({ ...responseData, admin_response: e.target.value })}
                    placeholder="Müşteriye yanıtınızı yazın..."
                    className="min-h-[120px] border-slate-300"
                    data-testid="admin-response-textarea"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
              İptal
            </Button>
            <Button 
              onClick={handleRespond}
              className="bg-slate-900 hover:bg-black"
              disabled={submitting || !responseData.admin_response.trim()}
              data-testid="send-response-button"
            >
              {submitting ? 'Gönderiliyor...' : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Yanıtla
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
