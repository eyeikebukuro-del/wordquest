// スケーリングシステム
// スノーボール効果（カードXP、コンボ、レリック）を管理する

/**
 * レリック（パッシブ効果アイテム）定義
 */
export const RELIC_DEFINITIONS = {
    lucky_coin: {
        id: 'lucky_coin',
        name: 'ラッキーコイン',
        emoji: '🪙',
        description: 'バトル後のゴールド+25%',
        effect: { type: 'gold_bonus', value: 0.25 }
    },
    sharp_blade: {
        id: 'sharp_blade',
        name: 'するどい剣',
        emoji: '🗡️',
        description: '攻撃カードのダメージ+2',
        effect: { type: 'attack_bonus', value: 2 }
    },
    thick_armor: {
        id: 'thick_armor',
        name: 'あつい鎧',
        emoji: '🛡️',
        description: '防御カードのブロック+2',
        effect: { type: 'block_bonus', value: 2 }
    },
    healing_ring: {
        id: 'healing_ring',
        name: 'いやしの指輪',
        emoji: '💍',
        description: 'バトル後にHP5回復',
        effect: { type: 'heal_after_battle', value: 5 }
    },
    word_scroll: {
        id: 'word_scroll',
        name: '言葉の巻物',
        emoji: '📜',
        description: '正答時のカードXP+1',
        effect: { type: 'xp_bonus', value: 1 }
    },
    combo_ring: {
        id: 'combo_ring',
        name: 'コンボリング',
        emoji: '💫',
        description: 'コンボボーナスが+10%増加',
        effect: { type: 'combo_bonus', value: 0.1 }
    },
    crystal_heart: {
        id: 'crystal_heart',
        name: 'クリスタルハート',
        emoji: '💎',
        description: '最大HP+10',
        effect: { type: 'max_hp_bonus', value: 10 },
        onPickup: true
    },
    speed_boots: {
        id: 'speed_boots',
        name: 'はやさのブーツ',
        emoji: '👟',
        description: '初ターンのドロー+1',
        effect: { type: 'first_draw_bonus', value: 1 }
    },
    magic_book: {
        id: 'magic_book',
        name: 'まほうの本',
        emoji: '📖',
        description: 'エナジー+1（バトル開始時）',
        effect: { type: 'energy_bonus', value: 1 }
    },
    wisdom_gem: {
        id: 'wisdom_gem',
        name: 'ちえの宝石',
        emoji: '🔮',
        description: '4択問題のヒントが1つ表示される',
        effect: { type: 'hint', value: 1 }
    }
};

/**
 * ポーション（使い切りアイテム）定義
 */
export const POTION_DEFINITIONS = {
    health_potion: {
        id: 'health_potion',
        name: 'HPポーション',
        emoji: '🧪',
        description: 'HPを15回復',
        effect: { type: 'heal', value: 15 }
    },
    energy_potion: {
        id: 'energy_potion',
        name: 'エナジーポーション',
        emoji: '⚡',
        description: 'このターンのエナジー+2',
        effect: { type: 'energy', value: 2 }
    },
    power_potion: {
        id: 'power_potion',
        name: 'パワーポーション',
        emoji: '💪',
        description: 'このバトル中、攻撃ダメージ+50%',
        effect: { type: 'damage_mult', value: 1.5 }
    },
    hint_potion: {
        id: 'hint_potion',
        name: 'ヒントポーション',
        emoji: '💡',
        description: '不正解の選択肢を2つ消す',
        effect: { type: 'eliminate_choices', value: 2 }
    }
};

/**
 * スケーリングシステムクラス
 */
export class ScalingSystem {
    constructor() {
        /** コンボカウンター（連続正答数） */
        this.comboCount = 0;
        /** 最大コンボ記録 */
        this.maxCombo = 0;
        /** レリック一覧 */
        this.relics = [];
        /** ポーション一覧（最大3個） */
        this.potions = [];
        /** プレイヤーバフ */
        this.buffs = {};
    }

    /**
     * コンボ倍率を取得
     * @returns {number} ダメージ倍率
     */
    getComboMultiplier() {
        const baseComboBonus = this.getRelicBonus('combo_bonus');
        if (this.comboCount < 2) return 1.0;
        if (this.comboCount < 4) return 1.4 + baseComboBonus; // 1.3 -> 1.4
        if (this.comboCount < 6) return 1.6 + baseComboBonus * 2;
        if (this.comboCount < 8) return 2.0 + baseComboBonus * 3;
        return 2.4 + baseComboBonus * 4; // 2.5 -> 2.4
    }

    /**
     * コンボテキストを取得
     * @returns {string} 表示テキスト
     */
    getComboText() {
        if (this.comboCount < 2) return '';
        const mult = this.getComboMultiplier().toFixed(1);
        const postfix = ` ×${mult}`;

        if (this.comboCount < 4) return '🔥 GOOD!' + postfix;
        if (this.comboCount < 6) return '🔥🔥 GREAT!' + postfix;
        if (this.comboCount < 8) return '🔥🔥🔥 EXCELLENT!' + postfix;
        return '🔥🔥🔥🔥 AMAZING!' + postfix;
    }

    /**
     * 正答時のコンボ更新
     */
    incrementCombo() {
        this.comboCount++;
        if (this.comboCount > this.maxCombo) {
            this.maxCombo = this.comboCount;
        }
    }

    /**
     * 誤答時のコンボリセット
     */
    resetCombo() {
        this.comboCount = 0;
    }

    /**
     * レリックを追加
     * @param {string} relicId - レリックID
     * @returns {Object} 追加したレリック
     */
    addRelic(relicId) {
        const def = RELIC_DEFINITIONS[relicId];
        if (!def) return null;
        if (this.relics.find(r => r.id === relicId)) return null; // 重複不可
        this.relics.push({ ...def });
        if (window.sm) window.sm.playRelic();
        return def;
    }

    /**
     * 特定タイプのレリックボーナスを合算
     * @param {string} effectType - 効果タイプ
     * @returns {number} ボーナス値
     */
    getRelicBonus(effectType) {
        return this.relics
            .filter(r => r.effect.type === effectType)
            .reduce((sum, r) => sum + r.effect.value, 0);
    }

    /**
     * レリックを持っているか
     * @param {string} effectType - 効果タイプ
     * @returns {boolean}
     */
    hasRelic(effectType) {
        return this.relics.some(r => r.effect.type === effectType);
    }

    /**
     * ポーション追加
     * @param {string} potionId - ポーションID
     * @returns {boolean} 追加成功したか
     */
    addPotion(potionId) {
        if (this.potions.length >= 3) return false;
        const def = POTION_DEFINITIONS[potionId];
        if (!def) return false;
        this.potions.push({ ...def, instanceId: `${potionId}_${Date.now()}` });
        return true;
    }

    /**
     * ポーション使用
     * @param {string} instanceId - ポーションインスタンスID
     * @returns {Object|null} 使用したポーション
     */
    usePotion(instanceId) {
        const idx = this.potions.findIndex(p => p.instanceId === instanceId);
        if (idx === -1) return null;
        return this.potions.splice(idx, 1)[0];
    }

    /**
     * カードのダメージを最終計算
     * @param {Object} card - カードインスタンス
     * @returns {number} 最終ダメージ
     */
    calculateDamage(card) {
        let damage = card.baseDamage || 0;

        // レリックボーナス
        damage += this.getRelicBonus('attack_bonus');

        // コンボ倍率
        damage = Math.ceil(damage * this.getComboMultiplier());

        // バフ
        if (this.buffs.strength) {
            damage = Math.ceil(damage * this.buffs.strength.value);
        }

        // ポーション効果
        if (this.buffs.damage_mult) {
            damage = Math.ceil(damage * this.buffs.damage_mult.value);
        }

        return damage;
    }

    /**
     * カードのブロック値を最終計算
     * @param {Object} card - カードインスタンス
     * @returns {number} 最終ブロック値
     */
    calculateBlock(card) {
        let block = card.baseBlock || 0;
        block += this.getRelicBonus('block_bonus');
        return block;
    }

    /**
     * 敵スケーリング係数
     * @param {number} floor - フロア番号
     * @param {number} nodeIndex - ノード進捗
     * @returns {number} スケーリング係数
     */
    getEnemyScaling(floor, nodeIndex) {
        return 1.0 + (floor - 1) * 0.3 + nodeIndex * 0.05;
    }

    /**
     * ランダムなレリックIDを取得
     * @param {number} count - 取得数
     * @returns {Array} レリックID配列
     */
    getRandomRelics(count = 1) {
        const available = Object.keys(RELIC_DEFINITIONS)
            .filter(id => !this.relics.find(r => r.id === id));

        const shuffled = available.sort(() => Math.random() - 0.5);
        return shuffled.slice(0, count);
    }

    /**
     * ランダムなポーションIDを取得
     * @returns {string} ポーションID
     */
    getRandomPotion() {
        const ids = Object.keys(POTION_DEFINITIONS);
        return ids[Math.floor(Math.random() * ids.length)];
    }
}
