export type TelegramBridge = {
  isTelegram: boolean;
  ready: () => void;
  expand: () => void;
  impact: (style?: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
  notification: (type?: 'success' | 'error' | 'warning') => void;
  close: () => void;
};

type TelegramWindow = Window & {
  Telegram?: {
    WebApp?: {
      initData?: string;
      ready?: () => void;
      expand?: () => void;
      close?: () => void;
      HapticFeedback?: {
        impactOccurred?: (style: string) => void;
        notificationOccurred?: (type: string) => void;
      };
    };
  };
};

export function createTelegramBridge(): TelegramBridge {
  const webApp = (window as TelegramWindow).Telegram?.WebApp;
  return {
    isTelegram: Boolean(webApp),
    ready: () => webApp?.ready?.(),
    expand: () => webApp?.expand?.(),
    impact: (style = 'light') => webApp?.HapticFeedback?.impactOccurred?.(style),
    notification: (type = 'success') => webApp?.HapticFeedback?.notificationOccurred?.(type),
    close: () => webApp?.close?.(),
  };
}