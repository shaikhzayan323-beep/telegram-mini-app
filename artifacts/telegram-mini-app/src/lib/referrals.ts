const BOT_USERNAME = 'usdtminingwalletbot';
const REFERRAL_PREFIX = 'ref_';
const LEDGER_STORAGE_KEY = 'usdt-mining-wallet-referral-ledger-v1';
const LOCAL_ID_KEY = 'usdt-mining-wallet-demo-visitor-id';

export const REFERRAL_REWARD = 1.25;

export type ReferralProfile = {
  code: string;
  link: string;
  count: number;
  earnings: number;
  referredBy: string | null;
  referredUserIds: string[];
  creditedCount: number;
};

type ReferralLedger = Record<string, string[]>;

function getBrowserVisitorId() {
  const existing = window.localStorage.getItem(LOCAL_ID_KEY);
  if (existing) return existing;

  const generated = typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `browser-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.localStorage.setItem(LOCAL_ID_KEY, generated);
  return generated;
}

function readLedger(): ReferralLedger {
  try {
    const stored = window.localStorage.getItem(LEDGER_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : {};
    return parsed && typeof parsed === 'object' ? parsed as ReferralLedger : {};
  } catch {
    return {};
  }
}

function writeLedger(ledger: ReferralLedger) {
  window.localStorage.setItem(LEDGER_STORAGE_KEY, JSON.stringify(ledger));
}

function parseReferralCode(startParam: string | null) {
  if (!startParam) return null;
  try {
    const decoded = decodeURIComponent(startParam).trim();
    return /^ref_[A-Za-z0-9_-]+$/.test(decoded) ? decoded : null;
  } catch {
    return null;
  }
}

export function createReferralProfile(
  telegramUserId: string | null,
  startParam: string | null,
  stored?: Partial<ReferralProfile>,
): ReferralProfile {
  const identity = telegramUserId ? `tg_${telegramUserId}` : `browser_${getBrowserVisitorId()}`;
  const code = `${REFERRAL_PREFIX}${identity}`;
  const link = `https://t.me/${BOT_USERNAME}?start=${encodeURIComponent(code)}`;
  const ledger = readLedger();
  const storedBelongsToUser = stored?.code === code;
  const referredUserIds = new Set<string>([
    ...(ledger[code] || []),
    ...(storedBelongsToUser ? stored?.referredUserIds || [] : []),
  ]);
  const incomingCode = parseReferralCode(startParam);
  let referredBy = storedBelongsToUser ? stored?.referredBy || null : null;

  if (incomingCode && incomingCode !== code && !referredBy) {
    const existingReferrals = new Set(ledger[incomingCode] || []);
    if (!existingReferrals.has(identity)) {
      existingReferrals.add(identity);
      ledger[incomingCode] = [...existingReferrals];
      writeLedger(ledger);
      referredBy = incomingCode;
    } else {
      referredBy = incomingCode;
    }
  }

  const storedCount = storedBelongsToUser && typeof stored?.count === 'number' ? stored.count : 0;
  const count = Math.max(referredUserIds.size, storedCount);
  const storedCreditedCount = storedBelongsToUser && typeof stored?.creditedCount === 'number'
    ? stored.creditedCount
    : 0;

  return {
    code,
    link,
    count,
    earnings: Number((count * REFERRAL_REWARD).toFixed(2)),
    referredBy,
    referredUserIds: [...referredUserIds],
    creditedCount: Math.min(storedCreditedCount, count),
  };
}