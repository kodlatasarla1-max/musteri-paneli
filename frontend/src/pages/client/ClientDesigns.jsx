import { useState, useEffect } from 'react';
import { Image, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import apiClient from '../../utils/api';
import { getUser } from '../../utils/auth';
import { toast } from 'sonner';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { tr } from '../../utils/translations';

export const ClientDesigns = () => {
  const user = getUser();
  const clientId = user?.client_id;
  const [designs, setDesigns] = useState([]);
  const [selectedDesign, setSelectedDesign] = useState(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (clientId) {
      loadData();
    }
  }, [clientId]);

  const loadData = async () => {
    try {
      const designsRes = await apiClient.get(`/designs/${clientId}`);
      setDesigns(designsRes.data);
    } catch (error) {
      console.error('Error loading designs:', error);
      toast.error('Tasarımlar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (designId, newStatus) => {
    try {
      await apiClient.put(`/designs/${designId}/status`, null, {
        params: { status: newStatus, notes }
      });
      toast.success('Durum başarıyla güncellendi');
      setSelectedDesign(null);
      setNotes('');
      loadData();
    } catch (error) {
      toast.error('Durum güncellenemedi');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'revision_requested':
        return <AlertCircle className="h-5 w-5 text-amber-600" />;
      default:
        return <Clock className="h-5 w-5 text-slate-600" />;
    }
  };

  const getStatusText = (status) => {
    return tr.status[status] || status;
  };

  if (loading) {
    return <div className="p-8">{tr.common.loading}</div>;
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto" data-testid="client-designs-page">
      <h1 className="text-4xl font-medium text-slate-900 mb-8" data-testid="designs-title">{tr.client.designs.title}</h1>

      <div>
        <h2 className="text-2xl font-medium text-slate-900 mb-4">{tr.client.designs.designGallery}</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {designs.length === 0 ? (
            <Card className="p-6 col-span-4 bg-slate-50 border-slate-200" data-testid="no-designs">
              <p className="text-slate-600">{tr.client.designs.noDesigns}</p>
            </Card>
          ) : (
            designs.map((design) => (
              <Card key={design.id} className="overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition-shadow" data-testid={`design-card-${design.id}`}>
                <div className="aspect-square bg-slate-200 relative flex items-center justify-center">
                  <Image className="h-12 w-12 text-slate-400" />
                </div>
                <div className="p-4">
                  <h3 className="font-medium text-slate-900 mb-1 text-sm">{design.file_name}</h3>
                  <p className="text-xs text-slate-600 mb-1">{design.project_name}</p>
                  <p className="text-xs text-slate-500 mb-3">Versiyon {design.version}</p>
                  <div className="flex items-center gap-2 mb-3">
                    {getStatusIcon(design.status)}
                    <span className="text-sm">{getStatusText(design.status)}</span>
                  </div>
                  {design.notes && (
                    <p className="text-xs text-slate-600 p-2 bg-slate-50 rounded mb-3">{design.notes}</p>
                  )}
                  {design.status === 'uploaded' && (
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        onClick={() => setSelectedDesign({ ...design, action: 'approve' })}
                        className="w-full bg-slate-900 hover:bg-black"
                        data-testid={`approve-design-${design.id}`}
                      >
                        {tr.client.designs.approveDesign}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedDesign({ ...design, action: 'revision' })}
                        className="w-full border-slate-300"
                        data-testid={`request-revision-${design.id}`}
                      >
                        {tr.client.designs.requestDesignRevision}
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      <Dialog open={!!selectedDesign} onOpenChange={() => setSelectedDesign(null)}>
        <DialogContent data-testid="status-update-dialog">
          <DialogHeader>
            <DialogTitle>
              {selectedDesign?.action === 'approve' ? tr.client.designs.approveDesign : tr.client.designs.requestDesignRevision}
            </DialogTitle>
            <DialogDescription>
              {selectedDesign?.action === 'approve'
                ? 'Bu tasarımı final olarak onaylayın.'
                : 'Bu tasarım için değişiklik isteyin.'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Not ekleyin (isteğe bağlı)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="border-slate-300"
              data-testid="notes-textarea"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedDesign(null)}>
              {tr.common.cancel}
            </Button>
            <Button
              onClick={() =>
                handleStatusUpdate(
                  selectedDesign?.id,
                  selectedDesign?.action === 'approve' ? 'approved' : 'revision_requested'
                )
              }
              className="bg-slate-900 hover:bg-black"
              data-testid="confirm-status-button"
            >
              {tr.common.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
