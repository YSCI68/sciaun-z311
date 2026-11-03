import { useEffect, useState } from 'react';
import { useLab } from './store';
import { TopBar } from './components/TopBar';
import { ProtocolPanel } from './components/ProtocolPanel';
import { HandPanel } from './components/HandPanel';
import { FreeLabPanel } from './components/FreeLabPanel';
import { Workbench } from './components/Workbench';
import { CursorItem, Toasts } from './components/Overlays';
import { BriefingScreen, IntroScreen } from './components/Intro';
import { CentrifugeModal, DryModal, FreezerModal, HeatModal } from './components/modals/Instruments';
import { AspirateModal } from './components/modals/AspirateModal';
import { SpoolModal } from './components/modals/SpoolModal';
import { PhaseQuizModal, QuizModal } from './components/modals/Quiz';
import { NanoDropModal, ReportModal } from './components/modals/Results';

function LabView() {
  const modal = useLab((s) => s.modal);
  const mode = useLab((s) => s.mode);
  const stepIndex = useLab((s) => s.stepIndex);
  const held = useLab((s) => s.held);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [handsOpen, setHandsOpen] = useState(true);

  useEffect(() => {
    if (held) setHandsOpen(true);
  }, [held?.kind, held?.id]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[radial-gradient(ellipse_at_top,#13213a,#0b1220_60%)]">
      <TopBar />
      <main className="lab-layout">
        <aside id="lab-instructions" className="lab-side-panel lab-instructions" hidden={!instructionsOpen} aria-label="Experiment instructions">
          {mode === 'free' ? <FreeLabPanel /> : <ProtocolPanel />}
        </aside>
        <Workbench
          instructionsOpen={instructionsOpen}
          handsOpen={handsOpen}
          onToggleInstructions={() => setInstructionsOpen((open) => !open)}
          onToggleHands={() => setHandsOpen((open) => !open)}
        />
        <aside id="lab-hands" className="lab-side-panel lab-hands" hidden={!handsOpen} aria-label="Hands and tube inspector">
          <HandPanel />
        </aside>
      </main>
      <CursorItem />
      <Toasts />
      {modal === 'centrifuge' && <CentrifugeModal />}
      {modal === 'heat' && <HeatModal />}
      {modal === 'freezer' && <FreezerModal />}
      {modal === 'dry' && <DryModal />}
      {modal === 'aspirate' && <AspirateModal />}
      {modal === 'spool' && <SpoolModal key={`sp-${stepIndex}`} />}
      {modal === 'phaseQuiz' && <PhaseQuizModal key={`pq-${stepIndex}`} />}
      {modal === 'quiz' && <QuizModal key={`q-${stepIndex}`} />}
      {modal === 'nanodrop' && <NanoDropModal />}
      {modal === 'report' && <ReportModal />}
    </div>
  );
}

export default function App() {
  const screen = useLab((s) => s.screen);
  if (screen === 'intro') return <IntroScreen />;
  if (screen === 'briefing') return <BriefingScreen />;
  return <LabView />;
}
