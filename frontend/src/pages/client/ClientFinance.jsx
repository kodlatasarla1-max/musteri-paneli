import { useState, useEffect } from 'react';
import { 
  Wallet, TrendingUp, TrendingDown, Plus, Download, Filter, 
  Calendar, Trash2, Edit2, ChevronDown, ChevronUp, BarChart3 
} from 'lucide-react';
import apiClient from '../../utils/api';
import { getUser } from '../../utils/auth';
import { toast } from 'sonner';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';

export const ClientFinance = () => {
  const user = getUser();
  const clientId = user?.client_id;
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [summary, setSummary] = useState({ total_income: 0, total_expense: 0, net_profit: 0, expense_by_category: {} });
  const [monthlySummary, setMonthlySummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [saving, setSaving] = useState(false);
  
  // Filters
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const [filterMonth, setFilterMonth] = useState('all');
  
  // Form
  const [form, setForm] = useState({
    transaction_type: 'expense',
    amount: '',
    transaction_date: new Date().toISOString().split('T')[0],
    category: '',
    description: ''
  });

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (clientId) {
      loadData();
    }
  }, [clientId, filterYear, filterMonth]);

  const loadCategories = async () => {
    try {
      const response = await apiClient.get('/client-finance/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterYear !== 'all') params.append('year', filterYear);
      if (filterMonth !== 'all') params.append('month', filterMonth);
      
      const [financeRes, monthlyRes] = await Promise.all([
        apiClient.get(`/client-finance/${clientId}?${params.toString()}`),
        apiClient.get(`/client-finance/${clientId}/monthly-summary?months=12`)
      ]);

      setTransactions(financeRes.data.transactions || []);
      setSummary(financeRes.data.summary || { total_income: 0, total_expense: 0, net_profit: 0, expense_by_category: {} });
      setMonthlySummary(monthlyRes.data || []);
    } catch (error) {
      console.error('Error loading finance data:', error);
      toast.error('Finans verileri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.amount || !form.category || !form.transaction_date) {
      toast.error('Lütfen zorunlu alanları doldurun');
      return;
    }

    setSaving(true);
    try {
      if (editingTransaction) {
        await apiClient.put(`/client-finance/${clientId}/${editingTransaction.id}`, form);
        toast.success('İşlem güncellendi');
      } else {
        await apiClient.post(`/client-finance/${clientId}`, form);
        toast.success('İşlem eklendi');
      }
      
      setShowAddDialog(false);
      setEditingTransaction(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving transaction:', error);
      toast.error('İşlem kaydedilemedi');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (transactionId) => {
    if (!confirm('Bu işlemi silmek istediğinize emin misiniz?')) return;
    
    try {
      await apiClient.delete(`/client-finance/${clientId}/${transactionId}`);
      toast.success('İşlem silindi');
      loadData();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error('İşlem silinemedi');
    }
  };

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
    setForm({
      transaction_type: transaction.transaction_type,
      amount: transaction.amount.toString(),
      transaction_date: transaction.transaction_date,
      category: transaction.category,
      description: transaction.description || ''
    });
    setShowAddDialog(true);
  };

  const resetForm = () => {
    setForm({
      transaction_type: 'expense',
      amount: '',
      transaction_date: new Date().toISOString().split('T')[0],
      category: '',
      description: ''
    });
  };

  const exportCSV = async () => {
    try {
      const params = new URLSearchParams();
      if (filterYear !== 'all') params.append('year', filterYear);
      if (filterMonth !== 'all') params.append('month', filterMonth);
      
      const response = await apiClient.get(`/client-finance/${clientId}/export?${params.toString()}`);
      const data = response.data.data;
      
      if (data.length === 0) {
        toast.error('Dışa aktarılacak veri yok');
        return;
      }
      
      // Convert to CSV
      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(h => `"${row[h] || ''}"`).join(','))
      ].join('\n');
      
      // Download
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `muhasebe_${filterYear}_${filterMonth !== 'all' ? filterMonth : 'tum'}.csv`;
      link.click();
      
      toast.success('CSV dosyası indirildi');
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Dışa aktarma başarısız');
    }
  };

  const getCategoryLabel = (categoryKey) => {
    const cat = categories.find(c => c.category_key === categoryKey);
    return cat?.name_tr || categoryKey;
  };

  const months = [
    { value: '1', label: 'Ocak' },
    { value: '2', label: 'Şubat' },
    { value: '3', label: 'Mart' },
    { value: '4', label: 'Nisan' },
    { value: '5', label: 'Mayıs' },
    { value: '6', label: 'Haziran' },
    { value: '7', label: 'Temmuz' },
    { value: '8', label: 'Ağustos' },
    { value: '9', label: 'Eylül' },
    { value: '10', label: 'Ekim' },
    { value: '11', label: 'Kasım' },
    { value: '12', label: 'Aralık' }
  ];

  const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString());

  const incomeCategories = categories.filter(c => c.category_type === 'income' || c.category_type === 'both');
  const expenseCategories = categories.filter(c => c.category_type === 'expense' || c.category_type === 'both');

  // Simple bar chart representation
  const maxValue = Math.max(...monthlySummary.map(m => Math.max(m.income, m.expense)), 1);

  if (loading) {
    return (
      <div className="p-4 lg:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-blue-100 rounded w-1/4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-blue-50 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-[1400px] mx-auto" data-testid="client-finance">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-medium text-slate-900">Muhasebe</h1>
          <p className="text-sm text-slate-600 mt-1">Gelir ve giderlerinizi takip edin</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">CSV İndir</span>
          </Button>
          <Button onClick={() => { resetForm(); setEditingTransaction(null); setShowAddDialog(true); }} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">İşlem Ekle</span>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-6 mb-6">
        <Card className="p-4 lg:p-6 bg-gradient-to-br from-emerald-50 to-white border-emerald-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 lg:p-3 bg-emerald-100 rounded-lg">
              <TrendingUp className="h-5 w-5 lg:h-6 lg:w-6 text-emerald-600" />
            </div>
          </div>
          <p className="text-2xl lg:text-3xl font-semibold text-emerald-900">
            ₺{summary.total_income.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-sm text-slate-600 mt-1">Toplam Gelir</p>
        </Card>

        <Card className="p-4 lg:p-6 bg-gradient-to-br from-red-50 to-white border-red-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 lg:p-3 bg-red-100 rounded-lg">
              <TrendingDown className="h-5 w-5 lg:h-6 lg:w-6 text-red-600" />
            </div>
          </div>
          <p className="text-2xl lg:text-3xl font-semibold text-red-900">
            ₺{summary.total_expense.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-sm text-slate-600 mt-1">Toplam Gider</p>
        </Card>

        <Card className={`p-4 lg:p-6 bg-gradient-to-br ${summary.net_profit >= 0 ? 'from-blue-50 to-white border-blue-100' : 'from-orange-50 to-white border-orange-100'}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 lg:p-3 rounded-lg ${summary.net_profit >= 0 ? 'bg-blue-100' : 'bg-orange-100'}`}>
              <Wallet className={`h-5 w-5 lg:h-6 lg:w-6 ${summary.net_profit >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
            </div>
          </div>
          <p className={`text-2xl lg:text-3xl font-semibold ${summary.net_profit >= 0 ? 'text-blue-900' : 'text-orange-900'}`}>
            ₺{summary.net_profit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-sm text-slate-600 mt-1">Net Kar</p>
        </Card>
      </div>

      {/* Monthly Chart */}
      {monthlySummary.length > 0 && (
        <Card className="p-4 lg:p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <h3 className="font-medium text-slate-900">Aylık Özet (Son 12 Ay)</h3>
          </div>
          <div className="overflow-x-auto">
            <div className="flex gap-2 min-w-[600px] pb-4">
              {monthlySummary.map((month) => (
                <div key={month.month} className="flex-1 min-w-[60px]">
                  <div className="h-32 flex items-end gap-1 mb-2">
                    <div 
                      className="flex-1 bg-emerald-400 rounded-t transition-all"
                      style={{ height: `${(month.income / maxValue) * 100}%`, minHeight: month.income > 0 ? '4px' : '0' }}
                      title={`Gelir: ₺${month.income.toLocaleString('tr-TR')}`}
                    />
                    <div 
                      className="flex-1 bg-red-400 rounded-t transition-all"
                      style={{ height: `${(month.expense / maxValue) * 100}%`, minHeight: month.expense > 0 ? '4px' : '0' }}
                      title={`Gider: ₺${month.expense.toLocaleString('tr-TR')}`}
                    />
                  </div>
                  <p className="text-xs text-center text-slate-500 truncate">
                    {month.month.split('-')[1]}/{month.month.split('-')[0].slice(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-center gap-6 mt-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-emerald-400 rounded"></div>
              <span className="text-xs text-slate-600">Gelir</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-400 rounded"></div>
              <span className="text-xs text-slate-600">Gider</span>
            </div>
          </div>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-500" />
          <span className="text-sm text-slate-600">Filtrele:</span>
        </div>
        <Select value={filterYear} onValueChange={setFilterYear}>
          <SelectTrigger className="w-full sm:w-28">
            <SelectValue placeholder="Yıl" />
          </SelectTrigger>
          <SelectContent>
            {years.map(year => (
              <SelectItem key={year} value={year}>{year}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterMonth} onValueChange={setFilterMonth}>
          <SelectTrigger className="w-full sm:w-32">
            <SelectValue placeholder="Ay" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Aylar</SelectItem>
            {months.map(m => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Transactions */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-4 bg-slate-100">
          <TabsTrigger value="all">Tümü ({transactions.length})</TabsTrigger>
          <TabsTrigger value="income">Gelir ({transactions.filter(t => t.transaction_type === 'income').length})</TabsTrigger>
          <TabsTrigger value="expense">Gider ({transactions.filter(t => t.transaction_type === 'expense').length})</TabsTrigger>
        </TabsList>

        {['all', 'income', 'expense'].map(tab => (
          <TabsContent key={tab} value={tab}>
            {transactions.filter(t => tab === 'all' || t.transaction_type === tab).length === 0 ? (
              <Card className="p-8 lg:p-12 text-center">
                <Wallet className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">Henüz işlem yok</h3>
                <p className="text-slate-600 mb-4">İlk işleminizi ekleyerek başlayın.</p>
                <Button onClick={() => { resetForm(); setShowAddDialog(true); }} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  İşlem Ekle
                </Button>
              </Card>
            ) : (
              <div className="space-y-2">
                {transactions
                  .filter(t => tab === 'all' || t.transaction_type === tab)
                  .map((transaction) => (
                    <Card key={transaction.id} className="p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${transaction.transaction_type === 'income' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                          {transaction.transaction_type === 'income' ? (
                            <TrendingUp className="h-5 w-5 text-emerald-600" />
                          ) : (
                            <TrendingDown className="h-5 w-5 text-red-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-slate-900">{getCategoryLabel(transaction.category)}</span>
                            <span className="text-xs text-slate-400">•</span>
                            <span className="text-sm text-slate-500">
                              {new Date(transaction.transaction_date).toLocaleDateString('tr-TR')}
                            </span>
                          </div>
                          {transaction.description && (
                            <p className="text-sm text-slate-600 truncate">{transaction.description}</p>
                          )}
                        </div>
                        <div className="text-right flex items-center gap-2">
                          <p className={`font-semibold ${transaction.transaction_type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                            {transaction.transaction_type === 'income' ? '+' : '-'}₺{parseFloat(transaction.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                          </p>
                          <div className="flex gap-1">
                            <button 
                              onClick={() => handleEdit(transaction)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleDelete(transaction.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
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
          </TabsContent>
        ))}
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTransaction ? 'İşlemi Düzenle' : 'Yeni İşlem Ekle'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>İşlem Türü</Label>
              <Tabs value={form.transaction_type} onValueChange={(v) => setForm({ ...form, transaction_type: v, category: '' })}>
                <TabsList className="w-full">
                  <TabsTrigger value="income" className="flex-1">Gelir</TabsTrigger>
                  <TabsTrigger value="expense" className="flex-1">Gider</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Tutar (₺) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Kategori *</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Kategori seçin" />
                </SelectTrigger>
                <SelectContent>
                  {(form.transaction_type === 'income' ? incomeCategories : expenseCategories).map(cat => (
                    <SelectItem key={cat.category_key} value={cat.category_key}>
                      {cat.name_tr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transaction_date">Tarih *</Label>
              <Input
                id="transaction_date"
                type="date"
                value={form.transaction_date}
                onChange={(e) => setForm({ ...form, transaction_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Açıklama</Label>
              <Input
                id="description"
                placeholder="İsteğe bağlı açıklama"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => { setShowAddDialog(false); setEditingTransaction(null); }}
                className="flex-1"
              >
                İptal
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
