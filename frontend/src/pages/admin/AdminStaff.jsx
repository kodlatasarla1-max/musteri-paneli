import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Shield, User, Mail, Check, X } from 'lucide-react';
import apiClient from '../../utils/api';
import { toast } from 'sonner';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Checkbox } from '../../components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { tr } from '../../utils/translations';

export const AdminStaff = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showPermDialog, setShowPermDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    password: ''
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
      setLoading(true);
      const response = await apiClient.get('/staff');
      setStaff(response.data);
    } catch (error) {
      console.error('Error loading staff:', error);
      toast.error('Personel listesi yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      if (editingStaff) {
        await apiClient.put(`/staff/${editingStaff.id}`, {
          full_name: formData.full_name
        });
        toast.success('Personel başarıyla güncellendi');
      } else {
        await apiClient.post('/staff', formData);
        toast.success('Personel başarıyla oluşturuldu');
      }
      setShowDialog(false);
      resetForm();
      loadStaff();
    } catch (error) {
      const message = error.response?.data?.detail || 'İşlem başarısız';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedStaff) return;
    
    setSubmitting(true);
    try {
      await apiClient.delete(`/staff/${selectedStaff.id}`);
      toast.success('Personel başarıyla silindi');
      setShowDeleteDialog(false);
      setSelectedStaff(null);
      loadStaff();
    } catch (error) {
      toast.error('Personel silinemedi');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePermissions = async () => {
    if (!selectedStaff) return;
    
    setSubmitting(true);
    try {
      await apiClient.post('/staff-permissions', {
        staff_id: selectedStaff.id,
        ...permissions
      });
      toast.success('İzinler başarıyla güncellendi');
      setShowPermDialog(false);
      loadStaff();
    } catch (error) {
      toast.error('İzinler güncellenemedi');
    } finally {
      setSubmitting(false);
    }
  };

  const openPermDialog = (member) => {
    setSelectedStaff(member);
    if (member.permissions) {
      setPermissions({
        can_manage_clients: member.permissions.can_manage_clients || false,
        can_manage_content: member.permissions.can_manage_content || false,
        can_view_reports: member.permissions.can_view_reports || false,
        can_approve_receipts: member.permissions.can_approve_receipts || false,
        can_manage_calendar: member.permissions.can_manage_calendar || false
      });
    } else {
      setPermissions({
        can_manage_clients: false,
        can_manage_content: false,
        can_view_reports: false,
        can_approve_receipts: false,
        can_manage_calendar: false
      });
    }
    setShowPermDialog(true);
  };

  const openEditDialog = (member) => {
    setEditingStaff(member);
    setFormData({
      email: member.email,
      full_name: member.full_name,
      password: ''
    });
    setShowDialog(true);
  };

  const resetForm = () => {
    setFormData({
      email: '',
      full_name: '',
      password: ''
    });
    setEditingStaff(null);
  };

  const getPermissionCount = (member) => {
    if (!member.permissions) return 0;
    return Object.values(member.permissions).filter(v => v === true).length;
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto" data-testid="admin-staff-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-medium text-slate-900" data-testid="staff-title">
            {tr.admin.staff.title}
          </h1>
          <p className="text-slate-600 mt-2 text-sm sm:text-base">
            Personel üyelerini yönetin ve izinlerini düzenleyin
          </p>
        </div>
        <Button 
          onClick={() => {
            resetForm();
            setShowDialog(true);
          }} 
          className="bg-slate-900 hover:bg-black w-full sm:w-auto" 
          data-testid="add-staff-button"
        >
          <Plus className="h-4 w-4 mr-2" />
          {tr.admin.staff.addStaff}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="p-4 sm:p-6 bg-gradient-to-br from-slate-50 to-white border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-3 bg-slate-900 rounded-xl">
              <User className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-semibold text-slate-900">{staff.length}</p>
              <p className="text-xs sm:text-sm text-slate-600">Toplam Personel</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 sm:p-6 bg-gradient-to-br from-green-50 to-white border-green-100">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-3 bg-green-100 rounded-xl">
              <Check className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-semibold text-green-900">
                {staff.filter(s => s.is_active !== false).length}
              </p>
              <p className="text-xs sm:text-sm text-slate-600">Aktif</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="whitespace-nowrap">{tr.admin.staff.fullName}</TableHead>
                <TableHead className="whitespace-nowrap">{tr.admin.staff.email}</TableHead>
                <TableHead className="whitespace-nowrap hidden sm:table-cell">Durum</TableHead>
                <TableHead className="whitespace-nowrap hidden md:table-cell">{tr.admin.staff.permissions}</TableHead>
                <TableHead className="text-right whitespace-nowrap">{tr.common.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-slate-600">
                    <User className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                    <p>{tr.admin.staff.noStaff}</p>
                    <p className="text-sm mt-2">İlk personelinizi eklemek için yukarıdaki butonu kullanın.</p>
                  </TableCell>
                </TableRow>
              ) : (
                staff.map((member) => (
                  <TableRow key={member.id} data-testid={`staff-row-${member.id}`}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-100 flex items-center justify-center">
                          {member.avatar_url ? (
                            <img src={member.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            <User className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm sm:text-base">{member.full_name}</p>
                          <p className="text-xs text-slate-500 sm:hidden">{member.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Mail className="h-4 w-4" />
                        <span className="text-sm">{member.email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant={member.is_active !== false ? "default" : "secondary"} className={member.is_active !== false ? "bg-green-100 text-green-800" : ""}>
                        {member.is_active !== false ? 'Aktif' : 'Pasif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openPermDialog(member)}
                        className="border-slate-300 text-slate-900 hover:bg-slate-50"
                      >
                        <Shield className="h-4 w-4 mr-1" />
                        <span className="hidden lg:inline">İzinler</span>
                        <Badge variant="secondary" className="ml-1 bg-slate-100 text-slate-700">
                          {getPermissionCount(member)}
                        </Badge>
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 sm:gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => openPermDialog(member)}
                          className="border-slate-300 text-slate-900 hover:bg-slate-50 md:hidden"
                        >
                          <Shield className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => openEditDialog(member)}
                          className="border-slate-300 text-slate-900 hover:bg-slate-50"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => {
                            setSelectedStaff(member);
                            setShowDeleteDialog(true);
                          }}
                          className="border-red-200 text-red-600 hover:bg-red-50"
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
        </div>
      </Card>

      {/* Add/Edit Staff Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => {
        setShowDialog(open);
        if (!open) resetForm();
      }}>
        <DialogContent data-testid="staff-dialog" aria-describedby="staff-dialog-desc">
          <DialogHeader>
            <DialogTitle>{editingStaff ? tr.admin.staff.editStaff : tr.admin.staff.addStaff}</DialogTitle>
            <DialogDescription id="staff-dialog-desc">
              {editingStaff ? 'Personel bilgilerini güncelleyin.' : 'Yeni personel ekleyin ve izinlerini ayarlayın.'}
            </DialogDescription>
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
                  className="border-slate-300 focus:border-slate-900"
                  data-testid="full-name-input"
                  placeholder="Ad Soyad"
                />
              </div>
              
              {!editingStaff && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="email">{tr.admin.staff.email}</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="border-slate-300 focus:border-slate-900"
                      data-testid="email-input"
                      placeholder="email@ornek.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Şifre</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      minLength={6}
                      className="border-slate-300 focus:border-slate-900"
                      data-testid="password-input"
                      placeholder="En az 6 karakter"
                    />
                  </div>
                </>
              )}
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                {tr.common.cancel}
              </Button>
              <Button 
                type="submit" 
                className="bg-slate-900 hover:bg-black" 
                data-testid="submit-staff-button"
                disabled={submitting}
              >
                {submitting ? 'Kaydediliyor...' : (editingStaff ? tr.common.update : tr.common.create)}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={showPermDialog} onOpenChange={setShowPermDialog}>
        <DialogContent data-testid="permissions-dialog" aria-describedby="perm-dialog-desc">
          <DialogHeader>
            <DialogTitle>{tr.admin.staff.permissions}</DialogTitle>
            <DialogDescription id="perm-dialog-desc">
              {selectedStaff?.full_name} için yetkileri düzenleyin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-50">
              <Checkbox
                id="manage_clients"
                checked={permissions.can_manage_clients}
                onCheckedChange={(checked) => setPermissions({ ...permissions, can_manage_clients: checked })}
              />
              <Label htmlFor="manage_clients" className="flex-1 cursor-pointer">
                <span className="font-medium">{tr.admin.staff.canManageClients}</span>
                <p className="text-xs text-slate-500">Müşteri ekleme, düzenleme ve silme</p>
              </Label>
            </div>
            
            <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-50">
              <Checkbox
                id="manage_content"
                checked={permissions.can_manage_content}
                onCheckedChange={(checked) => setPermissions({ ...permissions, can_manage_content: checked })}
              />
              <Label htmlFor="manage_content" className="flex-1 cursor-pointer">
                <span className="font-medium">{tr.admin.staff.canManageContent}</span>
                <p className="text-xs text-slate-500">Video ve tasarım yönetimi</p>
              </Label>
            </div>
            
            <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-50">
              <Checkbox
                id="view_reports"
                checked={permissions.can_view_reports}
                onCheckedChange={(checked) => setPermissions({ ...permissions, can_view_reports: checked })}
              />
              <Label htmlFor="view_reports" className="flex-1 cursor-pointer">
                <span className="font-medium">{tr.admin.staff.canViewReports}</span>
                <p className="text-xs text-slate-500">Raporları görüntüleme</p>
              </Label>
            </div>
            
            <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-50">
              <Checkbox
                id="approve_receipts"
                checked={permissions.can_approve_receipts}
                onCheckedChange={(checked) => setPermissions({ ...permissions, can_approve_receipts: checked })}
              />
              <Label htmlFor="approve_receipts" className="flex-1 cursor-pointer">
                <span className="font-medium">{tr.admin.staff.canApproveReceipts}</span>
                <p className="text-xs text-slate-500">Makbuz onaylama ve reddetme</p>
              </Label>
            </div>
            
            <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-50">
              <Checkbox
                id="manage_calendar"
                checked={permissions.can_manage_calendar}
                onCheckedChange={(checked) => setPermissions({ ...permissions, can_manage_calendar: checked })}
              />
              <Label htmlFor="manage_calendar" className="flex-1 cursor-pointer">
                <span className="font-medium">{tr.admin.staff.canManageCalendar}</span>
                <p className="text-xs text-slate-500">Takvim etkinlikleri yönetimi</p>
              </Label>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setShowPermDialog(false)}>
              {tr.common.cancel}
            </Button>
            <Button 
              onClick={handlePermissions} 
              className="bg-slate-900 hover:bg-black"
              disabled={submitting}
            >
              {submitting ? 'Kaydediliyor...' : tr.common.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent aria-describedby="delete-dialog-desc">
          <DialogHeader>
            <DialogTitle>Personeli Sil</DialogTitle>
            <DialogDescription id="delete-dialog-desc">
              <span className="font-medium text-slate-900">{selectedStaff?.full_name}</span> isimli personeli silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setShowDeleteDialog(false)}>
              İptal
            </Button>
            <Button 
              onClick={handleDelete} 
              variant="destructive"
              disabled={submitting}
            >
              {submitting ? 'Siliniyor...' : 'Sil'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
