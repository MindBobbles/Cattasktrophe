// Random event system — rolls on each app session open.

export type RandomEventType =
  | 'dog_attack'
  | 'lucky_coin'
  | 'cowboy_hat'
  | 'poop'
  | 'dancing_shy'
  | 'dancing_confident';

export interface RandomEventResult {
  type: RandomEventType;
  emoji: string;
  title: string;
  message: string;
  bannerColor: string;
  healthDelta: number;
  coinDelta: number;
  /** Happy activities are display-only — no state mutation needed */
  isHappyActivity: boolean;
}

export function rollRandomEvent(params: {
  coins: number;
  health: number;
  catAlive: boolean;
  catState: string;
  catName: string;
  personality: string;
}): RandomEventResult | null {
  const { coins, health, catAlive, catState, catName, personality } = params;

  if (!catAlive || catState === 'deathbed') return null;

  // ── Dog Attack ─────────────────────────────────────────────────────────────
  // 20% base chance; spikes to 40% when coins > 200 (punish the rich player)
  const dogChance = coins > 200 ? 0.40 : 0.20;
  if (Math.random() < dogChance) {
    return {
      type: 'dog_attack',
      emoji: '🐕💥',
      title: 'WOOF WOOF!!',
      message: `A dog jumped ${catName}! Lost a heart! Watch your back.`,
      bannerColor: '#4A0000',
      healthDelta: -20,
      coinDelta: 0,
      isHappyActivity: false,
    };
  }

  // ── Lucky Coin ─────────────────────────────────────────────────────────────
  // 30% chance but ONLY when health ≤ 20 (roughly 1 heart remaining)
  if (health <= 20 && Math.random() < 0.30) {
    return {
      type: 'lucky_coin',
      emoji: '✨🪙',
      title: 'Lucky Find!',
      message: `${catName} found a shiny coin while barely alive... +20 coins!`,
      bannerColor: '#3A2A00',
      healthDelta: 0,
      coinDelta: 20,
      isHappyActivity: false,
    };
  }

  // ── Happy Activities ────────────────────────────────────────────────────────
  // Only roll when cat is happy; purely cosmetic.
  if (catState === 'happy') {
    const confident = ['playful', 'sassy', 'curious'].includes(personality);
    const timid     = ['lazy', 'grumpy', 'sweet'].includes(personality);

    const r = Math.random();

    if (r < 0.15) {
      // Cowboy hat — personality flavours the message
      const msg = confident
        ? `${catName} swiped a cowboy hat and is FULLY owning it. Yeehaw.`
        : `${catName} put on a tiny cowboy hat... and looks very unsure about it.`;
      return {
        type: 'cowboy_hat',
        emoji: '🤠',
        title: 'Yeehaw!',
        message: msg,
        bannerColor: '#2A1A00',
        healthDelta: 0, coinDelta: 0,
        isHappyActivity: true,
      };
    }

    if (r < 0.25) {
      return {
        type: 'poop',
        emoji: '💩',
        title: 'Nature Calls...',
        message: `${catName} just waddled off and pooped. Stares you in the eye. No shame.`,
        bannerColor: '#1A1000',
        healthDelta: 0, coinDelta: 0,
        isHappyActivity: true,
      };
    }

    if (r < 0.38) {
      if (timid) {
        return {
          type: 'dancing_shy',
          emoji: '💃😳',
          title: 'Caught Dancing!',
          message: `${catName} was absolutely VIBING... then saw you and stopped immediately.`,
          bannerColor: '#002A1A',
          healthDelta: 0, coinDelta: 0,
          isHappyActivity: true,
        };
      } else {
        return {
          type: 'dancing_confident',
          emoji: '🕺✨',
          title: 'DANCE SHOW!',
          message: `${catName} is performing a full routine. Not a single drop of shame.`,
          bannerColor: '#001A2A',
          healthDelta: 0, coinDelta: 0,
          isHappyActivity: true,
        };
      }
    }
  }

  return null;
}
