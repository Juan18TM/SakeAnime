import React, { useState, useRef, useEffect } from 'react';
import { X, Loader2, Camera, Trash2 } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { uploadAvatar, removeAvatar, updateUsername } from '../services/profileService';
import { UserAvatar } from './UserAvatar';

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ open, onClose }) => {
  const { user, profile, refreshProfile } = useAuthStore();
  const [username, setUsername] = useState(profile?.username ?? '');
  const [uploading, setUploading] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setUsername(profile?.username ?? '');
      setError(null);
    }
  }, [open, profile?.username]);

  if (!open || !user) return null;

  const displayName = profile?.username ?? user.email?.split('@')[0] ?? 'Usuario';
  const hasAvatar = Boolean(profile?.avatar_url);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      await uploadAvatar(user.id, file);
      await refreshProfile();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo subir la foto');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    setUploading(true);
    setError(null);
    try {
      await removeAvatar(user.id);
      await refreshProfile();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo quitar la foto');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveUsername = async () => {
    setSavingName(true);
    setError(null);
    try {
      await updateUsername(user.id, username);
      await refreshProfile();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el nombre');
    } finally {
      setSavingName(false);
    }
  };

  const nameChanged = username.trim() !== (profile?.username ?? '');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-sm rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
        style={{ background: 'rgba(14, 18, 27, 0.98)' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <h2 className="text-white font-semibold font-display">Mi perfil</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-6 flex flex-col items-center gap-4">
          <div className="relative group">
            <UserAvatar
              name={displayName}
              avatarUrl={profile?.avatar_url}
              size="lg"
              className="!w-20 !h-20 !text-xl !rounded-2xl"
            />
            {uploading && (
              <div className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center">
                <Loader2 className="animate-spin text-white" size={24} />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/15 text-primary hover:bg-primary/25 text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Camera size={15} />
              Cambiar foto
            </button>
            {hasAvatar && (
              <button
                onClick={handleRemoveAvatar}
                disabled={uploading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 text-sm font-medium transition-colors disabled:opacity-50"
              >
                <Trash2 size={15} />
                Quitar
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileChange}
            className="hidden"
          />

          <p className="text-[11px] text-gray-500 text-center">
            JPG, PNG, WEBP o GIF · máximo 2 MB
          </p>
        </div>

        <div className="px-5 pb-5 flex flex-col gap-3">
          <label className="text-xs text-gray-400 font-medium">Nombre de usuario</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-primary/50"
              placeholder="Tu nombre"
            />
            <button
              onClick={handleSaveUsername}
              disabled={savingName || !nameChanged || !username.trim()}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm font-medium disabled:opacity-40 transition-colors"
            >
              {savingName ? <Loader2 size={16} className="animate-spin" /> : 'Guardar'}
            </button>
          </div>
          <p className="text-[11px] text-gray-500 truncate">{user.email}</p>
        </div>

        {error && (
          <p className="px-5 pb-4 text-xs text-red-400">{error}</p>
        )}
      </div>
    </div>
  );
};
