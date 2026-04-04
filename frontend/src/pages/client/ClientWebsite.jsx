import { Globe, CheckCircle, Monitor, Search, Zap } from 'lucide-react';

export const ClientWebsite = () => {
  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-green-100 rounded-lg">
            <Globe className="h-6 w-6 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Web Sitesi Kurulumu</h1>
        </div>
        <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
          <CheckCircle className="h-4 w-4" />
          <span>Bu hizmet hesabınızda aktif</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <Monitor className="h-5 w-5 text-slate-500 mb-3" />
          <p className="text-sm text-slate-500">Tasarım</p>
          <p className="text-lg font-semibold text-slate-800 mt-1">Modern & Responsive</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <Search className="h-5 w-5 text-slate-500 mb-3" />
          <p className="text-sm text-slate-500">SEO</p>
          <p className="text-lg font-semibold text-slate-800 mt-1">Arama motoru optimizasyonu</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <Zap className="h-5 w-5 text-slate-500 mb-3" />
          <p className="text-sm text-slate-500">Hız</p>
          <p className="text-lg font-semibold text-slate-800 mt-1">Yüksek performanslı altyapı</p>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
        <h2 className="font-semibold text-slate-800 mb-3">Bu hizmet kapsamında neler yapılıyor?</h2>
        <ul className="space-y-2 text-sm text-slate-600">
          <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span>Kurumsal web sitesi tasarımı ve geliştirmesi</span></li>
          <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span>Mobil uyumlu (responsive) arayüz</span></li>
          <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span>Temel SEO optimizasyonu</span></li>
          <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span>Domain ve hosting yönetimi</span></li>
        </ul>
      </div>
    </div>
  );
};
