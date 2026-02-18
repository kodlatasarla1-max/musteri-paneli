import { useState, useEffect } from 'react';
import { Activity, User, FileText, Calendar, Filter } from 'lucide-react';
import apiClient from '../../utils/api';
import { toast } from 'sonner';
import { Card } from '../../components/ui/card';
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

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
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
    const colors = {
      create: 'bg-green-100 text-green-800',
      update: 'bg-blue-100 text-blue-800',
      delete: 'bg-red-100 text-red-800',
      approve: 'bg-indigo-100 text-indigo-800',
      reject: 'bg-red-100 text-red-800',
      toggle_service: 'bg-amber-100 text-amber-800',
      approve_receipt: 'bg-green-100 text-green-800',
      reject_receipt: 'bg-red-100 text-red-800',
      update_status: 'bg-blue-100 text-blue-800'
    };

    const color = colors[action] || 'bg-slate-100 text-slate-800';

    return (
      <span className={`px-2 py-1 text-xs rounded-full ${color}`}>
        {action}
      </span>
    );
  };

  const getResourceIcon = (resourceType) => {
    switch (resourceType) {
      case 'client':
        return <User className="h-4 w-4 text-blue-600" />;
      case 'video':
      case 'design':
      case 'social_post':
        return <FileText className="h-4 w-4 text-indigo-600" />;
      case 'calendar_event':
        return <Calendar className="h-4 w-4 text-amber-600" />;
      default:
        return <Activity className="h-4 w-4 text-slate-600" />;
    }
  };

  if (loading) {
    return <div className="p-8">{tr.common.loading}</div>;
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto" data-testid="admin-logs-page">
      <div className="mb-8">
        <h1 className="text-4xl font-medium text-slate-900" data-testid="logs-title">{tr.admin.logs.title}</h1>
        <p className="text-slate-600 mt-2">Sistemdeki tüm önemli aktiviteleri izleyin</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-white border-blue-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <p className="text-3xl font-semibold text-blue-900">{logs.length}</p>
          <p className="text-sm text-slate-600 mt-1">Toplam Aktivite</p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-50 to-white border-green-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-green-100 rounded-xl">
              <Activity className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <p className="text-3xl font-semibold text-green-900">
            {logs.filter(l => l.action === 'create').length}
          </p>
          <p className="text-sm text-slate-600 mt-1">Oluşturma</p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-indigo-50 to-white border-indigo-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-indigo-100 rounded-xl">
              <Activity className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
          <p className="text-3xl font-semibold text-indigo-900">
            {logs.filter(l => l.action === 'update' || l.action === 'update_status').length}
          </p>
          <p className="text-sm text-slate-600 mt-1">Güncelleme</p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-rose-50 to-white border-rose-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-rose-100 rounded-xl">
              <Activity className="h-6 w-6 text-rose-600" />
            </div>
          </div>
          <p className="text-3xl font-semibold text-rose-900">
            {logs.filter(l => l.action === 'delete').length}
          </p>
          <p className="text-sm text-slate-600 mt-1">Silme</p>
        </Card>
      </div>

      {/* Logs Table */}
      <Card className="border-blue-100">
        <Table>
          <TableHeader>
            <TableRow className="bg-blue-50">
              <TableHead>Zaman</TableHead>
              <TableHead>Kullanıcı</TableHead>
              <TableHead>İşlem</TableHead>
              <TableHead>Kaynak</TableHead>
              <TableHead>Detay</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-slate-600">
                  {tr.admin.logs.noLogs}
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id} data-testid={`log-row-${log.id}`} className="hover:bg-blue-50">
                  <TableCell className="text-sm text-slate-600">
                    {new Date(log.timestamp).toLocaleString('tr-TR')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-slate-400" />
                      <span className="text-sm font-medium">{log.user_email}</span>
                    </div>
                  </TableCell>
                  <TableCell>{getActionBadge(log.action)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getResourceIcon(log.resource_type)}
                      <span className="text-sm">{log.resource_type}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600 max-w-md truncate">
                    {log.details}
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
