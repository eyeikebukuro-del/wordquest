// 敵システム
// 敵の定義、行動パターン、スケーリングを管理する

/**
 * 敵の行動タイプ
 */
export const ENEMY_INTENTS = {
    ATTACK: 'attack',
    DEFEND: 'defend',
    BUFF: 'buff',
    MULTI_ATTACK: 'multi_attack',
    SLEEP: 'sleep'
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
        image: './characters/slime.png',
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
        image: './characters/goblin.png',
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
        image: './characters/mushroom.png',
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
        image: './characters/bat.png',
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
        image: './characters/metal_slime.png',
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
        image: './characters/poison_toad.png',
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
        image: './characters/forest_guardian.png',
        baseHp: 55,
        isBoss: true,
        gimmick: 'regen_defend',
        regenValue: 8,
        gimmickDesc: '🌳 森の再生：防御ターン（🛡️）にHPを8回復する！（満タン時は最大HPも成長！）',
        patterns: [
            { intent: ENEMY_INTENTS.ATTACK, damage: 8, emoji: '⚔️' },
            { intent: ENEMY_INTENTS.DEFEND, block: 10, emoji: '🛡️' },
            { intent: ENEMY_INTENTS.BUFF, buff: { type: 'strength', value: 3 }, emoji: '💪' },
            { intent: ENEMY_INTENTS.MULTI_ATTACK, damage: 4, hits: 3, emoji: '⚡' }
        ],
        floor: 1
    },
    queen_bee: {
        id: 'queen_bee',
        name: 'クイーン・ビー',
        emoji: '🐝',
        image: './characters/queen_bee.png',
        baseHp: 58,
        isBoss: true,
        gimmick: 'enrage_skill',
        enrageValue: 2,
        gimmickDesc: '🐝 女王の逆鱗：防御・スキル（攻撃以外）を使うたび即座に攻撃力+2！',
        patterns: [
            { intent: ENEMY_INTENTS.MULTI_ATTACK, damage: 3, hits: 2, emoji: '⚡' },
            { intent: ENEMY_INTENTS.ATTACK, damage: 8, emoji: '⚔️' },
            { intent: ENEMY_INTENTS.DEFEND, block: 8, emoji: '🛡️' },
            { intent: ENEMY_INTENTS.MULTI_ATTACK, damage: 4, hits: 3, emoji: '⚡' }
        ],
        floor: 1
    },

    // === フロア2: 洞窟の敵 ===
    skeleton: {
        id: 'skeleton',
        name: 'スケルトン',
        emoji: '💀',
        image: './characters/skeleton.png',
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
        image: './characters/golem.png',
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
        image: './characters/dark_mage.png',
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
        image: './characters/spider.png',
        baseHp: 32,
        patterns: [
            { intent: ENEMY_INTENTS.MULTI_ATTACK, damage: 4, hits: 3, emoji: '⚡' },
            { intent: ENEMY_INTENTS.ATTACK, damage: 9, emoji: '⚔️' },
            { intent: ENEMY_INTENTS.DEFEND, block: 5, emoji: '🛡️' }
        ],
        floor: 2
    },
    crystal_turtle: {
        id: 'crystal_turtle',
        name: 'クリスタルタートル',
        emoji: '🐢',
        image: './characters/crystal_turtle.png',
        baseHp: 34,
        passiveThorns: 2,
        gimmickDesc: '💎 水晶のトゲ：攻撃を受けるたび2ダメージ反射！単発大技か毒が有効！',
        patterns: [
            { intent: ENEMY_INTENTS.DEFEND, block: 8, emoji: '🛡️' },
            { intent: ENEMY_INTENTS.ATTACK, damage: 9, emoji: '⚔️' },
            { intent: ENEMY_INTENTS.DEFEND, block: 10, emoji: '🛡️' },
            { intent: ENEMY_INTENTS.ATTACK, damage: 11, emoji: '⚔️' }
        ],
        floor: 2
    },
    sky_harpy: {
        id: 'sky_harpy',
        name: 'スカイハーピー',
        emoji: '🦅',
        image: './characters/sky_harpy.png',
        baseHp: 30,
        flightHitsRequired: 2,
        gimmickDesc: '🌪️ 風の衣：被ダメージ半減！1ターンに2回攻撃を当てると撃墜して大ダメージ！',
        patterns: [
            { intent: ENEMY_INTENTS.MULTI_ATTACK, damage: 4, hits: 2, emoji: '⚡' },
            { intent: ENEMY_INTENTS.ATTACK, damage: 10, emoji: '⚔️' },
            { intent: ENEMY_INTENTS.BUFF, buff: { type: 'strength', value: 2 }, emoji: '💪' }
        ],
        floor: 2
    },
    sleeping_dragon: {
        id: 'sleeping_dragon',
        name: 'スリーピング・ドラゴン',
        emoji: '🐉',
        image: './characters/sleeping_dragon.png',
        baseHp: 46,
        asleepTurns: 2,
        wakeUpStrength: 4,
        gimmickDesc: '💤 居眠り竜：最初の2ターンは眠っているが、攻撃するか3ターン目に目覚めて猛攻！バフを重ねてから叩こう！',
        patterns: [
            { intent: ENEMY_INTENTS.ATTACK, damage: 14, emoji: '🔥' },
            { intent: ENEMY_INTENTS.MULTI_ATTACK, damage: 7, hits: 2, emoji: '⚡' }
        ],
        floor: 2
    },

    // === フロア2 ボス ===
    cave_dragon: {
        id: 'cave_dragon',
        name: '洞窟ドラゴン',
        emoji: '🐲',
        image: './characters/cave_dragon.png',
        baseHp: 80,
        isBoss: true,
        gimmick: 'dragon_roar',
        gimmickDesc: '🐲 竜の咆哮：バフを使うたびにブロック+8も同時獲得する！',
        patterns: [
            { intent: ENEMY_INTENTS.ATTACK, damage: 12, emoji: '⚔️' },
            { intent: ENEMY_INTENTS.MULTI_ATTACK, damage: 6, hits: 3, emoji: '⚡' },
            { intent: ENEMY_INTENTS.BUFF, buff: { type: 'strength', value: 4 }, emoji: '💪' },
            { intent: ENEMY_INTENTS.ATTACK, damage: 18, emoji: '⚔️' }
        ],
        floor: 2
    },
    magma_behemoth: {
        id: 'magma_behemoth',
        name: 'マグマ・ベヒーモス',
        emoji: '🌋',
        image: './characters/magma_behemoth.png',
        baseHp: 88,
        isBoss: true,
        gimmick: 'magma_armor',
        gimmickDesc: '🌋 灼熱の装甲：敵のブロックを0に破壊すると装甲崩壊で10ダメージ＆弱体化！',
        patterns: [
            { intent: ENEMY_INTENTS.DEFEND, block: 16, emoji: '🌋' },
            { intent: ENEMY_INTENTS.ATTACK, damage: 16, emoji: '☄️' },
            { intent: ENEMY_INTENTS.BUFF, buff: { type: 'strength', value: 3 }, emoji: '💪' },
            { intent: ENEMY_INTENTS.MULTI_ATTACK, damage: 6, hits: 3, emoji: '⚡' }
        ],
        floor: 2
    },

    // === フロア3: 塔の敵 ===
    phantom: {
        id: 'phantom',
        name: 'ファントム',
        emoji: '👻',
        image: './characters/phantom.png',
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
        image: './characters/demon.png',
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
        image: './characters/dark_knight.png',
        baseHp: 50,
        patterns: [
            { intent: ENEMY_INTENTS.DEFEND, block: 8, emoji: '🛡️' },
            { intent: ENEMY_INTENTS.ATTACK, damage: 16, emoji: '⚔️' },
            { intent: ENEMY_INTENTS.MULTI_ATTACK, damage: 7, hits: 2, emoji: '⚡' }
        ],
        floor: 3
    },
    curse_book: {
        id: 'curse_book',
        name: 'カースブック',
        emoji: '📕',
        image: './characters/curse_book.png',
        baseHp: 42,
        gimmick: 'curse_weaken',
        gimmickDesc: '📕 呪いの言霊：クイズを間違えると敵のブロック+8＆攻撃力+2！',
        patterns: [
            { intent: ENEMY_INTENTS.ATTACK, damage: 11, emoji: '📕' },
            { intent: ENEMY_INTENTS.BUFF, buff: { type: 'strength', value: 3 }, emoji: '💪' },
            { intent: ENEMY_INTENTS.MULTI_ATTACK, damage: 6, hits: 2, emoji: '⚡' }
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
        gimmick: 'king_pressure',
        gimmickDesc: '👑 魔王の威圧：クイズを間違えると魔王のブロック+10＆攻撃力+2！',
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
        gimmick: 'evolving_archive',
        gimmickDesc: '📖 覚醒する知性：正解するたびダメージ1.15倍乗算！ミスでリセット！',
        patterns: [
            { intent: ENEMY_INTENTS.ATTACK, damage: 10, emoji: '⚔️' },
            { intent: ENEMY_INTENTS.ATTACK, damage: 12, emoji: '⚔️' },
            { intent: ENEMY_INTENTS.DEFEND, block: 10, emoji: '🛡️' },
            { intent: ENEMY_INTENTS.MULTI_ATTACK, damage: 5, hits: 3, emoji: '⚡' }
        ],
        floor: 3
    },

    // === フロア4: 天空の聖域の敵 ===
    astral_knight: {
        id: 'astral_knight',
        name: 'アストラルナイト',
        emoji: '🌟',
        image: './characters/astral_knight.png',
        baseHp: 55,
        patterns: [
            { intent: ENEMY_INTENTS.DEFEND, block: 12, emoji: '🛡️' },
            { intent: ENEMY_INTENTS.ATTACK, damage: 16, emoji: '⚔️' },
            { intent: ENEMY_INTENTS.MULTI_ATTACK, damage: 8, hits: 2, emoji: '⚡' }
        ],
        floor: 4
    },
    thunder_griffin: {
        id: 'thunder_griffin',
        name: 'サンダーグリフォン',
        emoji: '🦅',
        image: './characters/thunder_griffin.png',
        baseHp: 60,
        flightHitsRequired: 2,
        gimmickDesc: '🌪️ 迅雷の翼：被ダメージ半減！1ターンに2回攻撃を当てると撃墜！',
        patterns: [
            { intent: ENEMY_INTENTS.MULTI_ATTACK, damage: 6, hits: 3, emoji: '⚡' },
            { intent: ENEMY_INTENTS.BUFF, buff: { type: 'strength', value: 4 }, emoji: '💪' },
            { intent: ENEMY_INTENTS.ATTACK, damage: 18, emoji: '⚔️' }
        ],
        floor: 4
    },
    arcane_sphinx: {
        id: 'arcane_sphinx',
        name: 'ちえのスフィンクス',
        emoji: '🦁',
        image: './characters/arcane_sphinx.png',
        baseHp: 65,
        passiveThorns: 3,
        gimmickDesc: '🦁 謎かけの結界：攻撃を受けるたび3ダメージ反射！',
        patterns: [
            { intent: ENEMY_INTENTS.ATTACK, damage: 15, emoji: '⚔️' },
            { intent: ENEMY_INTENTS.DEFEND, block: 14, emoji: '🛡️' },
            { intent: ENEMY_INTENTS.BUFF, buff: { type: 'strength', value: 4 }, emoji: '💪' },
            { intent: ENEMY_INTENTS.ATTACK, damage: 20, emoji: '⚔️' }
        ],
        floor: 4
    },
    astral_eater: {
        id: 'astral_eater',
        name: 'アストラル・イーター',
        emoji: '👾',
        image: './characters/astral_eater.png',
        baseHp: 68,
        absorbOnMiss: 15,
        gimmickDesc: '👾 知識吸収：クイズを間違えるとHP15回復＆攻撃力+3！',
        patterns: [
            { intent: ENEMY_INTENTS.ATTACK, damage: 16, emoji: '⚔️' },
            { intent: ENEMY_INTENTS.MULTI_ATTACK, damage: 7, hits: 3, emoji: '⚡' },
            { intent: ENEMY_INTENTS.DEFEND, block: 15, emoji: '🛡️' }
        ],
        floor: 4
    },

    // === フロア4 ボス（最終ボス） ===
    omni_deity: {
        id: 'omni_deity',
        name: '全知の創造神クロノス',
        emoji: '🌌',
        image: './characters/omni_deity.png',
        baseHp: 180,
        isBoss: true,
        gimmick: 'chrono_judgment',
        gimmickDesc: '🌌 時の審判：3問連続正解ごとにエナジー+1回復！ミスすると神の攻撃力+3！',
        patterns: [
            { intent: ENEMY_INTENTS.ATTACK, damage: 16, emoji: '⚔️' },
            { intent: ENEMY_INTENTS.DEFEND, block: 18, emoji: '🛡️' },
            { intent: ENEMY_INTENTS.MULTI_ATTACK, damage: 8, hits: 3, emoji: '⚡' },
            { intent: ENEMY_INTENTS.BUFF, buff: { type: 'strength', value: 5 }, emoji: '💪' },
            { intent: ENEMY_INTENTS.ATTACK, damage: 25, emoji: '☄️' }
        ],
        floor: 4
    }
};

/**
 * エリート敵（通常より強い中ボス）
 */
export const ELITE_ENEMIES = {
    1: ['goblin', 'mushroom', 'metal_slime'],
    2: ['golem', 'dark_mage', 'sleeping_dragon', 'crystal_turtle'],
    3: ['demon', 'dark_knight', 'curse_book'],
    4: ['thunder_griffin', 'arcane_sphinx', 'astral_eater']
};

/**
 * 敵インスタンスを生成
 * @param {string} enemyId - 敵定義ID
 * @param {number} scalingFactor - スケーリング係数
 * @param {boolean} isElite - エリートかどうか
 * @param {boolean} isBurningElite - 強敵（燃える）エリートかどうか
 * @returns {Object} 敵インスタンス
 */
export function createEnemy(enemyId, scalingFactor = 1.0, isElite = false, isBurningElite = false) {
    const def = ENEMY_DEFINITIONS[enemyId];
    if (!def) throw new Error(`不明な敵: ${enemyId}`);

    const eliteMultiplier = isBurningElite ? 1.75 : (isElite ? 1.5 : 1.0);
    const hp = Math.ceil(def.baseHp * scalingFactor * eliteMultiplier);
    const initialBuffs = {};
    if (isBurningElite) {
        initialBuffs.strength = 2; // 強敵エリートは最初から攻撃力+2
    }

    return {
        ...def,
        hp,
        maxHp: hp,
        block: def.asleepTurns ? 15 : 0, // 居眠り竜は開始時ブロック15
        buffs: initialBuffs,
        currentPatternIndex: 0,
        isElite: isElite || isBurningElite,
        isBurningElite,
        scalingFactor,
        flightActive: Boolean(def.flightHitsRequired),
        hitsTakenThisTurn: 0,
        image: def.image || null
    };
}

/**
 * 敵の次の行動を取得
 * @param {Object} enemy - 敵インスタンス
 * @returns {Object} 行動データ
 */
export function getEnemyIntent(enemy) {
    if (enemy.asleepTurns && enemy.asleepTurns > 0) {
        return {
            intent: ENEMY_INTENTS.SLEEP,
            emoji: '💤',
            damage: 0,
            hits: 0
        };
    }

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
