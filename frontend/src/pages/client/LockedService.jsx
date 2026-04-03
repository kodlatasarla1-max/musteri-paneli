import { Lock } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useNavigate } from 'react-router-dom';

export const LockedService = ({ serviceName, description }) => {
  const navigate = useNavigate();

  return (
    <div className="p-4 lg:p-8 max-w-[1600px] mx-auto" data-testid="locked-service-page">
      <div className="flex items-center gap-3 mb-6 lg:mb-8">
        <Lock className="h-6 w-6 lg:h-8 lg:w-8 text-slate-400" />
        <h1 className="text-2xl lg:text-4xl font-medium text-slate-900" data-testid="locked-service-title">{serviceName}</h1>
      </div>

      <Card className="p-8 lg:p-12 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-100 rounded-full mb-6">
          <Lock className="h-10 w-10 text-slate-400" />
        </div>

        <h2 className="text-xl lg:text-2xl font-medium text-slate-900 mb-4">
          Bu hizmet şu an aktif değil
        </h2>

        <p className="text-slate-600 mb-8 max-w-xl mx-auto text-sm lg:text-base">
          {description || 'Bu hizmet hesabınızda aktifleştirilmemiş. Daha fazla bilgi almak için hesap yöneticinizle iletişime geçin.'}
        </p>

        <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-5 lg:p-6 rounded-xl mb-8 max-w-lg mx-auto">
          <h3 className="text-lg font-medium text-slate-900 mb-2">Bu hizmeti almak ister misiniz?</h3>
          <p className="text-slate-600 text-sm">
            Ajansımızın sunduğu bu hizmeti aktifleştirmek için hesap yöneticinize ulaşabilirsiniz.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            size="lg"
            className="bg-slate-900 hover:bg-black"
            onClick={() => navigate('/client/receipts')}
            data-testid="request-offer-button"
          >
            Makbuz Yükle
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-slate-300"
            onClick={() => navigate('/client/profile')}
            data-testid="contact-button"
          >
            Profil Sayfasına Git
          </Button>
        </div>
      </Card>
    </div>
  );
};
