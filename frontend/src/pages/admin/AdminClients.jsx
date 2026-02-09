import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
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

export const AdminClients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingClient) {
        await apiClient.put(`/clients/${editingClient.id}`, formData);
        toast.success(tr.admin.clients.clientUpdated);
      } else {
        await apiClient.post('/clients', formData);
        toast.success(tr.admin.clients.clientCreated);
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
    setEditingClient(null);
  };

  const openEditDialog = (client) => {
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
    setShowDialog(true);
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto" data-testid="admin-clients-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-medium text-slate-900" data-testid="clients-title">{tr.admin.clients.title}</h1>
          <p className="text-slate-600 mt-2">Müşteri profillerini ve hizmet erişimlerini yönetin</p>
        </div>
        <Button onClick={() => setShowDialog(true)} className="bg-blue-600 hover:bg-blue-700" data-testid="add-client-button">
          <Plus className="h-4 w-4 mr-2" />
          {tr.admin.clients.addClient}
        </Button>
      </div>

      <Card className="border-blue-100 shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-blue-50">
              <TableHead>{tr.admin.clients.companyName}</TableHead>
              <TableHead>{tr.admin.clients.contactName}</TableHead>
              <TableHead>{tr.admin.clients.industry}</TableHead>
              <TableHead>{tr.admin.clients.status}</TableHead>
              <TableHead>{tr.admin.clients.accessDays}</TableHead>
              <TableHead className="text-right">{tr.common.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-600">
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
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      client.status === 'active' ? 'bg-green-100 text-green-800' :
                      client.status === 'expired' ? 'bg-red-100 text-red-800' :
                      'bg-slate-100 text-slate-800'
                    }`}>
                      {tr.status[client.status] || client.status}
                    </span>
                  </TableCell>
                  <TableCell>{client.access_days_remaining} gün</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDialog(client)}
                        className="border-blue-200 text-blue-600 hover:bg-blue-50"
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

      <Dialog open={showDialog} onOpenChange={(open) => {
        setShowDialog(open);
        if (!open) resetForm();
      }}>
        <DialogContent data-testid="client-dialog">
          <DialogHeader>
            <DialogTitle>{editingClient ? tr.admin.clients.editClient : tr.admin.clients.addClient}</DialogTitle>
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
                  className="border-blue-200"
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
                  className="border-blue-200"
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
                  className="border-blue-200"
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
                  className="border-blue-200"
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
                  className="border-blue-200"
                  data-testid="industry-input"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                {tr.common.cancel}
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" data-testid="submit-client-button">
                {editingClient ? tr.common.update : tr.common.create}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
