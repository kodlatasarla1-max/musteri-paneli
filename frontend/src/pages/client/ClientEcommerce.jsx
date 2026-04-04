import { ShoppingBag, CheckCircle, Package, TrendingUp, CreditCard } from 'lucide-react';

export const ClientEcommerce = () => {
  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-orange-100 rounded-lg">
            <ShoppingBag className="h-6 w-6 text-orange-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">E-ticaret Yönetimi</h1>
        </div>
        <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
          <CheckCircle className="h-4 w-4" />
          <span>Bu hizmet hesabınızda aktif</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <Package className="h-5 w-5 text-slate-500 mb-3" />
          <p className="text-sm text-slate-500">Ürün Yönetimi</p>
          <p className="text-lg font-semibold text-slate-800 mt-1">Katalog ve stok takibi</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <TrendingUp className="h-5 w-5 text-slate-500 mb-3" />
          <p className="text-sm text-slate-500">Satış Analizi</p>
          <p className="text-lg font-semibold text-slate-800 mt-1">Aylık satış raporları</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <CreditCard className="h-5 w-5 text-slate-500 mb-3" />
          <p className="text-sm text-slate-500">Ödeme Sistemleri</p>
          <p className="text-lg font-semibold text-slate-800 mt-1">Güvenli ödeme altyapısı</p>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
        <h2 className="font-semibold text-slate-800 mb-3">Bu hizmet kapsamında neler yapılıyor?</h2>
        <ul className="space-y-2 text-sm text-slate-600">
          <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span>E-ticaret mağazası kurulumu ve yapılandırması</span></li>
          <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span>Ürün yükleme ve kategori yönetimi</span></li>
          <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span>Ödeme ve kargo entegrasyonları</span></li>
          <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span>Satış performansı takibi ve raporlama</span></li>
        </ul>
      </div>
    </div>
  );
};
