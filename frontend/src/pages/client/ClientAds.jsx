import { BarChart3, CheckCircle, TrendingUp, Target, DollarSign } from 'lucide-react';

export const ClientAds = () => {
  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-purple-100 rounded-lg">
            <BarChart3 className="h-6 w-6 text-purple-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Meta Reklamları Yönetimi</h1>
        </div>
        <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
          <CheckCircle className="h-4 w-4" />
          <span>Bu hizmet hesabınızda aktif</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <Target className="h-5 w-5 text-slate-500 mb-3" />
          <p className="text-sm text-slate-500">Kampanya Yönetimi</p>
          <p className="text-lg font-semibold text-slate-800 mt-1">Ajansınız yönetiyor</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <TrendingUp className="h-5 w-5 text-slate-500 mb-3" />
          <p className="text-sm text-slate-500">Optimizasyon</p>
          <p className="text-lg font-semibold text-slate-800 mt-1">Haftalık optimizasyon</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <DollarSign className="h-5 w-5 text-slate-500 mb-3" />
          <p className="text-sm text-slate-500">Bütçe Takibi</p>
          <p className="text-lg font-semibold text-slate-800 mt-1">Şeffaf raporlama</p>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
        <h2 className="font-semibold text-slate-800 mb-3">Bu hizmet kapsamında neler yapılıyor?</h2>
        <ul className="space-y-2 text-sm text-slate-600">
          <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span>Facebook ve Instagram reklam kampanyası kurulumu</span></li>
          <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span>Hedef kitle belirleme ve optimizasyonu</span></li>
          <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span>Reklam metinleri ve görsel üretimi</span></li>
          <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span>Haftalık performans takibi ve aylık raporlama</span></li>
        </ul>
      </div>
    </div>
  );
};
