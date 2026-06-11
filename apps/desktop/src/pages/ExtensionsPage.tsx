import React, { useState } from 'react';
import { Puzzle, RefreshCw, Settings, Download } from 'lucide-react';
import { extensionRegistry } from '../services/ExtensionRegistry';

export const ExtensionsPage: React.FC = () => {
  const allProviders = extensionRegistry.getAllProviders();
  const [activeIds, setActiveIds] = useState<Set<string>>(
    new Set(extensionRegistry.getActiveProviders().map(p => p.id))
  );

  // Keep local sync with registry (in case default set changes)
  React.useEffect(() => {
    setActiveIds(new Set(extensionRegistry.getActiveProviders().map(p => p.id)));
  }, []);

  const toggleExtension = (id: string) => {
    if (activeIds.has(id)) {
      extensionRegistry.deactivate(id);
      // Remove from local state
      const newSet = new Set(activeIds);
      newSet.delete(id);
      setActiveIds(newSet);
    } else {
      extensionRegistry.activate(id);
      const newSet = new Set(activeIds);
      newSet.add(id);
      setActiveIds(newSet);
    }
  };

  return (
    <div className="flex flex-col gap-6 px-8 py-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-white font-display flex items-center gap-3">
          <Puzzle className="text-primary" size={28} /> Extensions
        </h1>
        <p className="text-muted text-sm">Manage your content providers and scrapers.</p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {allProviders.map(ext => {
          const isActive = activeIds.has(ext.id);

          return (
            <div
              key={ext.id}
              className={`relative rounded-2xl p-5 border transition-all duration-300 ${
                isActive ? 'bg-card border-primary/30 shadow-[0_0_15px_rgba(255,107,138,0.05)]' : 'bg-card/50 border-white/5 opacity-70 grayscale'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-background flex items-center justify-center overflow-hidden border border-white/5">
                    {ext.logo ? (
                      <img src={ext.logo} alt={ext.name} className="w-full h-full object-contain p-2" />
                    ) : (
                      <span className="text-xl font-bold text-muted">{ext.name[0]}</span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-lg font-display">{ext.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-primary/20 text-primary">
                        {ext.type}
                      </span>
                      <span className="text-xs text-muted font-medium">v{ext.version}</span>
                    </div>
                  </div>
                </div>

                {/* Toggle Switch */}
                <button
                  onClick={() => toggleExtension(ext.id)}
                  className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-1 ${
                    isActive ? 'bg-primary' : 'bg-white/10'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      isActive ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between">
                <span className="text-xs text-muted bg-white/5 px-2 py-1 rounded">
                  Lang: {ext.language}
                </span>
                <div className="flex gap-2">
                  <button className="p-2 text-muted hover:text-white transition-colors rounded-lg hover:bg-white/5">
                    <RefreshCw size={16} />
                  </button>
                  <button className="p-2 text-muted hover:text-white transition-colors rounded-lg hover:bg-white/5">
                    <Settings size={16} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Placeholder for fetching more */}
        <div className="rounded-2xl p-5 border border-white/5 bg-card/30 border-dashed flex flex-col items-center justify-center gap-3 text-muted hover:bg-card/50 hover:text-white transition-colors cursor-pointer min-h-[160px]">
          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
            <Download size={20} />
          </div>
          <span className="font-medium text-sm">Get more extensions</span>
        </div>
      </div>
    </div>
  );
};
