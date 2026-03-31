import { useState, useEffect } from 'react';
import { Receipt, Upload, Clock, CheckCircle, XCircle, FileText, Calendar, Filter, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import apiClient from '../../utils/api';
import { getUser } from '../../utils/auth';
import { toast } from 'sonner';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';

export const ClientReceipts = () => {
  const user = getUser();
  const clientId = user?.client_id;
  const [receipts, setReceipts] = useState([]);
  const [groupedReceipts, setGroupedReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [expandedMonths, setExpandedMonths] = useState({});
  
  // Filters
  const [filterYear, setFilterYear] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Upload form
  const [uploadForm, setUploadForm] = useState({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    file_url: '',
    file_name: ''
  });

  useEffect(() => {
    if (clientId) {
      loadReceipts();
    }
  }, [clientId, filterYear, filterStatus]);

  const loadReceipts = async () => {
    setLoading(true);
    try {
      let url = `/receipts/client/${clientId}`;
      const params = new URLSearchParams();
      if (filterYear !== 'all') params.append('year', filterYear);
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await apiClient.get(url);
      setReceipts(response.data.all || []);
      setGroupedReceipts(response.data.grouped || []);
      
      // Expand first month by default
      if (response.data.grouped?.length > 0) {
        setExpandedMonths({ [response.data.grouped[0].month_key]: true });
      }
    } catch (error) {
      console.error('Error loading receipts:', error);
      toast.error('Makbuzlar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!uploadForm.amount || !uploadForm.payment_date || !uploadForm.file_url) {
      toast.error('Lütfen tüm alanları doldurun');
      return;
    }

    setUploading(true);
    try {
      await apiClient.post('/receipts', {
        client_id: clientId,
        amount: parseFloat(uploadForm.amount),
        payment_date: uploadForm.payment_date,
        file_url: uploadForm.file_url,
        file_name: uploadForm.file_name || 'makbuz.pdf'
      });

      toast.success('Makbuz yüklendi! Admin onayı bekleniyor.');
      setShowUploadDialog(false);
      setUploadForm({
        amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        file_url: '',
        file_name: ''
      });
      loadReceipts();
    } catch (error) {
      console.error('Error uploading receipt:', error);
      toast.error('Makbuz yüklenemedi');
    } finally {
      setUploading(false);
    }
  };

  const toggleMonth = (monthKey) => {
    setExpandedMonths(prev => ({
      ...prev,
      [monthKey]: !prev[monthKey]
    }));
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
            <Clock className="h-3 w-3" />
            Onay Bekleniyor
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
            <CheckCircle className="h-3 w-3" />
            Onaylandı
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <XCircle className="h-3 w-3" />
            Reddedildi
          </span>
        );
      default:
        return null;
    }
  };

  const getMonthName = (monthKey) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(year, parseInt(month) - 1);
    return date.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
  };

  const pendingCount = receipts.filter(r => r.status === 'pending').length;
  const approvedCount = receipts.filter(r => r.status === 'approved').length;
  const rejectedCount = receipts.filter(r => r.status === 'rejected').length;

  const years = [...new Set(receipts.map(r => new Date(r.created_at).getFullYear()))].sort((a, b) => b - a);

  if (loading) {
    return (
      <div className="p-4 lg:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-blue-100 rounded w-1/4"></div>
          <div className="h-32 bg-blue-50 rounded-xl"></div>
          <div className="h-64 bg-blue-50 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-[1200px] mx-auto" data-testid="client-receipts">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-medium text-slate-900">Makbuzlarım</h1>
          <p className="text-sm text-slate-600 mt-1">Ödeme makbuzlarınızı yönetin</p>
        </div>
        <Button 
          onClick={() => setShowUploadDialog(true)}
          className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
          data-testid="upload-receipt-button"
        >
          <Upload className="h-4 w-4 mr-2" />
          Makbuz Yükle
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 lg:gap-4 mb-6">
        <Card className="p-3 lg:p-4 bg-gradient-to-br from-orange-50 to-white border-orange-100">
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="p-2 bg-orange-100 rounded-lg hidden sm:block">
              <Clock className="h-4 w-4 lg:h-5 lg:w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xl lg:text-2xl font-semibold text-orange-900">{pendingCount}</p>
              <p className="text-xs text-slate-600">Bekleyen</p>
            </div>
          </div>
        </Card>

        <Card className="p-3 lg:p-4 bg-gradient-to-br from-emerald-50 to-white border-emerald-100">
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg hidden sm:block">
              <CheckCircle className="h-4 w-4 lg:h-5 lg:w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xl lg:text-2xl font-semibold text-emerald-900">{approvedCount}</p>
              <p className="text-xs text-slate-600">Onaylanan</p>
            </div>
          </div>
        </Card>

        <Card className="p-3 lg:p-4 bg-gradient-to-br from-red-50 to-white border-red-100">
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="p-2 bg-red-100 rounded-lg hidden sm:block">
              <XCircle className="h-4 w-4 lg:h-5 lg:w-5 text-red-600" />
            </div>
            <div>
              <p className="text-xl lg:text-2xl font-semibold text-red-900">{rejectedCount}</p>
              <p className="text-xs text-slate-600">Reddedilen</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Pending Receipt Alert */}
      {pendingCount > 0 && (
        <div className="mb-6 p-4 rounded-xl border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50">
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-orange-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-orange-900">Onay Bekleniyor</h3>
              <p className="text-sm text-orange-700 mt-1">
                {pendingCount} adet makbuzunuz admin onayı bekliyor. Onaylandıktan sonra 30 günlük erişiminiz başlayacak veya uzatılacaktır.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-500" />
          <span className="text-sm text-slate-600">Filtrele:</span>
        </div>
        <Select value={filterYear} onValueChange={setFilterYear}>
          <SelectTrigger className="w-full sm:w-32">
            <SelectValue placeholder="Yıl" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Yıllar</SelectItem>
            {years.map(year => (
              <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Durum" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Durumlar</SelectItem>
            <SelectItem value="pending">Bekleyen</SelectItem>
            <SelectItem value="approved">Onaylanan</SelectItem>
            <SelectItem value="rejected">Reddedilen</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Receipts by Month */}
      {groupedReceipts.length === 0 ? (
        <Card className="p-8 lg:p-12 text-center" data-testid="no-receipts">
          <Receipt className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">Henüz makbuz yok</h3>
          <p className="text-slate-600 mb-4">Ödeme yaptıktan sonra makbuzunuzu yükleyebilirsiniz.</p>
          <Button onClick={() => setShowUploadDialog(true)} className="bg-blue-600 hover:bg-blue-700">
            <Upload className="h-4 w-4 mr-2" />
            İlk Makbuzunuzu Yükleyin
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {groupedReceipts.map((group) => (
            <Card key={group.month_key} className="overflow-hidden">
              <button
                onClick={() => toggleMonth(group.month_key)}
                className="w-full p-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-slate-900">{getMonthName(group.month_key)}</span>
                  <span className="text-sm text-slate-500">({group.receipts.length} makbuz)</span>
                </div>
                {expandedMonths[group.month_key] ? (
                  <ChevronUp className="h-5 w-5 text-slate-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-slate-400" />
                )}
              </button>
              
              {expandedMonths[group.month_key] && (
                <div className="divide-y divide-slate-100">
                  {group.receipts.map((receipt) => (
                    <div key={receipt.id} className="p-4 hover:bg-slate-50 transition-colors" data-testid={`receipt-${receipt.id}`}>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <FileText className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-900">₺{receipt.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</p>
                            <p className="text-sm text-slate-500">
                              Yükleme: {new Date(receipt.created_at).toLocaleDateString('tr-TR')}
                            </p>
                            <p className="text-sm text-slate-500">
                              Ödeme Tarihi: {new Date(receipt.payment_date).toLocaleDateString('tr-TR')}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          {getStatusBadge(receipt.status)}
                          {receipt.file_url && (
                            <a 
                              href={receipt.file_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </div>
                      
                      {receipt.admin_note && (
                        <div className="mt-3 p-3 bg-slate-100 rounded-lg">
                          <p className="text-sm text-slate-600">
                            <span className="font-medium">Admin Notu:</span> {receipt.admin_note}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Makbuz Yükle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Tutar (₺)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={uploadForm.amount}
                onChange={(e) => setUploadForm({ ...uploadForm, amount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_date">Ödeme Tarihi</Label>
              <Input
                id="payment_date"
                type="date"
                value={uploadForm.payment_date}
                onChange={(e) => setUploadForm({ ...uploadForm, payment_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="file_url">Makbuz URL (veya dosya yükleyin)</Label>
              <Input
                id="file_url"
                type="url"
                placeholder="https://..."
                value={uploadForm.file_url}
                onChange={(e) => setUploadForm({ ...uploadForm, file_url: e.target.value })}
              />
              <p className="text-xs text-slate-500">
                Makbuz dosyanızı bir bulut depolama servisine yükleyip linkini yapıştırabilirsiniz.
              </p>
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowUploadDialog(false)}
                className="flex-1"
              >
                İptal
              </Button>
              <Button
                onClick={handleUpload}
                disabled={uploading}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {uploading ? 'Yükleniyor...' : 'Yükle'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
