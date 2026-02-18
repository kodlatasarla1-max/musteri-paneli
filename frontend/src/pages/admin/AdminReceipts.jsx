import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, FileText } from 'lucide-react';
import apiClient from '../../utils/api';
import { toast } from 'sonner';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { tr } from '../../utils/translations';

export const AdminReceipts = () => {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Use the new endpoint that returns all receipts with client names
      const response = await apiClient.get('/receipts');
      setReceipts(response.data);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (receiptId, approve) => {
    try {
      await apiClient.put(`/receipts/${receiptId}/approve`, { 
        approve, 
        admin_note: adminNotes 
      });
      
      toast.success(approve ? 'Makbuz onaylandı ve erişim aktifleştirildi' : 'Makbuz reddedildi');
      setSelectedReceipt(null);
      setAdminNotes('');
      loadData();
    } catch (error) {
      toast.error('İşlem başarısız');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <span className="px-3 py-1 text-xs rounded-full bg-green-100 text-green-800 flex items-center gap-1 w-fit">
          <CheckCircle className="h-3 w-3" />
          Onaylandı
        </span>;
      case 'rejected':
        return <span className="px-3 py-1 text-xs rounded-full bg-red-100 text-red-800 flex items-center gap-1 w-fit">
          <XCircle className="h-3 w-3" />
          Reddedildi
        </span>;
      default:
        return <span className="px-3 py-1 text-xs rounded-full bg-amber-100 text-amber-800 flex items-center gap-1 w-fit">
          <Clock className="h-3 w-3" />
          Beklemede
        </span>;
    }
  };

  const pendingReceipts = receipts.filter(r => r.status === 'pending');
  const approvedReceipts = receipts.filter(r => r.status === 'approved');
  const rejectedReceipts = receipts.filter(r => r.status === 'rejected');

  if (loading) {
    return <div className="p-8">{tr.common.loading}</div>;
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto" data-testid="admin-receipts-page">
      <div className="mb-8">
        <h1 className="text-4xl font-medium text-slate-900" data-testid="receipts-title">{tr.admin.receipts.title}</h1>
        <p className="text-slate-600 mt-2">Ödeme makbuzlarını onaylayın ve müşteri erişimlerini yönetin</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="p-6 rounded-xl border shadow" style={{ background: 'linear-gradient(to bottom right, #fff7ed, #ffffff)', borderColor: '#fed7aa' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 rounded-xl" style={{ backgroundColor: '#ffedd5' }}>
              <Clock className="h-6 w-6" style={{ color: '#ea580c' }} />
            </div>
          </div>
          <p className="text-3xl font-semibold" style={{ color: '#7c2d12' }}>{pendingReceipts.length}</p>
          <p className="text-sm text-slate-600 mt-1">Bekleyen Makbuz</p>
        </div>

        <div className="p-6 rounded-xl border shadow" style={{ background: 'linear-gradient(to bottom right, #ecfdf5, #ffffff)', borderColor: '#a7f3d0' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 rounded-xl" style={{ backgroundColor: '#d1fae5' }}>
              <CheckCircle className="h-6 w-6" style={{ color: '#059669' }} />
            </div>
          </div>
          <p className="text-3xl font-semibold" style={{ color: '#064e3b' }}>{approvedReceipts.length}</p>
          <p className="text-sm text-slate-600 mt-1">Onaylanan</p>
        </div>

        <div className="p-6 rounded-xl border shadow" style={{ background: 'linear-gradient(to bottom right, #fff1f2, #ffffff)', borderColor: '#fecdd3' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 rounded-xl" style={{ backgroundColor: '#ffe4e6' }}>
              <XCircle className="h-6 w-6" style={{ color: '#e11d48' }} />
            </div>
          </div>
          <p className="text-3xl font-semibold" style={{ color: '#881337' }}>{rejectedReceipts.length}</p>
          <p className="text-sm text-slate-600 mt-1">Reddedilen</p>
        </div>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="mb-6 bg-slate-100 border border-slate-200">
          <TabsTrigger value="pending" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            Bekleyen ({pendingReceipts.length})
          </TabsTrigger>
          <TabsTrigger value="approved" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            Onaylanan ({approvedReceipts.length})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            Reddedilen ({rejectedReceipts.length})
          </TabsTrigger>
        </TabsList>

        {[
          { value: 'pending', list: pendingReceipts },
          { value: 'approved', list: approvedReceipts },
          { value: 'rejected', list: rejectedReceipts }
        ].map(({ value, list }) => (
          <TabsContent key={value} value={value}>
            <Card className="border-blue-100">
              <Table>
                <TableHeader>
                  <TableRow className="bg-blue-50 border-b border-blue-100">
                    <TableHead className="text-blue-900 font-semibold">Müşteri</TableHead>
                    <TableHead className="text-blue-900 font-semibold">Tutar</TableHead>
                    <TableHead className="text-blue-900 font-semibold">Ödeme Tarihi</TableHead>
                    <TableHead className="text-blue-900 font-semibold">Yüklenme Tarihi</TableHead>
                    <TableHead className="text-blue-900 font-semibold">Durum</TableHead>
                    <TableHead className="text-blue-900 font-semibold">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-slate-600">
                        Bu kategoride makbuz yok
                      </TableCell>
                    </TableRow>
                  ) : (
                    list.map((receipt) => (
                      <TableRow key={receipt.id} data-testid={`receipt-row-${receipt.id}`}>
                        <TableCell className="font-medium">{receipt.client_name}</TableCell>
                        <TableCell className="font-semibold text-blue-600">₺{receipt.amount.toFixed(2)}</TableCell>
                        <TableCell>{new Date(receipt.payment_date).toLocaleDateString('tr-TR')}</TableCell>
                        <TableCell>{new Date(receipt.created_at).toLocaleDateString('tr-TR')}</TableCell>
                        <TableCell>{getStatusBadge(receipt.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {receipt.status === 'pending' ? (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => setSelectedReceipt({ ...receipt, action: 'approve' })}
                                  className="bg-green-600 hover:bg-green-700"
                                  data-testid={`approve-receipt-${receipt.id}`}
                                >
                                  Onayla
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setSelectedReceipt({ ...receipt, action: 'reject' })}
                                  className="border-red-200 text-red-600 hover:bg-red-50"
                                  data-testid={`reject-receipt-${receipt.id}`}
                                >
                                  Reddet
                                </Button>
                              </>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(receipt.receipt_file_url, '_blank')}
                                className="border-blue-200"
                              >
                                <FileText className="h-4 w-4 mr-1" />
                                Görüntüle
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Approval/Rejection Dialog */}
      <Dialog open={!!selectedReceipt} onOpenChange={() => setSelectedReceipt(null)}>
        <DialogContent data-testid="receipt-action-dialog">
          <DialogHeader>
            <DialogTitle>
              {selectedReceipt?.action === 'approve' ? 'Makbuzu Onayla' : 'Makbuzu Reddet'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-slate-900 mb-2">Müşteri: {selectedReceipt?.client_name}</p>
              <p className="text-sm text-slate-600">Tutar: ₺{selectedReceipt?.amount.toFixed(2)}</p>
            </div>

            {selectedReceipt?.action === 'approve' && (
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm font-medium text-green-900 mb-1">Onay Sonrası:</p>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• 30 günlük erişim aktifleştirilecek</li>
                  <li>• Müşteriye e-posta bildirimi gönderilecek</li>
                  <li>• Hesap durumu "aktif" olarak güncellenecek</li>
                </ul>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="admin_notes">Yönetici Notu (İsteğe bağlı)</Label>
              <Textarea
                id="admin_notes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="border-blue-200"
                rows={3}
                placeholder={selectedReceipt?.action === 'reject' ? 'Reddetme sebebini belirtin...' : 'Not ekleyin...'}
                data-testid="admin-notes-textarea"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedReceipt(null)}>
              İptal
            </Button>
            <Button
              onClick={() => handleApprove(selectedReceipt?.id, selectedReceipt?.action === 'approve')}
              className={selectedReceipt?.action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
              data-testid="confirm-action-button"
            >
              {selectedReceipt?.action === 'approve' ? 'Onayla' : 'Reddet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
