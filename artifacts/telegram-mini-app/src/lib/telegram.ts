type TelegramBridge = {
  isTelegram: boolean;
  firstName: string;
  userId: string | null;
  startParam: string | null;
  ready: () => void;
  expand: () => void;
  fullscreen: () => void;
  exitFullscreen: () => void;
  impact: (style?: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
  notification: (type?: 'success' | 'error' | 'warning') => void;
  close: () => void;
};

type TelegramWindow = Window & {
  Telegram?: {
    WebApp?: {
      initData?: string;
      initDataUnsafe?: {
        user?: {
          id?: number;
          first_name?: string;
        };
        start_param?: string;
      };
      ready?: () => void;
      expand?: () => void;
      requestFullscreen?: () => void;
      exitFullscreen?: () => void;
      close?: () => void;
      HapticFeedback?: {
        impactOccurred?: (style: string) => void;
        notificationOccurred?: (type: string) => void;
      };
    };
  };
};

export function createTelegramBridge(): TelegramBridge {
  const webApp =
    typeof window === 'undefined'
      ? undefined
      : (window as TelegramWindow).Telegram?.WebApp;

  const firstName =
    webApp?.initDataUnsafe?.user?.first_name?.trim() || 'User';

  const userId =
    webApp?.initDataUnsafe?.user?.id != null
      ? String(webApp.initDataUnsafe.user.id)
      : null;

  const queryStartParam =
    typeof window === 'undefined'
      ? null
      : new URLSearchParams(window.location.search).get('start') ||
        new URLSearchParams(window.location.search).get('startapp');

  const startParam =
    webApp?.initDataUnsafe?.start_param?.trim() ||
    queryStartParam?.trim() ||
    null;

  return {
    isTelegram: Boolean(webApp),
    firstName,
    userId,
    startParam,

    ready: () => webApp?.ready?.(),

    expand: () => webApp?.expand?.(),

    fullscreen: () => webApp?.requestFullscreen?.(),

    exitFullscreen: () => webApp?.exitFullscreen?.(),

    impact: (style = 'light') =>
      webApp?.HapticFeedback?.impactOccurred?.(style),

    notification: (type = 'success') =>
      webApp?.HapticFeedback?.notificationOccurred?.(type),

    close: () => webApp?.close?.(),
  };
}