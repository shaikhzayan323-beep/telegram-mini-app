import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  ArrowDownToLine,
  ArrowUpRight,
  Bell,
  Check,
  CircleDollarSign,
  Copy,
  Gift,
  History,
  Info,
  Layers3,
  Play,
  Plus,
  RefreshCw,
  Trash2,
  Settings2,
  Share2,
  ShieldCheck,
  UsersRound,
  WalletCards,
  X,
  Zap,
} from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { createTelegramBridge } from '@/lib/telegram';
import { showAdsgramRewardedAd } from '@/lib/adsgram';
import { createReferralProfile, REFERRAL_REWARD, type ReferralProfile } from '@/lib/referrals';
import { Route, Switch, Router as WouterRouter, useLocation } from 'wouter';

const queryClient = new QueryClient();
const STORAGE_KEY = 'usdt-mining-wallet-demo-v1';

type Tab = 'wallet' | 'earn' | 'history' | 'referral';
type Task = {
  id: string;
  title: string;
  description: string;
  amount: number;
  duration: string;
  claimed: boolean;
enabled: boolean;
kind: 'video' | 'check';
};
type HistoryItem = {
  id: string;
  title: string;
  detail: string;
  amount: number;
  time: string;
  positive: boolean;
};
type DemoState = {
  balance: number;
  tasks: Task[];
  history: HistoryItem[];
  haptics: boolean;
  dailyCheckInDate: string;
  referrals: ReferralProfile;
};

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const initialTasks: Task[] = [
  { id: 'daily-check', title: 'Daily Check-in', description: 'Claim today’s demo reward', amount: 0.24, duration: '5 sec', claimed: false, enabled: true, kind: 'check' },
  { id: 'watch-brief', title: 'Watch a Short Ad', description: 'Complete a rewarded demo ad', amount: 0.38, duration: '15 sec', claimed: false, enabled: true, kind: 'video' },
  { id: 'rewarded-2', title: 'Watch Rewarded Ad 2', description: 'Complete a rewarded demo ad', amount: 0.42, duration: '15 sec', claimed: false, enabled: true, kind: 'video' },
  { id: 'rewarded-3', title: 'Watch Rewarded Ad 3', description: 'Complete a rewarded demo ad', amount: 0.46, duration: '20 sec', claimed: false, enabled: true, kind: 'video' },
  { id: 'rewarded-4', title: 'Watch Rewarded Ad 4', description: 'Complete a rewarded demo ad', amount: 0.52, duration: '20 sec', claimed: false, enabled: true, kind: 'video' },
  { id: 'rewarded-5', title: 'Watch Rewarded Ad 5', description: 'Complete a rewarded demo ad', amount: 0.58, duration: '25 sec', claimed: false, enabled: true, kind:'video' },
  { id: 'community-visit', title: 'Partner Ad', description: 'Complete a partner demo ad', amount: 0.31, duration: '15 sec', claimed: false, enabled: true, kind:'video' },
  { id: 'sponsored-task', title: 'Sponsored Task', description: 'Complete a sponsored demo ad', amount: 0.64, duration: '25 sec', claimed: false, enabled: true, kind: 'video' },
];

const initialHistory: HistoryItem[] = [
  { id: 'welcome', title: 'Demo balance initialized', detail: 'Starting wallet balance', amount: 12.482, time: 'Today, 09:12', positive: true },
  { id: 'starter', title: 'Starter reward', detail: 'Demo welcome allocation', amount: 2.5, time: 'Yesterday, 18:40', positive: true },
];

const initialState: DemoState = {
  balance: 12.482,
  tasks: initialTasks,
  history: initialHistory,
  haptics: true,
  dailyCheckInDate: getLocalDateKey(),
  referrals: {
    code: '',
    link: '',
    count: 0,
    earnings: 0,
    referredBy: null,
    referredUserIds: [],
    creditedCount: 0,
  },
};

function Home() {
  const bridge = useMemo(() => createTelegramBridge(), []);
  const [state, setState] = useState<DemoState>(initialState);
  const [tab, setTab] = useState<Tab>('wallet');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);const [watchingTask, setWatchingTask] = useState<string | null>(null);
  const watchingTaskRef = useRef<string | null>(null);
  const rewardedTaskRef = useRef(new Set<string>());
  const [adProgress, setAdProgress] = useState(0);

  useEffect(() => {
    bridge.ready();
    bridge.expand();
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const timer = window.setTimeout(() => {
      if (stored) {
        try {
          const storedState = JSON.parse(stored) as Partial<DemoState>;
          const storedTasks = Array.isArray(storedState.tasks) ? storedState.tasks : [];
          const referralProfile = createReferralProfile(bridge.userId, bridge.startParam, storedState.referrals);
          const referralRewardsToCredit = Math.max(0, referralProfile.count - referralProfile.creditedCount);
          const referralHistory = Array.from({ length: referralRewardsToCredit }, (_, index) => ({
            id: `referral-${referralProfile.creditedCount + index + 1}`,
            title: 'Referral reward',
            detail: 'DEMO referral bonus',
            amount: REFERRAL_REWARD,
            time: 'Just now',
            positive: true,
          }));
          const hydratedState: DemoState = {
            ...initialState,
            ...storedState,
            balance: Number(((typeof storedState.balance === 'number' ? storedState.balance : initialState.balance) + referralRewardsToCredit * REFERRAL_REWARD).toFixed(4)),
            tasks: initialTasks.map((task) => {
              const storedTask = storedTasks.find((candidate) => candidate.id === task.id);
              return storedTask ? { ...task, claimed: storedTask.claimed === true } : task;
            }),
            history: [...referralHistory, ...(Array.isArray(storedState.history) ? storedState.history : initialState.history)].slice(0, 8),
            referrals: { ...referralProfile, creditedCount: referralProfile.count },
          };
          const today = getLocalDateKey();
          if (hydratedState.dailyCheckInDate !== today) {
            hydratedState.tasks = hydratedState.tasks.map((task) => task.id === 'daily-check' ? { ...task, claimed: false } : task);
            hydratedState.dailyCheckInDate = today;
          }
          setState(hydratedState);
        } catch {
          setState(initialState);
        }
      }
      setLoading(false);
    }, 260);
    return () => window.clearTimeout(timer);
  }, [bridge]);

  useEffect(() => {
    if (!loading) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, loading]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const earned = useMemo(() => state.history.filter((item) => item.positive).reduce((total, item) => total + item.amount, 0), [state.history]);
  const claimedCount = state.tasks.filter((task) => task.claimed).length;
  const taskProgress = Math.round((claimedCount / state.tasks.length) * 100);

  function feedback(message: string, impact: 'light' | 'medium' = 'light') {
    if (state.haptics) bridge.impact(impact);
    setToast(message);
  }

  function selectTab(nextTab: Tab) {
    setTab(nextTab);
    window.setTimeout(() => document.getElementById(nextTab === 'wallet' ? 'top' : nextTab)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
    if (state.haptics) bridge.impact('light');
  }

  function creditDemoReward(task: Task) {
    if (rewardedTaskRef.current.has(task.id)) return;
    rewardedTaskRef.current.add(task.id);

    setState((current) => ({
      ...current,
      balance: current.tasks.some((item) => item.id === task.id && !item.claimed)
        ? Number((current.balance + task.amount).toFixed(4))
        : current.balance,
      tasks: current.tasks.map((item) => item.id === task.id ? { ...item, claimed: true } : item),
      history: current.tasks.some((item) => item.id === task.id && !item.claimed)
        ? [{
            id: `task-${Date.now()}`,
            title: task.title,
            detail: 'DEMO reward credited',
            amount: task.amount,
            time: 'Just now',
            positive: true,
          }, ...current.history].slice(0, 8)
        : current.history,
    }));
  }

  async function watchTask(taskId: string) {
    const task = state.tasks.find((item) => item.id === taskId);
    if (!task || task.claimed || watchingTaskRef.current) return;
    watchingTaskRef.current = taskId;
    setWatchingTask(taskId);
    setAdProgress(1);

    if (task.kind === 'video') {
      setAdProgress(2);
      try {
        const rewarded = await showAdsgramRewardedAd();
        if (rewarded) {
          creditDemoReward(task);
          if (state.haptics) bridge.notification('success');
          setToast(`+${task.amount.toFixed(2)} DEMO USDT added to demo balance`);
        } else {
          setToast('No DEMO reward — the ad was skipped, closed, or unavailable.');
        }
      } catch {
        setToast('No DEMO reward — the ad was skipped, closed, or unavailable.');
      } finally {
        watchingTaskRef.current = null;
        setWatchingTask(null);
        setAdProgress(0);
      }
      return;
    }

    creditDemoReward(task);
    watchingTaskRef.current = null;
    setWatchingTask(null);
    setAdProgress(0);
    if (state.haptics) bridge.notification('success');
    setToast(`+${task.amount.toFixed(2)} DEMO USDT added to demo balance`);
  }

  function resetDemo() {
    window.localStorage.removeItem(STORAGE_KEY);
    watchingTaskRef.current = null;
    rewardedTaskRef.current.clear();
    setState(initialState);
    setSettingsOpen(false);
    feedback('Demo wallet reset on this device.');
  }

  async function copyReferral() {
    const referralLink = state.referrals.link;
    if (!referralLink) {
      feedback('Referral link is still loading.');
      return;
    }
    try {
      await navigator.clipboard.writeText(referralLink);
      feedback('Referral link copied.');
    } catch {
      const input = document.createElement('textarea');
      input.value = referralLink;
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      input.remove();
      feedback('Referral link copied.');
    }
  }

  async function shareReferral() {
    const referralLink = state.referrals.link;
    if (!referralLink) {
      feedback('Referral link is still loading.');
      return;
    }
    if (navigator.share) {
      try {
        await navigator.share({ title: 'USDT MINING WALLET', text: 'Join my demo mining wallet', url: referralLink });
        feedback('Share sheet opened.');
        return;
      } catch {
        // A dismissed native share sheet is not an error for the user.
      }
    }
    await copyReferral();
  }

  if (loading) return <LoadingState />;

  return (
    <main className="app-shell app-grid">
      <div id="top" className="phone-frame app-content safe-bottom px-4 pb-8 pt-4 sm:px-8">
        <header className="flex items-center justify-between stagger-in">
          <button className="pressable flex items-center gap-3 text-left" onClick={() => feedback('Wallet sync is local to this device.')} aria-label="Show wallet status" data-testid="button-wallet-status">
            <span className="grid h-10 w-10 place-items-center rounded-[14px] bg-[#102b3a] text-[#59d79d] shadow-[0_10px_24px_rgba(16,43,58,.16)]">
              <WalletCards size={20} strokeWidth={1.8} />
            </span>
            <span>
              <span className="font-display-custom block text-[12px] font-bold tracking-[.09em] text-[#102b3a]">USDT MINING</span>
              <span className="font-mono-custom block text-[9px] uppercase tracking-[.16em] text-[#71808a]">Wallet / Demo mode</span>
            </span>
      </button>
          <div className="flex items-center gap-2">
  <button
    type="button"
    className="pressable grid h-10 w-10 place-items-center rounded-full border border-[#d8e2e3] bg-[#f9fcfb] text-[#49616c]"
    onClick={() => {
      bridge.fullscreen();
      if (state.haptics) bridge.impact('light');
    }}
    aria-label="Enter fullscreen"
    data-testid="button-fullscreen"
  >
    <span className="text-[18px]">⛶</span>
  </button>

  <button
    type="button"
    className="pressable grid h-10 w-10 place-items-center rounded-full border border-[#d8e2e3] bg-[#f9fcfb] text-[#49616c]"
    onClick={() => {
      setProfileOpen(true);
      if (state.haptics) bridge.impact();
    }}
    aria-label="Open profile and settings"
    data-testid="button-open-profile"
  >
    <span className="font-display-custom text-[13px] font-bold">ME</span>
  </button>
</div>
          
        </header>

        <section className="mt-7 stagger-in stagger-1" aria-label="Wallet overview">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="font-mono-custom text-[10px] uppercase tracking-[.18em] text-[#1b9b68]">Available demo balance</p>
              <div className="mt-2 flex items-baseline gap-2">
                <h1 className="font-display-custom text-[2.85rem] font-bold leading-none tracking-[-.075em] text-[#102b3a]" data-testid="text-balance">{state.balance.toFixed(4)}</h1>
                <span className="font-mono-custom text-[14px] font-medium text-[#71808a]">USDT</span>
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-[#75848d]" data-testid="text-balance-status"><ShieldCheck size={13} className="text-[#1b9b68]" />Stored locally · no real funds</p>
            </div>
            <div className="mb-1 rounded-2xl border border-[#c9ebda] bg-[#ecfbf3] px-3 py-2 text-right">
              <p className="font-mono-custom text-[9px] uppercase tracking-[.14em] text-[#4e8970]">Earned</p>
              <p className="mt-0.5 font-display-custom text-[17px] font-bold text-[#16845a]" data-testid="text-earned">+{earned.toFixed(2)}</p>
            </div>
          </div>
          <div className="mt-5 overflow-hidden rounded-[1.65rem] bg-[#102b3a] p-5 text-[#f4fbf7] shadow-[0_15px_34px_rgba(16,43,58,.17)]">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono-custom text-[9px] uppercase tracking-[.18em] text-[#73d8ac]">Mining rate</p>
                <p className="mt-1.5 font-display-custom text-[23px] font-bold tracking-[-.04em]">0.80 <span className="font-mono-custom text-[11px] font-normal text-[#a7c4bd]">USDT / task</span></p>
              </div>
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#173e46] text-[#63d7a5]"><Zap size={17} fill="currentColor" /></span>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/10 pt-4">
              <WalletStat label="Tasks done" value={`${claimedCount}/${state.tasks.length}`} />
              <WalletStat label="Referrals" value={String(state.referrals.count).padStart(2, '0')} />
              <WalletStat label="Network" value="Demo" />
            </div>
          </div>
        </section>

        <div className="mt-6 flex gap-2 overflow-x-auto hide-scrollbar rounded-2xl bg-[#e4eef0] p-1" role="tablist" aria-label="Wallet sections">
          <TabButton active={tab === 'wallet'} label="Wallet" icon={<Layers3 size={15} />} onClick={() => selectTab('wallet')} testId="button-tab-wallet" />
          <TabButton active={tab === 'earn'} label="Earn" icon={<CircleDollarSign size={15} />} onClick={() => selectTab('earn')} testId="button-tab-earn" />
          <TabButton active={tab === 'history'} label="History" icon={<History size={15} />} onClick={() => selectTab('history')} testId="button-tab-history" />
          <TabButton active={tab === 'referral'} label="Referrals" icon={<UsersRound size={15} />} onClick={() => selectTab('referral')} testId="button-tab-referrals" />
        </div>

        {(tab === 'wallet' || tab === 'earn') && (
          <section id="earn" className="mt-8 stagger-in stagger-2" aria-label="Earn tasks">
            <SectionHeading eyebrow="Daily earning loop" title="Complete tasks" action={`${claimedCount} of ${state.tasks.length}`} />
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#dce8e5]"><div className="h-full rounded-full bg-[#1daf73] transition-all duration-500" style={{ width: `${taskProgress}%` }} /></div>
            <div className="task-list-scroll mt-4 max-h-[520px] space-y-2.5 overflow-y-auto pr-1" data-testid="task-list">
              {state.tasks.map((task, index) => <TaskCard key={task.id} task={task} index={index} watching={watchingTask === task.id} progress={adProgress} onWatch={watchTask} />)}
            </div>
          </section>
        )}

        {(tab === 'wallet' || tab === 'earn') && (
          <section className="mt-7 stagger-in stagger-3" aria-label="Withdraw demo funds">
            <div className="flex items-center justify-between">
              <div><p className="font-mono-custom text-[10px] uppercase tracking-[.16em] text-[#82919a]">Cash out</p><h2 className="mt-1 font-display-custom text-[20px] font-bold tracking-[-.045em] text-[#102b3a]">Withdraw USDT</h2></div>
              <ArrowDownToLine size={20} className="text-[#e8833d]" />
            </div>
            <div className="mt-3 rounded-[1.45rem] border border-[#f1ddc9] bg-[#fff7ef] p-4">
              <div className="flex gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#ffe9d8] text-[#da702c]"><Info size={17} /></span><div><p className="text-[12px] font-bold text-[#734425]">Demo preview only</p><p className="mt-1 text-[11px] leading-5 text-[#936d51]">Transfers, wallet connections, and payment APIs are disabled. Nothing can leave this browser.</p></div></div>
              <button className="pressable mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[#edc9aa] bg-[#fffaf5] py-3 text-[12px] font-bold text-[#aa5e2a] hover:border-[#da702c]" onClick={() => { setWithdrawOpen(true); if (state.haptics) bridge.impact(); }} data-testid="button-preview-withdraw"><ArrowUpRight size={15} />Preview withdrawal flow</button>
            </div>
          </section>
        )}

        {(tab === 'wallet' || tab === 'history') && <ActivitySection history={state.history} />}
        {tab === 'referral' && <ReferralPage profile={state.referrals} onCopy={copyReferral} onShare={shareReferral} />}

        <footer className="mt-9 flex items-center justify-between border-t border-[#d8e2e3] pt-5 text-[10px] text-[#82919a]">
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#1daf73]" />Demo data stays on this device</span>
          <span className="font-mono-custom tracking-[.12em]">MW / 01</span>
        </footer>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-[#d8e2e3] bg-[#f1f7f6]/95 px-4 py-2.5 backdrop-blur-md sm:hidden" aria-label="Bottom navigation">
        <div className="mx-auto flex max-w-[520px] items-center justify-around">
          <BottomNavButton active={tab === 'wallet'} icon={<WalletCards size={18} />} label="Wallet" onClick={() => selectTab('wallet')} testId="button-bottom-wallet" />
          <BottomNavButton active={tab === 'earn'} icon={<Gift size={18} />} label="Earn" onClick={() => selectTab('earn')} testId="button-bottom-earn" />
          <BottomNavButton active={tab === 'referral'} icon={<UsersRound size={18} />} label="Refer" onClick={() => selectTab('referral')} testId="button-bottom-referrals" />
          <BottomNavButton active={tab === 'history'} icon={<History size={18} />} label="History" onClick={() => selectTab('history')} testId="button-bottom-history" />
          <BottomNavButton active={profileOpen} icon={<Settings2 size={18} />} label="Profile" onClick={() => setProfileOpen(true)} testId="button-bottom-profile" />
        </div>
      </nav>

            {profileOpen && (
        <ProfileSheet
          bridge={bridge}
          haptics={state.haptics}
          onToggleHaptics={() =>
            setState((current) => ({
              ...current,
              haptics: !current.haptics,
            }))
          }
          onReset={resetDemo}
onClose={() => setProfileOpen(false)}
onAdmin={() => setAdminOpen(true)}
/>
      )}
      {adminOpen && (
        <AdminPanel
          tasks={state.tasks}
          onTasksChange={(tasks) =>
            setState((current) => ({
              ...current,
              tasks,
            }))
          }
          onResetTasks={() =>
            setState((current) => ({
              ...current,
              tasks: initialTasks.map((task) => ({ ...task })),
            }))
          }
          onResetDemo={resetDemo}
          onClose={() => setAdminOpen(false)}
        />
      )}
      {withdrawOpen && (
        <Modal
          title="Withdrawal preview"
          eyebrow="Safe demo boundary"
          onClose={() => setWithdrawOpen(false)}
        >
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#fff0e2] text-[#d87532]">
            <ArrowDownToLine size={22} />
          </div>

          <h3 className="mt-4 font-display-custom text-[22px] font-bold tracking-[-.05em] text-[#102b3a]">
            Nothing leaves your wallet.
          </h3>

          <p className="mt-2 text-[13px] leading-6 text-[#6d7c83]">
            This experience is a local product demo. A real withdrawal would
            require identity checks, a destination address, and a secure
            payment service — none of those are connected here.
          </p>

          <button
            className="pressable mt-5 w-full rounded-2xl bg-[#102b3a] py-3.5 text-[13px] font-bold text-[#f4fbf7]"
            onClick={() => {
              setWithdrawOpen(false);
              feedback('Withdrawal remains unavailable in demo mode.');
            }}
            data-testid="button-close-withdraw-preview"
          >
            Got it
          </button>
        </Modal>
      )}

      {toast && (
        <div
          className="fixed bottom-[78px] left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#102b3a] px-4 py-2.5 text-[11px] font-bold text-[#f4fbf7] shadow-[0_12px_30px_rgba(16,43,58,.22)] sm:bottom-5"
          role="status"
          data-testid="status-toast"
        >
          {toast}
        </div>
      )}
      {toast && <div className="fixed bottom-[78px] left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#102b3a] px-4 py-2.5 text-[11px] font-bold text-[#f4fbf7] shadow-[0_12px_30px_rgba(16,43,58,.22)] sm:bottom-5" role="status" data-testid="status-toast">{toast}</div>}
    </main>
  );
}

function LoadingState() {
  return <main className="app-shell app-grid min-h-[100dvh]"><div className="phone-frame px-4 pb-8 pt-5 sm:px-8"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="skeleton h-10 w-10 rounded-[14px]" /><div><div className="skeleton h-3 w-32 rounded-full" /><div className="skeleton mt-2 h-2 w-24 rounded-full" /></div></div><div className="skeleton h-10 w-10 rounded-full" /></div><div className="mt-10 space-y-3"><div className="skeleton h-3 w-36 rounded-full" /><div className="skeleton h-12 w-64 rounded-xl" /><div className="skeleton h-3 w-48 rounded-full" /></div><div className="skeleton mt-6 h-44 rounded-[1.65rem]" /><div className="skeleton mt-6 h-11 rounded-2xl" /><div className="mt-5 space-y-3"><div className="skeleton h-20 rounded-3xl" /><div className="skeleton h-20 rounded-3xl" /><div className="skeleton h-20 rounded-3xl" /></div></div></main>;
}

function WalletStat({ label, value }: { label: string; value: string }) {
  return <div><p className="font-mono-custom text-[9px] text-[#8eafa6]">{label}</p><p className="mt-1 font-display-custom text-[14px] font-bold text-[#f4fbf7]">{value}</p></div>;
}

function SectionHeading({ eyebrow, title, action }: { eyebrow: string; title: string; action?: string }) {
  return <div className="flex items-end justify-between"><div><p className="font-mono-custom text-[10px] uppercase tracking-[.16em] text-[#82919a]">{eyebrow}</p><h2 className="mt-1 font-display-custom text-[21px] font-bold tracking-[-.05em] text-[#102b3a]">{title}</h2></div>{action && <span className="rounded-full bg-[#e3f7ec] px-3 py-1.5 font-mono-custom text-[10px] text-[#18845b]">{action}</span>}</div>;
}

function TaskCard({ task, index, watching, progress, onWatch }: { task: Task; index: number; watching: boolean; progress: number; onWatch: (id: string) => void }) {
  const icon = task.kind === 'video' ? <Play size={16} fill="currentColor" /> : <Check size={17} />;
  const status = watching ? 'In progress' : task.claimed ? (task.id === 'daily-check' ? 'Completed today' : 'Completed') : 'Ready';
  const actionLabel = task.kind === 'check' ? 'Claim reward' : 'Watch Ad';
  return <article className={`stagger-in stagger-${Math.min(index + 1, 4)} rounded-[1.35rem] border p-3.5 transition ${task.claimed ? 'border-[#c9ebda] bg-[#f1fbf5]' : 'border-[#d8e2e3] bg-[#fbfdfc] hover:border-[#acd9c2]'}`} data-testid={`card-task-${task.id}`}>
    <div className="flex items-center gap-3">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${task.claimed ? 'bg-[#d9f3e4] text-[#16845a]' : 'bg-[#e8f1f1] text-[#466872]'}`}>{task.claimed ? <Check size={18} strokeWidth={2.5} /> : icon}</span>
      <div className="min-w-0 flex-1"><p className={`truncate text-[13px] font-bold ${task.claimed ? 'text-[#5f8877]' : 'text-[#102b3a]'}`}>{task.title}</p><p className="mt-1 truncate text-[10px] text-[#82919a]">{task.description} · {task.duration}</p></div>
      <div className="shrink-0 text-right"><p className={`font-mono-custom text-[11px] font-medium ${task.claimed ? 'text-[#599477]' : 'text-[#16845a]'}`}>+{task.amount.toFixed(2)} <span className="text-[9px]">DEMO</span></p><p className="font-mono-custom text-[9px] text-[#9aa8ad]">USDT</p></div>
    </div>
    <div className="mt-2 flex items-center justify-between px-0.5"><span className="font-mono-custom text-[9px] uppercase tracking-[.12em] text-[#94a3a6]">Status</span><span className={`font-mono-custom text-[9px] uppercase tracking-[.1em] ${task.claimed ? 'text-[#16845a]' : watching ? 'text-[#d87532]' : 'text-[#71858c]'}`}>{status}</span></div>
    <button className={`pressable mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[11px] font-bold ${task.claimed ? 'cursor-default bg-[#e1f3e8] text-[#5b8c74]' : 'bg-[#102b3a] text-[#f4fbf7] hover:bg-[#173f4b]'} disabled:cursor-wait disabled:opacity-70`} onClick={() => onWatch(task.id)} disabled={task.claimed || watching} data-testid={`button-watch-ad-${task.id}`}>
      {watching ? <><RefreshCw size={14} className="animate-spin" />{progress === 1 ? 'Opening demo…' : progress === 2 ? (task.kind === 'video' ? 'Watching AdsGram…' : 'Claiming demo…') : 'Crediting demo…'}</> : task.claimed ? <><Check size={14} />Completed</> : <><Play size={14} fill="currentColor" />{actionLabel} · +{task.amount.toFixed(2)} DEMO USDT</>}
    </button>
  </article>;
}

function ActivitySection({ history }: { history: HistoryItem[] }) {
  return <section id="history" className="mt-8 stagger-in" aria-label="Transaction and task history"><SectionHeading eyebrow="Proof of activity" title="Recent history" action="Local only" /><div className="mt-3 overflow-hidden rounded-[1.45rem] border border-[#d8e2e3] bg-[#fbfdfc]">{history.length === 0 ? <div className="px-5 py-10 text-center"><History size={22} className="mx-auto text-[#9badb0]" /><p className="mt-3 text-[13px] font-bold text-[#536b72]">No activity yet</p><p className="mt-1 text-[11px] text-[#8a999e]">Complete an earning task to see it here.</p></div> : history.map((item, index) => <div className={`flex items-center gap-3 px-4 py-3.5 ${index > 0 ? 'border-t border-[#e7eeee]' : ''}`} key={item.id} data-testid={`row-history-${item.id}`}><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${item.positive ? 'bg-[#e3f7ec] text-[#16845a]' : 'bg-[#fff0e2] text-[#d87532]'}`}>{item.positive ? <ArrowDownToLine size={16} /> : <ArrowUpRight size={16} />}</span><div className="min-w-0 flex-1"><p className="truncate text-[12px] font-bold text-[#284652]">{item.title}</p><p className="mt-0.5 truncate text-[10px] text-[#88989d]">{item.detail} · {item.time}</p></div><span className={`font-mono-custom text-[11px] font-medium ${item.positive ? 'text-[#16845a]' : 'text-[#d87532]'}`}>{item.positive ? '+' : '-'}{item.amount.toFixed(2)}</span></div>)}</div></section>;
}

function ReferralPage({ profile, onCopy, onShare }: { profile: ReferralProfile; onCopy: () => void; onShare: () => void }) {
  return <section id="referral" className="mt-8 stagger-in stagger-2" aria-label="Referral program">
    <SectionHeading eyebrow="Invite loop" title="Refer & earn" action={`${profile.count} referral${profile.count === 1 ? '' : 's'}`} />
    <div className="mt-4 grid grid-cols-2 gap-2.5">
      <div className="rounded-[1.35rem] border border-[#c9ebda] bg-[#f1fbf5] p-4"><p className="font-mono-custom text-[9px] uppercase tracking-[.14em] text-[#5c8d77]">Referrals</p><p className="mt-1 font-display-custom text-[25px] font-bold tracking-[-.05em] text-[#16845a]" data-testid="text-referral-count">{profile.count}</p><p className="mt-1 text-[10px] text-[#7a9b8c]">Unique DEMO joins</p></div>
      <div className="rounded-[1.35rem] border border-[#ccdcfa] bg-[#f4f7ff] p-4"><p className="font-mono-custom text-[9px] uppercase tracking-[.14em] text-[#58729d]">Earnings</p><p className="mt-1 font-display-custom text-[21px] font-bold tracking-[-.05em] text-[#315986]" data-testid="text-referral-earnings">+{profile.earnings.toFixed(2)}</p><p className="mt-1 font-mono-custom text-[9px] text-[#7892b5]">DEMO USDT</p></div>
    </div>
    <div className="mt-3 overflow-hidden rounded-[1.55rem] bg-[#e8f0ff] p-5">
      <div className="flex items-start justify-between"><div><p className="font-mono-custom text-[10px] uppercase tracking-[.16em] text-[#526fa5]">Your invite link</p><h2 className="mt-1 font-display-custom text-[21px] font-bold tracking-[-.05em] text-[#1d3454]">Bring your circle.</h2></div><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#d8e5ff] text-[#5574ae]"><Gift size={19} /></span></div>
      <p className="mt-2 max-w-[320px] text-[12px] leading-5 text-[#607798]">This link is unique to your Telegram account and uses a DEMO start code.</p>
      <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#ccdcfa] bg-[#f4f7ff] px-3 py-2.5"><span className="min-w-0 flex-1 truncate font-mono-custom text-[10px] text-[#58729d]" data-testid="text-referral-link">{profile.link}</span><button className="pressable shrink-0 rounded-lg p-1.5 text-[#5574ae] hover:bg-[#e3ebff]" onClick={onCopy} aria-label="Copy referral link" data-testid="button-copy-referral"><Copy size={15} /></button></div>
      <div className="mt-4 grid grid-cols-2 gap-2"><button className="pressable flex items-center justify-center gap-2 rounded-xl bg-[#1d3454] py-3 text-[11px] font-bold text-[#f4fbf7]" onClick={onShare} data-testid="button-share-referral"><Share2 size={14} />Share invite</button><button className="pressable flex items-center justify-center gap-2 rounded-xl border border-[#bcd0f3] bg-[#eef3ff] py-3 text-[11px] font-bold text-[#5574ae]" onClick={onCopy} data-testid="button-copy-referral-wide"><Copy size={14} />Copy link</button></div>
    </div>
    <div className="mt-3 rounded-[1.35rem] border border-[#d8e2e3] bg-[#fbfdfc] p-4"><p className="flex items-center gap-2 text-[11px] font-bold text-[#284652]"><ShieldCheck size={15} className="text-[#1b9b68]" />DEMO tracking safeguards</p><p className="mt-2 text-[11px] leading-5 text-[#7a8b91]">{profile.referredBy ? 'You joined through one DEMO referral. Reusing the same invite cannot create another referral.' : 'Each Telegram user can be counted once. Your own link cannot refer back to yourself.'} Referral rewards are local DEMO values only.</p></div>
  </section>;
}

function TabButton({ active, label, icon, onClick, testId }: { active: boolean; label: string; icon: ReactNode; onClick: () => void; testId: string }) {
  return <button className={`pressable flex min-w-[96px] flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-[11px] font-bold ${active ? 'bg-[#fbfdfc] text-[#102b3a] shadow-[0_2px_8px_rgba(16,43,58,.08)]' : 'text-[#71858c]'}`} onClick={onClick} role="tab" aria-selected={active} data-testid={testId}>{icon}{label}</button>;
}

function BottomNavButton({ active, icon, label, onClick, testId }: { active: boolean; icon: ReactNode; label: string; onClick: () => void; testId: string }) {
  return <button className={`pressable flex min-w-[64px] flex-col items-center gap-1 rounded-xl px-3 py-1 text-[10px] font-bold ${active ? 'text-[#16845a]' : 'text-[#819198]'}`} onClick={onClick} data-testid={testId}>{icon}<span>{label}</span></button>;
}

function ProfileSheet({ bridge, haptics, onToggleHaptics, onReset, onClose, onAdmin }: { bridge: ReturnType<typeof createTelegramBridge>; haptics: boolean; onToggleHaptics: () => void; onReset: () => void; onClose: () => void; onAdmin: () => void }) {
  const initials = bridge.firstName.slice(0, 2).toUpperCase();const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
  const username = tgUser?.username ? `@${tgUser.username}` : 'Not available';
  const telegramId = tgUser?.id ? String(tgUser.id) : 'Not available';
  const appVersion = '1.0.0';
  const referralStatus = 'DEMO tracking active';
  return (
  <Modal title="Profile & settings" eyebrow="Personal wallet" onClose={onClose}>
    <div className="flex items-center gap-3 rounded-2xl bg-[#e8f1f1] p-3.5">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#102b3a] font-display-custom text-[13px] font-bold text-[#73d8ac]">
        {initials}
      </span>

      <div className="min-w-0">
        <p
          className="font-display-custom text-[16px] font-bold text-[#102b3a]"
          data-testid="text-telegram-first-name"
        >
          {bridge.firstName || 'Telegram User'}
        </p>

        <p className="mt-0.5 font-mono-custom text-[10px] text-[#7a8b91]">
          {bridge.isTelegram ? 'Telegram connected' : 'Browser preview mode'}
        </p>
      </div>
    </div>

    <div className="mt-4 divide-y divide-[#e3ebeb] overflow-hidden rounded-2xl border border-[#d8e2e3] bg-[#fbfdfc]">

      <SettingRow
        icon={<Bell size={16} />}
        title="Tactile feedback"
        description={haptics ? 'Enabled for wallet actions' : 'Muted in this browser'}
        enabled={haptics}
        onClick={onToggleHaptics}
        testId="button-toggle-haptics"
      />

      <SettingRow
        icon={<ShieldCheck size={16} />}
        title="Telegram connection"
        description={
          bridge.isTelegram
            ? `Connected · ${bridge.firstName || 'User'}`
            : 'Browser preview mode · User fallback'
        }
        enabled={bridge.isTelegram}
        onClick={() => bridge.isTelegram ? bridge.impact('light') : undefined}
        testId="button-telegram-status"
      />
    </div>

    <div className="mt-4 rounded-2xl border border-[#d8e2e3] bg-[#fbfdfc] p-4">
      <p className="font-display-custom text-[12px] font-bold text-[#102b3a]">
        Account information
      </p>

      <div className="mt-3 space-y-3 text-[11px]">
        <div className="flex justify-between gap-3">
          <span className="text-[#819198]">First name</span>
          <span className="font-semibold text-[#102b3a]">
            {bridge.firstName || 'Not available'}
          </span>
        </div>

        <div className="flex justify-between gap-3">
          <span className="text-[#819198]">Telegram status</span>
          <span className="font-semibold text-[#16845a]">
            {bridge.isTelegram ? 'Connected' : 'Preview'}
          </span>
        </div>

        <div className="flex justify-between gap-3">
          <span className="text-[#819198]">App version</span>
          <span className="font-semibold text-[#102b3a]">1.0.0 DEMO</span>
        </div>

        <div className="flex justify-between gap-3">
          <span className="text-[#819198]">Referral status</span>
          <span className="font-semibold text-[#16845a]">DEMO tracking</span>
        </div>
      </div>
    </div>

    <div className="mt-4 rounded-2xl border border-[#d8e2e3] bg-[#f5faf8] p-4">
      <p className="font-display-custom text-[12px] font-bold text-[#16845a]">
        DEMO ONLY
      </p>
      <p className="mt-1 text-[10px] leading-4 text-[#718188]">
        This application uses simulated balances and rewards only.
        No real USDT transfers, withdrawals, or wallet credentials are used.
      </p>
    </div>

    <div className="mt-4 grid grid-cols-2 gap-2">
      {['Help', 'Terms', 'Privacy', 'Contact'].map((label) => (
        <button
          key={label}
          type="button"
          className="pressable rounded-xl border border-[#d8e2e3] bg-[#fbfdfc] py-3 text-[11px] font-bold text-[#102b3a]"
          onClick={() => bridge.impact('light')}
        >
          {label}
        </button>
      ))}
    </div>

    <button
      type="button"
      className="pressable mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[#bcdcca] bg-[#f1fbf5] py-3 text-[11px] font-bold text-[#16845a]"
      onClick={onAdmin}
      data-testid="button-open-demo-admin"
    >
      <Settings2 size={14} />
      Demo Admin
    </button>

    <button
      className="pressable mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[11px] font-bold text-[#b06149] hover:bg-[#fff0e9]"
      onClick={onReset}
      data-testid="button-reset-demo"
    >
      <RefreshCw size={14} />
      Reset local demo data
    </button>
<button
  type="button"
  className="pressable mt-3 flex w-full items-center justify-center rounded-xl bg-[#102b3a] py-3 text-[11px] font-bold text-white"
  onClick={onClose}
  data-testid="button-close-profile"
>
  Close
</button>
    <p className="mt-4 text-center text-[10px] leading-4 text-[#91a0a4]">
      This wallet is simulated. Never enter a seed phrase or connect a real wallet.
    </p>
  </Modal>
);
}


function AdminPanel({
  tasks,
  onTasksChange,
  onResetTasks,
  onResetDemo,
  onClose,
}: {
  tasks: Task[];
  onTasksChange: (tasks: Task[]) => void;
  onResetTasks: () => void;
  onResetDemo: () => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Task[]>(() => tasks.map((task) => ({ ...task })));
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [newTask, setNewTask] = useState<Task>({
    id: '',
    title: '',
    description: '',
    amount: 0.25,
    duration: '15 sec',
    claimed: false,
enabled: true,
kind: 'video',
  });

  useEffect(() => {
    setDraft(tasks.map((task) => ({ ...task })));
  }, [tasks]);

  function updateTask(id: string, field: keyof Task, value: string | number | boolean) {
    const next = draft.map((task) =>
      task.id === id ? ({ ...task, [field]: value } as Task) : task
    );
    setDraft(next);
    onTasksChange(next);
  }

  function removeTask(id: string) {
    const next = draft.filter((task) => task.id !== id);
    setDraft(next);
    onTasksChange(next);
  }

  function addTask() {
    const title = newTask.title.trim();
    if (!title) return;

    const baseId =
      newTask.id.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') ||
      `custom-task-${Date.now()}`;

    const id = draft.some((task) => task.id === baseId)
      ? `${baseId}-${Date.now()}`
      : baseId;

    const task: Task = {
      ...newTask,
      id,
      title,
      description: newTask.description.trim() || 'Complete this demo task',
      amount: Number(Math.max(0, newTask.amount).toFixed(4)),
      duration: newTask.duration.trim() || '15 sec',
      claimed: false,
    };

    const next = [...draft, task];
    setDraft(next);
    onTasksChange(next);
    setNewTask({
      id: '',
      title: '',
      description: '',
      amount: 0.25,
      duration: '15 sec',
      claimed: false,
enabled: true,
kind: 'video',
    });
    setNewTaskOpen(false);
  }

  function restoreDefaults() {
    const next = initialTasks.map((task) => ({ ...task }));
    setDraft(next);
    onTasksChange(next);
    onResetTasks();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#102b3a]/35 p-3 backdrop-blur-[3px]"
      role="dialog"
      aria-modal="true"
      aria-label="Demo Admin"
    >
      <div className="flex max-h-[92dvh] w-full max-w-[520px] flex-col overflow-hidden rounded-[1.7rem] bg-[#f9fcfb] shadow-[0_24px_70px_rgba(16,43,58,.24)]">
        <div className="shrink-0 border-b border-[#d8e2e3] p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-mono-custom text-[10px] uppercase tracking-[.16em] text-[#1b9b68]">
                Local controls
              </p>
              <h2 className="mt-1 font-display-custom text-[20px] font-bold tracking-[-.05em] text-[#102b3a]">
                Demo Admin
              </h2>
            </div>
            <button
              type="button"
              className="pressable grid h-9 w-9 place-items-center rounded-full bg-[#e8f0f0] text-[#6c8086]"
              onClick={onClose}
              aria-label="Close Demo Admin"
              data-testid="button-close-demo-admin-top"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5">
          <div className="rounded-2xl border border-[#c9ebda] bg-[#f1fbf5] p-4">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#d9f3e4] text-[#16845a]">
                <ShieldCheck size={17} />
              </span>
              <div>
                <p className="text-[12px] font-bold text-[#16845a]">DEMO ADMIN ONLY</p>
                <p className="mt-1 text-[10px] leading-4 text-[#718188]">
                  Changes affect this device&apos;s simulated tasks only. No real USDT,
                  payments, or other users are controlled here.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-[#d8e2e3] bg-[#fbfdfc] p-3">
              <p className="font-mono-custom text-[9px] uppercase text-[#82919a]">Tasks</p>
              <p className="mt-1 font-display-custom text-[18px] font-bold text-[#102b3a]">{draft.length}</p>
            </div>
            <div className="rounded-xl border border-[#d8e2e3] bg-[#fbfdfc] p-3">
              <p className="font-mono-custom text-[9px] uppercase text-[#82919a]">Active</p>
              <p className="mt-1 font-display-custom text-[18px] font-bold text-[#16845a]">
                {draft.filter((task) => !task.claimed).length}
              </p>
            </div>
            <div className="rounded-xl border border-[#d8e2e3] bg-[#fbfdfc] p-3">
              <p className="font-mono-custom text-[9px] uppercase text-[#82919a]">Rewards</p>
              <p className="mt-1 font-display-custom text-[18px] font-bold text-[#16845a]">
                {draft.reduce((sum, task) => sum + task.amount, 0).toFixed(2)}
              </p>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              className="pressable flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#102b3a] py-3 text-[11px] font-bold text-white"
              onClick={() => setNewTaskOpen((open) => !open)}
              data-testid="button-admin-add-task"
            >
              <Plus size={14} />
              {newTaskOpen ? 'Close add form' : 'Add task'}
            </button>
            <button
              type="button"
              className="pressable flex items-center justify-center gap-2 rounded-xl border border-[#d8e2e3] bg-[#fbfdfc] px-3 py-3 text-[11px] font-bold text-[#536b72]"
              onClick={restoreDefaults}
              data-testid="button-admin-restore-tasks"
            >
              <RefreshCw size={14} />
              Defaults
            </button>
          </div>

          {newTaskOpen && (
            <div className="mt-3 rounded-2xl border border-[#d8e2e3] bg-[#fbfdfc] p-3.5">
              <p className="text-[12px] font-bold text-[#102b3a]">New demo task</p>
              <div className="mt-3 space-y-2.5">
                <input
                  className="w-full rounded-xl border border-[#d8e2e3] bg-white px-3 py-2.5 text-[11px] outline-none focus:border-[#1daf73]"
                  placeholder="Task ID (optional)"
                  value={newTask.id}
                  onChange={(event) => setNewTask((current) => ({ ...current, id: event.target.value }))}
                />
                <input
                  className="w-full rounded-xl border border-[#d8e2e3] bg-white px-3 py-2.5 text-[11px] outline-none focus:border-[#1daf73]"
                  placeholder="Task title"
                  value={newTask.title}
                  onChange={(event) => setNewTask((current) => ({ ...current, title: event.target.value }))}
                />
                <input
                  className="w-full rounded-xl border border-[#d8e2e3] bg-white px-3 py-2.5 text-[11px] outline-none focus:border-[#1daf73]"
                  placeholder="Description"
                  value={newTask.description}
                  onChange={(event) => setNewTask((current) => ({ ...current, description: event.target.value }))}
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    className="w-full rounded-xl border border-[#d8e2e3] bg-white px-3 py-2.5 text-[11px] outline-none focus:border-[#1daf73]"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Reward"
                    value={newTask.amount}
                    onChange={(event) => setNewTask((current) => ({ ...current, amount: Number(event.target.value) }))}
                  />
                  <input
                    className="w-full rounded-xl border border-[#d8e2e3] bg-white px-3 py-2.5 text-[11px] outline-none focus:border-[#1daf73]"
                    placeholder="Duration"
                    value={newTask.duration}
                    onChange={(event) => setNewTask((current) => ({ ...current, duration: event.target.value }))}
                  />
                </div>
                <select
                  className="w-full rounded-xl border border-[#d8e2e3] bg-white px-3 py-2.5 text-[11px] outline-none focus:border-[#1daf73]"
                  value={newTask.kind}
                  onChange={(event) => setNewTask((current) => ({ ...current, kind: event.target.value as Task['kind'] }))}
                >
                  <option value="video">Video / Ad</option>
                  <option value="check">Daily check</option>
                </select>
                <button
                  type="button"
                  className="pressable w-full rounded-xl bg-[#1daf73] py-3 text-[11px] font-bold text-white disabled:opacity-50"
                  onClick={addTask}
                  disabled={!newTask.title.trim()}
                  data-testid="button-admin-save-new-task"
                >
                  Save task
                </button>
              </div>
            </div>
          )}

          <div className="mt-4 space-y-2.5">
            {draft.map((task, index) => (
              <div key={task.id} className="rounded-2xl border border-[#d8e2e3] bg-[#fbfdfc] p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono-custom text-[9px] uppercase tracking-[.1em] text-[#82919a]">
                      Task {index + 1}
                    </p>
                    <p className="truncate text-[12px] font-bold text-[#102b3a]">{task.id}</p>
                  </div>
                  <button
                    type="button"
                    className="pressable grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#fff0e9] text-[#b06149]"
                    onClick={() => removeTask(task.id)}
                    aria-label={`Delete ${task.title}`}
                    data-testid={`button-admin-delete-${task.id}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="mt-2.5 space-y-2">
                  <input
                    className="w-full rounded-lg border border-[#d8e2e3] bg-white px-2.5 py-2 text-[10px] outline-none focus:border-[#1daf73]"
                    value={task.title}
                    onChange={(event) => updateTask(task.id, 'title', event.target.value)}
                    aria-label={`Title ${task.id}`}
                  />
                  <input
                    className="w-full rounded-lg border border-[#d8e2e3] bg-white px-2.5 py-2 text-[10px] outline-none focus:border-[#1daf73]"
                    value={task.description}
                    onChange={(event) => updateTask(task.id, 'description', event.target.value)}
                    aria-label={`Description ${task.id}`}
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      className="w-full rounded-lg border border-[#d8e2e3] bg-white px-2.5 py-2 text-[10px] outline-none focus:border-[#1daf73]"
                      type="number"
                      min="0"
                      step="0.01"
                      value={task.amount}
                      onChange={(event) => updateTask(task.id, 'amount', Number(event.target.value))}
                      aria-label={`Reward ${task.id}`}
                    />
                    <input
                      className="w-full rounded-lg border border-[#d8e2e3] bg-white px-2.5 py-2 text-[10px] outline-none focus:border-[#1daf73]"
                      value={task.duration}
                      onChange={(event) => updateTask(task.id, 'duration', event.target.value)}
                      aria-label={`Duration ${task.id}`}
                    />
                    <select
                      className="w-full rounded-lg border border-[#d8e2e3] bg-white px-2 py-2 text-[10px] outline-none focus:border-[#1daf73]"
                      value={task.kind}
                      onChange={(event) => updateTask(task.id, 'kind', event.target.value as Task['kind'])}
                      aria-label={`Type ${task.id}`}
                    >
                      <option value="video">Video</option>
                      <option value="check">Check</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-2 text-[10px] text-[#718188]">
                    <input
                      type="checkbox"
                      checked={task.claimed}
                      onChange={(event) => updateTask(task.id, 'claimed', event.target.checked)}
                    />
                    Mark completed
                  </label><button
  type="button"
  className={`pressable flex w-full items-center justify-between rounded-lg border px-2.5 py-2 text-[10px] font-bold ${
    task.enabled
      ? 'border-[#c9ebda] bg-[#f1fbf5] text-[#16845a]'
      : 'border-[#e1d7d2] bg-[#fff7f2] text-[#aa6b4d]'
  }`}
  onClick={() => updateTask(task.id, 'enabled', !task.enabled)}
  role="switch"
  aria-checked={task.enabled}
  data-testid={`button-admin-toggle-${task.id}`}
>
  <span>{task.enabled ? 'Task enabled' : 'Task disabled'}</span>
  <span>
    {task.enabled ? 'ON' : 'OFF'}
  </span>
</button>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="pressable mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[#edc9aa] bg-[#fffaf5] py-3 text-[11px] font-bold text-[#aa5e2a]"
            onClick={onResetDemo}
            data-testid="button-admin-reset-demo"
          >
            <RefreshCw size={14} />
            Reset all local demo data
          </button>

          <button
            type="button"
            className="pressable mt-2 flex w-full items-center justify-center rounded-xl bg-[#102b3a] py-3 text-[11px] font-bold text-white"
            onClick={onClose}
            data-testid="button-close-demo-admin"
          >
            Close Admin
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingRow({ icon, title, description, enabled, onClick, testId }: { icon: ReactNode; title: string; description: string; enabled: boolean; onClick: () => void; testId: string }) {
  return <div className="flex items-center gap-3 px-3.5 py-3.5"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e7f5ed] text-[#16845a]">{icon}</span><span className="min-w-0 flex-1"><span className="block text-[12px] font-bold text-[#284652]">{title}</span><span className="mt-0.5 block truncate text-[10px] text-[#87969b]">{description}</span></span><button className={`relative h-6 w-11 rounded-full transition-colors ${enabled ? 'bg-[#1daf73]' : 'bg-[#c8d4d5]'}`} onClick={onClick} role="switch" aria-checked={enabled} aria-label={title} data-testid={testId}><span className={`absolute top-1 h-4 w-4 rounded-full bg-[#fbfdfc] shadow-sm transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} /></button></div>;
}

function Modal({ title, eyebrow, onClose, children }: { title: string; eyebrow: string; onClose: () => void; children: ReactNode }) {
  return <div className="fixed inset-0 z-40 flex items-end justify-center bg-[#102b3a]/30 p-3 backdrop-blur-[3px] sm:items-center" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="w-full max-w-[480px] rounded-[1.7rem] bg-[#f9fcfb] p-5 shadow-[0_24px_70px_rgba(16,43,58,.24)] stagger-in"><div className="flex items-start justify-between"><div><p className="font-mono-custom text-[10px] uppercase tracking-[.16em] text-[#1b9b68]">{eyebrow}</p><h2 className="mt-1 font-display-custom text-[20px] font-bold tracking-[-.05em] text-[#102b3a]">{title}</h2></div><button className="pressable grid h-9 w-9 place-items-center rounded-full bg-[#e8f0f0] text-[#6c8086]" onClick={onClose} aria-label={`Close ${title}`} data-testid={`button-close-${title.toLowerCase().replaceAll(' ', '-')}`}><X size={17} /></button></div>{children}</div></div>;
}

function Router() {
  return <RoutedErrorBoundary><Switch><Route path="/" component={Home} /><Route component={NotFound} /></Switch></RoutedErrorBoundary>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;