// カードシステム
// デッキ構築、手札管理、カード効果の定義を担当する

/**
 * カードタイプの定義
 */
export const CARD_TYPES = {
    ATTACK: 'attack',
    DEFENSE: 'defense',
    SKILL: 'skill'
};

/**
 * 出題形式の定義
 */
export const QUIZ_MODES = {
    CHOICE: 'choice',       // 4択
    TYPING: 'typing',       // タイピング
    CHOICE_DOUBLE: 'choice_double' // 4択×2問
};

/**
 * 全カード定義マスタ
 */
export const CARD_DEFINITIONS = {
    // === 攻撃カード ===
    slash: {
        id: 'slash',
        name: 'スラッシュ',
        type: CARD_TYPES.ATTACK,
        cost: 1,
        baseDamage: 6,
        emoji: '⚔️',
        description: '⚔️ 6ダメージ！ちからいっぱいきりつける！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'common',
        color: '#ff6b6b'
    },
    fireball: {
        id: 'fireball',
        name: 'ファイアボール',
        type: CARD_TYPES.ATTACK,
        cost: 2,
        baseDamage: 14,
        emoji: '🔥',
        description: '🔥 14ダメージ！燃えさかる火の玉をなげつける！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'uncommon',
        color: '#ff4500'
    },
    double_strike: {
        id: 'double_strike',
        name: 'ダブルストライク',
        type: CARD_TYPES.ATTACK,
        cost: 2,
        baseDamage: 5,
        hits: 2,
        emoji: '⚡',
        description: '⚡ 5ダメージを2回！クイズを2問とくよ！',
        quizMode: QUIZ_MODES.CHOICE_DOUBLE,
        rarity: 'uncommon',
        color: '#ffa500'
    },
    thunder: {
        id: 'thunder',
        name: 'サンダー',
        type: CARD_TYPES.ATTACK,
        cost: 2,
        baseDamage: 10,
        emoji: '⛈️',
        description: '⛈️ 10ダメージ！コンボ中はさらに+5！',
        quizMode: QUIZ_MODES.CHOICE,
        comboBonus: 5,
        rarity: 'uncommon',
        color: '#ffea00'
    },
    ice_lance: {
        id: 'ice_lance',
        name: 'アイスランス',
        type: CARD_TYPES.ATTACK,
        cost: 1,
        baseDamage: 4,
        emoji: '🧊',
        description: '🧊 4ダメージ＋敵の攻撃力を2さげる（1ターン）',
        quizMode: QUIZ_MODES.CHOICE,
        debuff: { type: 'weakened', value: 2, turns: 1 },
        rarity: 'common',
        color: '#74b9ff'
    },
    meteor: {
        id: 'meteor',
        name: 'メテオ',
        type: CARD_TYPES.ATTACK,
        cost: 3,
        baseDamage: 24,
        emoji: '☄️',
        description: '☄️ 24ダメージ！空から岩をおとす大技！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'rare',
        color: '#e056fd'
    },
    quick_slash: {
        id: 'quick_slash',
        name: 'クイックスラッシュ',
        type: CARD_TYPES.ATTACK,
        cost: 0,
        baseDamage: 3,
        emoji: '💨',
        description: '💨 3ダメージ！コスト0でつかえる！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'common',
        color: '#a8e6cf'
    },
    poison_blade: {
        id: 'poison_blade',
        name: 'ポイズンブレード',
        type: CARD_TYPES.ATTACK,
        cost: 1,
        baseDamage: 3,
        emoji: '🗡️',
        description: '🗡️ 3ダメージ＋毒3！毒は毎ターン敵にダメージ！',
        quizMode: QUIZ_MODES.CHOICE,
        poison: 3,
        rarity: 'uncommon',
        color: '#6c5ce7'
    },
    combo_blade: {
        id: 'combo_blade',
        name: 'コンボ・ブレード',
        type: CARD_TYPES.ATTACK,
        cost: 2,
        baseDamage: 10,
        emoji: '🔪',
        description: '🔪 10ダメージ＋コンボ数×5の追加ダメージ！',
        quizMode: QUIZ_MODES.CHOICE,
        comboMultiplierBonus: 5,
        rarity: 'rare',
        color: '#ff9f43'
    },
    longword_burst: {
        id: 'longword_burst',
        name: '長文バースト',
        type: CARD_TYPES.ATTACK,
        cost: 2,
        baseDamage: 0,
        emoji: '📚',
        description: '📚 英単語の文字数×3のダメージとブロック！',
        quizMode: QUIZ_MODES.CHOICE,
        lengthSynergy: 3,
        rarity: 'rare',
        color: '#5f27cd'
    },

    // ── 新・攻撃カード ──

    soul_blade: {
        id: 'soul_blade',
        name: 'ソウルブレード',
        type: CARD_TYPES.ATTACK,
        cost: 1,
        baseDamage: 4,
        emoji: '💀',
        description: '💀 4ダメージ＋このバトルの正解数×2のダメージ！じわじわ強くなる！',
        quizMode: QUIZ_MODES.CHOICE,
        soulBlade: true, // BattleSystem側で特別処理
        rarity: 'rare',
        color: '#8e44ad'
    },
    rage_flame: {
        id: 'rage_flame',
        name: 'いかりの炎',
        type: CARD_TYPES.ATTACK,
        cost: 1,
        baseDamage: 3,
        emoji: '😡',
        description: '😡 3ダメージ＋失ったHP÷5のダメージ！ピンチほど燃え上がる！',
        quizMode: QUIZ_MODES.CHOICE,
        rageFlame: true, // BattleSystem側で特別処理
        rarity: 'uncommon',
        color: '#e74c3c'
    },
    snowball: {
        id: 'snowball',
        name: 'ゆきだるま',
        type: CARD_TYPES.ATTACK,
        cost: 2,
        baseDamage: 1,
        emoji: '⛄',
        description: '⛄ 初めはたった1ダメージ！でも使うたびに永久+3！雪だるま式に強くなる！',
        quizMode: QUIZ_MODES.CHOICE,
        snowball: true, // BattleSystem側で特別処理
        rarity: 'rare',
        color: '#74b9ff'
    },
    vortex: {
        id: 'vortex',
        name: 'うずしお',
        type: CARD_TYPES.ATTACK,
        cost: 1,
        baseDamage: 2,
        emoji: '🌊',
        description: '🌊 2ダメージ＋手札の枚数×2のダメージ！カードを引いてから使おう！',
        quizMode: QUIZ_MODES.CHOICE,
        vortex: true, // BattleSystem側で特別処理
        rarity: 'uncommon',
        color: '#0984e3'
    },

    // === 防御カード ===
    shield: {
        id: 'shield',
        name: 'シールド',
        type: CARD_TYPES.DEFENSE,
        cost: 1,
        baseBlock: 5,
        emoji: '🛡️',
        description: '🛡️ 5ブロック！敵のこうげきをふせぐ！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'common',
        color: '#74b9ff'
    },
    iron_wall: {
        id: 'iron_wall',
        name: 'アイアンウォール',
        type: CARD_TYPES.DEFENSE,
        cost: 2,
        baseBlock: 12,
        emoji: '🏰',
        description: '🏰 12ブロック！鉄の壁で守りをかためる！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'uncommon',
        color: '#636e72'
    },
    counter: {
        id: 'counter',
        name: 'カウンター',
        type: CARD_TYPES.DEFENSE,
        cost: 1,
        baseBlock: 3,
        baseDamage: 3,
        emoji: '🔄',
        description: '🔄 3ブロック＋3ダメージ！守りながらやりかえす！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'uncommon',
        color: '#fd79a8'
    },
    barrier: {
        id: 'barrier',
        name: 'バリア',
        type: CARD_TYPES.DEFENSE,
        cost: 2,
        baseBlock: 8,
        emoji: '✨',
        description: '✨ 8ブロック！つぎのターンも4ブロックのこる！',
        quizMode: QUIZ_MODES.CHOICE,
        persistent: true,
        persistBlock: 4,
        rarity: 'rare',
        color: '#00cec9'
    },
    thorn_armor: {
        id: 'thorn_armor',
        name: 'とげのよろい',
        type: CARD_TYPES.DEFENSE,
        cost: 1,
        baseBlock: 4,
        emoji: '🦔',
        description: '🦔 4ブロック！このターン、敵が攻撃してくるたびに3ダメージ返す！',
        quizMode: QUIZ_MODES.CHOICE,
        thornArmor: 3, // BattleSystem側で1ヒットごとに反撃
        rarity: 'uncommon',
        color: '#55efc4'
    },

    // === スキルカード ===
    heal: {
        id: 'heal',
        name: 'ヒール',
        type: CARD_TYPES.SKILL,
        cost: 1,
        healAmount: 5,
        emoji: '💚',
        description: '💚 HPを5かいふく！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'common',
        color: '#00b894'
    },
    power_up: {
        id: 'power_up',
        name: 'パワーアップ',
        type: CARD_TYPES.SKILL,
        cost: 1,
        emoji: '💪',
        description: '💪 つぎの攻撃のダメージが+50%！',
        quizMode: QUIZ_MODES.CHOICE,
        buff: { type: 'strength', value: 1.5, turns: 1 },
        rarity: 'uncommon',
        color: '#e17055'
    },
    draw_card: {
        id: 'draw_card',
        name: 'ドロー',
        type: CARD_TYPES.SKILL,
        cost: 1,
        drawCount: 2,
        emoji: '🃏',
        description: '🃏 カードを2まいひく！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'uncommon',
        color: '#dfe6e9'
    },
    focus: {
        id: 'focus',
        name: 'フォーカス',
        type: CARD_TYPES.SKILL,
        cost: 0,
        emoji: '🔮',
        description: '🔮 つぎのターン、エナジーが+1！コスト0！',
        quizMode: QUIZ_MODES.CHOICE,
        buff: { type: 'next_turn_energy', value: 1, turns: 1 },
        rarity: 'rare',
        color: '#a29bfe'
    },
    mega_heal: {
        id: 'mega_heal',
        name: 'メガヒール',
        type: CARD_TYPES.SKILL,
        cost: 2,
        healAmount: 12,
        emoji: '💖',
        description: '💖 HPを12かいふく！ピンチのときのたのもしい味方！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'rare',
        color: '#fd79a8'
    },
    poison_catalyst: {
        id: 'poison_catalyst',
        name: 'もうどく',
        type: CARD_TYPES.SKILL,
        cost: 2,
        emoji: '🧪',
        description: '🧪 毒5を与えて、さらに敵の毒を2倍に！毒デッキの必殺技！',
        quizMode: QUIZ_MODES.CHOICE,
        poison: 5,
        catalyst: true,
        rarity: 'rare',
        color: '#8e44ad'
    },

    // ── 新・スキルカード ──

    accumulate: {
        id: 'accumulate',
        name: 'ちくせきの力',
        type: CARD_TYPES.SKILL,
        cost: 1,
        emoji: '🌀',
        description: '🌀 このバトル中、全攻撃のダメージが永久に+3！何回でも重ねられる！',
        quizMode: QUIZ_MODES.CHOICE,
        accumulate: 3, // BattleSystem側でdamagePermanentBuff に加算
        rarity: 'rare',
        color: '#6c5ce7'
    },
    weak_point: {
        id: 'weak_point',
        name: 'ウィークポイント',
        type: CARD_TYPES.SKILL,
        cost: 0,
        emoji: '🎯',
        description: '🎯 敵の毒が3以上なら、つぎの攻撃が2倍に！コスト0！',
        quizMode: QUIZ_MODES.CHOICE,
        weakPoint: true, // BattleSystem側でnextAttackDoubled フラグ
        rarity: 'uncommon',
        color: '#00b894'
    },
    mirror_copy: {
        id: 'mirror_copy',
        name: 'ミラーコピー',
        type: CARD_TYPES.SKILL,
        cost: 1,
        emoji: '🪞',
        description: '🪞 さっきつかったカードをもう1回！どんな大技もコピー！',
        quizMode: QUIZ_MODES.CHOICE,
        mirrorCopy: true, // BattleSystem側でlastCardUsedを再実行
        rarity: 'rare',
        color: '#e17055'
    }
};

/**
 * カードインスタンスを生成する
 * @param {string} definitionId - カード定義ID
 * @returns {Object} カードインスタンス
 */
export function createCard(definitionId) {
    const def = CARD_DEFINITIONS[definitionId];
    if (!def) throw new Error(`不明なカード: ${definitionId}`);

    const card = {
        ...def,
        instanceId: `${definitionId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        level: 1,
        xp: 0,
        xpToNext: 3 // レベルアップに必要な正答数
    };

    // スキルカードは使用後に廃棄されることを明記
    if (card.type === CARD_TYPES.SKILL) {
        card.description += ' 廃棄する。';
    }

    return card;
}

/**
 * カードにXPを加算し、レベルアップ判定
 * @param {Object} card - カードインスタンス
 * @returns {boolean} レベルアップしたかどうか
 */
export function addCardXP(card) {
    // レベル3のカードはこれ以上強化できない
    if (card.level >= 3) return false;

    card.xp++;
    if (card.xp >= card.xpToNext) {
        card.level++;
        card.xp = 0;
        card.xpToNext = card.level * 3;

        // レベルアップボーナス（攻撃・防御・回復）
        if (card.baseDamage) card.baseDamage = Math.ceil(card.baseDamage * 1.3);
        if (card.baseBlock) card.baseBlock = Math.ceil(card.baseBlock * 1.3);
        if (card.healAmount) card.healAmount = Math.ceil(card.healAmount * 1.3);

        // レベルアップボーナス（スキル系）
        if (card.drawCount) card.drawCount += 1;
        if (card.poison) card.poison = Math.ceil(card.poison * 1.4);
        if (card.comboBonus) card.comboBonus = Math.ceil(card.comboBonus * 1.3);
        if (card.debuff) card.debuff = { ...card.debuff, value: card.debuff.value + 1 };
        if (card.thornArmor) card.thornArmor = Math.ceil(card.thornArmor * 1.3);
        if (card.accumulate) card.accumulate += 1;
        if (card.buff) {
            if (card.buff.type === 'strength') {
                // パワーアップ: 倍率を+0.25ずつ上昇
                card.buff = { ...card.buff, value: +(card.buff.value + 0.25).toFixed(2) };
            } else if (card.buff.type === 'next_turn_energy') {
                // フォーカス: エナジー+1ずつ上昇
                card.buff = { ...card.buff, value: card.buff.value + 1 };
            }
        }

        return true;
    }
    return false;
}

/**
 * カードの現在のステータスに基づいて説明テキストを動的に生成
 * @param {Object} card - カードインスタンス
 * @returns {string} 説明テキスト
 */
export function getCardDescription(card) {
    // カードIDごとに、現在の数値を反映した説明を生成
    const suffix = card.type === CARD_TYPES.SKILL ? ' 廃棄する。' : '';
    switch (card.id) {
        // === 攻撃カード ===
        case 'slash':
            return `⚔️ ${card.baseDamage}ダメージ！ちからいっぱいきりつける！`;
        case 'fireball':
            return `🔥 ${card.baseDamage}ダメージ！燃えさかる火の玉！`;
        case 'double_strike':
            return `⚡ ${card.baseDamage}ダメージを${card.hits}回！クイズを${card.hits}問いる！`;
        case 'thunder':
            return `⛈️ ${card.baseDamage}ダメージ！コンボ中はさらに+${card.comboBonus}！`;
        case 'ice_lance':
            return `🧊 ${card.baseDamage}ダメージ＋敵の攻撃力を${card.debuff.value}さげる（${card.debuff.turns}ターン）`;
        case 'meteor':
            return `☄️ ${card.baseDamage}ダメージ！空から岩をおとす大技！`;
        case 'quick_slash':
            return `💨 ${card.baseDamage}ダメージ！コスト0でつかえる！`;
        case 'poison_blade':
            return `🗡️ ${card.baseDamage}ダメージ＋毒${card.poison}！毒は毎ターン敵にダメージ！`;
        case 'combo_blade':
            return `🔪 ${card.baseDamage}ダメージ＋コンボ数×${card.comboMultiplierBonus}の追加ダメージ！`;
        case 'longword_burst':
            return `📚 英単語の文字数×${card.lengthSynergy}のダメージとブロック！`;
        case 'soul_blade':
            return `💀 ${card.baseDamage}ダメージ＋このバトルの正解数×2のダメージ！じわじわ強くなる！`;
        case 'rage_flame':
            return `😡 ${card.baseDamage}ダメージ＋失ったHP÷5のダメージ！ピンチほど燃えあがる！`;
        case 'snowball':
            return `⛄ ${card.baseDamage}ダメージ！使うたびに永久+3！（現在${card.baseDamage}→次は${card.baseDamage + 3}）`;
        case 'vortex':
            return `🌊 ${card.baseDamage}ダメージ＋手札の枚数×2のダメージ！カードを引いてから使おう！`;

        // === 防御カード ===
        case 'shield':
            return `🛡️ ${card.baseBlock}ブロック！敵のこうげきをふせぐ！`;
        case 'iron_wall':
            return `🏰 ${card.baseBlock}ブロック！鉄の壁で守りをかためる！`;
        case 'counter':
            return `🔄 ${card.baseBlock}ブロック＋${card.baseDamage}ダメージ！守りながらやりかえす！`;
        case 'barrier':
            return `✨ ${card.baseBlock}ブロック！つぎのターンも${card.persistBlock}ブロックのこる！`;
        case 'thorn_armor':
            return `🦔 ${card.baseBlock}ブロック！このターン、敵が攻撃してくるたびに${card.thornArmor}ダメージ返す！`;

        // === スキルカード ===
        case 'heal':
            return `💚 HPを${card.healAmount}かいふく！` + suffix;
        case 'power_up': {
            const pct = Math.round((card.buff.value - 1) * 100);
            return `💪 つぎの攻撃のダメージが+${pct}%！` + suffix;
        }
        case 'draw_card':
            return `🃏 カードを${card.drawCount}まいひく！` + suffix;
        case 'focus':
            return `🔮 つぎのターン、エナジー+${card.buff.value}！コスト0！` + suffix;
        case 'mega_heal':
            return `💖 HPを${card.healAmount}かいふく！ピンチのときのたのもしい味方！` + suffix;
        case 'poison_catalyst':
            return `🧪 毒${card.poison}を与えて、敵の毒を2倍に！` + suffix;
        case 'accumulate':
            return `🌀 全攻撃ダメージが永久+${card.accumulate}！今すぐ重ねよう！` + suffix;
        case 'weak_point':
            return `🎯 敵の毒が3以上なら、つぎの攻撃が2倍！コスト0！` + suffix;
        case 'mirror_copy':
            return `🪞 さっきつかったカードをもう1回！` + suffix;

        default:
            return card.description;
    }
}

/**
 * レアリティに基づいてランダムなカードを取得
 * @param {number} count - 取得枚数
 * @param {string} minRarity - 最低レアリティ
 * @returns {Array} カード定義IDの配列
 */
export function getRandomCards(count, minRarity = 'common') {
    const rarityOrder = ['common', 'uncommon', 'rare'];
    const minIndex = rarityOrder.indexOf(minRarity);

    const eligibleCards = Object.entries(CARD_DEFINITIONS)
        .filter(([, def]) => rarityOrder.indexOf(def.rarity) >= minIndex);

    const result = [];
    const used = new Set();

    while (result.length < count && result.length < eligibleCards.length) {
        const [id] = eligibleCards[Math.floor(Math.random() * eligibleCards.length)];
        if (!used.has(id)) {
            used.add(id);
            result.push(id);
        }
    }

    return result;
}

/**
 * 初期デッキを生成
 * @returns {Array} カードインスタンスの配列
 */
export function createStarterDeck() {
    const deckDef = [
        'slash', 'slash', 'slash', 'slash',
        'shield', 'shield', 'shield',
        'quick_slash', 'quick_slash',
        'heal'
    ];
    return deckDef.map(id => createCard(id));
}

/**
 * デッキ管理クラス
 */
export class DeckManager {
    constructor(cards) {
        /** 山札 */
        this.drawPile = [...cards];
        /** 手札 */
        this.hand = [];
        /** 捨て札 */
        this.discardPile = [];
        /** 除外 */
        this.exhaustPile = [];

        this.shuffle();
    }

    /**
     * 山札をシャッフル
     */
    shuffle() {
        for (let i = this.drawPile.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.drawPile[i], this.drawPile[j]] = [this.drawPile[j], this.drawPile[i]];
        }
    }

    /**
     * 指定枚数のカードを引く
     * @param {number} count - 引く枚数
     * @returns {Array} 引いたカード
     */
    draw(count = 5) {
        const drawn = [];
        for (let i = 0; i < count; i++) {
            if (this.drawPile.length === 0) {
                // 山札切れ → 捨て札をリシャッフル
                if (this.discardPile.length === 0) break;
                this.drawPile = [...this.discardPile];
                this.discardPile = [];
                this.shuffle();
            }
            const card = this.drawPile.pop();
            if (card) {
                this.hand.push(card);
                drawn.push(card);
            }
        }
        return drawn;
    }

    /**
     * 手札からカードを使用（捨て札へ）
     * @param {string} instanceId - カードインスタンスID
     * @returns {Object|null} 使用したカード
     */
    playCard(instanceId) {
        const index = this.hand.findIndex(c => c.instanceId === instanceId);
        if (index === -1) return null;
        const card = this.hand.splice(index, 1)[0];
        this.discardPile.push(card);
        return card;
    }

    /**
     * 手札からカードを除外（廃棄）
     * @param {string} instanceId - カードインスタンスID
     * @returns {Object|null} 除外したカード
     */
    exhaustCard(instanceId) {
        const index = this.hand.findIndex(c => c.instanceId === instanceId);
        if (index === -1) return null;
        const card = this.hand.splice(index, 1)[0];
        this.exhaustPile.push(card);
        return card;
    }

    /**
     * ターン終了時に手札を全て捨て札に
     */
    discardHand() {
        this.discardPile.push(...this.hand);
        this.hand = [];
    }

    /**
     * デッキ全体のカード一覧
     * @returns {Array} 全カード
     */
    getAllCards() {
        return [...this.drawPile, ...this.hand, ...this.discardPile, ...this.exhaustPile];
    }

    /**
     * デッキにカードを追加
     * @param {Object} card - カードインスタンス
     */
    addCard(card) {
        this.discardPile.push(card);
    }

    /**
     * デッキからカードを除去
     * @param {string} instanceId - カードインスタンスID
     * @returns {boolean} 除去成功したか
     */
    removeCard(instanceId) {
        for (const pile of [this.drawPile, this.hand, this.discardPile]) {
            const idx = pile.findIndex(c => c.instanceId === instanceId);
            if (idx !== -1) {
                pile.splice(idx, 1);
                return true;
            }
        }
        return false;
    }
}
