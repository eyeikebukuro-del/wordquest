// 報酬システム
// バトル後の報酬（カード選択、ゴールド、レリック）を管理する

import { createCard, getRandomCards } from './CardSystem.js';

/**
 * 報酬タイプ
 */
export const REWARD_TYPES = {
    CARD: 'card',
    GOLD: 'gold',
    RELIC: 'relic',
    POTION: 'potion'
};

/**
 * バトル報酬を生成
 * @param {Object} enemy - 倒した敵
 * @param {Object} scaling - スケーリングシステム
 * @returns {Array} 報酬リスト
 */
export function generateBattleRewards(enemy, scaling) {
    const rewards = [];

    // ゴールド報酬
    let goldAmount = 15 + Math.floor(Math.random() * 10);
    if (enemy.isBoss) goldAmount *= 2;
    if (enemy.isElite) goldAmount = Math.ceil(goldAmount * 1.5);
    goldAmount = Math.ceil(goldAmount * (1 + scaling.getRelicBonus('gold_bonus')));

    rewards.push({
        type: REWARD_TYPES.GOLD,
        amount: goldAmount,
        emoji: '💰',
        description: `${goldAmount} ゴールド`
    });

    // カード報酬（3枚から1枚選択）
    const minRarity = enemy.isBoss ? 'uncommon' : (enemy.isElite ? 'common' : 'common');
    const cardIds = getRandomCards(3, minRarity);
    const cardOptions = cardIds.map(id => createCard(id));

    rewards.push({
        type: REWARD_TYPES.CARD,
        cards: cardOptions,
        emoji: '🃏',
        description: 'カードを1枚選ぶ'
    });

    // ポーション（30%確率）
    if (Math.random() < 0.3) {
        const potionId = scaling.getRandomPotion();
        rewards.push({
            type: REWARD_TYPES.POTION,
            potionId,
            emoji: '🧪',
            description: 'ポーション'
        });
    }

    // レリック（ボス/エリートのみ）
    if (enemy.isBoss || enemy.isElite) {
        const relicIds = scaling.getRandomRelics(3);
        if (relicIds.length > 0) {
            rewards.push({
                type: 'relic_choice',
                relicIds: relicIds,
                emoji: '✨',
                description: 'レリックを1つ選ぶ'
            });
        }
    }

    return rewards;
}

/**
 * ショップ品ぞろえを生成
 * @param {Object} scaling - スケーリングシステム
 * @returns {Object} ショップデータ
 */
export function generateShopItems(scaling) {
    const items = [];

    // カード販売（5枚）
    const cardIds = getRandomCards(5);
    for (const id of cardIds) {
        const card = createCard(id);
        let price = 50;
        if (card.rarity === 'uncommon') price = 80;
        if (card.rarity === 'rare') price = 130;

        items.push({
            type: 'card',
            card,
            price,
            emoji: card.emoji,
            name: card.name,
            description: card.description
        });
    }

    // ポーション販売（2個）
    const potionId1 = scaling.getRandomPotion();
    const potionId2 = scaling.getRandomPotion();
    items.push(
        { type: 'potion', potionId: potionId1, price: 35, emoji: '🧪', name: 'ポーション' },
        { type: 'potion', potionId: potionId2, price: 35, emoji: '🧪', name: 'ポーション' }
    );

    // カード除去サービス
    items.push({
        type: 'remove_card',
        price: 75,
        emoji: '🗑️',
        name: 'カード除去',
        description: 'デッキから1枚取り除く'
    });

    return { items };
}

/**
 * イベント報酬を生成
 * @returns {Object} イベントデータ
 */
export function generateEvent() {
    const events = [
        {
            title: 'ふしぎな泉',
            emoji: '⛲',
            description: 'きれいな泉を見つけた。水を飲みますか？',
            choices: [
                { text: '飲む（HP15回復）', effect: { type: 'heal', value: 15 } },
                { text: '飲まない（ゴールド+20）', effect: { type: 'gold', value: 20 } }
            ]
        },
        {
            title: 'あやしい商人',
            emoji: '🧙',
            description: 'フードをかぶった商人が現れた。',
            choices: [
                { text: 'カードをもらう', effect: { type: 'random_card' } },
                { text: '通り過ぎる（ゴールド+15）', effect: { type: 'gold', value: 15 } }
            ]
        },
        {
            title: 'たからばこ',
            emoji: '📦',
            description: '古びた宝箱を見つけた！',
            choices: [
                { text: '開ける（ゴールド+30 or ダメージ10）', effect: { type: 'gamble', good: { type: 'gold', value: 30 }, bad: { type: 'damage', value: 10 }, chance: 0.7 } },
                { text: 'そっとしておく', effect: { type: 'none' } }
            ]
        },
        {
            title: '修行の神殿',
            emoji: '⛩️',
            description: '神秘的な神殿を発見した。',
            choices: [
                { text: '修行する（カード1枚強化）', effect: { type: 'upgrade_card' } },
                { text: 'お祈りする（最大HP+5）', effect: { type: 'max_hp', value: 5 } }
            ]
        }
    ];

    return events[Math.floor(Math.random() * events.length)];
}
