// 敵システム
// 敵の定義、行動パターン、スケーリングを管理する

/**
 * 敵の行動タイプ
 */
export const ENEMY_INTENTS = {
    ATTACK: 'attack',
    DEFEND: 'defend',
    BUFF: 'buff',
    MULTI_ATTACK: 'multi_attack'
};

/**
 * 敵マスタデータ
 */
export const ENEMY_DEFINITIONS = {
    // === フロア1: 森の敵 ===
    slime: {
        id: 'slime',
        name: 'スライム',
        emoji: '🟢',
        baseHp: 20,
        patterns: [
            { intent: ENEMY_INTENTS.ATTACK, damage: 5, emoji: '⚔️' },
            { intent: ENEMY_INTENTS.ATTACK, damage: 7, emoji: '⚔️' },
            { intent: ENEMY_INTENTS.DEFEND, block: 4, emoji: '🛡️' }
        ],
        floor: 1
    },
    goblin: {
        id: 'goblin',
        name: 'ゴブリン',
        emoji: '👺',
        baseHp: 25,
        patterns: [
            { intent: ENEMY_INTENTS.ATTACK, damage: 6, emoji: '⚔️' },
            { intent: ENEMY_INTENTS.ATTACK, damage: 8, emoji: '⚔️' },
            { intent: ENEMY_INTENTS.MULTI_ATTACK, damage: 3, hits: 2, emoji: '⚡' }
        ],
        floor: 1
    },
    mushroom: {
        id: 'mushroom',
        name: 'マッシュルーム',
        emoji: '🍄',
        baseHp: 18,
        patterns: [
            { intent: ENEMY_INTENTS.ATTACK, damage: 4, emoji: '⚔️' },
            { intent: ENEMY_INTENTS.BUFF, buff: { type: 'strength', value: 2 }, emoji: '💪' },
            { intent: ENEMY_INTENTS.ATTACK, damage: 6, emoji: '⚔️' }
        ],
        floor: 1
    },
    bat: {
        id: 'bat',
        name: 'コウモリ',
        emoji: '🦇',
        baseHp: 15,
        patterns: [
            { intent: ENEMY_INTENTS.ATTACK, damage: 4, emoji: '⚔️' },
            { intent: ENEMY_INTENTS.MULTI_ATTACK, damage: 2, hits: 3, emoji: '⚡' },
            { intent: ENEMY_INTENTS.ATTACK, damage: 6, emoji: '⚔️' }
        ],
        floor: 1
    },
    metal_slime: {
        id: 'metal_slime',
        name: 'メタルスライム',
        emoji: '🛡️',
        baseHp: 15,
        patterns: [
            { intent: ENEMY_INTENTS.DEFEND, block: 15, emoji: '🛡️' },
            { intent: ENEMY_INTENTS.DEFEND, block: 20, emoji: '🛡️' },
            { intent: ENEMY_INTENTS.ATTACK, damage: 2, emoji: '⚔️' }
        ],
        floor: 1
    },
    poison_toad: {
        id: 'poison_toad',
        name: 'ポイズントード',
        emoji: '🐸',
        baseHp: 28,
        patterns: [
            { intent: ENEMY_INTENTS.ATTACK, damage: 3, emoji: '⚔️' }, // 実際は毒攻撃にしたいが今のシステムで再現するならバフ等が必要
            { intent: ENEMY_INTENTS.DEFEND, block: 5, emoji: '🛡️' },
            { intent: ENEMY_INTENTS.ATTACK, damage: 7, emoji: '⚔️' }
        ],
        floor: 1
    },

    // === フロア1 ボス ===
    forest_guardian: {
        id: 'forest_guardian',
        name: '森のガーディアン',
        emoji: '🌳',
        image: null,
        baseHp: 55,
        isBoss: true,
        patterns: [
            { intent: ENEMY_INTENTS.ATTACK, damage: 8, emoji: '⚔️' },
            { intent: ENEMY_INTENTS.DEFEND, block: 10, emoji: '🛡️' },
            { intent: ENEMY_INTENTS.BUFF, buff: { type: 'strength', value: 3 }, emoji: '💪' },
            { intent: ENEMY_INTENTS.MULTI_ATTACK, damage: 4, hits: 3, emoji: '⚡' }
        ],
        floor: 1
    },

    // === フロア2: 洞窟の敵 ===
    skeleton: {
        id: 'skeleton',
        name: 'スケルトン',
        emoji: '💀',
        baseHp: 30,
        patterns: [
            { intent: ENEMY_INTENTS.ATTACK, damage: 8, emoji: '⚔️' },
            { intent: ENEMY_INTENTS.ATTACK, damage: 10, emoji: '⚔️' },
            { intent: ENEMY_INTENTS.DEFEND, block: 6, emoji: '🛡️' }
        ],
        floor: 2
    },
    golem: {
        id: 'golem',
        name: 'ゴーレム',
        emoji: '🗿',
        baseHp: 40,
        patterns: [
            { intent: ENEMY_INTENTS.DEFEND, block: 10, emoji: '🛡️' },
            { intent: ENEMY_INTENTS.ATTACK, damage: 12, emoji: '⚔️' },
            { intent: ENEMY_INTENTS.ATTACK, damage: 14, emoji: '⚔️' }
        ],
        floor: 2
    },
    dark_mage: {
        id: 'dark_mage',
        name: 'ダークメイジ',
        emoji: '🧙',
        baseHp: 28,
        patterns: [
            { intent: ENEMY_INTENTS.BUFF, buff: { type: 'strength', value: 3 }, emoji: '💪' },
            { intent: ENEMY_INTENTS.ATTACK, damage: 10, emoji: '⚔️' },
            { intent: ENEMY_INTENTS.MULTI_ATTACK, damage: 5, hits: 2, emoji: '⚡' }
        ],
        floor: 2
    },
    spider: {
        id: 'spider',
        name: 'ジャイアントスパイダー',
        emoji: '🕷️',
        baseHp: 32,
        patterns: [
            { intent: ENEMY_INTENTS.MULTI_ATTACK, damage: 4, hits: 3, emoji: '⚡' },
            { intent: ENEMY_INTENTS.ATTACK, damage: 9, emoji: '⚔️' },
            { intent: ENEMY_INTENTS.DEFEND, block: 5, emoji: '🛡️' }
        ],
        floor: 2
    },

    // === フロア2 ボス ===
    cave_dragon: {
        id: 'cave_dragon',
        name: '洞窟ドラゴン',
        emoji: '🐲',
        image: null,
        baseHp: 80,
        isBoss: true,
        patterns: [
            { intent: ENEMY_INTENTS.ATTACK, damage: 12, emoji: '⚔️' },
            { intent: ENEMY_INTENTS.MULTI_ATTACK, damage: 6, hits: 3, emoji: '⚡' },
            { intent: ENEMY_INTENTS.BUFF, buff: { type: 'strength', value: 4 }, emoji: '💪' },
            { intent: ENEMY_INTENTS.ATTACK, damage: 18, emoji: '⚔️' }
        ],
        floor: 2
    },

    // === フロア3: 塔の敵 ===
    phantom: {
        id: 'phantom',
        name: 'ファントム',
        emoji: '👻',
        baseHp: 38,
        patterns: [
            { intent: ENEMY_INTENTS.ATTACK, damage: 10, emoji: '⚔️' },
            { intent: ENEMY_INTENTS.ATTACK, damage: 14, emoji: '⚔️' },
            { intent: ENEMY_INTENTS.BUFF, buff: { type: 'strength', value: 3 }, emoji: '💪' }
        ],
        floor: 3
    },
    demon: {
        id: 'demon',
        name: 'デーモン',
        emoji: '😈',
        baseHp: 45,
        patterns: [
            { intent: ENEMY_INTENTS.ATTACK, damage: 14, emoji: '⚔️' },
            { intent: ENEMY_INTENTS.MULTI_ATTACK, damage: 6, hits: 3, emoji: '⚡' },
            { intent: ENEMY_INTENTS.DEFEND, block: 12, emoji: '🛡️' }
        ],
        floor: 3
    },
    dark_knight: {
        id: 'dark_knight',
        name: 'ダークナイト',
        emoji: '🖤',
        baseHp: 50,
        patterns: [
            { intent: ENEMY_INTENTS.DEFEND, block: 8, emoji: '🛡️' },
            { intent: ENEMY_INTENTS.ATTACK, damage: 16, emoji: '⚔️' },
            { intent: ENEMY_INTENTS.MULTI_ATTACK, damage: 7, hits: 2, emoji: '⚡' }
        ],
        floor: 3
    },

    // === フロア3 ボス ===
    word_king: {
        id: 'word_king',
        name: '言葉の魔王',
        emoji: '👑',
        image: './characters/word_king.png',
        baseHp: 120,
        isBoss: true,
        patterns: [
            { intent: ENEMY_INTENTS.ATTACK, damage: 14, emoji: '⚔️' },
            { intent: ENEMY_INTENTS.MULTI_ATTACK, damage: 7, hits: 3, emoji: '⚡' },
            { intent: ENEMY_INTENTS.DEFEND, block: 15, emoji: '🛡️' },
            { intent: ENEMY_INTENTS.BUFF, buff: { type: 'strength', value: 5 }, emoji: '💪' },
            { intent: ENEMY_INTENTS.ATTACK, damage: 22, emoji: '⚔️' }
        ],
        floor: 3
    },
    evolving_archive: {
        id: 'evolving_archive',
        name: '進化する古文書',
        emoji: '📖',
        image: './characters/evolving_archive.png',
        baseHp: 150,
        isBoss: true,
        patterns: [
            { intent: ENEMY_INTENTS.ATTACK, damage: 10, emoji: '⚔️' },
            { intent: ENEMY_INTENTS.ATTACK, damage: 12, emoji: '⚔️' },
            { intent: ENEMY_INTENTS.DEFEND, block: 10, emoji: '🛡️' },
            { intent: ENEMY_INTENTS.MULTI_ATTACK, damage: 5, hits: 3, emoji: '⚡' }
        ],
        floor: 3
    }
};

/**
 * エリート敵（通常より強い中ボス）
 */
export const ELITE_ENEMIES = {
    1: ['goblin', 'mushroom', 'metal_slime'],
    2: ['golem', 'dark_mage'],
    3: ['demon', 'dark_knight']
};

/**
 * 敵インスタンスを生成
 * @param {string} enemyId - 敵定義ID
 * @param {number} scalingFactor - スケーリング係数
 * @param {boolean} isElite - エリートかどうか
 * @returns {Object} 敵インスタンス
 */
export function createEnemy(enemyId, scalingFactor = 1.0, isElite = false) {
    const def = ENEMY_DEFINITIONS[enemyId];
    if (!def) throw new Error(`不明な敵: ${enemyId}`);

    const eliteMultiplier = isElite ? 1.5 : 1.0;
    const hp = Math.ceil(def.baseHp * scalingFactor * eliteMultiplier);

    return {
        ...def,
        hp,
        maxHp: hp,
        block: 0,
        buffs: {},
        currentPatternIndex: 0,
        isElite,
        scalingFactor,
        image: def.image || null
    };
}

/**
 * 敵の次の行動を取得
 * @param {Object} enemy - 敵インスタンス
 * @returns {Object} 行動データ
 */
export function getEnemyIntent(enemy) {
    const def = ENEMY_DEFINITIONS[enemy.id];
    const pattern = def.patterns[enemy.currentPatternIndex % def.patterns.length];

    // バフ適用
    let damage = pattern.damage || 0;
    if (enemy.buffs.strength) {
        damage += enemy.buffs.strength;
    }

    return {
        ...pattern,
        damage,
        hits: pattern.hits || 1
    };
}

/**
 * 敵の行動パターンを進める
 * @param {Object} enemy - 敵インスタンス
 */
export function advanceEnemyPattern(enemy) {
    const def = ENEMY_DEFINITIONS[enemy.id];
    enemy.currentPatternIndex = (enemy.currentPatternIndex + 1) % def.patterns.length;
}

/**
 * フロアに応じたランダムな敵を取得
 * @param {number} floor - フロア番号
 * @returns {string} 敵定義ID
 */
export function getRandomEnemy(floor) {
    const floorEnemies = Object.entries(ENEMY_DEFINITIONS)
        .filter(([, def]) => def.floor === floor && !def.isBoss)
        .map(([id]) => id);

    return floorEnemies[Math.floor(Math.random() * floorEnemies.length)];
}

/**
 * フロアのボスを取得
 * @param {number} floor - フロア番号
 * @returns {string} ボス敵定義ID
 */
export function getFloorBoss(floor) {
    const bosses = Object.entries(ENEMY_DEFINITIONS)
        .filter(([, def]) => def.floor === floor && def.isBoss);

    if (bosses.length === 0) return null;
    const [id] = bosses[Math.floor(Math.random() * bosses.length)];
    return id;
}
