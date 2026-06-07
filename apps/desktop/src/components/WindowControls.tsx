import React, { useEffect, useState } from 'react';
import { X, Maximize2, Minimize2, Square } from 'lucide-react';

declare global {
  interface Window {
    windowControls?: any;
  }
}

export const WindowControls: React.FC = () => {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await window.windowControls?.isMaximized();
        setMaximized(Boolean(res?.maximized));
      } catch {}
    };
    check();
  }, []);

  return (
    <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as any}>
      <button onClick={() => window.windowControls?.minimize()} className="p-2 rounded-md hover:bg-white/6">
        <Minimize2 size={14} />
      </button>
      <button onClick={async () => {
        const res = await window.windowControls?.maximize();
        if (res && typeof res.maximized !== 'undefined') setMaximized(res.maximized);
      }} className="p-2 rounded-md hover:bg-white/6">
        {maximized ? <Square size={14} /> : <Maximize2 size={14} />}
      </button>
      <button onClick={() => window.windowControls?.close()} className="p-2 rounded-md hover:bg-red-600 hover:text-white">
        <X size={14} />
      </button>
    </div>
  );
};

export default WindowControls;
