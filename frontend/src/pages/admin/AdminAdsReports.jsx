import { useState, useEffect } from 'react';
import { Plus, TrendingUp, BarChart3, DollarSign } from 'lucide-react';
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
import { tr } from '../../utils/translations';

export const AdminAdsReports = () => {
  const [clients, setClients] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedClient, setSelectedClient] = useState('');
  
  const [reportForm, setReportForm] = useState({
    report_date: new Date().toISOString().split('T')[0],
    daily_spend: 0,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    cpc: 0,
    cpm: 0,
    campaign_name: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [clientsRes, allReports] = await Promise.all([
        apiClient.get('/clients'),
        loadAllReports()
      ]);
      setClients(clientsRes.data);
      setReports(allReports);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const loadAllReports = async () => {
    try {
      const clientsRes = await apiClient.get('/clients');
      const allReports = [];
      for (const client of clientsRes.data) {
        const reportsRes = await apiClient.get(`/ads-reports/${client.id}`);
        allReports.push(...reportsRes.data.map(r => ({ ...r, client_name: client.company_name })));
      }
      return allReports.sort((a, b) => new Date(b.report_date) - new Date(a.report_date));
    } catch (error) {
      return [];
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedClient) {
      toast.error('Lütfen bir müşteri seçin');
      return;
    }

    try {
      await apiClient.post('/ads-reports', {
        ...reportForm,
        client_id: selectedClient,
        report_date: new Date(reportForm.report_date).toISOString()
      });
      toast.success('Reklam raporu başarıyla eklendi');
      setShowDialog(false);
      resetForm();
      loadData();
    } catch (error) {
      toast.error('Rapor eklenemedi');
    }
  };

  const resetForm = () => {
    setReportForm({
      report_date: new Date().toISOString().split('T')[0],
      daily_spend: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      cpc: 0,
      cpm: 0,
      campaign_name: ''
    });
    setSelectedClient('');
  };

  const calculateMetrics = () => {
    if (reportForm.clicks > 0 && reportForm.daily_spend > 0) {
      const cpc = reportForm.daily_spend / reportForm.clicks;
      setReportForm({ ...reportForm, cpc: parseFloat(cpc.toFixed(2)) });
    }
    if (reportForm.impressions > 0 && reportForm.daily_spend > 0) {
      const cpm = (reportForm.daily_spend / reportForm.impressions) * 1000;
      setReportForm({ ...reportForm, cpm: parseFloat(cpm.toFixed(2)) });
    }
  };

  if (loading) {
    return <div className="p-8">{tr.common.loading}</div>;
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto" data-testid="admin-ads-reports-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-medium text-slate-900" data-testid="ads-reports-title">{tr.admin.adsReports.title}</h1>
          <p className="text-slate-600 mt-2">Günlük reklam harcamaları ve performans metriklerini yönetin</p>
        </div>
        <Button onClick={() => setShowDialog(true)} className="bg-blue-600 hover:bg-blue-700" data-testid="add-report-button">
          <Plus className="h-4 w-4 mr-2" />
          {tr.admin.adsReports.addReport}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-white border-blue-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <p className="text-3xl font-semibold text-blue-900">
            ${reports.reduce((sum, r) => sum + r.daily_spend, 0).toFixed(2)}
          </p>
          <p className="text-sm text-slate-600 mt-1">Toplam Harcama</p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-indigo-50 to-white border-indigo-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-indigo-100 rounded-xl">
              <TrendingUp className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
          <p className="text-3xl font-semibold text-indigo-900">
            {reports.reduce((sum, r) => sum + r.impressions, 0).toLocaleString()}
          </p>
          <p className="text-sm text-slate-600 mt-1">Toplam Gösterim</p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-cyan-50 to-white border-cyan-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-cyan-100 rounded-xl">
              <BarChart3 className="h-6 w-6 text-cyan-600" />
            </div>
          </div>
          <p className="text-3xl font-semibold text-cyan-900">
            {reports.reduce((sum, r) => sum + r.clicks, 0).toLocaleString()}
          </p>
          <p className="text-sm text-slate-600 mt-1">Toplam Tıklama</p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-violet-50 to-white border-violet-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-violet-100 rounded-xl">
              <TrendingUp className="h-6 w-6 text-violet-600" />
            </div>
          </div>
          <p className="text-3xl font-semibold text-violet-900">
            {reports.reduce((sum, r) => sum + r.conversions, 0)}
          </p>
          <p className="text-sm text-slate-600 mt-1">Toplam Dönüşüm</p>
        </Card>
      </div>

      {/* Reports Table */}
      <Card className="border-blue-100">
        <Table>
          <TableHeader>
            <TableRow className="bg-blue-50">
              <TableHead>Müşteri</TableHead>
              <TableHead>Kampanya</TableHead>
              <TableHead>Tarih</TableHead>
              <TableHead>Harcama</TableHead>
              <TableHead>Gösterim</TableHead>
              <TableHead>Tıklama</TableHead>
              <TableHead>Dönüşüm</TableHead>
              <TableHead>TBM</TableHead>
              <TableHead>GBM</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-slate-600">
                  Henüz reklam raporu yok
                </TableCell>
              </TableRow>
            ) : (
              reports.map((report) => (
                <TableRow key={report.id} data-testid={`report-row-${report.id}`}>
                  <TableCell className="font-medium">{report.client_name}</TableCell>
                  <TableCell>{report.campaign_name}</TableCell>
                  <TableCell>{new Date(report.report_date).toLocaleDateString('tr-TR')}</TableCell>
                  <TableCell>${report.daily_spend.toFixed(2)}</TableCell>
                  <TableCell>{report.impressions.toLocaleString()}</TableCell>
                  <TableCell>{report.clicks.toLocaleString()}</TableCell>
                  <TableCell>{report.conversions}</TableCell>
                  <TableCell>${report.cpc.toFixed(2)}</TableCell>
                  <TableCell>${report.cpm.toFixed(2)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Add Report Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => {
        setShowDialog(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-2xl" data-testid="report-dialog">
          <DialogHeader>
            <DialogTitle>{tr.admin.adsReports.addReport}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Müşteri</Label>
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="campaign_name">{tr.admin.adsReports.campaignName}</Label>
                  <Input
                    id="campaign_name"
                    value={reportForm.campaign_name}
                    onChange={(e) => setReportForm({ ...reportForm, campaign_name: e.target.value })}
                    required
                    className="border-blue-200"
                    placeholder="Kampanya adı"
                    data-testid="campaign-name-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="report_date">{tr.admin.adsReports.reportDate}</Label>
                  <Input
                    id="report_date"
                    type="date"
                    value={reportForm.report_date}
                    onChange={(e) => setReportForm({ ...reportForm, report_date: e.target.value })}
                    required
                    className="border-blue-200"
                    data-testid="report-date-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="daily_spend">{tr.admin.adsReports.dailySpend}</Label>
                  <Input
                    id="daily_spend"
                    type="number"
                    step="0.01"
                    value={reportForm.daily_spend}
                    onChange={(e) => setReportForm({ ...reportForm, daily_spend: parseFloat(e.target.value) })}
                    onBlur={calculateMetrics}
                    required
                    className="border-blue-200"
                    data-testid="daily-spend-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="impressions">{tr.admin.adsReports.impressions}</Label>
                  <Input
                    id="impressions"
                    type="number"
                    value={reportForm.impressions}
                    onChange={(e) => setReportForm({ ...reportForm, impressions: parseInt(e.target.value) })}
                    onBlur={calculateMetrics}
                    required
                    className="border-blue-200"
                    data-testid="impressions-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clicks">{tr.admin.adsReports.clicks}</Label>
                  <Input
                    id="clicks"
                    type="number"
                    value={reportForm.clicks}
                    onChange={(e) => setReportForm({ ...reportForm, clicks: parseInt(e.target.value) })}
                    onBlur={calculateMetrics}
                    required
                    className="border-blue-200"
                    data-testid="clicks-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="conversions">{tr.admin.adsReports.conversions}</Label>
                  <Input
                    id="conversions"
                    type="number"
                    value={reportForm.conversions}
                    onChange={(e) => setReportForm({ ...reportForm, conversions: parseInt(e.target.value) })}
                    required
                    className="border-blue-200"
                    data-testid="conversions-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cpc">{tr.admin.adsReports.cpc}</Label>
                  <Input
                    id="cpc"
                    type="number"
                    step="0.01"
                    value={reportForm.cpc}
                    onChange={(e) => setReportForm({ ...reportForm, cpc: parseFloat(e.target.value) })}
                    className="border-blue-200"
                    data-testid="cpc-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cpm">{tr.admin.adsReports.cpm}</Label>
                  <Input
                    id="cpm"
                    type="number"
                    step="0.01"
                    value={reportForm.cpm}
                    onChange={(e) => setReportForm({ ...reportForm, cpm: parseFloat(e.target.value) })}
                    className="border-blue-200"
                    data-testid="cpm-input"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                {tr.common.cancel}
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" data-testid="submit-report-button">
                <Plus className="h-4 w-4 mr-2" />
                Ekle
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
