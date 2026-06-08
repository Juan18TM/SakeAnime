import React, { useState, useEffect, useCallback } from 'react';
import { X, Loader2, Plus, ListPlus, Check } from 'lucide-react';
import clsx from 'clsx';
import { useAuthStore } from '../stores/authStore';
import {
  getLists,
  createList,
  addAnimeToList,
  removeAnimeFromList,
  getAnimeListMembership,
} from '../services/listsService';
import type { AnimeListWithCount, ListAnimeInput } from '../types/database';

interface AddToListModalProps {
  open: boolean;
  onClose: () => void;
  anime: ListAnimeInput;
}

export const AddToListModal: React.FC<AddToListModalProps> = ({ open, onClose, anime }) => {
  const { user } = useAuthStore();
  const [lists, setLists] = useState<AnimeListWithCount[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [initialIds, setInitialIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [allLists, memberIds] = await Promise.all([
        getLists(user.id),
        getAnimeListMembership(user.id, anime.url, anime.providerId),
      ]);
      setLists(allLists);
      const ids = new Set(memberIds);
      setSelectedIds(ids);
      setInitialIds(ids);
    } catch {
      setError('No se pudieron cargar las listas');
    } finally {
      setLoading(false);
    }
  }, [user, anime.url, anime.providerId]);

  useEffect(() => {
    if (open && user) loadData();
    if (!open) {
      setShowCreate(false);
      setNewListName('');
      setError(null);
    }
  }, [open, user, loadData]);

  const toggleList = (listId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(listId)) next.delete(listId);
      else next.add(listId);
      return next;
    });
  };

  const handleCreateList = async () => {
    if (!user || !newListName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const list = await createList(user.id, newListName.trim());
      setLists((prev) => [{ ...list, item_count: 0 }, ...prev]);
      setSelectedIds((prev) => new Set(prev).add(list.id));
      setNewListName('');
      setShowCreate(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la lista');
    } finally {
      setCreating(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      const toAdd = [...selectedIds].filter((id) => !initialIds.has(id));
      const toRemove = [...initialIds].filter((id) => !selectedIds.has(id));

      await Promise.all([
        ...toAdd.map((listId) => addAnimeToList(user.id, listId, anime)),
        ...toRemove.map((listId) => removeAnimeFromList(user.id, listId, anime.url, anime.providerId)),
      ]);

      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges =
    selectedIds.size !== initialIds.size ||
    [...selectedIds].some((id) => !initialIds.has(id));

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
        style={{ background: 'rgba(14, 18, 27, 0.98)' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <div className="flex items-center gap-2">
            <ListPlus size={18} className="text-primary" />
            <h2 className="text-white font-semibold">Guardar en lista</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-white/6">
          <p className="text-sm text-white font-medium truncate">{anime.title}</p>
          <p className="text-xs text-gray-500 mt-0.5">Selecciona las listas donde quieres guardarlo</p>
        </div>

        <div className="max-h-64 overflow-y-auto px-3 py-3">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-primary" size={24} />
            </div>
          ) : lists.length === 0 && !showCreate ? (
            <div className="text-center py-6 text-gray-500 text-sm">
              <p>No tienes listas aún.</p>
              <p className="mt-1">Crea una para empezar a guardar animes.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {lists.map((list) => {
                const checked = selectedIds.has(list.id);
                return (
                  <button
                    key={list.id}
                    onClick={() => toggleList(list.id)}
                    className={clsx(
                      'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left transition-all',
                      checked ? 'bg-primary/10 border border-primary/30' : 'hover:bg-white/5 border border-transparent'
                    )}
                  >
                    <div
                      className={clsx(
                        'w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors',
                        checked ? 'bg-primary border-primary' : 'border-white/20'
                      )}
                    >
                      {checked && <Check size={12} className="text-white" strokeWidth={3} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">{list.name}</p>
                      <p className="text-[11px] text-gray-500">{list.item_count} anime{list.item_count !== 1 ? 's' : ''}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {showCreate ? (
          <div className="px-5 py-3 border-t border-white/6 flex gap-2">
            <input
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateList()}
              placeholder="Nombre de la lista"
              autoFocus
              className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-primary/50"
            />
            <button
              onClick={handleCreateList}
              disabled={creating || !newListName.trim()}
              className="px-3 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-semibold disabled:opacity-50 transition-colors"
            >
              {creating ? <Loader2 size={16} className="animate-spin" /> : 'Crear'}
            </button>
          </div>
        ) : (
          <div className="px-5 py-3 border-t border-white/6">
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 text-sm text-primary hover:text-primary-hover font-medium transition-colors"
            >
              <Plus size={16} />
              Crear nueva lista
            </button>
          </div>
        )}

        {error && (
          <p className="px-5 pb-2 text-xs text-red-400">{error}</p>
        )}

        <div className="flex gap-2 px-5 py-4 border-t border-white/6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-primary hover:bg-primary-hover text-white disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
};
