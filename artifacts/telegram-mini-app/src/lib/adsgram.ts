const ADSGRAM_BLOCK_ID = '44852';

export type AdsgramShowPromiseResult = {
  done: boolean;
  description: string;
  state: 'load' | 'render' | 'playing' | 'destroy';
  error: boolean;
};

export type AdsgramController = {
  show: () => Promise<AdsgramShowPromiseResult>;
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