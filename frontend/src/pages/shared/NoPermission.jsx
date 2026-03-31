import { ShieldOff, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';

export const NoPermission = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4" data-testid="no-permission-page">
      <Card className="max-w-md w-full p-8 text-center border-red-100">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldOff className="h-8 w-8 text-red-600" />
        </div>
        
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">
          Erişim Reddedildi
        </h1>
        
        <p className="text-slate-600 mb-6">
          Bu sayfaya erişim yetkiniz bulunmamaktadır. Yetki almak için yöneticinizle iletişime geçin.
        </p>
        
        <Button 
          onClick={() => navigate(-1)} 
          variant="outline" 
          className="border-slate-200"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Geri Dön
        </Button>
      </Card>
    </div>
  );
};
