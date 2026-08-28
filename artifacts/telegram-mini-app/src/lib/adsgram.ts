const ADSGRAM_BLOCK_ID = '44852';

export type AdsgramShowPromiseResult = {
  done: boolean;
  description: string;
  state: 'load' | 'render' | 'playing' | 'destroy';
  error: boolean;
};

export type AdsgramController = {
  show: () => Promise<AdsgramShowPromiseResult>;
  addEventListener: (event: 'onReward', callback: () => void) => void;
  removeEventListener: (event: 'onReward', callback: () => void) => void;
};

type AdsgramWindow = Window & {
  Adsgram?: {
    init: (options: {
      blockId: string;
      debug?: boolean;
      debugConsole?: boolean;
      debugBannerType?: 'FullscreenMedia' | 'RewardedVideo';
    }) => AdsgramController;
  };
};

let controller: AdsgramController | null = null;

export function getAdsgramController(): AdsgramController | null {
  if (controller) return controller;

  const adsgram = typeof window === 'undefined'
    ? undefined
    : (window as AdsgramWindow).Adsgram;

  if (!adsgram) return null;

  controller = adsgram.init({
    blockId: ADSGRAM_BLOCK_ID,
    debug: true,
    debugConsole: false,
    debugBannerType: 'RewardedVideo',
  });

  return controller;
}

export function showAdsgramRewardedAd(): Promise<boolean> {
  const adController = getAdsgramController();
  if (!adController) return Promise.resolve(false);

  return new Promise((resolve) => {
    let settled = false;

    const settle = (rewarded: boolean) => {
      if (settled) return;
      settled = true;
      adController.removeEventListener('onReward', handleReward);
      resolve(rewarded);
    };

    const handleReward = () => settle(true);
    adController.addEventListener('onReward', handleReward);

    try {
      adController.show()
        .catch(() => settle(false))
        .finally(() => {
          if (!settled) settle(false);
        });
    } catch {
      settle(false);
    }
  });
}