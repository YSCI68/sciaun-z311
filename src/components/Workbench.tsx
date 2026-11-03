import { useEffect, useRef, useState } from 'react';
import { BookOpen, Hand, Maximize2, Minus, Plus } from 'lucide-react';
import { hintFor } from '../engine';
import { useLab } from '../store';
import { LabScene } from './LabScene';
import { ProtectionChoice } from './ProtectionChoice';

interface Props {
  instructionsOpen: boolean;
  handsOpen: boolean;
  onToggleInstructions: () => void;
  onToggleHands: () => void;
}

const MIN_ZOOM = 75;
const MAX_ZOOM = 200;
const ZOOM_STEP = 25;
const SCENE_RATIO = 16 / 10;

function initialZoom() {
  return typeof window !== 'undefined' && window.matchMedia?.('(max-width: 700px)').matches ? 175 : 100;
}

export function Workbench({ instructionsOpen, handsOpen, onToggleInstructions, onToggleHands }: Props) {
  const s = useLab();
  const step = s.steps[s.stepIndex];
  const hint = s.hints ? hintFor(step, s) : null;
  const [zoom, setZoom] = useState(initialZoom);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const measure = () => {
      const width = viewport.clientWidth;
      const height = viewport.clientHeight;
      setSize((previous) => previous.width === width && previous.height === height ? previous : { width, height });
    };
    measure();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    observer?.observe(viewport);
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  const fitWidth = size.width && size.height ? Math.min(size.width, size.height * SCENE_RATIO) : 0;
  const width = fitWidth ? Math.round(fitWidth * zoom / 100) : undefined;

  const fit = () => {
    setZoom(100);
    const viewport = viewportRef.current;
    if (!viewport) return;
    if (typeof viewport.scrollTo === 'function') viewport.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    else { viewport.scrollTop = 0; viewport.scrollLeft = 0; }
  };

  return (
    <section className="workbench" aria-label="Virtual laboratory workbench">
      <div className="workbench-toolbar">
        <div className="workbench-heading">
          <div className="workbench-eyebrow">
            <span>YOUR LAB BENCH</span>
            <span className="workbench-heading-divider" />
            <span>{s.mode === 'free' ? 'Free practice' : `Step ${s.stepIndex + 1} of ${s.steps.length}`}</span>
          </div>
          <div className="workbench-title" title={s.mode === 'free' ? s.exp.title : step.title}>
            {s.mode === 'free' ? s.exp.title : step.title}
          </div>
          <div className="workbench-next" aria-live="polite">
            {s.mode === 'free' ? 'Use any equipment, or open the picture reference.' : hint ? `Next: ${hint.text}` : 'Open instructions for the current step.'}
          </div>
        </div>

        <div className="workbench-controls">
          <div className="zoom-control" role="group" aria-label="Workbench zoom">
            <button
              type="button"
              className="workbench-icon-button"
              onClick={() => setZoom((value) => Math.max(MIN_ZOOM, value - ZOOM_STEP))}
              disabled={zoom <= MIN_ZOOM}
              aria-label="Zoom out"
              title="Zoom out"
            >
              <Minus size={16} />
            </button>
            <output className="zoom-value" aria-live="polite" aria-label="Zoom level">{zoom}%</output>
            <button
              type="button"
              className="workbench-icon-button"
              onClick={() => setZoom((value) => Math.min(MAX_ZOOM, value + ZOOM_STEP))}
              disabled={zoom >= MAX_ZOOM}
              aria-label="Zoom in"
              title="Zoom in"
            >
              <Plus size={16} />
            </button>
            <button type="button" className="fit-button" onClick={fit} aria-label="Fit workbench" title="Fit workbench">
              <Maximize2 size={14} /> <span>Fit</span>
            </button>
          </div>

          <button
            type="button"
            className={`panel-toggle ${instructionsOpen ? 'panel-toggle-active' : ''}`}
            onClick={onToggleInstructions}
            aria-label={instructionsOpen ? 'Hide instructions' : 'Show instructions'}
            aria-expanded={instructionsOpen}
            aria-controls="lab-instructions"
            title={instructionsOpen ? 'Hide instructions' : 'Show instructions'}
          >
            <BookOpen size={15} /> <span>Instructions</span>
          </button>
          <button
            type="button"
            className={`panel-toggle ${handsOpen ? 'panel-toggle-active' : ''}`}
            onClick={onToggleHands}
            aria-label={handsOpen ? 'Hide hands panel' : 'Show hands panel'}
            aria-expanded={handsOpen}
            aria-controls="lab-hands"
            title={handsOpen ? 'Hide hands panel' : 'Show hands panel'}
          >
            <Hand size={15} /> <span>Hands</span>
          </button>
        </div>
      </div>

      <ProtectionChoice />
      <div
        ref={viewportRef}
        className="workbench-viewport thin-scroll"
        role="region"
        aria-label="Lab bench. Scroll to see more when zoomed in."
        tabIndex={0}
        data-testid="lab-viewport"
      >
        <div className="workbench-canvas" style={{ width: width ? `${width}px` : '100%' }} data-testid="lab-canvas">
          <LabScene />
        </div>
      </div>
      <p className="workbench-help">Zoom in for a closer look. Scroll or swipe to move around the bench.</p>
    </section>
  );
}