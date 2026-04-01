import { useState, useEffect } from 'react';
import { Activity, User, FileText, Calendar, Filter, RefreshCw, Receipt, Video, Image, Settings, Users, Bell } from 'lucide-react';
import apiClient from '../../utils/api';
import { toast } from 'sonner';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { tr } from '../../utils/translations';

export const AdminLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('all');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/activity-logs');
      setLogs(response.data);
    } catch (error) {
      console.error('Error loading logs:', error);
      toast.error('Loglar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (action) => {
    const actionLabels = {
      create: 'Oluşturma',
      update: 'Güncelleme',
      delete: 'Silme',
      toggle_service: 'Hizmet Değişikliği',
      receipt_approved: 'Makbuz Onayı',
      receipt_rejected: 'Makbuz Reddi',
      update_status: 'Durum Güncellemesi',
      sync: 'Senkronizasyon'
    };

    const colors = {
      create: 'bg-green-100 text-green-800',
      update: 'bg-slate-100 text-slate-800',
      delete: 'bg-red-100 text-red-800',
      toggle_service: 'bg-slate-200 text-slate-900',
      receipt_approved: 'bg-green-100 text-green-800',
      receipt_rejected: 'bg-red-100 text-red-800',
      update_status: 'bg-slate-100 text-slate-800',
      sync: 'bg-slate-100 text-slate-800'
    };

    const color = colors[action] || 'bg-slate-100 text-slate-800';
    const label = actionLabels[action] || action;

    return (
      <span className={`px-2 py-1 text-xs rounded-full font-medium ${color}`}>
        {label}
      </span>
    );
  };

  const getEntityLabel = (entity) => {
    const labels = {
      client: 'Müşteri',
      receipt: 'Makbuz',
      video: 'Video',
      design: 'Tasarım',
      calendar_event: 'Etkinlik',
      client_service: 'Hizmet',
      client_finance: 'Finans',
      user: 'Kullanıcı',
      staff: 'Personel',
      campaign: 'Kampanya',
      ad_report: 'Reklam Raporu',
      meta_account: 'Meta Hesabı',
      revision: 'Revizyon',
      profile: 'Profil',
      staff_permissions: 'Yetki'
    };
    return labels[entity] || entity;
  };

  const getDetails = (log) => {
    // Format details from before/after data
    const parts = [];
    
    if (log.entity === 'client' && log.before?.company_name) {
      parts.push(log.before.company_name);
    }
    if (log.entity === 'receipt' && log.after?.status) {
      parts.push(`Durum: ${log.after.status}`);
    }
    if (log.action === 'toggle_service' && log.after?.is_enabled !== undefined) {
      parts.push(log.after.is_enabled ? 'Aktif' : 'Pasif');
    }
    if (log.action === 'receipt_approved' && log.after?.days_granted) {
      parts.push(`${log.after.days_granted} gün erişim verildi`);
    }
    
    return parts.join(' • ') || '-';
  };

  const getResourceIcon = (entity) => {
    switch (entity) {
      case 'client':
        return <Users className="h-4 w-4 text-slate-900" />;
      case 'video':
        return <Video className="h-4 w-4 text-slate-600" />;
      case 'design':
        return <Image className="h-4 w-4 text-slate-600" />;
      case 'receipt':
        return <Receipt className="h-4 w-4 text-green-600" />;
      case 'calendar_event':
        return <Calendar className="h-4 w-4 text-slate-600" />;
      case 'user':
      case 'staff':
      case 'staff_permissions':
        return <User className="h-4 w-4 text-slate-600" />;
      case 'profile':
        return <Settings className="h-4 w-4 text-slate-600" />;
      default:
        return <Activity className="h-4 w-4 text-slate-600" />;
    }
  };

  const filteredLogs = filterAction === 'all' 
    ? logs 
    : logs.filter(l => l.action === filterAction || (filterAction === 'update' && l.action === 'update_status'));

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-slate-600" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto" data-testid="admin-logs-page">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-medium text-slate-900" data-testid="logs-title">{tr.admin.logs.title}</h1>
          <p className="text-slate-600 mt-2">Sistemdeki tüm önemli aktiviteleri izleyin</p>
        </div>
        <Button 
          onClick={loadLogs} 
          variant="outline" 
          className="gap-2"
          data-testid="refresh-logs-btn"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Yenile
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card 
          className={`p-6 bg-white border-slate-200 cursor-pointer transition-all ${filterAction === 'all' ? 'ring-2 ring-slate-900' : ''}`}
          onClick={() => setFilterAction('all')}
          data-testid="filter-all"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-slate-900 rounded-xl">
              <Activity className="h-6 w-6 text-white" />
            </div>
          </div>
          <p className="text-3xl font-semibold text-slate-900">{logs.length}</p>
          <p className="text-sm text-slate-600 mt-1">Toplam Aktivite</p>
        </Card>

        <Card 
          className={`p-6 bg-white border-slate-200 cursor-pointer transition-all ${filterAction === 'create' ? 'ring-2 ring-green-600' : ''}`}
          onClick={() => setFilterAction('create')}
          data-testid="filter-create"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-green-100 rounded-xl">
              <Activity className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <p className="text-3xl font-semibold text-slate-900">
            {logs.filter(l => l.action === 'create').length}
          </p>
          <p className="text-sm text-slate-600 mt-1">Oluşturma</p>
        </Card>

        <Card 
          className={`p-6 bg-white border-slate-200 cursor-pointer transition-all ${filterAction === 'update' ? 'ring-2 ring-slate-600' : ''}`}
          onClick={() => setFilterAction('update')}
          data-testid="filter-update"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-slate-200 rounded-xl">
              <Activity className="h-6 w-6 text-slate-600" />
            </div>
          </div>
          <p className="text-3xl font-semibold text-slate-900">
            {logs.filter(l => l.action === 'update' || l.action === 'update_status').length}
          </p>
          <p className="text-sm text-slate-600 mt-1">Güncelleme</p>
        </Card>

        <Card 
          className={`p-6 bg-white border-slate-200 cursor-pointer transition-all ${filterAction === 'delete' ? 'ring-2 ring-red-600' : ''}`}
          onClick={() => setFilterAction('delete')}
          data-testid="filter-delete"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-red-100 rounded-xl">
              <Activity className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <p className="text-3xl font-semibold text-slate-900">
            {logs.filter(l => l.action === 'delete').length}
          </p>
          <p className="text-sm text-slate-600 mt-1">Silme</p>
        </Card>
      </div>

      {/* Logs Table */}
      <Card className="border-slate-200">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Zaman</TableHead>
              <TableHead>Kullanıcı</TableHead>
              <TableHead>İşlem</TableHead>
              <TableHead>Kaynak</TableHead>
              <TableHead>Detay</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-slate-600">
                  {filterAction !== 'all' ? 'Bu filtreye uygun log bulunamadı' : tr.admin.logs.noLogs}
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => (
                <TableRow key={log.id} data-testid={`log-row-${log.id}`} className="hover:bg-slate-50">
                  <TableCell className="text-sm text-slate-600">
                    {new Date(log.created_at).toLocaleString('tr-TR')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-slate-400" />
                      <span className="text-sm font-medium">{log.actor_email}</span>
                    </div>
                  </TableCell>
                  <TableCell>{getActionBadge(log.action)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getResourceIcon(log.entity)}
                      <span className="text-sm">{getEntityLabel(log.entity)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600 max-w-md truncate">
                    {getDetails(log)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default AdminLogs;
