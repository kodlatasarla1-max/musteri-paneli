import { Share2, CheckCircle, Calendar, BarChart2, MessageSquare } from 'lucide-react';

export const ClientSocialMedia = () => {
  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Share2 className="h-6 w-6 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Sosyal Medya Yönetimi</h1>
        </div>
        <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
          <CheckCircle className="h-4 w-4" />
          <span>Bu hizmet hesabınızda aktif</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <Calendar className="h-5 w-5 text-slate-500 mb-3" />
          <p className="text-sm text-slate-500">İçerik Takvimi</p>
          <p className="text-lg font-semibold text-slate-800 mt-1">Ajansınız planlıyor</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <BarChart2 className="h-5 w-5 text-slate-500 mb-3" />
          <p className="text-sm text-slate-500">Raporlama</p>
          <p className="text-lg font-semibold text-slate-800 mt-1">Aylık rapor gönderilir</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <MessageSquare className="h-5 w-5 text-slate-500 mb-3" />
          <p className="text-sm text-slate-500">Destek</p>
          <p className="text-lg font-semibold text-slate-800 mt-1">Hesap yöneticiniz</p>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
        <h2 className="font-semibold text-slate-800 mb-3">Bu hizmet kapsamında neler yapılıyor?</h2>
        <ul className="space-y-2 text-sm text-slate-600">
          <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span>Instagram, Facebook ve diğer platformlar için içerik üretimi</span></li>
          <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span>Düzenli paylaşım takvimi oluşturma ve yönetimi</span></li>
          <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span>Topluluk yönetimi ve yorum takibi</span></li>
          <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span>Aylık performans raporlaması</span></li>
        </ul>
      </div>
    </div>
  );
};
