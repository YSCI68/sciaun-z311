import { useEffect, useState } from 'react';
import { Maximize, Minimize } from 'lucide-react';

export function FullscreenButton() {
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const sync = () => setFullscreen(!!document.fullscreenElement || document.body.classList.contains('pseudo-fullscreen'));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && document.body.classList.contains('pseudo-fullscreen')) {
        document.body.classList.remove('pseudo-fullscreen');
        sync();
      }
    };
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('keydown', onKey);
    sync();
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const toggle = async () => {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        setFullscreen(!!document.fullscreenElement);
      }
      return;
    }
    if (document.body.classList.contains('pseudo-fullscreen')) {
      document.body.classList.remove('pseudo-fullscreen');
      setFullscreen(false);
      return;
    }
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      document.body.classList.add('pseudo-fullscreen');
      setFullscreen(true);
    }
  };

  return (
    <button
      onClick={() => void toggle()}
      title={fullscreen ? 'Exit full screen' : 'Full screen'}
      aria-label={fullscreen ? 'Exit full screen' : 'Full screen'}
      className="flex h-8 items-center gap-1.5 rounded-lg bg-white/5 px-2.5 text-[11.5px] font-semibold text-slate-200 transition hover:bg-white/10"
    >
      {fullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
      <span className="hidden sm:inline">{fullscreen ? 'Exit full screen' : 'Full screen'}</span>
    </button>
  );
}