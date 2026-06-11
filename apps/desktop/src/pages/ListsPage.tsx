import React, { useState, useEffect, useCallback } from 'react';
import {
  List,
  Plus,
  Trash2,
  LogIn,
  Loader2,
  ArrowLeft,
  Pencil,
  Check,
  X,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import {
  getLists,
  createList,
  deleteList,
  updateList,
  getListItems,
  removeAnimeFromList,
} from '../services/listsService';
import type { AnimeListWithCount, AnimeListItem } from '../types/database';
import { AuthModal } from '../components/AuthModal';

export const ListsPage: React.FC<{
  onAnimeSelect?: (url: string, providerId: string) => void;
}> = ({ onAnimeSelect }) => {
  const { user, initialized } = useAuthStore();
  const [lists, setLists] = useState<AnimeListWithCount[]>([]);
  const [selectedList, setSelectedList] = useState<AnimeListWithCount | null>(null);
  const [items, setItems] = useState<AnimeListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const loadLists = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getLists(user.id);
      setLists(data);
    } catch {
      setLists([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) loadLists();
    else {
      setLists([]);
      setSelectedList(null);
    }
  }, [user, loadLists]);

  const openList = async (list: AnimeListWithCount) => {
    setSelectedList(list);
    setItemsLoading(true);
    try {
      const data = await getListItems(list.id);
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setItemsLoading(false);
    }
  };

  const handleCreateList = async () => {
    if (!user || !newListName.trim()) return;
    setCreating(true);
    try {
      const list = await createList(user.id, newListName.trim());
      setLists((prev) => [{ ...list, item_count: 0 }, ...prev]);
      setNewListName('');
      setShowCreateForm(false);
    } catch {
      // silencioso
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteList = async (listId: string) => {
    if (!user) return;
    await deleteList(user.id, listId);
    setLists((prev) => prev.filter((l) => l.id !== listId));
    if (selectedList?.id === listId) {
      setSelectedList(null);
      setItems([]);
    }
  };

  const handleRename = async (listId: string) => {
    if (!user || !editName.trim()) return;
    try {
      const updated = await updateList(user.id, listId, { name: editName.trim() });
      setLists((prev) =>
        prev.map((l) => (l.id === listId ? { ...l, name: updated.name } : l))
      );
      if (selectedList?.id === listId) {
        setSelectedList((prev) => (prev ? { ...prev, name: updated.name } : null));
      }
      setEditingId(null);
    } catch {
      // silencioso
    }
  };

  const handleRemoveItem = async (item: AnimeListItem) => {
    if (!user || !selectedList) return;
    await removeAnimeFromList(user.id, selectedList.id, item.url, item.provider_id);
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    setLists((prev) =>
      prev.map((l) =>
        l.id === selectedList.id ? { ...l, item_count: Math.max(0, l.item_count - 1) } : l
      )
    );
    setSelectedList((prev) =>
      prev ? { ...prev, item_count: Math.max(0, prev.item_count - 1) } : null
    );
  };

  if (!initialized) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="animate-spin text-primary" size={28} />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-gray-500">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
            <List size={28} className="text-gray-600" />
          </div>
          <p className="text-white font-medium">Inicia sesión para usar listas</p>
          <p className="text-sm text-center max-w-sm">
            Crea listas personalizadas y guarda tus animes favoritos organizados como quieras.
          </p>
          <button
            onClick={() => setAuthOpen(true)}
            className="mt-2 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition-all"
          >
            <LogIn size={16} />
            Iniciar sesión
          </button>
        </div>
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      </>
    );
  }

  if (selectedList) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => {
              setSelectedList(null);
              setItems([]);
            }}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold text-white truncate font-display">{selectedList.name}</h1>
            <p className="text-xs text-gray-500">{selectedList.item_count} anime{selectedList.item_count !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => handleDeleteList(selectedList.id)}
            className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
            title="Eliminar lista"
          >
            <Trash2 size={18} />
          </button>
        </div>

        {itemsLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="animate-spin text-primary" size={28} />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-gray-500">
            <p className="text-white font-medium">Lista vacía</p>
            <p className="text-sm">Guarda animes desde su página de detalle</p>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-4">
            {items.map((item) => (
              <div key={item.id} className="group relative flex flex-col gap-2">
                <button
                  onClick={() => onAnimeSelect?.(item.url, item.provider_id)}
                  className="text-left"
                >
                  <div className="aspect-[3/4] rounded-xl overflow-hidden bg-white/5 border border-white/5 group-hover:border-primary/30 transition-all">
                    {item.poster ? (
                      <img src={item.poster} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600 text-2xl">🎬</div>
                    )}
                  </div>
                  <p className="text-sm text-gray-300 font-medium line-clamp-2 group-hover:text-white transition-colors mt-2">
                    {item.title}
                  </p>
                </button>
                <button
                  onClick={() => handleRemoveItem(item)}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-gray-400 hover:text-red-400 hover:bg-red-400/15 transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-white font-display">Mis listas</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/15 text-primary hover:bg-primary/25 transition-all"
        >
          <Plus size={14} />
          Nueva lista
        </button>
      </div>

      {showCreateForm && (
        <div className="flex gap-2 mb-6 p-4 rounded-xl bg-card border border-white/8">
          <input
            type="text"
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateList()}
            placeholder="Nombre de la lista (ej: Por ver, Mejores 2024...)"
            autoFocus
            className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-primary/50"
          />
          <button
            onClick={handleCreateList}
            disabled={creating || !newListName.trim()}
            className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-semibold disabled:opacity-50 transition-colors"
          >
            {creating ? <Loader2 size={16} className="animate-spin" /> : 'Crear'}
          </button>
          <button
            onClick={() => {
              setShowCreateForm(false);
              setNewListName('');
            }}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="animate-spin text-primary" size={28} />
        </div>
      ) : lists.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[50vh] gap-4 text-gray-500">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
            <List size={28} className="text-gray-600" />
          </div>
          <p className="text-white font-medium">Sin listas</p>
          <p className="text-sm">Crea tu primera lista para organizar tus animes</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {lists.map((list) => (
            <div
              key={list.id}
              className="group relative flex flex-col gap-3 p-4 rounded-xl bg-card border border-white/8 hover:border-primary/30 transition-all cursor-pointer"
              onClick={() => openList(list)}
            >
              <div className="flex items-start justify-between gap-2">
                {editingId === list.id ? (
                  <div className="flex items-center gap-2 flex-1" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename(list.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      autoFocus
                      className="flex-1 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-primary/50"
                    />
                    <button
                      onClick={() => handleRename(list.id)}
                      className="p-1.5 rounded-lg text-green-400 hover:bg-green-400/10"
                    >
                      <Check size={14} />
                    </button>
                  </div>
                ) : (
                  <h3 className="text-white font-semibold truncate flex-1 font-display">{list.name}</h3>
                )}
                <div
                  className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => {
                      setEditingId(list.id);
                      setEditName(list.name);
                    }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5"
                    title="Renombrar"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => handleDeleteList(list.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-400/10"
                    title="Eliminar"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                {list.item_count} anime{list.item_count !== 1 ? 's' : ''}
              </p>
              {list.description && (
                <p className="text-xs text-gray-400 line-clamp-2">{list.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
