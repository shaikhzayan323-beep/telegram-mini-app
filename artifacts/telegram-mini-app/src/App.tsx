import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  Activity,
  ArrowUpRight,
  BellRing,
  ChartNoAxesColumnIncreasing,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock3,
  Droplets,
  ListChecks,
  PanelTop,
  Plus,
  RotateCcw,
  Settings2,
  StickyNote,
  Timer,
  X,
  Zap,
} from 'lucide-react';
import { createTelegramBridge } from '@/lib/telegram';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

function Home() {
  type Task = {
    id: string;
    title: string;
    meta: string;
    kind: 'focus' | 'personal' | 'move' | 'admin';
    complete: boolean;
  };
  type ActivityItem = {
    id: string;
    title: string;
    detail: string;
    time: string;
    tone: 'teal' | 'coral' | 'ink';
  };

  const bridge = useMemo(() => createTelegramBridge(), []);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [view, setView] = useState<'today' | 'activity'>('today');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [isFocusOn, setIsFocusOn] = useState(false);
  const [waterCount, setWaterCount] = useState(3);
  const [haptics, setHaptics] = useState(true);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  useEffect(() => {
    bridge.ready();
    bridge.expand();
    const storedTasks = window.localStorage.getItem('pulse-tasks');
    const storedActivity = window.localStorage.getItem('pulse-activity');
    const storedWater = window.localStorage.getItem('pulse-water');
    const storedHaptics = window.localStorage.getItem('pulse-haptics');
    const timer = window.setTimeout(() => {
      setTasks(storedTasks ? JSON.parse(storedTasks) : [
        { id: 't1', title: 'Reply to the design thread', meta: '09:30 · Work', kind: 'focus', complete: true },
        { id: 't2', title: 'Take a proper lunch break', meta: '12:30 · Personal', kind: 'personal', complete: false },
        { id: 't3', title: 'Walk around the block', meta: '15 min · Wellbeing', kind: 'move', complete: false },
        { id: 't4', title: 'Plan tomorrow in three lines', meta: '18:00 · Wrap up', kind: 'admin', complete: false },
      ]);
      setActivity(storedActivity ? JSON.parse(storedActivity) : [
        { id: 'a1', title: 'You finished a task', detail: 'Reply to the design thread', time: '18 min ago', tone: 'teal' },
        { id: 'a2', title: 'Focus session logged', detail: '25 minutes of clear air', time: 'Yesterday', tone: 'coral' },
        { id: 'a3', title: 'Day wrapped at 4 / 5', detail: 'A steady, human pace', time: 'Yesterday', tone: 'ink' },
      ]);
      if (storedWater) setWaterCount(Number(storedWater));
      if (storedHaptics) setHaptics(storedHaptics === 'true');
      setLoading(false);
    }, 380);
    return () => window.clearTimeout(timer);
  }, [bridge]);

  useEffect(() => {
    if (!loading) window.localStorage.setItem('pulse-tasks', JSON.stringify(tasks));
  }, [tasks, loading]);

  useEffect(() => {
    if (!loading) window.localStorage.setItem('pulse-activity', JSON.stringify(activity));
  }, [activity, loading]);

  useEffect(() => {
    if (!loading) {
      window.localStorage.setItem('pulse-water', String(waterCount));
      window.localStorage.setItem('pulse-haptics', String(haptics));
    }
  }, [waterCount, haptics, loading]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const todayLabel = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
  const completed = tasks.filter((task) => task.complete).length;
  const completion = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  const firstName = 'Maya';
  const nudge = completion === 100 ? 'That is a full day. Nicely done.' : completion > 0 ? 'You have your rhythm. Keep it light.' : 'Start small. Let the day meet you there.';

  function feedback(message: string, style: 'light' | 'medium' = 'light') {
    if (haptics) bridge.impact(style);
    setToast(message);
  }

  function toggleTask(id: string) {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;
    const nextComplete = !task.complete;
    setTasks((current) => current.map((item) => item.id === id ? { ...item, complete: nextComplete } : item));
    if (nextComplete) {
      setActivity((current) => [{
        id: `a-${Date.now()}`,
        title: 'You finished a task',
        detail: task.title,
        time: 'Just now',
        tone: 'teal' as const,
      }, ...current].slice(0, 8));
      if (haptics) bridge.notification('success');
      setToast('Task complete. Nice work.');
    } else {
      feedback('Back on your list.');
    }
  }

  function addTask() {
    const title = draft.trim();
    if (!title) return;
    const newTask: Task = { id: `t-${Date.now()}`, title, meta: 'Just now · Quick add', kind: 'admin', complete: false };
    setTasks((current) => [...current, newTask]);
    setDraft('');
    setIsComposerOpen(false);
    feedback('Added to today.');
  }

  function logWater() {
    const next = Math.min(waterCount + 1, 8);
    setWaterCount(next);
    feedback(next === 8 ? 'Daily water goal reached.' : 'Water logged.', 'medium');
  }

  function resetDemo() {
    window.localStorage.removeItem('pulse-tasks');
    window.localStorage.removeItem('pulse-activity');
    window.localStorage.removeItem('pulse-water');
    setTasks([]);
    setActivity([]);
    setWaterCount(0);
    feedback('Demo data cleared.');
  }

  if (loading) {
    return (
      <main className="app-shell">
        <div className="phone-frame app-content px-5 pb-10 pt-6">
          <div className="flex items-center justify-between"><div className="skeleton h-10 w-10 rounded-2xl" /><div className="skeleton h-9 w-24 rounded-full" /></div>
          <div className="mt-12 space-y-4"><div className="skeleton h-4 w-28 rounded-full" /><div className="skeleton h-12 w-80 max-w-full rounded-2xl" /><div className="skeleton h-4 w-60 rounded-full" /></div>
          <div className="skeleton mt-10 h-48 rounded-[2rem]" />
          <div className="mt-7 flex gap-2"><div className="skeleton h-11 flex-1 rounded-full" /><div className="skeleton h-11 flex-1 rounded-full" /></div>
          <div className="mt-5 space-y-3">{[1, 2, 3].map((item) => <div className="skeleton h-20 rounded-3xl" key={item} />)}</div>
        </div>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <div className="phone-frame app-content px-5 pb-10 pt-5 sm:px-8">
        <header className="flex items-center justify-between stagger-in">
          <button className="pressable group flex items-center gap-3 rounded-2xl text-left" onClick={() => feedback('Your space is up to date.')} aria-label="Show pulse status" data-testid="button-pulse-status">
            <span className="relative grid h-11 w-11 place-items-center rounded-[15px] bg-[#102b3a] shadow-[0_8px_20px_rgba(16,43,58,.18)]">
              <span className="h-4 w-4 rounded-full border-[3px] border-[#f5f0e7] border-r-transparent rotate-45" />
              <span className="absolute bottom-[9px] right-[8px] h-1.5 w-1.5 rounded-full bg-[#f2745d]" />
            </span>
            <span><span className="block text-[11px] font-extrabold uppercase tracking-[.18em] text-[#6b7980]">Pulse</span><span className="block text-[11px] font-medium text-[#96a0a2]">your day, in focus</span></span>
          </button>
          <button className="pressable grid h-10 w-10 place-items-center rounded-full border border-[#ddd8cd] bg-[#faf8f2] text-[#53636a] hover:border-[#17a8b8]" onClick={() => { setIsSettingsOpen(true); if (haptics) bridge.impact(); }} aria-label="Open settings" data-testid="button-open-settings">
            <Settings2 size={18} strokeWidth={1.8} />
          </button>
        </header>

        <section className="mt-11 stagger-in stagger-1">
          <p className="font-mono-custom text-[11px] font-medium uppercase tracking-[.12em] text-[#17a8b8]" data-testid="text-date">{todayLabel}</p>
          <div className="mt-3 flex items-end justify-between gap-4">
            <div><h1 className="max-w-[20rem] text-[2.2rem] font-extrabold leading-[1.05] tracking-[-.055em] text-[#102b3a] sm:text-[2.8rem]" data-testid="text-greeting">Good morning, {firstName}.</h1><p className="mt-3 text-[14px] leading-6 text-[#6b7980]" data-testid="text-nudge">{nudge}</p></div>
            <div className="relative mb-1 h-[68px] w-[68px] shrink-0">
              <svg viewBox="0 0 42 42" className="h-full w-full -rotate-90" aria-label={`${completion}% complete`} role="img">
                <circle cx="21" cy="21" r="17" fill="none" stroke="#e0ddd4" strokeWidth="4" />
                <circle cx="21" cy="21" r="17" fill="none" stroke="#17a8b8" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${completion * 1.068} 108`} />
              </svg>
              <span className="absolute inset-0 grid place-items-center font-mono-custom text-[11px] font-medium text-[#102b3a]" data-testid="text-completion">{completion}%</span>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-3 sm:grid-cols-[1.3fr_.7fr] stagger-in stagger-2">
          <button className={`pressable relative overflow-hidden rounded-[1.7rem] p-5 text-left shadow-[0_12px_28px_rgba(16,43,58,.09)] ${isFocusOn ? 'bg-[#102b3a] text-[#faf8f2]' : 'bg-[#17a8b8] text-[#f8fcfa]'}`} onClick={() => { setIsFocusOn((current) => !current); feedback(isFocusOn ? 'Focus mode paused.' : 'Focus mode on.', 'medium'); }} aria-pressed={isFocusOn} data-testid="button-focus-mode">
            <span className="absolute -right-5 -top-8 h-28 w-28 rounded-full border-[18px] border-white/10" /><span className="absolute -bottom-10 right-16 h-24 w-24 rounded-full border-[12px] border-white/10" />
            <span className="relative flex items-start justify-between"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white/15"><Timer size={19} strokeWidth={1.8} /></span><ArrowUpRight size={18} className="opacity-70" /></span>
            <span className="relative mt-8 block text-[17px] font-extrabold tracking-[-.03em]">{isFocusOn ? 'Focus mode is on' : 'Make room for focus'}</span>
            <span className="relative mt-1 block text-[12px] text-white/70">{isFocusOn ? '25 min · interruptions off' : 'One quiet block, whenever you need it'}</span>
          </button>
          <button className="pressable rounded-[1.7rem] border border-[#ded9cf] bg-[#faf8f2] p-5 text-left hover:border-[#f2745d]" onClick={logWater} aria-label={`Log water, ${waterCount} of 8 glasses`} data-testid="button-log-water">
            <span className="flex items-start justify-between"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#fcede7] text-[#f2745d]"><Droplets size={19} strokeWidth={1.8} /></span><span className="font-mono-custom text-[11px] text-[#9aa1a0]" data-testid="text-water-count">{waterCount}/8</span></span>
            <span className="mt-8 block text-[17px] font-extrabold tracking-[-.03em] text-[#102b3a]">Water break</span>
            <span className="mt-1 block text-[12px] text-[#6b7980]">Tap to log a glass</span>
          </button>
        </section>

        <nav className="mt-9 flex rounded-2xl bg-[#e8e4db] p-1" aria-label="Main views">
          <button className={`pressable flex-1 rounded-xl px-4 py-2.5 text-[13px] font-bold ${view === 'today' ? 'bg-[#faf8f2] text-[#102b3a] shadow-sm' : 'text-[#748187]'}`} onClick={() => { setView('today'); if (haptics) bridge.impact(); }} aria-selected={view === 'today'} data-testid="button-view-today"><ListChecks size={16} className="mr-2 inline-block -mt-0.5" />Today</button>
          <button className={`pressable flex-1 rounded-xl px-4 py-2.5 text-[13px] font-bold ${view === 'activity' ? 'bg-[#faf8f2] text-[#102b3a] shadow-sm' : 'text-[#748187]'}`} onClick={() => { setView('activity'); if (haptics) bridge.impact(); }} aria-selected={view === 'activity'} data-testid="button-view-activity"><Activity size={16} className="mr-2 inline-block -mt-0.5" />Activity</button>
        </nav>

        {view === 'today' ? (
          <section className="mt-7 stagger-in" aria-label="Today's tasks">
            <div className="flex items-end justify-between"><div><p className="font-mono-custom text-[10px] uppercase tracking-[.16em] text-[#9aa1a0]">Your rhythm</p><h2 className="mt-1 text-xl font-extrabold tracking-[-.04em] text-[#102b3a]" data-testid="text-task-heading">{completed} of {tasks.length} complete</h2></div><span className="rounded-full bg-[#dff5f3] px-3 py-1.5 text-[11px] font-bold text-[#128a98]" data-testid="status-task-count">{tasks.length === 0 ? 'Fresh start' : `${tasks.length} items`}</span></div>
            {tasks.length === 0 ? (
              <div className="mt-4 rounded-[1.6rem] border border-dashed border-[#c8d5d1] bg-[#edf8f6] px-6 py-10 text-center" data-testid="empty-tasks">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#d7f0ec] text-[#128a98]"><CheckCircle2 size={23} strokeWidth={1.8} /></span><h3 className="mt-4 text-base font-extrabold text-[#102b3a]">A clean slate</h3><p className="mx-auto mt-1 max-w-[230px] text-[13px] leading-5 text-[#6b7980]">Add one small thing and give your day a place to begin.</p>
              </div>
            ) : (
              <div className="mt-4 space-y-2.5">{tasks.map((task, index) => (
                <TaskRow key={task.id} task={task} index={index} onToggle={toggleTask} />
              ))}</div>
            )}
            <button className="pressable mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#c5cbc5] bg-transparent py-3.5 text-[13px] font-bold text-[#53636a] hover:border-[#17a8b8] hover:text-[#128a98]" onClick={() => setIsComposerOpen(true)} data-testid="button-add-task"><Plus size={17} />Add a quick task</button>
          </section>
        ) : (
          <ActivityView activity={activity} onReset={resetDemo} />
        )}

        <footer className="mt-11 flex items-center justify-between border-t border-[#e0ddd4] pt-5 text-[11px] text-[#9aa1a0]">
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#17a8b8]" />Saved on this device</span>
          <span className="font-mono-custom">PULSE / 01</span>
        </footer>
      </div>

      {isComposerOpen && <div className="fixed inset-0 z-30 flex items-end justify-center bg-[#102b3a]/25 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="quick-task-title" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsComposerOpen(false); }}>
        <div className="w-full max-w-[680px] rounded-[1.8rem] bg-[#faf8f2] p-5 shadow-[0_20px_60px_rgba(16,43,58,.2)] stagger-in">
          <div className="flex items-center justify-between"><div><p className="font-mono-custom text-[10px] uppercase tracking-[.16em] text-[#17a8b8]">Quick capture</p><h2 id="quick-task-title" className="mt-1 text-xl font-extrabold tracking-[-.04em] text-[#102b3a]">What belongs in today?</h2></div><button className="pressable grid h-9 w-9 place-items-center rounded-full bg-[#ece8df] text-[#6b7980]" onClick={() => setIsComposerOpen(false)} aria-label="Close quick task form" data-testid="button-close-composer"><X size={17} /></button></div>
          <input autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') addTask(); }} className="mt-5 w-full rounded-2xl border border-[#d8d5cb] bg-[#f3f0e8] px-4 py-3.5 text-[14px] text-[#102b3a] outline-none transition focus:border-[#17a8b8] focus:bg-[#faf8f2]" placeholder="e.g. Send the booking link" aria-label="Quick task" data-testid="input-quick-task" />
          <button className="pressable mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#102b3a] py-3.5 text-[13px] font-bold text-[#f8f5ed] disabled:cursor-not-allowed disabled:opacity-40" onClick={addTask} disabled={!draft.trim()} data-testid="button-save-task"><Plus size={17} />Add to today</button>
        </div>
      </div>}

      {isSettingsOpen && <div className="fixed inset-0 z-30 flex items-end justify-center bg-[#102b3a]/25 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="settings-title" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsSettingsOpen(false); }}>
        <div className="w-full max-w-[680px] rounded-[1.8rem] bg-[#faf8f2] p-5 shadow-[0_20px_60px_rgba(16,43,58,.2)] stagger-in">
          <div className="flex items-center justify-between"><div><p className="font-mono-custom text-[10px] uppercase tracking-[.16em] text-[#f2745d]">Small settings</p><h2 id="settings-title" className="mt-1 text-xl font-extrabold tracking-[-.04em] text-[#102b3a]">Make it yours.</h2></div><button className="pressable grid h-9 w-9 place-items-center rounded-full bg-[#ece8df] text-[#6b7980]" onClick={() => setIsSettingsOpen(false)} aria-label="Close settings" data-testid="button-close-settings"><X size={17} /></button></div>
          <div className="mt-5 divide-y divide-[#e0ddd4] rounded-2xl border border-[#e0ddd4] bg-[#f5f2ea]">
            <SettingRow icon={<BellRing size={17} />} title="Tactile feedback" description="A soft nudge for completed actions" enabled={haptics} onToggle={() => setHaptics((current) => !current)} testId="button-toggle-haptics" />
            <SettingRow icon={<PanelTop size={17} />} title="Telegram connection" description={bridge.isTelegram ? 'Connected to the Mini App bridge' : 'Running in browser preview'} enabled={bridge.isTelegram} onToggle={() => feedback(bridge.isTelegram ? 'Telegram bridge is active.' : 'Preview mode is active.')} testId="button-telegram-status" />
          </div>
          <button className="pressable mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-[12px] font-bold text-[#9b6860] hover:bg-[#fcede7]" onClick={resetDemo} data-testid="button-reset-demo"><RotateCcw size={15} />Clear demo data</button>
        </div>
      </div>}

      {toast && <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#102b3a] px-4 py-2.5 text-[12px] font-bold text-[#f8f5ed] shadow-[0_12px_30px_rgba(16,43,58,.2)] stagger-in" role="status" data-testid="status-toast">{toast}</div>}
    </main>
  );
}

function TaskRow({ task, index, onToggle }: { task: { id: string; title: string; meta: string; kind: string; complete: boolean }; index: number; onToggle: (id: string) => void }) {
  const icon = task.kind === 'focus' ? <Zap size={16} /> : task.kind === 'move' ? <Activity size={16} /> : task.kind === 'personal' ? <Droplets size={16} /> : <Clock3 size={16} />;
  return <div className={`stagger-in stagger-${Math.min(index + 1, 4)} group flex items-center gap-3 rounded-[1.35rem] border px-4 py-3.5 transition ${task.complete ? 'border-[#d9ece7] bg-[#edf8f6]' : 'border-[#e0ddd4] bg-[#faf8f2] hover:border-[#b9deda]'}`} data-testid={`card-task-${task.id}`}>
    <button className={`pressable grid h-9 w-9 shrink-0 place-items-center rounded-xl border ${task.complete ? 'border-[#17a8b8] bg-[#17a8b8] text-white' : 'border-[#c6ceca] bg-[#f3f0e8] text-transparent hover:border-[#17a8b8]'}`} onClick={() => onToggle(task.id)} aria-label={task.complete ? `Mark ${task.title} incomplete` : `Mark ${task.title} complete`} aria-pressed={task.complete} data-testid={`button-toggle-task-${task.id}`}>{task.complete ? <Check className="check-path" size={17} strokeWidth={2.5} /> : <Circle size={16} strokeWidth={1.4} />}</button>
    <div className={`min-w-0 flex-1 ${task.complete ? 'opacity-55' : ''}`}><p className={`truncate text-[13px] font-bold ${task.complete ? 'text-[#587777] line-through' : 'text-[#102b3a]'}`} data-testid={`text-task-title-${task.id}`}>{task.title}</p><p className="mt-1 flex items-center gap-1.5 text-[10px] font-medium text-[#929b9a]" data-testid={`text-task-meta-${task.id}`}>{icon}{task.meta}</p></div>
    {!task.complete && <span className="opacity-0 transition group-hover:opacity-100"><ChevronRight size={16} className="text-[#a4aeaa]" /></span>}
  </div>;
}

function ActivityView({ activity, onReset }: { activity: { id: string; title: string; detail: string; time: string; tone: string }[]; onReset: () => void }) {
  return <section className="mt-7 stagger-in" aria-label="Your activity">
    <div className="flex items-end justify-between"><div><p className="font-mono-custom text-[10px] uppercase tracking-[.16em] text-[#9aa1a0]">A little proof</p><h2 className="mt-1 text-xl font-extrabold tracking-[-.04em] text-[#102b3a]" data-testid="text-activity-heading">Your recent motion</h2></div><ChartNoAxesColumnIncreasing size={22} className="text-[#17a8b8]" /></div>
    <div className="mt-5 rounded-[1.6rem] bg-[#102b3a] p-5 text-[#f8f5ed]"><div className="flex items-start justify-between"><div><p className="font-mono-custom text-[10px] uppercase tracking-[.16em] text-[#84d8d2]">This week</p><p className="mt-2 text-[29px] font-extrabold tracking-[-.06em]" data-testid="text-weekly-focus">2h 15m</p><p className="mt-1 text-[12px] text-[#b7c4c3]">of intentional time</p></div><span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold text-[#bfe9e5]">+18 min</span></div><div className="mt-6 flex h-20 items-end gap-2" aria-label="Weekly activity chart">{[28, 42, 35, 60, 48, 72, 36].map((height, index) => <div className="flex flex-1 flex-col items-center gap-2" key={index}><div className={`w-full rounded-t-md ${index === 5 ? 'bg-[#f2745d]' : 'bg-[#56c8c5]/70'}`} style={{ height: `${height}%` }} data-testid={`bar-activity-${index}`} /><span className="font-mono-custom text-[9px] text-[#829795]">{['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]}</span></div>)}</div></div>
    {activity.length === 0 ? <div className="mt-4 rounded-[1.6rem] border border-dashed border-[#c8d5d1] bg-[#edf8f6] px-6 py-10 text-center" data-testid="empty-activity"><Activity size={22} className="mx-auto text-[#17a8b8]" /><h3 className="mt-3 text-base font-extrabold text-[#102b3a]">Your story starts here</h3><p className="mt-1 text-[13px] text-[#6b7980]">Complete a task to see it show up.</p></div> : <div className="mt-5 space-y-1">{activity.map((item) => <div className="flex gap-3 rounded-2xl px-1 py-3" key={item.id} data-testid={`activity-item-${item.id}`}><span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${item.tone === 'teal' ? 'bg-[#17a8b8]' : item.tone === 'coral' ? 'bg-[#f2745d]' : 'bg-[#102b3a]'}`} /><div className="min-w-0 flex-1"><p className="text-[13px] font-bold text-[#102b3a]">{item.title}</p><p className="mt-0.5 truncate text-[12px] text-[#718083]">{item.detail}</p></div><span className="shrink-0 pt-0.5 font-mono-custom text-[10px] text-[#a2aaa7]">{item.time}</span></div>)}</div>}
    <button className="pressable mt-5 flex items-center gap-2 text-[11px] font-bold text-[#9b6860] hover:text-[#f2745d]" onClick={onReset} data-testid="button-reset-activity"><RotateCcw size={14} />Reset demo activity</button>
  </section>;
}

function SettingRow({ icon, title, description, enabled, onToggle, testId }: { icon: ReactNode; title: string; description: string; enabled: boolean; onToggle: () => void; testId: string }) {
  return <div className="flex items-center gap-3 px-4 py-3.5"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e5f3f0] text-[#148d99]">{icon}</span><span className="min-w-0 flex-1"><span className="block text-[13px] font-bold text-[#102b3a]">{title}</span><span className="mt-0.5 block truncate text-[11px] text-[#7b8787]">{description}</span></span><button className={`relative h-6 w-11 rounded-full transition-colors ${enabled ? 'bg-[#17a8b8]' : 'bg-[#c9cfca]'}`} onClick={onToggle} role="switch" aria-checked={enabled} aria-label={title} data-testid={testId}><span className={`absolute top-1 h-4 w-4 rounded-full bg-[#faf8f2] shadow-sm transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} /></button></div>;
}

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
