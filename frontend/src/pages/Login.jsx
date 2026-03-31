import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { setToken, setUser } from '../utils/auth';
import { tr } from '../utils/translations';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || tr.auth.loginFailed);
      }

      const { access_token, role, user } = data;

      setToken(access_token);
      setUser(user);

      toast.success(tr.auth.loginSuccessful);

      if (role === 'admin') {
        navigate('/admin/dashboard');
      } else if (role === 'staff') {
        navigate('/staff/dashboard');
      } else if (role === 'client') {
        navigate('/client/dashboard');
      }
    } catch (error) {
      toast.error(error.message || tr.auth.loginFailed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2" data-testid="login-page">
      {/* Left Side - Form */}
      <div className="flex flex-col items-center justify-center p-8 md:p-12 bg-white">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h1 className="text-5xl font-medium text-slate-900 tracking-tight" data-testid="login-title">{tr.auth.welcomeBack}</h1>
            <p className="mt-3 text-slate-600">{tr.auth.signInToAccount}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" data-testid="login-form">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">{tr.auth.emailAddress}</Label>
              <Input
                id="email"
                data-testid="email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 border-slate-200 focus:border-slate-900 focus:ring-slate-900"
                placeholder="ornek@sirket.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">{tr.auth.password}</Label>
              <Input
                id="password"
                data-testid="password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12 border-slate-200 focus:border-slate-900 focus:ring-slate-900"
                placeholder="••••••••"
              />
            </div>

            <Button
              type="submit"
              data-testid="login-submit-button"
              className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg transition-all"
              disabled={loading}
            >
              {loading ? tr.auth.signingIn : tr.auth.signIn}
            </Button>
          </form>

          {/* Demo credentials hint */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-sm text-blue-800 font-medium mb-2">Demo Giriş Bilgileri:</p>
            <p className="text-xs text-blue-700">E-posta: admin@agency.com</p>
            <p className="text-xs text-blue-700">Şifre: admin123</p>
          </div>
        </div>
      </div>

      {/* Right Side - Image */}
      <div
        className="hidden md:block bg-cover bg-center relative"
        style={{ backgroundImage: `url('https://images.unsplash.com/photo-1553792012-5c75e251255e?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1MTN8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBjcmVhdGl2ZSUyMGFnZW5jeSUyMG1lZXRpbmclMjBtaW5pbWFsfGVufDB8fHx8MTc3MDU3NzI5NHww&ixlib=rb-4.1.0&q=85')` }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/60 to-slate-900/40" />
        <div className="absolute inset-0 flex items-end p-12">
          <div className="text-white max-w-lg">
            <h2 className="text-4xl font-medium mb-4 tracking-tight">{tr.auth.manageAgency}</h2>
            <p className="text-slate-100 text-lg">{tr.auth.completeControl}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
