import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import axios from 'axios';
import { setToken, setUser } from '../utils/auth';

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
      const response = await axios.post(`${API}/auth/login`, { email, password });
      const { access_token, role, client_id } = response.data;

      setToken(access_token);
      
      const userResponse = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${access_token}` }
      });
      setUser(userResponse.data);

      toast.success('Login successful!');

      if (role === 'admin') {
        navigate('/admin/dashboard');
      } else if (role === 'staff') {
        navigate('/staff/dashboard');
      } else if (role === 'client') {
        navigate('/client/dashboard');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2" data-testid="login-page">
      {/* Left Side - Form */}
      <div className="flex flex-col items-center justify-center p-8 md:p-12">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h1 className="text-4xl font-semibold text-slate-900" data-testid="login-title">Welcome back</h1>
            <p className="mt-2 text-slate-600">Sign in to your Agency OS account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" data-testid="login-form">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                data-testid="email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11"
                placeholder="you@company.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                data-testid="password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11"
                placeholder="••••••••"
              />
            </div>

            <Button
              type="submit"
              data-testid="login-submit-button"
              className="w-full h-11 bg-slate-900 hover:bg-slate-800"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </div>
      </div>

      {/* Right Side - Image */}
      <div
        className="hidden md:block bg-cover bg-center relative"
        style={{ backgroundImage: `url('https://images.unsplash.com/photo-1553792012-5c75e251255e?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1MTN8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBjcmVhdGl2ZSUyMGFnZW5jeSUyMG1lZXRpbmclMjBtaW5pbWFsfGVufDB8fHx8MTc3MDU3NzI5NHww&ixlib=rb-4.1.0&q=85')` }}
      >
        <div className="absolute inset-0 bg-slate-900/40" />
        <div className="absolute inset-0 flex items-end p-12">
          <div className="text-white max-w-lg">
            <h2 className="text-3xl font-medium mb-4">Manage your agency with confidence</h2>
            <p className="text-slate-200">Complete control over clients, projects, and services in one powerful platform.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
