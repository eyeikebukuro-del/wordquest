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
        description: '6ダメージを与える',
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
        description: '14ダメージを与える',
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
        description: '5ダメージを2回与える',
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
        description: '10ダメージ。コンボ中+5',
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
        description: '4ダメージ。敵の攻撃力-2（1ターン）',
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
        description: '24ダメージを与える',
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
        description: '3ダメージ。コスト0',
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
        description: '3ダメージ+毒3（毎ターン3ダメージ）',
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
        description: '10ダメージ。コンボ数×5の追加ダメージ',
        quizMode: QUIZ_MODES.CHOICE,
        comboMultiplierBonus: 5, // BattleSystem側で特別処理
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
        description: '英単語の文字数×3のダメージとブロック',
        quizMode: QUIZ_MODES.CHOICE,
        lengthSynergy: 3, // BattleSystem側で特別処理
        rarity: 'rare',
        color: '#5f27cd'
    },

    // === 防御カード ===
    shield: {
        id: 'shield',
        name: 'シールド',
        type: CARD_TYPES.DEFENSE,
        cost: 1,
        baseBlock: 5,
        emoji: '🛡️',
        description: '5ブロックを得る',
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
        description: '12ブロックを得る',
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
        description: '3ブロック+3ダメージ',
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
        description: '8ブロック。次のターンも4ブロック残る',
        quizMode: QUIZ_MODES.CHOICE,
        persistent: true,
        persistBlock: 4,
        rarity: 'rare',
        color: '#00cec9'
    },

    // === スキルカード ===
    heal: {
        id: 'heal',
        name: 'ヒール',
        type: CARD_TYPES.SKILL,
        cost: 1,
        healAmount: 5,
        emoji: '💚',
        description: 'HPを5回復する',
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
        description: '次の攻撃のダメージ+50%',
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
        description: 'カードを2枚引く',
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
        description: '次のターン、エナジー+1',
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
        description: 'HPを12回復する',
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
        description: '毒5を与え、その後敵の毒を2倍にする',
        quizMode: QUIZ_MODES.CHOICE,
        poison: 5,
        catalyst: true, // BattleSystem側で特別処理
        rarity: 'rare',
        color: '#8e44ad'
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
            return `${card.baseDamage}ダメージを与える`;
        case 'fireball':
            return `${card.baseDamage}ダメージを与える`;
        case 'double_strike':
            return `${card.baseDamage}ダメージを${card.hits}回与える`;
        case 'thunder':
            return `${card.baseDamage}ダメージ。コンボ中+${card.comboBonus}`;
        case 'ice_lance':
            return `${card.baseDamage}ダメージ。敵の攻撃力-${card.debuff.value}（${card.debuff.turns}ターン）`;
        case 'meteor':
            return `${card.baseDamage}ダメージを与える`;
        case 'quick_slash':
            return `${card.baseDamage}ダメージ。コスト0`;
        case 'poison_blade':
            return `${card.baseDamage}ダメージ+毒${card.poison}（毎ターン${card.poison}ダメージ）`;
        case 'combo_blade':
            return `${card.baseDamage}ダメージ。コンボ数×${card.comboMultiplierBonus}の追加ダメージ`;
        case 'longword_burst':
            return `英単語の文字数×${card.lengthSynergy}のダメージとブロック`;

        // === 防御カード ===
        case 'shield':
            return `${card.baseBlock}ブロックを得る`;
        case 'iron_wall':
            return `${card.baseBlock}ブロックを得る`;
        case 'counter':
            return `${card.baseBlock}ブロック+${card.baseDamage}ダメージ`;
        case 'barrier':
            return `${card.baseBlock}ブロック。次のターンも${card.persistBlock}ブロック残る`;

        // === スキルカード ===
        case 'heal':
            return `HPを${card.healAmount}回復する` + suffix;
        case 'power_up': {
            const pct = Math.round((card.buff.value - 1) * 100);
            return `次の攻撃のダメージ+${pct}%` + suffix;
        }
        case 'draw_card':
            return `カードを${card.drawCount}枚引く` + suffix;
        case 'focus':
            return `次のターン、エナジー+${card.buff.value}` + suffix;
        case 'mega_heal':
            return `HPを${card.healAmount}回復する` + suffix;
        case 'poison_catalyst':
            return `毒${card.poison}を与え、その後敵の毒を2倍にする` + suffix;

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
