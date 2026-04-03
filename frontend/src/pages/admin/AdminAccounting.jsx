import { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, Wallet, BarChart3, Download, Filter,
  Users, ArrowUpRight, ArrowDownRight, Search, ChevronDown, ChevronUp,
  RefreshCw, Plus, Tag, Building2, FileText, Edit2, Trash2, X
} from 'lucide-react';
import apiClient from '../../utils/api';
import { toast } from 'sonner';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';

const fmt = (n) => `₺${parseFloat(n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;

const MONTHS = [
  { value: '1', label: 'Ocak' }, { value: '2', label: 'Şubat' },
  { value: '3', label: 'Mart' }, { value: '4', label: 'Nisan' },
  { value: '5', label: 'Mayıs' }, { value: '6', label: 'Haziran' },
  { value: '7', label: 'Temmuz' }, { value: '8', label: 'Ağustos' },
  { value: '9', label: 'Eylül' }, { value: '10', label: 'Ekim' },
  { value: '11', label: 'Kasım' }, { value: '12', label: 'Aralık' },
];

const YEARS = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString());

const monthLabel = (key) => {
  const [y, m] = key.split('-');
  const monthName = MONTHS.find(mo => mo.value === String(parseInt(m)))?.label || m;
  return `${monthName} ${y}`;
};

const EMPTY_FORM = {
  client_id: '',
  transaction_type: 'income',
  amount: '',
  transaction_date: new Date().toISOString().split('T')[0],
  category: '',
  description: '',
};

export const AdminAccounting = () => {
  const [overview, setOverview] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [clients, setClients] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Filters
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterClient, setFilterClient] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [search, setSearch] = useState('');

  // Client table sort
  const [sortField, setSortField] = useState('net');
  const [sortDir, setSortDir] = useState('desc');

  // Dialog state
  const [showDialog, setShowDialog] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadClients();
    loadCategories();
  }, []);

  useEffect(() => {
    loadOverview();
  }, [filterYear, filterMonth]);

  useEffect(() => {
    if (activeTab === 'transactions') {
      loadTransactions();
    }
  }, [activeTab, filterYear, filterMonth, filterClient, filterType]);

  const loadClients = async () => {
    try {
      const res = await apiClient.get('/admin/finance/clients-list');
      setClients(res.data || []);
    } catch (e) {
      console.error('Clients load error:', e);
    }
  };

  const loadCategories = async () => {
    try {
      const res = await apiClient.get('/client-finance/categories');
      setCategories(res.data || []);
    } catch (e) {
      console.error('Categories load error:', e);
    }
  };

  const loadOverview = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterYear !== 'all') params.append('year', filterYear);
      if (filterMonth !== 'all') params.append('month', filterMonth);
      const res = await apiClient.get(`/admin/finance/overview?${params.toString()}`);
      setOverview(res.data);
    } catch (e) {
      console.error('Overview load error:', e);
      toast.error('Muhasebe verisi yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    setTxLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterYear !== 'all') params.append('year', filterYear);
      if (filterMonth !== 'all') params.append('month', filterMonth);
      if (filterClient !== 'all') params.append('client_id', filterClient);
      if (filterType !== 'all') params.append('transaction_type', filterType);
      const res = await apiClient.get(`/admin/finance/transactions?${params.toString()}`);
      setTransactions(res.data || []);
    } catch (e) {
      console.error('Transactions load error:', e);
      toast.error('İşlemler yüklenemedi');
    } finally {
      setTxLoading(false);
    }
  };

  const openAddDialog = () => {
    setEditingTx(null);
    setForm(EMPTY_FORM);
    setShowDialog(true);
  };

  const openEditDialog = (tx) => {
    setEditingTx(tx);
    setForm({
      client_id: tx.client_id,
      transaction_type: tx.transaction_type,
      amount: String(tx.amount),
      transaction_date: tx.transaction_date,
      category: tx.category,
      description: tx.description || '',
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.client_id) { toast.error('Lütfen müşteri seçin'); return; }
    if (!form.amount || parseFloat(form.amount) <= 0) { toast.error('Geçerli bir tutar girin'); return; }
    if (!form.category) { toast.error('Kategori seçin'); return; }
    if (!form.transaction_date) { toast.error('Tarih girin'); return; }

    setSaving(true);
    try {
      const payload = {
        transaction_type: form.transaction_type,
        amount: parseFloat(form.amount),
        transaction_date: form.transaction_date,
        category: form.category,
        description: form.description || null,
      };

      if (editingTx) {
        await apiClient.put(`/client-finance/${form.client_id}/${editingTx.id}`, payload);
        toast.success('İşlem güncellendi');
      } else {
        await apiClient.post(`/client-finance/${form.client_id}`, payload);
        toast.success('İşlem eklendi');
      }

      setShowDialog(false);
      loadOverview();
      if (activeTab === 'transactions') loadTransactions();
    } catch (e) {
      console.error('Save error:', e);
      toast.error(editingTx ? 'İşlem güncellenemedi' : 'İşlem eklenemedi');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tx) => {
    if (!window.confirm(`"${getCategoryLabel(tx.category)}" işlemini silmek istediğinize emin misiniz?`)) return;
    try {
      await apiClient.delete(`/client-finance/${tx.client_id}/${tx.id}`);
      toast.success('İşlem silindi');
      loadOverview();
      if (activeTab === 'transactions') loadTransactions();
    } catch (e) {
      console.error('Delete error:', e);
      toast.error('İşlem silinemedi');
    }
  };

  const getCategoryLabel = (key) => {
    const c = categories.find(c => c.category_key === key);
    return c?.name_tr || key;
  };

  const exportCSV = () => {
    const data = filteredTransactions;
    if (!data.length) { toast.error('Dışa aktarılacak veri yok'); return; }
    const headers = ['Tarih', 'Müşteri', 'Tür', 'Kategori', 'Tutar', 'Açıklama'];
    const rows = data.map(t => [
      t.transaction_date,
      t.clients?.company_name || '',
      t.transaction_type === 'income' ? 'Gelir' : 'Gider',
      getCategoryLabel(t.category),
      parseFloat(t.amount).toFixed(2),
      t.description || ''
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `muhasebe_${filterYear}_${filterMonth !== 'all' ? filterMonth : 'tum'}.csv`;
    link.click();
    toast.success('CSV indirildi');
  };

  const sortedClients = useMemo(() => {
    const list = [...(overview?.client_summary || [])];
    list.sort((a, b) => {
      const av = a[sortField] ?? 0;
      const bv = b[sortField] ?? 0;
      return sortDir === 'desc' ? bv - av : av - bv;
    });
    return list;
  }, [overview, sortField, sortDir]);

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronDown className="h-3 w-3 text-slate-300" />;
    return sortDir === 'desc'
      ? <ChevronDown className="h-3 w-3 text-slate-700" />
      : <ChevronUp className="h-3 w-3 text-slate-700" />;
  };

  const filteredTransactions = useMemo(() => {
    if (!search) return transactions;
    const q = search.toLowerCase();
    return transactions.filter(t =>
      (t.clients?.company_name || '').toLowerCase().includes(q) ||
      (t.description || '').toLowerCase().includes(q) ||
      getCategoryLabel(t.category).toLowerCase().includes(q)
    );
  }, [transactions, search, categories]);

  const maxMonthly = useMemo(() => {
    const vals = (overview?.monthly_trend || []).flatMap(m => [m.income, m.expense]);
    return Math.max(...vals, 1);
  }, [overview]);

  // Filtered categories for form
  const formCategories = useMemo(() => {
    return categories.filter(c =>
      c.category_type === form.transaction_type || c.category_type === 'both'
    );
  }, [categories, form.transaction_type]);

  if (loading && !overview) {
    return (
      <div className="p-6 lg:p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-1/3" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-slate-100 rounded-xl" />)}
          </div>
          <div className="h-64 bg-slate-100 rounded-xl" />
        </div>
      </div>
    );
  }

  const summary = overview?.summary || {};

  return (
    <div className="p-4 lg:p-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-semibold text-slate-900">Muhasebe</h1>
          <p className="text-sm text-slate-500 mt-1">Tüm müşterilerin gelir ve gider takibi</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { loadOverview(); if (activeTab === 'transactions') loadTransactions(); }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Yenile
          </Button>
          {activeTab === 'transactions' && (
            <Button variant="outline" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
          )}
          <Button onClick={openAddDialog} className="bg-slate-900 hover:bg-black">
            <Plus className="h-4 w-4 mr-2" />
            Yeni İşlem
          </Button>
        </div>
      </div>

      {/* Global Filters */}
      <div className="flex flex-wrap gap-3 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Filter className="h-4 w-4" />
          <span className="font-medium">Dönem:</span>
        </div>
        <Select value={filterYear} onValueChange={setFilterYear}>
          <SelectTrigger className="w-28 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Yıllar</SelectItem>
            {YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterMonth} onValueChange={setFilterMonth}>
          <SelectTrigger className="w-36 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Aylar</SelectItem>
            {MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <Card className="p-4 lg:p-5 bg-gradient-to-br from-emerald-50 to-white border-emerald-100">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
            <ArrowUpRight className="h-4 w-4 text-emerald-500 mt-1" />
          </div>
          <p className="text-xl lg:text-2xl font-bold text-emerald-900">{fmt(summary.total_income)}</p>
          <p className="text-xs text-slate-500 mt-1">Toplam Gelir</p>
        </Card>

        <Card className="p-4 lg:p-5 bg-gradient-to-br from-red-50 to-white border-red-100">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <TrendingDown className="h-5 w-5 text-red-600" />
            </div>
            <ArrowDownRight className="h-4 w-4 text-red-500 mt-1" />
          </div>
          <p className="text-xl lg:text-2xl font-bold text-red-900">{fmt(summary.total_expense)}</p>
          <p className="text-xs text-slate-500 mt-1">Toplam Gider</p>
        </Card>

        <Card className={`p-4 lg:p-5 bg-gradient-to-br border ${(summary.net_profit || 0) >= 0 ? 'from-blue-50 to-white border-blue-100' : 'from-orange-50 to-white border-orange-100'}`}>
          <div className="flex items-start justify-between mb-3">
            <div className={`p-2 rounded-lg ${(summary.net_profit || 0) >= 0 ? 'bg-blue-100' : 'bg-orange-100'}`}>
              <Wallet className={`h-5 w-5 ${(summary.net_profit || 0) >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
            </div>
          </div>
          <p className={`text-xl lg:text-2xl font-bold ${(summary.net_profit || 0) >= 0 ? 'text-blue-900' : 'text-orange-900'}`}>
            {fmt(summary.net_profit)}
          </p>
          <p className="text-xs text-slate-500 mt-1">Net Kar / Zarar</p>
        </Card>

        <Card className="p-4 lg:p-5 bg-gradient-to-br from-slate-50 to-white border-slate-200">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 bg-slate-200 rounded-lg">
              <Users className="h-5 w-5 text-slate-600" />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <p className="text-xl lg:text-2xl font-bold text-slate-900">{summary.client_count || 0}</p>
            <p className="text-xs text-slate-500 mb-1">müşteri</p>
          </div>
          <p className="text-xs text-slate-500 mt-1">{summary.transaction_count || 0} toplam işlem</p>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 bg-slate-100">
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Genel Bakış
          </TabsTrigger>
          <TabsTrigger value="clients" className="gap-2">
            <Building2 className="h-4 w-4" />
            Müşteri Bazlı
          </TabsTrigger>
          <TabsTrigger value="transactions" className="gap-2">
            <FileText className="h-4 w-4" />
            İşlemler
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-2">
            <Tag className="h-4 w-4" />
            Kategoriler
          </TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview">
          <Card className="p-4 lg:p-6 mb-6">
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="h-5 w-5 text-slate-700" />
              <h2 className="font-semibold text-slate-900">Aylık Gelir / Gider Trendi</h2>
            </div>
            {(overview?.monthly_trend || []).length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>Bu dönemde veri yok</p>
                <Button onClick={openAddDialog} className="mt-4 bg-slate-900 hover:bg-black">
                  <Plus className="h-4 w-4 mr-2" />İlk İşlemi Ekle
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="flex gap-3 min-w-[500px] pb-4 items-end" style={{ height: 200 }}>
                  {(overview?.monthly_trend || []).map((m) => {
                    const incH = (m.income / maxMonthly) * 150;
                    const expH = (m.expense / maxMonthly) * 150;
                    return (
                      <div key={m.month} className="flex-1 min-w-[50px] flex flex-col items-center gap-1">
                        <div className="w-full flex items-end justify-center gap-1" style={{ height: 160 }}>
                          <div
                            className="flex-1 bg-emerald-400 rounded-t-md transition-all hover:bg-emerald-500 cursor-default"
                            style={{ height: incH > 0 ? Math.max(incH, 4) : 0 }}
                            title={`Gelir: ${fmt(m.income)}`}
                          />
                          <div
                            className="flex-1 bg-red-400 rounded-t-md transition-all hover:bg-red-500 cursor-default"
                            style={{ height: expH > 0 ? Math.max(expH, 4) : 0 }}
                            title={`Gider: ${fmt(m.expense)}`}
                          />
                        </div>
                        <p className="text-[10px] text-slate-500 text-center truncate w-full">
                          {monthLabel(m.month)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="flex items-center justify-center gap-8 mt-2 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-400 rounded" />
                <span className="text-xs text-slate-600">Gelir</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-400 rounded" />
                <span className="text-xs text-slate-600">Gider</span>
              </div>
            </div>
          </Card>

          <Card className="p-4 lg:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-slate-700" />
              <h2 className="font-semibold text-slate-900">En Yüksek Ciro — İlk 5 Müşteri</h2>
            </div>
            <div className="space-y-3">
              {(overview?.client_summary || []).slice(0, 5).map((c, idx) => {
                const maxIncome = Math.max(...(overview?.client_summary || []).map(x => x.income), 1);
                const pct = (c.income / maxIncome) * 100;
                return (
                  <div key={c.client_id} className="flex items-center gap-3">
                    <span className="text-slate-400 text-xs w-5 text-right">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-slate-800 truncate">{c.company_name}</span>
                        <span className="text-sm font-semibold text-emerald-700 ml-2">{fmt(c.income)}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
              {(overview?.client_summary || []).length === 0 && (
                <div className="text-center py-8">
                  <p className="text-slate-400 text-sm mb-4">Henüz işlem kaydedilmemiş</p>
                  <Button onClick={openAddDialog} className="bg-slate-900 hover:bg-black">
                    <Plus className="h-4 w-4 mr-2" />Yeni İşlem Ekle
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* CLIENT TAB */}
        <TabsContent value="clients">
          <Card className="overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-slate-700" />
                <h2 className="font-semibold text-slate-900">Müşteri Bazlı Muhasebe</h2>
              </div>
              <Badge variant="secondary">{sortedClients.length} müşteri</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Müşteri</th>
                    {[
                      { field: 'income', label: 'Gelir' },
                      { field: 'expense', label: 'Gider' },
                      { field: 'net', label: 'Net' },
                      { field: 'transaction_count', label: 'İşlem' },
                    ].map(({ field, label }) => (
                      <th
                        key={field}
                        className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer hover:text-slate-700 select-none"
                        onClick={() => toggleSort(field)}
                      >
                        <div className="flex items-center justify-end gap-1">
                          {label} <SortIcon field={field} />
                        </div>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Kar Oranı</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedClients.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400">
                        <Building2 className="h-8 w-8 mx-auto mb-3 opacity-30" />
                        <p className="mb-4">Bu dönemde müşteri verisi yok</p>
                        <Button onClick={openAddDialog} className="bg-slate-900 hover:bg-black">
                          <Plus className="h-4 w-4 mr-2" />Yeni İşlem Ekle
                        </Button>
                      </td>
                    </tr>
                  ) : sortedClients.map((c) => {
                    const margin = c.income > 0 ? ((c.net / c.income) * 100) : 0;
                    return (
                      <tr key={c.client_id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-slate-900">{c.company_name}</p>
                            {c.contact_name && <p className="text-xs text-slate-400">{c.contact_name}</p>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-emerald-700">{fmt(c.income)}</td>
                        <td className="px-4 py-3 text-right font-medium text-red-600">{fmt(c.expense)}</td>
                        <td className={`px-4 py-3 text-right font-semibold ${c.net >= 0 ? 'text-blue-700' : 'text-orange-600'}`}>{fmt(c.net)}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{c.transaction_count}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${margin >= 0 ? 'bg-blue-400' : 'bg-orange-400'}`}
                                style={{ width: `${Math.min(Math.abs(margin), 100)}%` }}
                              />
                            </div>
                            <span className={`text-xs font-medium w-12 text-right ${margin >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                              %{margin.toFixed(1)}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {sortedClients.length > 0 && (
                  <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                    <tr>
                      <td className="px-4 py-3 font-semibold text-slate-700">TOPLAM</td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-700">{fmt(summary.total_income)}</td>
                      <td className="px-4 py-3 text-right font-bold text-red-600">{fmt(summary.total_expense)}</td>
                      <td className={`px-4 py-3 text-right font-bold ${(summary.net_profit || 0) >= 0 ? 'text-blue-700' : 'text-orange-600'}`}>{fmt(summary.net_profit)}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-700">{summary.transaction_count || 0}</td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* TRANSACTIONS TAB */}
        <TabsContent value="transactions">
          <div className="flex flex-wrap gap-3 mb-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <Select value={filterClient} onValueChange={setFilterClient}>
              <SelectTrigger className="w-52 h-9">
                <SelectValue placeholder="Tüm Müşteriler" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Müşteriler</SelectItem>
                {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-36 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                <SelectItem value="income">Gelir</SelectItem>
                <SelectItem value="expense">Gider</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                className="pl-9 h-9"
                placeholder="Müşteri, kategori veya açıklama ara..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {txLoading ? (
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}
            </div>
          ) : filteredTransactions.length === 0 ? (
            <Card className="p-12 text-center">
              <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <h3 className="font-medium text-slate-700 mb-1">İşlem bulunamadı</h3>
              <p className="text-sm text-slate-500 mb-4">Filtre kriterlerinizi değiştirin veya yeni işlem ekleyin</p>
              <Button onClick={openAddDialog} className="bg-slate-900 hover:bg-black">
                <Plus className="h-4 w-4 mr-2" />Yeni İşlem Ekle
              </Button>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredTransactions.map(t => (
                <Card key={t.id} className="px-4 py-3 hover:bg-slate-50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg flex-shrink-0 ${t.transaction_type === 'income' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                      {t.transaction_type === 'income'
                        ? <TrendingUp className="h-4 w-4 text-emerald-600" />
                        : <TrendingDown className="h-4 w-4 text-red-600" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-slate-800 text-sm">{t.clients?.company_name || '—'}</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{getCategoryLabel(t.category)}</span>
                        {t.description && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="text-xs text-slate-500 truncate max-w-xs">{t.description}</span>
                          </>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(t.transaction_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className={`font-bold text-sm flex-shrink-0 ${t.transaction_type === 'income' ? 'text-emerald-700' : 'text-red-600'}`}>
                        {t.transaction_type === 'income' ? '+' : '-'}{fmt(t.amount)}
                      </p>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditDialog(t)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Düzenle"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(t)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Sil"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {filteredTransactions.length > 0 && (
            <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Toplam:</span>
                <span className="font-semibold text-slate-900">{filteredTransactions.length} işlem</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-600">↑ Gelir:</span>
                <span className="font-semibold text-emerald-700">
                  {fmt(filteredTransactions.filter(t => t.transaction_type === 'income').reduce((s, t) => s + parseFloat(t.amount), 0))}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-red-600">↓ Gider:</span>
                <span className="font-semibold text-red-700">
                  {fmt(filteredTransactions.filter(t => t.transaction_type === 'expense').reduce((s, t) => s + parseFloat(t.amount), 0))}
                </span>
              </div>
            </div>
          )}
        </TabsContent>

        {/* CATEGORIES TAB */}
        <TabsContent value="categories">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-4 lg:p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                <h2 className="font-semibold text-slate-900">Gelir Kategorileri</h2>
              </div>
              {(() => {
                const items = (overview?.category_breakdown || []).filter(c => c.income > 0).sort((a, b) => b.income - a.income);
                const maxVal = Math.max(...items.map(c => c.income), 1);
                return items.length === 0
                  ? <p className="text-slate-400 text-sm text-center py-8">Bu dönemde gelir kaydı yok</p>
                  : items.map(c => (
                    <div key={c.category} className="mb-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-slate-700">{getCategoryLabel(c.category)}</span>
                        <span className="text-sm font-semibold text-emerald-700">{fmt(c.income)}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${(c.income / maxVal) * 100}%` }} />
                      </div>
                    </div>
                  ));
              })()}
            </Card>

            <Card className="p-4 lg:p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingDown className="h-5 w-5 text-red-600" />
                <h2 className="font-semibold text-slate-900">Gider Kategorileri</h2>
              </div>
              {(() => {
                const items = (overview?.category_breakdown || []).filter(c => c.expense > 0).sort((a, b) => b.expense - a.expense);
                const maxVal = Math.max(...items.map(c => c.expense), 1);
                return items.length === 0
                  ? <p className="text-slate-400 text-sm text-center py-8">Bu dönemde gider kaydı yok</p>
                  : items.map(c => (
                    <div key={c.category} className="mb-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-slate-700">{getCategoryLabel(c.category)}</span>
                        <span className="text-sm font-semibold text-red-600">{fmt(c.expense)}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-red-400 rounded-full" style={{ width: `${(c.expense / maxVal) * 100}%` }} />
                      </div>
                    </div>
                  ));
              })()}
            </Card>

            <Card className="lg:col-span-2 p-4 lg:p-6">
              <div className="flex items-center gap-2 mb-4">
                <Tag className="h-5 w-5 text-slate-600" />
                <h2 className="font-semibold text-slate-900">Kategori Özeti</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="pb-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Kategori</th>
                      <th className="pb-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Gelir</th>
                      <th className="pb-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Gider</th>
                      <th className="pb-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Net</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(overview?.category_breakdown || [])
                      .sort((a, b) => (b.income + b.expense) - (a.income + a.expense))
                      .map(c => {
                        const net = c.income - c.expense;
                        return (
                          <tr key={c.category} className="hover:bg-slate-50">
                            <td className="py-2.5 text-slate-700">{getCategoryLabel(c.category)}</td>
                            <td className="py-2.5 text-right text-emerald-700 font-medium">{c.income > 0 ? fmt(c.income) : '—'}</td>
                            <td className="py-2.5 text-right text-red-600 font-medium">{c.expense > 0 ? fmt(c.expense) : '—'}</td>
                            <td className={`py-2.5 text-right font-semibold ${net >= 0 ? 'text-blue-700' : 'text-orange-600'}`}>{fmt(net)}</td>
                          </tr>
                        );
                      })}
                    {(overview?.category_breakdown || []).length === 0 && (
                      <tr><td colSpan={4} className="text-center py-8 text-slate-400">Kategori verisi yok</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add / Edit Transaction Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) setShowDialog(false); }}>
        <DialogContent className="sm:max-w-lg" aria-describedby="accounting-dialog-desc">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingTx ? <Edit2 className="h-5 w-5 text-blue-600" /> : <Plus className="h-5 w-5 text-emerald-600" />}
              {editingTx ? 'İşlemi Düzenle' : 'Yeni İşlem Ekle'}
            </DialogTitle>
            <DialogDescription id="accounting-dialog-desc">
              {editingTx ? 'Mevcut işlemi güncelleyin.' : 'Müşteri için gelir veya gider kaydı oluşturun.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Client select */}
            <div className="space-y-1.5">
              <Label>Müşteri *</Label>
              <Select
                value={form.client_id}
                onValueChange={v => setForm({ ...form, client_id: v })}
                disabled={!!editingTx}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Müşteri seçin" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editingTx && <p className="text-xs text-slate-400">Düzenleme sırasında müşteri değiştirilemez</p>}
            </div>

            {/* Type toggle */}
            <div className="space-y-1.5">
              <Label>İşlem Türü *</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, transaction_type: 'income', category: '' })}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                    form.transaction_type === 'income'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  <TrendingUp className="h-4 w-4" />
                  Gelir
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, transaction_type: 'expense', category: '' })}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                    form.transaction_type === 'expense'
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  <TrendingDown className="h-4 w-4" />
                  Gider
                </button>
              </div>
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <Label htmlFor="amount">Tutar (₺) *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">₺</span>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0,00"
                  className="pl-8"
                  value={form.amount}
                  onChange={e => setForm({ ...form, amount: e.target.value })}
                />
              </div>
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label>Kategori *</Label>
              <Select
                value={form.category}
                onValueChange={v => setForm({ ...form, category: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Kategori seçin" />
                </SelectTrigger>
                <SelectContent>
                  {formCategories.length === 0 ? (
                    <SelectItem value="_" disabled>Kategori bulunamadı</SelectItem>
                  ) : formCategories.map(c => (
                    <SelectItem key={c.category_key} value={c.category_key}>{c.name_tr}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <Label htmlFor="tx-date">Tarih *</Label>
              <Input
                id="tx-date"
                type="date"
                value={form.transaction_date}
                onChange={e => setForm({ ...form, transaction_date: e.target.value })}
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="tx-desc">Açıklama</Label>
              <Input
                id="tx-desc"
                placeholder="İsteğe bağlı not veya açıklama"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowDialog(false)}
                disabled={saving}
              >
                İptal
              </Button>
              <Button
                className={`flex-1 ${form.transaction_type === 'income' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Kaydediliyor...' : editingTx ? 'Güncelle' : form.transaction_type === 'income' ? 'Gelir Ekle' : 'Gider Ekle'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
