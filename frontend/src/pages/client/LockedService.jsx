import { Lock, Unlock } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

export const LockedService = ({ serviceName, description }) => {
  return (
    <div className="p-8 max-w-[1600px] mx-auto" data-testid="locked-service-page">
      <div className="flex items-center gap-3 mb-8">
        <Lock className="h-8 w-8 text-slate-400" />
        <h1 className="text-4xl font-medium text-slate-900" data-testid="locked-service-title">{serviceName}</h1>
      </div>

      <Card className="p-12 text-center relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-100 rounded-full mb-6">
            <Lock className="h-10 w-10 text-slate-400" />
          </div>
          <h2 className="text-2xl font-medium text-slate-900 mb-4">This service is currently locked</h2>
          <p className="text-slate-600 mb-8 max-w-2xl mx-auto">{description}</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 max-w-4xl mx-auto">
            <Card className="p-6 text-left">
              <h3 className="text-lg font-medium text-slate-900 mb-2">Starter</h3>
              <p className="text-3xl font-semibold text-slate-900 mb-4">$499<span className="text-sm text-slate-600">/mo</span></p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <Unlock className="h-4 w-4 text-green-600" />
                  Basic features
                </li>
                <li className="flex items-center gap-2">
                  <Unlock className="h-4 w-4 text-green-600" />
                  Email support
                </li>
              </ul>
            </Card>

            <Card className="p-6 text-left border-indigo-600 border-2">
              <div className="inline-block px-3 py-1 bg-indigo-600 text-white text-xs rounded-full mb-2">Popular</div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">Professional</h3>
              <p className="text-3xl font-semibold text-slate-900 mb-4">$999<span className="text-sm text-slate-600">/mo</span></p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <Unlock className="h-4 w-4 text-green-600" />
                  All Starter features
                </li>
                <li className="flex items-center gap-2">
                  <Unlock className="h-4 w-4 text-green-600" />
                  Priority support
                </li>
              </ul>
            </Card>

            <Card className="p-6 text-left">
              <h3 className="text-lg font-medium text-slate-900 mb-2">Enterprise</h3>
              <p className="text-3xl font-semibold text-slate-900 mb-4">Custom</p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <Unlock className="h-4 w-4 text-green-600" />
                  All Pro features
                </li>
                <li className="flex items-center gap-2">
                  <Unlock className="h-4 w-4 text-green-600" />
                  Dedicated manager
                </li>
              </ul>
            </Card>
          </div>

          <div className="bg-gradient-to-r from-indigo-50 to-pink-50 p-6 rounded-lg mb-6">
            <h3 className="text-xl font-medium text-slate-900 mb-2">🎉 March Special Offer</h3>
            <p className="text-slate-700">Get 50% off your first 3 months when you activate this service this month!</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" data-testid="request-offer-button">Request Offer</Button>
            <Button size="lg" variant="outline" data-testid="contact-button">Contact Account Manager</Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
