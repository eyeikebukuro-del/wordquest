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
    CHOICE_DOUBLE: 'choice_double', // 4択×2問
    CHOICE_TRIPLE: 'choice_triple' // 4択×3問
};

/**
 * 全カード定義マスタ
 */
export const CARD_DEFINITIONS = {
    // =========================================================================
    // === ワードマスター（wordmaster）専用カード定義（スペル＆スノーボール刷新版） ===
    // =========================================================================

    // === 攻撃カード ===
    slash: {
        id: 'slash',
        name: 'スペル・スラッシュ',
        type: CARD_TYPES.ATTACK,
        cost: 1,
        baseDamage: 6,
        longWordBonus: 4,
        emoji: '⚔️',
        description: '⚔️ 6ダメージ！5文字以上の英単語ならさらに+4ダメージ！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'common',
        color: '#ff6b6b'
    },
    fireball: {
        id: 'fireball',
        name: 'スペル・フレア',
        type: CARD_TYPES.ATTACK,
        cost: 2,
        baseDamage: 10,
        wordLengthDamage: 2,
        emoji: '🔥',
        description: '🔥 10ダメージ＋英単語の文字数×2ダメージ追加！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'uncommon',
        color: '#ff4500'
    },
    double_strike: {
        id: 'double_strike',
        name: 'ツイン・チャント',
        type: CARD_TYPES.ATTACK,
        cost: 1,
        baseDamage: 5,
        hits: 2,
        emoji: '⚡',
        description: '⚡ 5ダメージを2回！英単語を2問といて連続詠唱！',
        quizMode: QUIZ_MODES.CHOICE_DOUBLE,
        rarity: 'uncommon',
        color: '#ffa500'
    },
    thunder: {
        id: 'thunder',
        name: 'チェイン・サンダー',
        type: CARD_TYPES.ATTACK,
        cost: 2,
        baseDamage: 14,
        emoji: '⛈️',
        description: '⛈️ 14ダメージ！コンボ中は+8ダメージ＆カードを1まい引く！',
        quizMode: QUIZ_MODES.CHOICE,
        comboBonus: 8,
        comboDraw: 1,
        rarity: 'uncommon',
        color: '#ffea00'
    },
    ice_lance: {
        id: 'ice_lance',
        name: 'フリーズ・スペル',
        type: CARD_TYPES.ATTACK,
        cost: 1,
        baseDamage: 5,
        drawCount: 1,
        emoji: '🧊',
        description: '🧊 5ダメージ！敵の攻撃力-2（1T）＆カードを1まい引く！',
        quizMode: QUIZ_MODES.CHOICE,
        debuff: { type: 'weakened', value: 2, turns: 1 },
        rarity: 'common',
        color: '#74b9ff'
    },
    meteor: {
        id: 'meteor',
        name: 'アルファ・メテオ',
        type: CARD_TYPES.ATTACK,
        cost: 3,
        baseDamage: 24,
        vowelBonusDamage: 5,
        emoji: '☄️',
        description: '☄️ 24ダメージ！さらに英単語の母音(a,i,u,e,o)の数×5ダメージ！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'rare',
        color: '#e056fd'
    },
    quick_slash: {
        id: 'quick_slash',
        name: 'フォニックス・ダガー',
        type: CARD_TYPES.ATTACK,
        cost: 0,
        baseDamage: 4,
        vowelStartDraw: 1,
        emoji: '💨',
        description: '💨 4ダメージ！コスト0！母音(a,i,u,e,o)始まりなら1まい引く！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'common',
        color: '#a8e6cf'
    },
    poison_blade: {
        id: 'poison_blade',
        name: 'ベノム・スペル',
        type: CARD_TYPES.ATTACK,
        cost: 1,
        baseDamage: 4,
        emoji: '🐍',
        description: '🐍 4ダメージ＋英単語の文字数と同じ量の毒を与える！',
        quizMode: QUIZ_MODES.CHOICE,
        poison: 3,
        wordLengthPoison: true,
        rarity: 'uncommon',
        color: '#6c5ce7'
    },
    combo_blade: {
        id: 'combo_blade',
        name: 'リズム・ブレード',
        type: CARD_TYPES.ATTACK,
        cost: 2,
        baseDamage: 10,
        emoji: '🔪',
        description: '🔪 10ダメージ＋コンボ数×6ダメージ！',
        quizMode: QUIZ_MODES.CHOICE,
        comboMultiplierBonus: 6,
        rarity: 'rare',
        color: '#ff9f43'
    },
    longword_burst: {
        id: 'longword_burst',
        name: 'ボキャブラ・ノヴァ',
        type: CARD_TYPES.ATTACK,
        cost: 2,
        baseDamage: 0,
        emoji: '📚',
        description: '📚 英単語の文字数×4のダメージとブロック！',
        quizMode: QUIZ_MODES.CHOICE,
        lengthSynergy: 4,
        rarity: 'rare',
        color: '#5f27cd'
    },
    triple_slash: {
        id: 'triple_slash',
        name: 'トリプル・レキシコン',
        type: CARD_TYPES.ATTACK,
        cost: 3,
        baseDamage: 12,
        hits: 3,
        emoji: '⚡',
        description: '⚡ 12ダメージを3回！英単語を3問とく超連撃！',
        quizMode: QUIZ_MODES.CHOICE_TRIPLE,
        rarity: 'rare',
        color: '#ff3f3f'
    },

    // ── スケーリング＆シナジー攻撃カード ──

    soul_blade: {
        id: 'soul_blade',
        name: 'アカシック・ブレード',
        type: CARD_TYPES.ATTACK,
        cost: 1,
        baseDamage: 6,
        soulMult: 3,
        emoji: '💀',
        description: '💀 6ダメージ！さらに正解数×3ダメージ追加！',
        quizMode: QUIZ_MODES.CHOICE,
        soulBlade: true,
        rarity: 'rare',
        color: '#8e44ad'
    },
    rage_flame: {
        id: 'rage_flame',
        name: 'リベンジ・フレイム',
        type: CARD_TYPES.ATTACK,
        cost: 1,
        baseDamage: 5,
        healAmount: 3,
        emoji: '😡',
        description: '😡 5ダメージ＋へったHP÷4ダメージ！さらにHP3かいふく！',
        quizMode: QUIZ_MODES.CHOICE,
        rageFlame: true,
        rarity: 'uncommon',
        color: '#e74c3c'
    },
    snowball: {
        id: 'snowball',
        name: 'グロウ・スペル',
        type: CARD_TYPES.ATTACK,
        cost: 1,
        baseDamage: 6,
        emoji: '⛄',
        description: '⛄ 6ダメージ！使うたびこのカードの威力がずっと+5成長！',
        quizMode: QUIZ_MODES.CHOICE,
        snowball: true,
        snowballBuff: 5,
        rarity: 'rare',
        color: '#74b9ff'
    },
    vortex: {
        id: 'vortex',
        name: 'ワード・ストーム',
        type: CARD_TYPES.ATTACK,
        cost: 1,
        baseDamage: 4,
        vortexMult: 3,
        emoji: '🌪️',
        description: '🌪️ 4ダメージ！さらに手札のまい数×3ダメージ追加！',
        quizMode: QUIZ_MODES.CHOICE,
        vortex: true,
        rarity: 'uncommon',
        color: '#0984e3'
    },

    // === 防御カード ===
    shield: {
        id: 'shield',
        name: 'スペル・シールド',
        type: CARD_TYPES.DEFENSE,
        cost: 1,
        baseBlock: 6,
        longWordBlock: 3,
        emoji: '🛡️',
        description: '🛡️ 6ブロック！5文字以上の英単語ならさらに+3ブロック！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'common',
        color: '#74b9ff'
    },
    iron_wall: {
        id: 'iron_wall',
        name: 'フォートレス・ウォール',
        type: CARD_TYPES.DEFENSE,
        cost: 2,
        baseBlock: 14,
        drawCount: 1,
        emoji: '🏰',
        description: '🏰 14ブロック！さらにカードを1まい引く！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'uncommon',
        color: '#636e72'
    },
    counter: {
        id: 'counter',
        name: 'エコー・カウンター',
        type: CARD_TYPES.DEFENSE,
        cost: 1,
        baseBlock: 6,
        baseDamage: 6,
        comboBonus: 4,
        emoji: '🔄',
        description: '🔄 6ブロック＋6ダメージ！コンボ中ならさらに+4ダメージ！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'uncommon',
        color: '#fd79a8'
    },
    barrier: {
        id: 'barrier',
        name: 'エターナル・バリア',
        type: CARD_TYPES.DEFENSE,
        cost: 2,
        baseBlock: 10,
        emoji: '✨',
        description: '✨ 10ブロック！次のターンも6ブロック残る！',
        quizMode: QUIZ_MODES.CHOICE,
        persistent: true,
        persistBlock: 6,
        rarity: 'rare',
        color: '#00cec9'
    },
    thorn_armor: {
        id: 'thorn_armor',
        name: 'ルーンの荊鎧',
        type: CARD_TYPES.DEFENSE,
        cost: 1,
        baseBlock: 6,
        emoji: '🦔',
        description: '🦔 6ブロック！攻撃されるたびに4ダメージ返す！',
        quizMode: QUIZ_MODES.CHOICE,
        thornArmor: 4,
        rarity: 'uncommon',
        color: '#55efc4'
    },
    holy_shield: {
        id: 'holy_shield',
        name: 'サンクチュアリ',
        type: CARD_TYPES.DEFENSE,
        cost: 2,
        baseBlock: 14,
        healAmount: 8,
        emoji: '✨',
        description: '✨ 14ブロック！さらにHPを8かいふく！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'rare',
        color: '#feca57'
    },

    // === スキルカード ===
    heal: {
        id: 'heal',
        name: 'ヒーリング・チャント',
        type: CARD_TYPES.SKILL,
        cost: 1,
        healAmount: 6,
        baseBlock: 4,
        emoji: '💚',
        description: '💚 HPを6かいふく＋4ブロック獲得！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'common',
        color: '#00b894'
    },
    power_up: {
        id: 'power_up',
        name: 'エンチャント・ワード',
        type: CARD_TYPES.SKILL,
        cost: 1,
        accumulate: 2,
        emoji: '💪',
        description: '💪 次の攻撃ダメージ+50%＆バトル中ずっと全攻撃+2！',
        quizMode: QUIZ_MODES.CHOICE,
        buff: { type: 'strength', value: 1.5, turns: 1 },
        rarity: 'uncommon',
        color: '#e17055'
    },
    draw_card: {
        id: 'draw_card',
        name: 'グリモワール',
        type: CARD_TYPES.SKILL,
        cost: 1,
        drawCount: 2,
        zeroCostHandCard: 1,
        emoji: '📖',
        description: '📖 カードを2まい引き、手札1まいのコストをこのターン0にする！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'uncommon',
        color: '#dfe6e9'
    },
    focus: {
        id: 'focus',
        name: 'マナ・チャント',
        type: CARD_TYPES.SKILL,
        cost: 0,
        energyBonus: 1,
        emoji: '🔮',
        description: '🔮 今すぐエナジー+1＆次のターンもエナジー+1！コスト0！',
        quizMode: QUIZ_MODES.CHOICE,
        buff: { type: 'next_turn_energy', value: 1, turns: 1 },
        rarity: 'rare',
        color: '#a29bfe'
    },
    mega_heal: {
        id: 'mega_heal',
        name: 'ゴッド・ブレッシング',
        type: CARD_TYPES.SKILL,
        cost: 2,
        healAmount: 14,
        drawCount: 2,
        emoji: '💖',
        description: '💖 HPを14かいふく＋カードを2まい引く！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'rare',
        color: '#fd79a8'
    },
    poison_catalyst: {
        id: 'poison_catalyst',
        name: 'カース・スペル',
        type: CARD_TYPES.SKILL,
        cost: 1,
        emoji: '🧪',
        description: '🧪 毒5を与える！さらに敵の毒を2倍にする！',
        quizMode: QUIZ_MODES.CHOICE,
        poison: 5,
        catalyst: true,
        rarity: 'rare',
        color: '#8e44ad'
    },

    // ── スノーボール・スキルカード ──

    accumulate: {
        id: 'accumulate',
        name: 'レキシコンの覚醒',
        type: CARD_TYPES.SKILL,
        cost: 1,
        drawCount: 1,
        emoji: '🌀',
        description: '🌀 全攻撃ダメージがずっと+4＆カードを1まい引く！',
        quizMode: QUIZ_MODES.CHOICE,
        accumulate: 4,
        rarity: 'rare',
        color: '#6c5ce7'
    },
    weak_point: {
        id: 'weak_point',
        name: 'クリティカル・スペル',
        type: CARD_TYPES.SKILL,
        cost: 0,
        drawCount: 1,
        emoji: '🎯',
        description: '🎯 次の攻撃ダメージ2倍＆カードを1まい引く！コスト0！',
        quizMode: QUIZ_MODES.CHOICE,
        weakPoint: true,
        rarity: 'uncommon',
        color: '#00b894'
    },
    mirror_copy: {
        id: 'mirror_copy',
        name: 'エコー・スペル',
        type: CARD_TYPES.SKILL,
        cost: 1,
        emoji: '🪞',
        description: '🪞 前のカードをもう1回使う！',
        quizMode: QUIZ_MODES.CHOICE,
        mirrorCopy: true,
        mirrorRatio: 1,
        rarity: 'rare',
        color: '#e17055'
    },

    // =========================================================================
    // === 算術マスター（mathmaster）専用カード定義 ===
    // =========================================================================

    // ── 算術マスター：攻撃カード ──
    abacus_strike: {
        id: 'abacus_strike',
        name: 'そろばん弾き',
        character: 'mathmaster',
        type: CARD_TYPES.ATTACK,
        cost: 1,
        baseDamage: 6,
        emoji: '🧮',
        description: '🧮 6ダメージ！はじき出した数で攻撃！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'common',
        color: '#ff6b6b'
    },
    mental_math: {
        id: 'mental_math',
        name: '暗算ショット',
        character: 'mathmaster',
        type: CARD_TYPES.ATTACK,
        cost: 0,
        baseDamage: 3,
        emoji: '💡',
        description: '💡 3ダメージ！コスト0ですばやく計算！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'common',
        color: '#a8e6cf'
    },
    prime_slash: {
        id: 'prime_slash',
        name: '素数スラッシュ',
        character: 'mathmaster',
        type: CARD_TYPES.ATTACK,
        cost: 1,
        baseDamage: 4,
        emoji: '📏',
        description: '📏 4ダメージ！敵の攻撃力を2さげる（1ターン）',
        quizMode: QUIZ_MODES.CHOICE,
        debuff: { type: 'weakened', value: 2, turns: 1 },
        rarity: 'common',
        color: '#74b9ff'
    },
    nine_tables: {
        id: 'nine_tables',
        name: '九九の連弾',
        character: 'mathmaster',
        type: CARD_TYPES.ATTACK,
        cost: 2,
        baseDamage: 5,
        hits: 2,
        emoji: '🔢',
        description: '🔢 5ダメージを2回！計算を2問とく！',
        quizMode: QUIZ_MODES.CHOICE_DOUBLE,
        rarity: 'uncommon',
        color: '#ffa500'
    },
    indian_math: {
        id: 'indian_math',
        name: 'インド式魔導砲',
        character: 'mathmaster',
        type: CARD_TYPES.ATTACK,
        cost: 2,
        baseDamage: 12,
        twoDigitBonusDamage: 8,
        emoji: '🇮🇳',
        description: '🇮🇳 12ダメージ！2けたの計算ならさらに+8ダメージ！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'uncommon',
        color: '#ff4500'
    },
    exponential_strike: {
        id: 'exponential_strike',
        name: '累乗インパクト',
        character: 'mathmaster',
        type: CARD_TYPES.ATTACK,
        cost: 2,
        baseDamage: 10,
        comboBonus: 6,
        emoji: '📈',
        description: '📈 10ダメージ！コンボ中はさらに+6ダメージ！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'uncommon',
        color: '#ffea00'
    },
    fractal_venom: {
        id: 'fractal_venom',
        name: 'フラクタル侵食',
        character: 'mathmaster',
        type: CARD_TYPES.ATTACK,
        cost: 1,
        baseDamage: 3,
        poison: 3,
        emoji: '🧪',
        description: '🧪 3ダメージ＋毒3！無限に広がる数式の毒！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'uncommon',
        color: '#6c5ce7'
    },
    paradox_flame: {
        id: 'paradox_flame',
        name: 'パラドックスの炎',
        character: 'mathmaster',
        type: CARD_TYPES.ATTACK,
        cost: 1,
        baseDamage: 3,
        rageFlame: true,
        emoji: '🔥',
        description: '🔥 3ダメージ！さらに、へったHP÷5ダメージ！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'uncommon',
        color: '#e74c3c'
    },
    factor_vortex: {
        id: 'factor_vortex',
        name: '因数うずしお',
        character: 'mathmaster',
        type: CARD_TYPES.ATTACK,
        cost: 1,
        baseDamage: 2,
        vortex: true,
        emoji: '🌊',
        description: '🌊 2ダメージ！さらに手札のまい数×2ダメージ！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'uncommon',
        color: '#0984e3'
    },
    product_burst: {
        id: 'product_burst',
        name: '積のバースト',
        character: 'mathmaster',
        type: CARD_TYPES.ATTACK,
        cost: 2,
        baseDamage: 4,
        digitSumSynergy: 2,
        emoji: '💥',
        description: '💥 4ダメージ＋こたえの各けたの合計×2のダメージとブロック！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'rare',
        color: '#5f27cd'
    },
    big_number_cannon: {
        id: 'big_number_cannon',
        name: '大数カノン',
        character: 'mathmaster',
        type: CARD_TYPES.ATTACK,
        cost: 2,
        baseDamage: 8,
        answerScaleDivisor: 15,
        emoji: '🚀',
        description: '🚀 8ダメージ！さらに「こたえ÷15」ダメージ追加！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'rare',
        color: '#00cec9'
    },
    fibonacci_spiral: {
        id: 'fibonacci_spiral',
        name: '黄金比スパイラル',
        character: 'mathmaster',
        type: CARD_TYPES.ATTACK,
        cost: 2,
        baseDamage: 10,
        comboMultiplierBonus: 5,
        emoji: '🌀',
        description: '🌀 10ダメージ＋コンボ数×5ダメージ！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'rare',
        color: '#ff9f43'
    },
    square_meteor: {
        id: 'square_meteor',
        name: '平方メテオ',
        character: 'mathmaster',
        type: CARD_TYPES.ATTACK,
        cost: 3,
        baseDamage: 24,
        emoji: '☄️',
        description: '☄️ 24ダメージ！巨大な立方体をおとす大技！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'rare',
        color: '#e056fd'
    },
    triple_matrix: {
        id: 'triple_matrix',
        name: '三重マトリクス',
        character: 'mathmaster',
        type: CARD_TYPES.ATTACK,
        cost: 3,
        baseDamage: 12,
        hits: 3,
        emoji: '⚡',
        description: '⚡ 12ダメージを3回！計算を3問とく！',
        quizMode: QUIZ_MODES.CHOICE_TRIPLE,
        rarity: 'rare',
        color: '#ff3f3f'
    },
    theorem_blade: {
        id: 'theorem_blade',
        name: '定理の刃',
        character: 'mathmaster',
        type: CARD_TYPES.ATTACK,
        cost: 1,
        baseDamage: 4,
        soulBlade: true,
        emoji: '📜',
        description: '📜 4ダメージ！さらに正解数×2ダメージ追加！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'rare',
        color: '#8e44ad'
    },
    sequence_snowball: {
        id: 'sequence_snowball',
        name: '等差ストーム',
        character: 'mathmaster',
        type: CARD_TYPES.ATTACK,
        cost: 2,
        baseDamage: 2,
        snowball: true,
        snowballBuff: 4,
        emoji: '🌨️',
        description: '🌨️ 2ダメージ！使うたびにずっと+4ダメージ！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'rare',
        color: '#74b9ff'
    },

    // ── 算術マスター：防御カード ──
    geometric_shield: {
        id: 'geometric_shield',
        name: '幾何学バリア',
        character: 'mathmaster',
        type: CARD_TYPES.DEFENSE,
        cost: 1,
        baseBlock: 5,
        emoji: '📐',
        description: '📐 5ブロック！美しい図形で攻撃をふせぐ！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'common',
        color: '#74b9ff'
    },
    magic_square: {
        id: 'magic_square',
        name: '魔方陣ウォール',
        character: 'mathmaster',
        type: CARD_TYPES.DEFENSE,
        cost: 2,
        baseBlock: 12,
        emoji: '🧱',
        description: '🧱 12ブロック！完璧な魔方陣でかためる！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'uncommon',
        color: '#636e72'
    },
    inverse_counter: {
        id: 'inverse_counter',
        name: '逆算カウンター',
        character: 'mathmaster',
        type: CARD_TYPES.DEFENSE,
        cost: 1,
        baseBlock: 3,
        baseDamage: 3,
        emoji: '🔄',
        description: '🔄 3ブロック！さらに3ダメージ返す！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'uncommon',
        color: '#fd79a8'
    },
    compass_needle: {
        id: 'compass_needle',
        name: 'コンパスの針',
        character: 'mathmaster',
        type: CARD_TYPES.DEFENSE,
        cost: 1,
        baseBlock: 4,
        thornArmor: 3,
        emoji: '🧭',
        description: '🧭 4ブロック！攻撃されるたびに3ダメージ返す！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'uncommon',
        color: '#55efc4'
    },
    mobius_ring: {
        id: 'mobius_ring',
        name: 'メビウスの輪',
        character: 'mathmaster',
        type: CARD_TYPES.DEFENSE,
        cost: 2,
        baseBlock: 8,
        persistent: true,
        persistBlock: 4,
        emoji: '♾️',
        description: '♾️ 8ブロック！次のターンも4ブロック残る！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'rare',
        color: '#00cec9'
    },
    golden_fortress: {
        id: 'golden_fortress',
        name: '黄金律の要塞',
        character: 'mathmaster',
        type: CARD_TYPES.DEFENSE,
        cost: 3,
        baseBlock: 15,
        healAmount: 10,
        emoji: '🏛️',
        description: '🏛️ 15ブロック！さらにHPを10かいふく！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'rare',
        color: '#feca57'
    },

    // ── 算術マスター：スキルカード ──
    proof_heal: {
        id: 'proof_heal',
        name: '証明完了',
        character: 'mathmaster',
        type: CARD_TYPES.SKILL,
        cost: 1,
        healAmount: 5,
        emoji: '📝',
        description: '📝 HPを5かいふく！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'common',
        color: '#00b894'
    },
    formula_boost: {
        id: 'formula_boost',
        name: '公式展開',
        character: 'mathmaster',
        type: CARD_TYPES.SKILL,
        cost: 1,
        emoji: '📊',
        description: '📊 次の攻撃のダメージが+50%！',
        quizMode: QUIZ_MODES.CHOICE,
        buff: { type: 'strength', value: 1.5, turns: 1 },
        rarity: 'uncommon',
        color: '#e17055'
    },
    brain_accelerate: {
        id: 'brain_accelerate',
        name: '思考加速',
        character: 'mathmaster',
        type: CARD_TYPES.SKILL,
        cost: 1,
        drawCount: 2,
        emoji: '🧠',
        description: '🧠 カードを2まい引く！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'uncommon',
        color: '#dfe6e9'
    },
    double_formula: {
        id: 'double_formula',
        name: '2倍角の公式',
        character: 'mathmaster',
        type: CARD_TYPES.SKILL,
        cost: 0,
        weakPoint: true,
        emoji: '🎯',
        description: '🎯 次の攻撃のダメージが2倍！コスト0！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'uncommon',
        color: '#00b894'
    },
    zero_point: {
        id: 'zero_point',
        name: 'ゼロの発見',
        character: 'mathmaster',
        type: CARD_TYPES.SKILL,
        cost: 0,
        emoji: '0️⃣',
        description: '0️⃣ 次のターン、エナジー+1！コスト0！',
        quizMode: QUIZ_MODES.CHOICE,
        buff: { type: 'next_turn_energy', value: 1, turns: 1 },
        rarity: 'rare',
        color: '#a29bfe'
    },
    perfect_number: {
        id: 'perfect_number',
        name: '完全数リカバリー',
        character: 'mathmaster',
        type: CARD_TYPES.SKILL,
        cost: 2,
        healAmount: 12,
        emoji: '💖',
        description: '💖 HPを12かいふく！美しい数の調和！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'rare',
        color: '#fd79a8'
    },
    exponential_poison: {
        id: 'exponential_poison',
        name: '倍々ゲーム',
        character: 'mathmaster',
        type: CARD_TYPES.SKILL,
        cost: 2,
        poison: 5,
        catalyst: true,
        emoji: '☣️',
        description: '☣️ 毒5を与える！さらに敵の毒を2倍にする！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'rare',
        color: '#8e44ad'
    },
    axiom_power: {
        id: 'axiom_power',
        name: '公理の蓄積',
        character: 'mathmaster',
        type: CARD_TYPES.SKILL,
        cost: 1,
        accumulate: 3,
        emoji: '📚',
        description: '📚 全攻撃ダメージがずっと+3！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'rare',
        color: '#6c5ce7'
    },
    symmetry_mirror: {
        id: 'symmetry_mirror',
        name: '線対称ミラー',
        character: 'mathmaster',
        type: CARD_TYPES.SKILL,
        cost: 1,
        mirrorCopy: true,
        mirrorRatio: 1,
        emoji: '🪞',
        description: '🪞 前のカードをもう1回使う！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'rare',
        color: '#e17055'
    },

    // =========================================================================
    // === カンフーマスター（kungfumaster）専用カード定義 ===
    // =========================================================================

    // ── カンフーマスター：攻撃カード ──
    seiken_tsuki: {
        id: 'seiken_tsuki',
        name: '正拳突き',
        character: 'kungfumaster',
        type: CARD_TYPES.ATTACK,
        cost: 1,
        baseDamage: 6,
        emoji: '👊',
        description: '👊 6ダメージ！まっすぐな拳で突きぬく！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'common',
        color: '#ff6b6b'
    },
    shippu_kick: {
        id: 'shippu_kick',
        name: '疾風脚',
        character: 'kungfumaster',
        type: CARD_TYPES.ATTACK,
        cost: 0,
        baseDamage: 3,
        emoji: '🦶',
        description: '🦶 3ダメージ！コスト0のすばやい蹴り！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'common',
        color: '#a8e6cf'
    },
    hakkei_palm: {
        id: 'hakkei_palm',
        name: '発勁掌',
        character: 'kungfumaster',
        type: CARD_TYPES.ATTACK,
        cost: 1,
        baseDamage: 4,
        emoji: '✋',
        description: '✋ 4ダメージ！敵の攻撃力を2さげる（1ターン）',
        quizMode: QUIZ_MODES.CHOICE,
        debuff: { type: 'weakened', value: 2, turns: 1 },
        rarity: 'common',
        color: '#74b9ff'
    },
    renbu_ken: {
        id: 'renbu_ken',
        name: '連舞拳',
        character: 'kungfumaster',
        type: CARD_TYPES.ATTACK,
        cost: 2,
        baseDamage: 5,
        hits: 2,
        emoji: '🥋',
        description: '🥋 5ダメージを2回！漢字クイズを2問とく！',
        quizMode: QUIZ_MODES.CHOICE_DOUBLE,
        rarity: 'uncommon',
        color: '#ffa500'
    },
    dragon_kick: {
        id: 'dragon_kick',
        name: '龍神脚',
        character: 'kungfumaster',
        type: CARD_TYPES.ATTACK,
        cost: 2,
        baseDamage: 14,
        emoji: '🐉',
        description: '🐉 14ダメージ！龍のような跳び蹴り！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'uncommon',
        color: '#ff4500'
    },
    gouken_strike: {
        id: 'gouken_strike',
        name: '剛拳砕き',
        character: 'kungfumaster',
        type: CARD_TYPES.ATTACK,
        cost: 2,
        baseDamage: 12,
        highStrokeBonusDamage: 8,
        emoji: '💥',
        description: '💥 12ダメージ！10画以上の漢字ならさらに+8ダメージ！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'uncommon',
        color: '#e17055'
    },
    raijin_ken: {
        id: 'raijin_ken',
        name: '雷神拳',
        character: 'kungfumaster',
        type: CARD_TYPES.ATTACK,
        cost: 2,
        baseDamage: 10,
        comboBonus: 6,
        emoji: '⚡',
        description: '⚡ 10ダメージ！コンボ中はさらに+6ダメージ！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'uncommon',
        color: '#ffea00'
    },
    dokushu_ken: {
        id: 'dokushu_ken',
        name: '毒手拳',
        character: 'kungfumaster',
        type: CARD_TYPES.ATTACK,
        cost: 1,
        baseDamage: 3,
        poison: 3,
        emoji: '🦂',
        description: '🦂 3ダメージ＋毒3！秘伝の毒手で攻撃！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'uncommon',
        color: '#6c5ce7'
    },
    haisui_ken: {
        id: 'haisui_ken',
        name: '背水の拳',
        character: 'kungfumaster',
        type: CARD_TYPES.ATTACK,
        cost: 1,
        baseDamage: 3,
        rageFlame: true,
        emoji: '🔥',
        description: '🔥 3ダメージ！さらに、へったHP÷5ダメージ！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'uncommon',
        color: '#e74c3c'
    },
    senpu_kyaku: {
        id: 'senpu_kyaku',
        name: '旋風脚',
        character: 'kungfumaster',
        type: CARD_TYPES.ATTACK,
        cost: 1,
        baseDamage: 2,
        vortex: true,
        emoji: '🌪️',
        description: '🌪️ 2ダメージ！さらに手札のまい数×2ダメージ！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'uncommon',
        color: '#0984e3'
    },
    kakusu_burst: {
        id: 'kakusu_burst',
        name: '画数バースト',
        character: 'kungfumaster',
        type: CARD_TYPES.ATTACK,
        cost: 2,
        baseDamage: 4,
        strokeSynergy: 2,
        emoji: '🖌️',
        description: '🖌️ 4ダメージ＋漢字の画数×2のダメージとブロック！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'rare',
        color: '#5f27cd'
    },
    renki_hadou: {
        id: 'renki_hadou',
        name: '練気波動',
        character: 'kungfumaster',
        type: CARD_TYPES.ATTACK,
        cost: 2,
        baseDamage: 10,
        comboMultiplierBonus: 5,
        emoji: '🌀',
        description: '🌀 10ダメージ＋コンボ数×5ダメージ！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'rare',
        color: '#ff9f43'
    },
    tenchi_haoh: {
        id: 'tenchi_haoh',
        name: '天地覇王拳',
        character: 'kungfumaster',
        type: CARD_TYPES.ATTACK,
        cost: 3,
        baseDamage: 24,
        emoji: '☄️',
        description: '☄️ 24ダメージ！天地をゆらす究極奥義！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'rare',
        color: '#e056fd'
    },
    hyakuretsu_ken: {
        id: 'hyakuretsu_ken',
        name: '百烈拳',
        character: 'kungfumaster',
        type: CARD_TYPES.ATTACK,
        cost: 3,
        baseDamage: 12,
        hits: 3,
        emoji: '👊',
        description: '👊 12ダメージを3回！漢字クイズを3問とく！',
        quizMode: QUIZ_MODES.CHOICE_TRIPLE,
        rarity: 'rare',
        color: '#ff3f3f'
    },
    bushin_blade: {
        id: 'bushin_blade',
        name: '武神の魂',
        character: 'kungfumaster',
        type: CARD_TYPES.ATTACK,
        cost: 1,
        baseDamage: 4,
        soulBlade: true,
        emoji: '🏮',
        description: '🏮 4ダメージ！さらに正解数×2ダメージ追加！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'rare',
        color: '#8e44ad'
    },
    shugyo_snowball: {
        id: 'shugyo_snowball',
        name: '千日修行',
        character: 'kungfumaster',
        type: CARD_TYPES.ATTACK,
        cost: 2,
        baseDamage: 2,
        snowball: true,
        snowballBuff: 4,
        emoji: '⛰️',
        description: '⛰️ 2ダメージ！使うたびにずっと+4ダメージ！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'rare',
        color: '#74b9ff'
    },

    // ── カンフーマスター：防御カード ──
    kiko_guard: {
        id: 'kiko_guard',
        name: '気功ガード',
        character: 'kungfumaster',
        type: CARD_TYPES.DEFENSE,
        cost: 1,
        baseBlock: 5,
        emoji: '🛡️',
        description: '🛡️ 5ブロック！気のオーラで攻撃をふせぐ！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'common',
        color: '#74b9ff'
    },
    kongou_stance: {
        id: 'kongou_stance',
        name: '金剛立ち',
        character: 'kungfumaster',
        type: CARD_TYPES.DEFENSE,
        cost: 2,
        baseBlock: 12,
        emoji: '🗿',
        description: '🗿 12ブロック！岩のように動かない構え！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'uncommon',
        color: '#636e72'
    },
    taikyoku_counter: {
        id: 'taikyoku_counter',
        name: '太極カウンター',
        character: 'kungfumaster',
        type: CARD_TYPES.DEFENSE,
        cost: 1,
        baseBlock: 3,
        baseDamage: 3,
        emoji: '☯️',
        description: '☯️ 3ブロック！敵の力を受け流して3ダメージ！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'uncommon',
        color: '#fd79a8'
    },
    ryu_uroko: {
        id: 'ryu_uroko',
        name: '龍のうろこ',
        character: 'kungfumaster',
        type: CARD_TYPES.DEFENSE,
        cost: 1,
        baseBlock: 4,
        thornArmor: 3,
        emoji: '🐲',
        description: '🐲 4ブロック！攻撃されるたびに3ダメージ返す！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'uncommon',
        color: '#55efc4'
    },
    fudou_stance: {
        id: 'fudou_stance',
        name: '不動の構え',
        character: 'kungfumaster',
        type: CARD_TYPES.DEFENSE,
        cost: 2,
        baseBlock: 8,
        persistent: true,
        persistBlock: 4,
        emoji: '🏯',
        description: '🏯 8ブロック！次のターンも4ブロック残る！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'rare',
        color: '#00cec9'
    },
    senjutsu_wall: {
        id: 'senjutsu_wall',
        name: '仙術の護り',
        character: 'kungfumaster',
        type: CARD_TYPES.DEFENSE,
        cost: 3,
        baseBlock: 15,
        healAmount: 10,
        emoji: '✨',
        description: '✨ 15ブロック！さらにHPを10かいふく！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'rare',
        color: '#feca57'
    },

    // ── カンフーマスター：スキルカード ──
    kokyu_ho: {
        id: 'kokyu_ho',
        name: '呼吸法',
        character: 'kungfumaster',
        type: CARD_TYPES.SKILL,
        cost: 1,
        healAmount: 5,
        emoji: '🍃',
        description: '🍃 HPを5かいふく！深い呼吸で気を整える！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'common',
        color: '#00b894'
    },
    kiai_boost: {
        id: 'kiai_boost',
        name: '気合充実',
        character: 'kungfumaster',
        type: CARD_TYPES.SKILL,
        cost: 1,
        emoji: '💪',
        description: '💪 次の攻撃のダメージが+50%！',
        quizMode: QUIZ_MODES.CHOICE,
        buff: { type: 'strength', value: 1.5, turns: 1 },
        rarity: 'uncommon',
        color: '#e17055'
    },
    shingan_draw: {
        id: 'shingan_draw',
        name: '心眼',
        character: 'kungfumaster',
        type: CARD_TYPES.SKILL,
        cost: 1,
        drawCount: 2,
        emoji: '👁️',
        description: '👁️ カードを2まい引く！心の目で動きを読む！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'uncommon',
        color: '#dfe6e9'
    },
    kyusho_strike: {
        id: 'kyusho_strike',
        name: '急所見切り',
        character: 'kungfumaster',
        type: CARD_TYPES.SKILL,
        cost: 0,
        weakPoint: true,
        emoji: '🎯',
        description: '🎯 次の攻撃のダメージが2倍！コスト0！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'uncommon',
        color: '#00b894'
    },
    mu_stance: {
        id: 'mu_stance',
        name: '無の境地',
        character: 'kungfumaster',
        type: CARD_TYPES.SKILL,
        cost: 0,
        emoji: '🧘',
        description: '🧘 次のターン、エナジー+1！コスト0！',
        quizMode: QUIZ_MODES.CHOICE,
        buff: { type: 'next_turn_energy', value: 1, turns: 1 },
        rarity: 'rare',
        color: '#a29bfe'
    },
    daishuten_heal: {
        id: 'daishuten_heal',
        name: '大周天',
        character: 'kungfumaster',
        type: CARD_TYPES.SKILL,
        cost: 2,
        healAmount: 12,
        emoji: '💖',
        description: '💖 HPを12かいふく！全身に気をめぐらせる！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'rare',
        color: '#fd79a8'
    },
    keiraku_poison: {
        id: 'keiraku_poison',
        name: '経絡秘孔',
        character: 'kungfumaster',
        type: CARD_TYPES.SKILL,
        cost: 2,
        poison: 5,
        catalyst: true,
        emoji: '☣️',
        description: '☣️ 毒5を与える！さらに敵の毒を2倍にする！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'rare',
        color: '#8e44ad'
    },
    tanden_power: {
        id: 'tanden_power',
        name: '丹田練気',
        character: 'kungfumaster',
        type: CARD_TYPES.SKILL,
        cost: 1,
        accumulate: 3,
        emoji: '🔥',
        description: '🔥 全攻撃ダメージがずっと+3！',
        quizMode: QUIZ_MODES.CHOICE,
        rarity: 'rare',
        color: '#6c5ce7'
    },
    zanshin_mirror: {
        id: 'zanshin_mirror',
        name: '残心演武',
        character: 'kungfumaster',
        type: CARD_TYPES.SKILL,
        cost: 1,
        mirrorCopy: true,
        mirrorRatio: 1,
        emoji: '🪞',
        description: '🪞 前のカードをもう1回使う！',
        quizMode: QUIZ_MODES.CHOICE,
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
        card.description += '（1回だけ）';
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

        // レベルアップボーナス（スキル・特殊効果系）
        if (card.drawCount) card.drawCount += 1;
        if (card.poison) card.poison = Math.ceil(card.poison * 1.4);
        if (card.comboBonus) card.comboBonus = Math.ceil(card.comboBonus * 1.3);
        if (card.debuff) card.debuff = { ...card.debuff, value: card.debuff.value + 1 };
        if (card.thornArmor) card.thornArmor = Math.ceil(card.thornArmor * 1.3);
        if (card.accumulate) card.accumulate += 1;
        if (card.snowballBuff) card.snowballBuff += 1; // 5->6->7
        if (card.lengthSynergy) card.lengthSynergy += 1; // 4->5->6
        if (card.longWordBonus) card.longWordBonus += 2; // 4->6->8
        if (card.longWordBlock) card.longWordBlock += 2; // 3->5->7
        if (card.wordLengthDamage) card.wordLengthDamage += 1; // 2->3->4
        if (card.vowelBonusDamage) card.vowelBonusDamage += 2; // 5->7->9
        if (card.soulMult) card.soulMult += 1; // 3->4->5
        if (card.vortexMult) card.vortexMult += 1; // 3->4->5
        if (card.twoDigitBonusDamage) card.twoDigitBonusDamage = Math.ceil(card.twoDigitBonusDamage * 1.3);
        if (card.digitSumSynergy) card.digitSumSynergy += 1; // 2->3->4
        if (card.answerScaleDivisor) card.answerScaleDivisor = Math.max(6, card.answerScaleDivisor - 3); // 15->12->9
        if (card.strokeSynergy) card.strokeSynergy += 1; // 2->3->4
        if (card.highStrokeBonusDamage) card.highStrokeBonusDamage = Math.ceil(card.highStrokeBonusDamage * 1.3);
        if (card.mirrorRatio) card.mirrorRatio += 0.5; // 1->1.5->2.0
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
    const suffix = card.type === CARD_TYPES.SKILL ? '（1回だけ）' : '';
    switch (card.id) {
        // === ワードマスター：攻撃カード ===
        case 'slash':
            return `⚔️ ${card.baseDamage}ダメージ！5文字以上の英単語なら+${card.longWordBonus || 4}ダメージ！`;
        case 'fireball':
            return `🔥 ${card.baseDamage}ダメージ＋英単語の文字数×${card.wordLengthDamage || 2}ダメージ！`;
        case 'double_strike':
            return `⚡ ${card.baseDamage}ダメージを${card.hits}回！英単語を${card.hits}問とく！`;
        case 'triple_slash':
            return `⚡ ${card.baseDamage}ダメージを${card.hits}回！英単語を${card.hits}問とく超連撃！`;
        case 'thunder':
            return `⛈️ ${card.baseDamage}ダメージ！コンボ中は+${card.comboBonus}ダメージ＆1まい引く！`;
        case 'ice_lance':
            return `🧊 ${card.baseDamage}ダメージ！敵攻撃力-${card.debuff.value}＆カードを${card.drawCount || 1}まい引く！`;
        case 'meteor':
            return `☄️ ${card.baseDamage}ダメージ！母音(a,i,u,e,o)の数×${card.vowelBonusDamage || 5}ダメージ追加！`;
        case 'quick_slash':
            return `💨 ${card.baseDamage}ダメージ！コスト0！母音始まりなら1まい引く！`;
        case 'poison_blade':
            return `🐍 ${card.baseDamage}ダメージ＋英単語の文字数と同じ量の毒を与える！`;
        case 'combo_blade':
            return `🔪 ${card.baseDamage}ダメージ＋コンボ数×${card.comboMultiplierBonus}ダメージ！`;
        case 'longword_burst':
            return `📚 英単語の文字数×${card.lengthSynergy}のダメージとブロック！`;
        case 'soul_blade':
            return `💀 ${card.baseDamage}ダメージ！さらに正解数×${card.soulMult || 3}ダメージ追加！`;
        case 'rage_flame':
            return `😡 ${card.baseDamage}ダメージ＋へったHP÷4ダメージ！さらにHP${card.healAmount || 3}かいふく！`;
        case 'snowball':
            return `⛄ ${card.baseDamage}ダメージ！使うたび威力がずっと+${card.snowballBuff}成長！`;
        case 'vortex':
            return `🌪️ ${card.baseDamage}ダメージ！さらに手札のまい数×${card.vortexMult || 3}ダメージ！`;

        // === ワードマスター：防御カード ===
        case 'shield':
            return `🛡️ ${card.baseBlock}ブロック！5文字以上の英単語なら+${card.longWordBlock || 3}ブロック！`;
        case 'iron_wall':
            return `🏰 ${card.baseBlock}ブロック！さらにカードを${card.drawCount || 1}まい引く！`;
        case 'counter':
            return `🔄 ${card.baseBlock}ブロック＋${card.baseDamage}ダメージ！コンボ中なら+${card.comboBonus || 4}ダメージ！`;
        case 'barrier':
            return `✨ ${card.baseBlock}ブロック！次のターンも${card.persistBlock}ブロック残る！`;
        case 'thorn_armor':
            return `🦔 ${card.baseBlock}ブロック！攻撃されるたびに${card.thornArmor}ダメージ返す！`;
        case 'holy_shield':
            return `✨ ${card.baseBlock}ブロック！さらにHPを${card.healAmount}かいふく！`;

        // === ワードマスター：スキルカード ===
        case 'heal':
            return `💚 HPを${card.healAmount}かいふく＋${card.baseBlock || 4}ブロック獲得！` + suffix;
        case 'power_up': {
            const pct = Math.round((card.buff.value - 1) * 100);
            return `💪 次の攻撃+${pct}%＆バトル中ずっと全攻撃+${card.accumulate || 2}！` + suffix;
        }
        case 'draw_card':
            return `📖 カードを${card.drawCount}まい引き、手札1まいのコストをこのターン0に！` + suffix;
        case 'focus':
            return `🔮 今すぐ⚡+${card.energyBonus || 1}＆次のターンも⚡+${card.buff.value}！コスト0！` + suffix;
        case 'mega_heal':
            return `💖 HPを${card.healAmount}かいふく＋カードを${card.drawCount || 2}まい引く！` + suffix;
        case 'poison_catalyst':
            return `🧪 毒${card.poison}を与える！さらに敵の毒を2倍にする！` + suffix;
        case 'accumulate':
            return `🌀 全攻撃ダメージがずっと+${card.accumulate}＆カード${card.drawCount || 1}まいドロー！` + suffix;
        case 'weak_point':
            return `🎯 次の攻撃ダメージ2倍＆カード${card.drawCount || 1}まいドロー！` + suffix;
        case 'mirror_copy': {
            const ratioStr = card.mirrorRatio > 1 ? `（威力${card.mirrorRatio}倍！）` : '';
            return `🪞 前のカードをもう1回使う${ratioStr}！` + suffix;
        }

        // === 算術マスター：攻撃カード ===
        case 'abacus_strike':
            return `🧮 ${card.baseDamage}ダメージ！はじき出した数で攻撃！`;
        case 'mental_math':
            return `💡 ${card.baseDamage}ダメージ！コスト0ですばやく計算！`;
        case 'prime_slash':
            return `📏 ${card.baseDamage}ダメージ！敵の攻撃力を${card.debuff.value}さげる（${card.debuff.turns}ターン）`;
        case 'nine_tables':
            return `🔢 ${card.baseDamage}ダメージを${card.hits}回！計算を${card.hits}問とく！`;
        case 'indian_math':
            return `🇮🇳 ${card.baseDamage}ダメージ！2けたの計算ならさらに+${card.twoDigitBonusDamage}ダメージ！`;
        case 'exponential_strike':
            return `📈 ${card.baseDamage}ダメージ！コンボ中はさらに+${card.comboBonus}ダメージ！`;
        case 'fractal_venom':
            return `🧪 ${card.baseDamage}ダメージ＋毒${card.poison}！無限に広がる数式の毒！`;
        case 'paradox_flame':
            return `🔥 ${card.baseDamage}ダメージ！さらに、へったHP÷5ダメージ！`;
        case 'factor_vortex':
            return `🌊 ${card.baseDamage}ダメージ！さらに手札のまい数×2ダメージ！`;
        case 'product_burst':
            return `💥 ${card.baseDamage}ダメージ＋こたえの各けたの合計×${card.digitSumSynergy}のダメージとブロック！`;
        case 'big_number_cannon':
            return `🚀 ${card.baseDamage}ダメージ！さらに「こたえ÷${card.answerScaleDivisor}」ダメージ追加！`;
        case 'fibonacci_spiral':
            return `🌀 ${card.baseDamage}ダメージ＋コンボ数×${card.comboMultiplierBonus}ダメージ！`;
        case 'square_meteor':
            return `☄️ ${card.baseDamage}ダメージ！巨大な立方体をおとす大技！`;
        case 'triple_matrix':
            return `⚡ ${card.baseDamage}ダメージを${card.hits}回！計算を${card.hits}問とく！`;
        case 'theorem_blade':
            return `📜 ${card.baseDamage}ダメージ！さらに正解数×2ダメージ追加！`;
        case 'sequence_snowball':
            return `🌨️ ${card.baseDamage}ダメージ！使うたびにずっと+${card.snowballBuff}ダメージ！`;

        // === 算術マスター：防御カード ===
        case 'geometric_shield':
            return `📐 ${card.baseBlock}ブロック！美しい図形で攻撃をふせぐ！`;
        case 'magic_square':
            return `🧱 ${card.baseBlock}ブロック！完璧な魔方陣でかためる！`;
        case 'inverse_counter':
            return `🔄 ${card.baseBlock}ブロック！さらに${card.baseDamage}ダメージ返す！`;
        case 'compass_needle':
            return `🧭 ${card.baseBlock}ブロック！攻撃されるたびに${card.thornArmor}ダメージ返す！`;
        case 'mobius_ring':
            return `♾️ ${card.baseBlock}ブロック！次のターンも${card.persistBlock}ブロック残る！`;
        case 'golden_fortress':
            return `🏛️ ${card.baseBlock}ブロック！さらにHPを${card.healAmount}かいふく！`;

        // === 算術マスター：スキルカード ===
        case 'proof_heal':
            return `📝 HPを${card.healAmount}かいふく！` + suffix;
        case 'formula_boost': {
            const pct = Math.round((card.buff.value - 1) * 100);
            return `📊 次の攻撃のダメージが+${pct}%！` + suffix;
        }
        case 'brain_accelerate':
            return `🧠 カードを${card.drawCount}まい引く！` + suffix;
        case 'double_formula':
            return `🎯 次の攻撃のダメージが2倍！コスト0！` + suffix;
        case 'zero_point':
            return `0️⃣ 次のターン、エナジー+${card.buff.value}！コスト0！` + suffix;
        case 'perfect_number':
            return `💖 HPを${card.healAmount}かいふく！美しい数の調和！` + suffix;
        case 'exponential_poison':
            return `☣️ 毒${card.poison}を与える！さらに敵の毒を2倍にする！` + suffix;
        case 'axiom_power':
            return `📚 全攻撃ダメージがずっと+${card.accumulate}！` + suffix;
        case 'symmetry_mirror': {
            const ratioStr = card.mirrorRatio > 1 ? `（威力${card.mirrorRatio}倍！）` : '';
            return `🪞 前のカードをもう1回使う${ratioStr}！` + suffix;
        }

        // === カンフーマスター：攻撃カード ===
        case 'seiken_tsuki':
            return `👊 ${card.baseDamage}ダメージ！まっすぐな拳で突きぬく！`;
        case 'shippu_kick':
            return `🦶 ${card.baseDamage}ダメージ！コスト0のすばやい蹴り！`;
        case 'hakkei_palm':
            return `✋ ${card.baseDamage}ダメージ！敵の攻撃力を${card.debuff.value}さげる（${card.debuff.turns}ターン）`;
        case 'renbu_ken':
            return `🥋 ${card.baseDamage}ダメージを${card.hits}回！漢字クイズを${card.hits}問とく！`;
        case 'dragon_kick':
            return `🐉 ${card.baseDamage}ダメージ！龍のような跳び蹴り！`;
        case 'gouken_strike':
            return `💥 ${card.baseDamage}ダメージ！10画以上の漢字ならさらに+${card.highStrokeBonusDamage}ダメージ！`;
        case 'raijin_ken':
            return `⚡ ${card.baseDamage}ダメージ！コンボ中はさらに+${card.comboBonus}ダメージ！`;
        case 'dokushu_ken':
            return `🦂 ${card.baseDamage}ダメージ＋毒${card.poison}！秘伝の毒手で攻撃！`;
        case 'haisui_ken':
            return `🔥 ${card.baseDamage}ダメージ！さらに、へったHP÷5ダメージ！`;
        case 'senpu_kyaku':
            return `🌪️ ${card.baseDamage}ダメージ！さらに手札のまい数×2ダメージ！`;
        case 'kakusu_burst':
            return `🖌️ ${card.baseDamage}ダメージ＋漢字の画数×${card.strokeSynergy}のダメージとブロック！`;
        case 'renki_hadou':
            return `🌀 ${card.baseDamage}ダメージ＋コンボ数×${card.comboMultiplierBonus}ダメージ！`;
        case 'tenchi_haoh':
            return `☄️ ${card.baseDamage}ダメージ！天地をゆらす究極奥義！`;
        case 'hyakuretsu_ken':
            return `👊 ${card.baseDamage}ダメージを${card.hits}回！漢字クイズを${card.hits}問とく！`;
        case 'bushin_blade':
            return `🏮 ${card.baseDamage}ダメージ！さらに正解数×2ダメージ追加！`;
        case 'shugyo_snowball':
            return `⛰️ ${card.baseDamage}ダメージ！使うたびにずっと+${card.snowballBuff}ダメージ！`;

        // === カンフーマスター：防御カード ===
        case 'kiko_guard':
            return `🛡️ ${card.baseBlock}ブロック！気のオーラで攻撃をふせぐ！`;
        case 'kongou_stance':
            return `🗿 ${card.baseBlock}ブロック！岩のように動かない構え！`;
        case 'taikyoku_counter':
            return `☯️ ${card.baseBlock}ブロック！敵の力を受け流して${card.baseDamage}ダメージ！`;
        case 'ryu_uroko':
            return `🐲 ${card.baseBlock}ブロック！攻撃されるたびに${card.thornArmor}ダメージ返す！`;
        case 'fudou_stance':
            return `🏯 ${card.baseBlock}ブロック！次のターンも${card.persistBlock}ブロック残る！`;
        case 'senjutsu_wall':
            return `✨ ${card.baseBlock}ブロック！さらにHPを${card.healAmount}かいふく！`;

        // === カンフーマスター：スキルカード ===
        case 'kokyu_ho':
            return `🍃 HPを${card.healAmount}かいふく！深い呼吸で気を整える！` + suffix;
        case 'kiai_boost': {
            const pct = Math.round((card.buff.value - 1) * 100);
            return `💪 次の攻撃のダメージが+${pct}%！` + suffix;
        }
        case 'shingan_draw':
            return `👁️ カードを${card.drawCount}まい引く！心の目で動きを読む！` + suffix;
        case 'kyusho_strike':
            return `🎯 次の攻撃のダメージが2倍！コスト0！` + suffix;
        case 'mu_stance':
            return `🧘 次のターン、エナジー+${card.buff.value}！コスト0！` + suffix;
        case 'daishuten_heal':
            return `💖 HPを${card.healAmount}かいふく！全身に気をめぐらせる！` + suffix;
        case 'keiraku_poison':
            return `☣️ 毒${card.poison}を与える！さらに敵の毒を2倍にする！` + suffix;
        case 'tanden_power':
            return `🔥 全攻撃ダメージがずっと+${card.accumulate}！` + suffix;
        case 'zanshin_mirror': {
            const ratioStr = card.mirrorRatio > 1 ? `（威力${card.mirrorRatio}倍！）` : '';
            return `🪞 前のカードをもう1回使う${ratioStr}！` + suffix;
        }

        default:
            return card.description;
    }
}

/**
 * レアリティおよびキャラクターに基づいてランダムなカードを取得
 * @param {number} count - 取得枚数
 * @param {string} minRarity - 最低レアリティ
 * @param {string} characterId - キャラクターID（'wordmaster' | 'mathmaster' | 'kungfumaster'）
 * @returns {Array} カード定義IDの配列
 */
export function getRandomCards(count, minRarity = 'common', characterId = 'wordmaster') {
    const rarityOrder = ['common', 'uncommon', 'rare'];
    const minIndex = rarityOrder.indexOf(minRarity);

    const eligibleCards = Object.entries(CARD_DEFINITIONS)
        .filter(([, def]) => {
            const cardChar = def.character || 'wordmaster';
            return cardChar === characterId && rarityOrder.indexOf(def.rarity) >= minIndex;
        });

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
 * @param {string} characterId - キャラクターID（'wordmaster' | 'mathmaster' | 'kungfumaster'）
 * @returns {Array} カードインスタンスの配列
 */
export function createStarterDeck(characterId = 'wordmaster') {
    let deckDef;
    if (characterId === 'mathmaster') {
        deckDef = [
            'abacus_strike', 'abacus_strike', 'abacus_strike', 'abacus_strike',
            'geometric_shield', 'geometric_shield', 'geometric_shield',
            'mental_math', 'mental_math',
            'proof_heal'
        ];
    } else if (characterId === 'kungfumaster') {
        deckDef = [
            'seiken_tsuki', 'seiken_tsuki', 'seiken_tsuki', 'seiken_tsuki',
            'kiko_guard', 'kiko_guard', 'kiko_guard',
            'shippu_kick', 'shippu_kick',
            'kokyu_ho'
        ];
    } else {
        deckDef = [
            'slash', 'slash', 'slash', 'slash',
            'shield', 'shield', 'shield',
            'quick_slash', 'quick_slash',
            'heal'
        ];
    }
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
