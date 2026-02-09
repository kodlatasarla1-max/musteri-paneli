import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Shield } from 'lucide-react';
import apiClient from '../../utils/api';
import { toast } from 'sonner';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Checkbox } from '../../components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { tr } from '../../utils/translations';

export const AdminStaff = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showPermDialog, setShowPermDialog] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    password: '',
    role: 'staff'
  });
  const [permissions, setPermissions] = useState({
    can_manage_clients: false,
    can_manage_content: false,
    can_view_reports: false,
    can_approve_receipts: false,
    can_manage_calendar: false
  });

  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = async () => {
    try {
      const response = await apiClient.get('/auth/me');
      const usersRes = await apiClient.get('/clients');
      setStaff([]);
    } catch (error) {
      console.error('Error loading staff:', error);
      toast.error('Personel yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingStaff) {
        toast.info('Personel güncelleme yapılıyor...');
      } else {
        await apiClient.post('/auth/register', formData);
        toast.success('Personel başarıyla oluşturuldu');
      }
      setShowDialog(false);
      resetForm();
      loadStaff();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'İşlem başarısız');
    }
  };

  const handlePermissions = async () => {
    try {
      if (selectedStaff) {
        await apiClient.post('/staff-permissions', {
          staff_id: selectedStaff.id,
          ...permissions
        });
        toast.success('İzinler başarıyla güncellendi');
        setShowPermDialog(false);
      }
    } catch (error) {
      toast.error('İzinler güncellenemedi');
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      full_name: '',
      password: '',
      role: 'staff'
    });
    setEditingStaff(null);
  };

  if (loading) {
    return <div className="p-8">{tr.common.loading}</div>;
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto" data-testid="admin-staff-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-medium text-slate-900" data-testid="staff-title">{tr.admin.staff.title}</h1>
          <p className="text-slate-600 mt-2">Personel üyelerini yönetin ve izinlerini düzenleyin</p>
        </div>
        <Button onClick={() => setShowDialog(true)} className="bg-blue-600 hover:bg-blue-700" data-testid="add-staff-button">
          <Plus className="h-4 w-4 mr-2" />
          {tr.admin.staff.addStaff}
        </Button>
      </div>

      <Card className="border-blue-100 shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-blue-50">
              <TableHead>{tr.admin.staff.fullName}</TableHead>
              <TableHead>{tr.admin.staff.email}</TableHead>
              <TableHead>{tr.admin.staff.role}</TableHead>
              <TableHead>{tr.admin.staff.permissions}</TableHead>
              <TableHead className="text-right">{tr.common.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {staff.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-slate-600">
                  {tr.admin.staff.noStaff}
                </TableCell>
              </TableRow>
            ) : (
              staff.map((member) => (
                <TableRow key={member.id} data-testid={`staff-row-${member.id}`}>
                  <TableCell className="font-medium">{member.full_name}</TableCell>
                  <TableCell>{member.email}</TableCell>
                  <TableCell>
                    <span className="px-3 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                      {member.role}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedStaff(member);
                        setShowPermDialog(true);
                      }}
                      className="border-blue-200 text-blue-600 hover:bg-blue-50"
                    >
                      <Shield className="h-4 w-4 mr-1" />
                      İzinler
                    </Button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" className="border-blue-200 text-blue-600 hover:bg-blue-50">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50">
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
        <DialogContent data-testid="staff-dialog">
          <DialogHeader>
            <DialogTitle>{editingStaff ? tr.admin.staff.editStaff : tr.admin.staff.addStaff}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">{tr.admin.staff.fullName}</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                  className="border-blue-200 focus:border-blue-500"
                  data-testid="full-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{tr.admin.staff.email}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="border-blue-200 focus:border-blue-500"
                  data-testid="email-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Şifre</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!editingStaff}
                  className="border-blue-200 focus:border-blue-500"
                  data-testid="password-input"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                {tr.common.cancel}
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" data-testid="submit-staff-button">
                {editingStaff ? tr.common.update : tr.common.create}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showPermDialog} onOpenChange={setShowPermDialog}>
        <DialogContent data-testid="permissions-dialog">
          <DialogHeader>
            <DialogTitle>{tr.admin.staff.permissions}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="manage_clients"
                checked={permissions.can_manage_clients}
                onCheckedChange={(checked) => setPermissions({ ...permissions, can_manage_clients: checked })}
              />
              <Label htmlFor="manage_clients">{tr.admin.staff.canManageClients}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="manage_content"
                checked={permissions.can_manage_content}
                onCheckedChange={(checked) => setPermissions({ ...permissions, can_manage_content: checked })}
              />
              <Label htmlFor="manage_content">{tr.admin.staff.canManageContent}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="view_reports"
                checked={permissions.can_view_reports}
                onCheckedChange={(checked) => setPermissions({ ...permissions, can_view_reports: checked })}
              />
              <Label htmlFor="view_reports">{tr.admin.staff.canViewReports}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="approve_receipts"
                checked={permissions.can_approve_receipts}
                onCheckedChange={(checked) => setPermissions({ ...permissions, can_approve_receipts: checked })}
              />
              <Label htmlFor="approve_receipts">{tr.admin.staff.canApproveReceipts}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="manage_calendar"
                checked={permissions.can_manage_calendar}
                onCheckedChange={(checked) => setPermissions({ ...permissions, can_manage_calendar: checked })}
              />
              <Label htmlFor="manage_calendar">{tr.admin.staff.canManageCalendar}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowPermDialog(false)}>
              {tr.common.cancel}
            </Button>
            <Button onClick={handlePermissions} className="bg-blue-600 hover:bg-blue-700">
              {tr.common.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};