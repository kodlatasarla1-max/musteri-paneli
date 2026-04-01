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
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-xl">M</span>
              </div>
              <span className="text-2xl font-bold text-slate-900">Mova Dijital</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight" data-testid="login-title">{tr.auth.welcomeBack}</h1>
            <p className="mt-3 text-slate-600">{tr.auth.signInToAccount}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" data-testid="login-form">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-slate-900">{tr.auth.emailAddress}</Label>
              <Input
                id="email"
                data-testid="email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 border-slate-300 focus:border-slate-900 focus:ring-slate-900 bg-white"
                placeholder="ornek@sirket.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-slate-900">{tr.auth.password}</Label>
              <Input
                id="password"
                data-testid="password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12 border-slate-300 focus:border-slate-900 focus:ring-slate-900 bg-white"
                placeholder="••••••••"
              />
            </div>

            <Button
              type="submit"
              data-testid="login-submit-button"
              className="w-full h-12 bg-slate-900 hover:bg-black text-white font-semibold rounded-xl transition-all shadow-lg shadow-slate-900/20"
              disabled={loading}
            >
              {loading ? tr.auth.signingIn : tr.auth.signIn}
            </Button>
          </form>
        </div>
      </div>

      {/* Right Side - Navy Blue Background */}
      <div className="hidden md:flex bg-slate-900 relative items-center justify-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black opacity-80" />
        <div className="relative z-10 p-12 max-w-lg text-center">
          <div className="w-20 h-20 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-8 border border-white/20">
            <span className="text-white font-bold text-4xl">M</span>
          </div>
          <h2 className="text-4xl font-bold text-white mb-4 tracking-tight">{tr.auth.manageAgency}</h2>
          <p className="text-slate-300 text-lg leading-relaxed">{tr.auth.completeControl}</p>
          
          <div className="mt-12 flex items-center justify-center gap-4">
            <div className="w-3 h-3 bg-white rounded-full" />
            <div className="w-3 h-3 bg-white/40 rounded-full" />
            <div className="w-3 h-3 bg-white/40 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
};
