import React, { useState } from 'react';
import { X, Loader2, Mail, Lock, User } from 'lucide-react';
import clsx from 'clsx';
import { useAuthStore } from '../stores/authStore';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

type AuthMode = 'login' | 'register';

export const AuthModal: React.FC<AuthModalProps> = ({ open, onClose }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { signIn, signUp, loading } = useAuthStore();

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (mode === 'login') {
      const result = await signIn(email, password);
      if (result.error) {
        setError(result.error);
        return;
      }
    } else {
      if (password.length < 6) {
        setError('La contraseña debe tener al menos 6 caracteres');
        return;
      }
      const result = await signUp(email, password, username || email.split('@')[0]);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.needsConfirmation) {
        setSuccess('Cuenta creada. Revisa tu correo para confirmar tu email, luego inicia sesión.');
        setEmail('');
        setPassword('');
        setUsername('');
        return;
      }
    }

    setEmail('');
    setPassword('');
    setUsername('');
    onClose();
  };

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative w-full max-w-md rounded-2xl border border-white/8 shadow-2xl shadow-black/50 p-6"
        style={{ background: 'rgba(14, 18, 27, 0.98)' }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <X size={18} />
        </button>

        <h2 className="text-xl font-semibold text-white mb-1 font-display">
          {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          {mode === 'login'
            ? 'Accede para guardar tus favoritos en la nube'
            : 'Regístrate para sincronizar tus favoritos'}
        </p>

        <div className="flex gap-1 p-1 rounded-xl bg-white/5 mb-6">
          {(['login', 'register'] as AuthMode[]).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={clsx(
                'flex-1 py-2 rounded-lg text-sm font-medium transition-all',
                mode === m ? 'bg-primary/15 text-primary' : 'text-gray-400 hover:text-white'
              )}
            >
              {m === 'login' ? 'Entrar' : 'Registrarse'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === 'register' && (
            <div className="relative">
              <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Nombre de usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/8 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>
          )}

          <div className="relative">
            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/8 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>

          <div className="relative">
            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/8 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {success && (
            <p className="text-sm text-gray-300">
              {success}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold transition-all disabled:opacity-50"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {mode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>
      </div>
    </div>
  );
};
