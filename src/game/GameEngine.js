// ゲームエンジン
// ゲーム全体の状態管理と画面遷移を制御するメインコントローラー

import { WordDatabase } from '../vocabulary/WordDatabase.js';
import { MathDatabase } from '../vocabulary/MathDatabase.js';
import { KanjiDatabase } from '../vocabulary/KanjiDatabase.js';
import { SpacedRepetition } from '../vocabulary/SpacedRepetition.js';
import { createStarterDeck, createCard, getRandomCards, addCardXP } from './CardSystem.js';
import { BattleSystem } from './BattleSystem.js';
import { createEnemy, getRandomEnemy, getFloorBoss, ELITE_ENEMIES } from './EnemySystem.js';
import { generateMap, visitNode, NODE_TYPES } from './MapGenerator.js';
import { generateBattleRewards, generateTreasureRewards, generateShopItems, generateEvent } from './RewardSystem.js';
import { ScalingSystem, RELIC_DEFINITIONS, POTION_DEFINITIONS } from './ScalingSystem.js';
import { SaveManager } from '../utils/SaveManager.js';

/**
 * ゲーム画面の種類
 */
export const SCREENS = {
    MENU: 'menu',
    MAP: 'map',
    BATTLE: 'battle',
    REWARD: 'reward',
    SHOP: 'shop',
    REST: 'rest',
    EVENT: 'event',
    GAME_OVER: 'game_over',
    VICTORY: 'victory'
};

/**
 * ゲームエンジンクラス
 */
export class GameEngine {
    constructor() {
        // システム
        this.wordDb = new WordDatabase();
        this.mathDb = new MathDatabase();
        this.kanjiDb = new KanjiDatabase();
        this.activeDb = this.wordDb;
        this.characterId = 'wordmaster';
        this.ascensionLevel = 0;
        this.spacedRep = new SpacedRepetition();
        this.scaling = new ScalingSystem();
        this.saveManager = new SaveManager();

        // プレイヤー状態
        this.player = null;
        // デッキ
        this.playerDeck = null;
        // 現在のフロア
        this.currentFloor = 1;
        // マップデータ
        this.maps = {};
        // 現在のノード
        this.currentNodeId = null;
        // 現在の画面
        this.currentScreen = SCREENS.MENU;
        // バトルシステムインスタンス
        this.battle = null;
        // 報酬データ
        this.currentRewards = null;
        // ショップデータ
        this.currentShop = null;
        // イベントデータ
        this.currentEvent = null;
        // ノード訪問カウント（スケーリング用）
        this.nodesVisited = 0;
        // 画面遷移コールバック
        this.onScreenChange = null;
        // 統計
        this.stats = {
            battlesWon: 0,
            totalCorrect: 0,
            totalIncorrect: 0,
            floorsCleared: 0,
            maxCombo: 0,
            totalWisdomScore: 0,
            lastBossId: null,
            lastBossName: null
        };
    }

    /**
     * 新しいランを開始
     * @param {string} characterId - 選択されたキャラクターID（'wordmaster' | 'mathmaster' | 'kungfumaster'）
     * @param {number} ascensionLevel - 登塔レベル（0〜5）
     */
    startNewRun(characterId = 'wordmaster', ascensionLevel = 0) {
        this.characterId = characterId;
        this.ascensionLevel = ascensionLevel || 0;
        if (characterId === 'mathmaster') {
            this.activeDb = this.mathDb;
        } else if (characterId === 'kungfumaster') {
            this.activeDb = this.kanjiDb;
        } else {
            this.activeDb = this.wordDb;
        }

        const charProfileMap = {
            wordmaster: {
                name: 'ワードマスター',
                emoji: '🧙‍♂️',
                image: './characters/wordmaster.png'
            },
            mathmaster: {
                name: '算術マスター',
                emoji: '🧮',
                image: './characters/mathmaster.png'
            },
            kungfumaster: {
                name: 'カンフーマスター',
                emoji: '🥋',
                image: './characters/kungfumaster.png'
            }
        };
        const profile = charProfileMap[characterId] || charProfileMap.wordmaster;
        const masteryBonus = this.getMasteryBonus();
        const startMaxHp = 60 + masteryBonus.hpBonus;

        // プレイヤー初期化（図鑑コンプリート報酬の最大HPボーナスを反映）
        this.player = {
            hp: startMaxHp,
            maxHp: startMaxHp,
            gold: 50,
            maxEnergy: 3,
            characterId,
            ascensionLevel: this.ascensionLevel,
            name: profile.name,
            emoji: profile.emoji,
            image: profile.image,
            masteryHpBonus: masteryBonus.hpBonus
        };

        // デッキ初期化（キャラクター別専用デッキ）
        this.playerDeck = createStarterDeck(characterId);

        // スケーリングリセット
        this.scaling = new ScalingSystem();
        this.scaling.ascensionLevel = this.ascensionLevel;
        // テスト用：開始時にヒントポーションを付与
        this.scaling.addPotion('hint_potion');

        // フロア1のマップ生成
        this.currentFloor = 1;
        this.maps = {};
        this.maps[1] = generateMap(1);
        this.currentNodeId = 'start';
        this.nodesVisited = 0;

        // 統計リセット
        this.stats = {
            battlesWon: 0,
            enemiesDefeated: 0,
            totalCorrect: 0,
            totalIncorrect: 0,
            floorsCleared: 0,
            maxCombo: 0,
            totalWisdomScore: 0,
            lastBossId: null,
            lastBossName: null
        };

        this.saveCurrentRun();
        this.changeScreen(SCREENS.MAP);
    }

    /**
     * 現在の冒険の進行状況をセーブする（オートセーブ＆手動中断セーブ用）
     */
    saveCurrentRun() {
        if (!this.player || !this.maps) return;
        this.saveManager.saveActiveRun({
            characterId: this.characterId,
            ascensionLevel: this.ascensionLevel,
            player: this.player,
            playerDeck: this.playerDeck,
            currentFloor: this.currentFloor,
            maps: this.maps,
            currentNodeId: this.currentNodeId,
            nodesVisited: this.nodesVisited,
            stats: this.stats,
            relics: this.scaling ? this.scaling.relics : [],
            potions: this.scaling ? this.scaling.potions : [],
            maxCombo: this.scaling ? this.scaling.maxCombo : 0
        });
    }

    /**
     * セーブされた冒険データを読み込んで再開する（コンティニュー）
     * @returns {boolean} 再開に成功したか
     */
    resumeSavedRun() {
        const saved = this.saveManager.loadActiveRun();
        if (!saved || !saved.player || !saved.maps) return false;

        this.characterId = saved.characterId || saved.player.characterId || 'wordmaster';
        this.ascensionLevel = saved.ascensionLevel || saved.player.ascensionLevel || 0;
        if (this.characterId === 'mathmaster') {
            this.activeDb = this.mathDb;
        } else if (this.characterId === 'kungfumaster') {
            this.activeDb = this.kanjiDb;
        } else {
            this.activeDb = this.wordDb;
        }

        this.player = saved.player;
        this.playerDeck = Array.isArray(saved.playerDeck) ? saved.playerDeck : createStarterDeck(this.characterId);
        this.currentFloor = saved.currentFloor || 1;
        this.maps = saved.maps;
        this.currentNodeId = saved.currentNodeId || 'start';
        this.nodesVisited = saved.nodesVisited || 0;
        this.stats = saved.stats || {
            battlesWon: 0,
            enemiesDefeated: 0,
            totalCorrect: 0,
            totalIncorrect: 0,
            floorsCleared: 0,
            maxCombo: 0,
            totalWisdomScore: 0,
            lastBossId: null,
            lastBossName: null
        };

        this.scaling = new ScalingSystem();
        this.scaling.ascensionLevel = this.ascensionLevel;
        this.scaling.relics = Array.isArray(saved.relics) ? saved.relics : [];
        this.scaling.potions = Array.isArray(saved.potions) ? saved.potions : [];
        this.scaling.maxCombo = saved.maxCombo || 0;

        this.changeScreen(SCREENS.MAP);
        return true;
    }

    /**
     * ノードを選択して移動
     * @param {string} nodeId - ノードID
     */
    selectNode(nodeId) {
        const map = this.maps[this.currentFloor];
        const node = map.nodes.find(n => n.id === nodeId);
        if (!node || (!node.available && !window.DEBUG_MODE)) return;

        visitNode(map, nodeId);
        this.currentNodeId = nodeId;
        this.nodesVisited++;

        // ノードタイプに応じて画面遷移
        switch (node.type) {
            case NODE_TYPES.BATTLE:
                this.startBattle(false, false);
                break;
            case NODE_TYPES.ELITE:
                this.startBattle(true, false);
                break;
            case NODE_TYPES.BURNING_ELITE:
                this.startBattle(true, true);
                break;
            case NODE_TYPES.TREASURE:
                this.openTreasure();
                break;
            case NODE_TYPES.BOSS:
                this.startBossBattle();
                break;
            case NODE_TYPES.SHOP:
                this.openShop();
                break;
            case NODE_TYPES.REST:
                this.changeScreen(SCREENS.REST);
                break;
            case NODE_TYPES.EVENT:
                this.startEvent();
                break;
        }
    }

    /**
     * 宝箱ノードを開く（レリック＋ゴールド報酬）
     */
    openTreasure() {
        this.currentRewards = generateTreasureRewards(this.scaling);
        this.changeScreen(SCREENS.REWARD);
    }

    /**
     * 通常バトルまたはエリートバトルを開始
     * @param {boolean} isElite - エリートかどうか
     * @param {boolean} isBurningElite - 強化エリート（🔥）かどうか
     */
    startBattle(isElite = false, isBurningElite = false) {
        const enemyId = isElite
            ? ELITE_ENEMIES[this.currentFloor][Math.floor(Math.random() * ELITE_ENEMIES[this.currentFloor].length)]
            : getRandomEnemy(this.currentFloor);

        const scalingFactor = this.scaling.getEnemyScaling(this.currentFloor, this.nodesVisited);
        const enemy = createEnemy(enemyId, scalingFactor, isElite, isBurningElite);

        this.battle = new BattleSystem(
            this.player,
            enemy,
            [...this.playerDeck],
            this.scaling,
            this.activeDb,
            this.spacedRep,
            this.currentFloor  // フロア情報を渡す
        );

        this.scaling.comboCount = 0;
        this.changeScreen(SCREENS.BATTLE);
    }

    /**
     * ボスバトルを開始
     */
    startBossBattle() {
        const bossId = getFloorBoss(this.currentFloor);
        const scalingFactor = this.scaling.getEnemyScaling(this.currentFloor, this.nodesVisited);
        const enemy = createEnemy(bossId, scalingFactor);

        this.battle = new BattleSystem(
            this.player,
            enemy,
            [...this.playerDeck],
            this.scaling,
            this.activeDb,
            this.spacedRep,
            this.currentFloor  // フロア情報を渡す
        );

        this.scaling.comboCount = 0;
        this.changeScreen(SCREENS.BATTLE);
    }

    /**
     * バトル終了処理
     * @param {string} result - 'victory' or 'defeat'
     */
    onBattleEnd(result) {
        if (result === 'victory') {
            this.stats.battlesWon++;
            this.stats.enemiesDefeated++;
            this.stats.totalCorrect += (this.battle.correctCount || 0);
            this.stats.maxCombo = Math.max(this.stats.maxCombo, this.scaling.maxCombo);
            this.stats.maxDamage = Math.max(this.stats.maxDamage || 0, this.battle.maxDamageThisBattle || 0);
            this.stats.totalWisdomScore += (this.battle.wisdomScore || 0);

            if (this.battle.enemy.isBoss) {
                this.stats.lastBossId = this.battle.enemy.id;
                this.stats.lastBossName = this.battle.enemy.name;
            }

            // レリック「いやしの指輪」効果
            if (this.scaling.hasRelic('heal_after_battle')) {
                const healAmount = this.scaling.getRelicBonus('heal_after_battle');
                this.player.hp = Math.min(this.player.maxHp, this.player.hp + healAmount);
            }

            // レリック「鍛冶屋のハンマー（post_battle_card_xp）」効果：ランダムな未強化カード1枚に経験値付与
            if (this.scaling.hasRelic('post_battle_card_xp')) {
                const xpBonus = this.scaling.getRelicBonus('post_battle_card_xp');
                const upgradable = this.playerDeck.filter(c => c.level < 3);
                if (upgradable.length > 0) {
                    const targetCard = upgradable[Math.floor(Math.random() * upgradable.length)];
                    for (let i = 0; i < xpBonus; i++) {
                        addCardXP(targetCard);
                    }
                }
            }

            // ボス勝利の場合
            const map = this.maps[this.currentFloor];
            const node = map.nodes.find(n => n.id === this.currentNodeId);
            if (node && node.type === NODE_TYPES.BOSS) {
                this.stats.floorsCleared++;

                if (this.currentFloor >= 4) {
                    // フロア4（EX最終ボス）撃破で完全ゲームクリア
                    this.stats.exStageCleared = true;
                    this.saveManager.clearActiveRun();
                    this.changeScreen(SCREENS.VICTORY);
                    return;
                }
            }

            // 報酬生成
            this.currentRewards = generateBattleRewards(this.battle.enemy, this.scaling, this.characterId);
            this.saveCurrentRun();
            this.changeScreen(SCREENS.REWARD);
        } else {
            this.saveManager.clearActiveRun();
            this.changeScreen(SCREENS.GAME_OVER);
        }
    }

    /**
     * 報酬カードを選択
     * @param {Object} card - 選択したカード
     */
    selectRewardCard(card) {
        this.playerDeck.push(card);
    }

    /**
     * ゴールドを獲得
     * @param {number} amount - ゴールド量
     */
    addGold(amount) {
        if (window.sm) window.sm.playGold();
        this.player.gold += amount;
    }

    /**
     * 報酬画面を閉じて次へ進む
     */
    closeRewards() {
        const map = this.maps[this.currentFloor];
        const node = map.nodes.find(n => n.id === this.currentNodeId);

        // ボス勝利時の処理
        if (node && node.type === NODE_TYPES.BOSS) {
            if (this.currentFloor === 3) {
                // フロア3（魔王の城）のボス撃破後：「ここでクリアする」か「EXステージ（天空の聖域・フロア4）へ挑む」かを選択！
                if (this.onFloor3ClearChoice) {
                    this.saveCurrentRun();
                    this.onFloor3ClearChoice();
                    return;
                }
            }
            if (this.currentFloor < 4) {
                this.currentFloor++;
                this.maps[this.currentFloor] = generateMap(this.currentFloor);
                this.currentNodeId = 'start';
            }
        }

        this.saveCurrentRun();
        this.changeScreen(SCREENS.MAP);
    }

    /**
     * フロア3クリア時点で通常クリアとして帰還する
     */
    finishRunAtFloor3() {
        this.stats.exStageCleared = false;
        this.saveManager.clearActiveRun();
        this.changeScreen(SCREENS.VICTORY);
    }

    /**
     * フロア3クリア後、EXステージ（フロア4「天空の聖域」）へ進む
     */
    enterFloor4ExStage() {
        this.currentFloor = 4;
        this.maps[4] = generateMap(4);
        this.currentNodeId = 'start';
        // EXステージ突入ボーナスとしてHPを最大HPの30%回復
        const healAmount = Math.ceil(this.player.maxHp * 0.3);
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + healAmount);
        this.saveCurrentRun();
        this.changeScreen(SCREENS.MAP);
    }

    /**
     * ショップを開く
     */
    openShop() {
        this.currentShop = generateShopItems(this.scaling, this.characterId);
        this.changeScreen(SCREENS.SHOP);
    }

    /**
     * ショップで購入
     * @param {Object} item - ショップアイテム
     * @returns {boolean} 購入成功したか
     */
    buyItem(item) {
        if (this.player.gold < item.price) return false;

        this.player.gold -= item.price;

        switch (item.type) {
            case 'card':
                this.playerDeck.push(item.card);
                break;
            case 'relic': {
                const addedRelic = this.scaling.addRelic(item.relicId);
                if (addedRelic && addedRelic.effect && addedRelic.effect.type === 'max_hp_bonus') {
                    this.player.maxHp += addedRelic.effect.value;
                    this.player.hp += addedRelic.effect.value;
                }
                break;
            }
            case 'potion':
                this.scaling.addPotion(item.potionId);
                break;
            case 'remove_card':
                this.saveCurrentRun();
                return true; // UI側でカード選択画面を表示
        }

        this.saveCurrentRun();
        return true;
    }

    /**
     * デッキからカードを除去
     * @param {number} deckIndex - デッキインデックス
     */
    removeCardFromDeck(deckIndex) {
        if (deckIndex >= 0 && deckIndex < this.playerDeck.length) {
            this.playerDeck.splice(deckIndex, 1);
            this.saveCurrentRun();
        }
    }

    /**
     * 休憩処理
     * @param {string} choice - 'heal' or 'upgrade'
     */
    rest(choice) {
        if (choice === 'heal') {
            const healAmount = Math.ceil(this.player.maxHp * 0.3);
            this.player.hp = Math.min(this.player.maxHp, this.player.hp + healAmount);
        }
        // upgradeの場合はUI側でカード選択後にカード強化
        this.saveCurrentRun();
        this.changeScreen(SCREENS.MAP);
    }

    /**
     * イベントを開始
     */
    startEvent() {
        this.currentEvent = generateEvent();
        this.changeScreen(SCREENS.EVENT);
    }

    /**
     * イベントの選択肢を実行
     * @param {Object} effect - 効果データ
     * @returns {Object} 実行結果
     */
    applyEventEffect(effect) {
        const result = { success: true, message: '' };

        switch (effect.type) {
            case 'heal':
                const heal = Math.min(effect.value, this.player.maxHp - this.player.hp);
                this.player.hp += heal;
                result.message = `HPが${heal}回復した！`;
                break;
            case 'gold':
                this.player.gold += effect.value;
                result.message = `${effect.value}ゴールドを手に入れた！`;
                break;
            case 'random_card':
                const card = createCard(getRandomCards(1, 'common', this.characterId)[0]);
                this.playerDeck.push(card);
                result.message = `「${card.name}」を手に入れた！`;
                result.card = card;
                break;
            case 'max_hp':
                this.player.maxHp += effect.value;
                this.player.hp += effect.value;
                result.message = `最大HPが${effect.value}増えた！`;
                break;
            case 'gamble':
                if (Math.random() < effect.chance) {
                    return this.applyEventEffect(effect.good);
                } else {
                    this.player.hp = Math.max(1, this.player.hp - effect.bad.value);
                    result.message = `罠だ！${effect.bad.value}ダメージを受けた！`;
                }
                break;
            case 'upgrade_card':
                result.message = 'カードを1枚選んで強化しよう！';
                result.needCardSelect = true;
                break;
            case 'none':
                result.message = 'そっとその場を去った…';
                break;
        }

        this.saveCurrentRun();
        return result;
    }

    /**
     * 画面遷移
     * @param {string} screen - 遷移先画面
     */
    changeScreen(screen) {
        this.currentScreen = screen;
        if (screen === SCREENS.MAP) {
            this.saveCurrentRun();
        }
        if (this.onScreenChange) {
            this.onScreenChange(screen);
        }
    }

    /**
     * 学習統計を取得
     * @returns {Object} 統計データ
     */
    getLearningStats() {
        return this.spacedRep.getStats();
    }

    /**
     * 現在のマップを取得
     * @returns {Object} マップデータ
     */
    getCurrentMap() {
        return this.maps[this.currentFloor];
    }

    /**
     * 図鑑コンプリート（マスター数）に応じたボーナスを計算
     * @returns {Object} { masteredTotal, crownedTotal, hpBonus, wordMastered, mathMastered, kanjiMastered }
     */
    getMasteryBonus() {
        const learningData = this.spacedRep.learningData || {};
        let wordMastered = 0;
        let mathMastered = 0;
        let kanjiMastered = 0;
        let crownedTotal = 0;

        for (const [idStr, data] of Object.entries(learningData)) {
            if (!data || data.correct < 2) continue;
            const numId = parseInt(idStr, 10);
            if (numId >= 20000) {
                kanjiMastered++;
            } else if (numId >= 10000) {
                mathMastered++;
            } else {
                wordMastered++;
            }
            if (data.correct >= 5) {
                crownedTotal++;
            }
        }

        const masteredTotal = wordMastered + mathMastered + kanjiMastered;
        // 5問マスター（✅以上）ごとに最大HP+1、さらに王冠（👑）3個ごとに最大HP+1（最大+50）
        const hpBonus = Math.min(50, Math.floor(masteredTotal / 5) + Math.floor(crownedTotal / 3));

        return {
            masteredTotal,
            crownedTotal,
            hpBonus,
            wordMastered,
            mathMastered,
            kanjiMastered
        };
    }

    /**
     * 称号・実績バッジ一覧と解放状況を取得
     * @returns {Array} バッジ情報の配列
     */
    getAchievements() {
        const stats = this.spacedRep.getStats();
        const best = this.saveManager.loadBestRun();
        const mastery = this.getMasteryBonus();

        return [
            {
                id: 'first_step',
                emoji: '🌱',
                title: 'はじめの一歩',
                desc: 'クイズに合計10問以上正解する',
                unlocked: stats.totalCorrect >= 10,
                progress: `${Math.min(10, stats.totalCorrect)} / 10`
            },
            {
                id: 'scholar_50',
                emoji: '📘',
                title: 'ちえの探究者',
                desc: 'クイズに合計50問以上正解する',
                unlocked: stats.totalCorrect >= 50,
                progress: `${Math.min(50, stats.totalCorrect)} / 50`
            },
            {
                id: 'scholar_200',
                emoji: '🎓',
                title: '博識グランドマスター',
                desc: 'クイズに合計200問以上正解する',
                unlocked: stats.totalCorrect >= 200,
                progress: `${Math.min(200, stats.totalCorrect)} / 200`
            },
            {
                id: 'word_collector',
                emoji: '🧙‍♂️',
                title: 'えいご博士',
                desc: '英単語を20個以上マスター（✅2回以上正解）',
                unlocked: mastery.wordMastered >= 20,
                progress: `${Math.min(20, mastery.wordMastered)} / 20`
            },
            {
                id: 'math_collector',
                emoji: '🧮',
                title: 'かけ算の達人',
                desc: 'かけ算を20個以上マスター（✅2回以上正解）',
                unlocked: mastery.mathMastered >= 20,
                progress: `${Math.min(20, mastery.mathMastered)} / 20`
            },
            {
                id: 'kanji_collector',
                emoji: '🥋',
                title: '漢字の免許皆伝',
                desc: '漢字を20個以上マスター（✅2回以上正解）',
                unlocked: mastery.kanjiMastered >= 20,
                progress: `${Math.min(20, mastery.kanjiMastered)} / 20`
            },
            {
                id: 'crown_jewel',
                emoji: '👑',
                title: 'かんぺき王冠コレクター',
                desc: '王冠マーク（5回以上正解）を10個集める',
                unlocked: mastery.crownedTotal >= 10,
                progress: `${Math.min(10, mastery.crownedTotal)} / 10`
            },
            {
                id: 'combo_10',
                emoji: '🔥',
                title: 'れんぞく10コンボ！',
                desc: 'バトルで10コンボ以上を達成する',
                unlocked: (best.maxCombo || 0) >= 10,
                progress: `最大 ${best.maxCombo || 0} / 10`
            },
            {
                id: 'dojo_master',
                emoji: '🪵',
                title: 'にがてゼロの証',
                desc: '15問以上学習した状態で「にがてな問題」を0個にする',
                unlocked: stats.totalAttempted >= 15 && stats.weakWords === 0,
                progress: stats.totalAttempted < 15 ? `学習数 ${stats.totalAttempted}/15` : `にがて残り ${stats.weakWords}個`
            },
            {
                id: 'sky_conqueror',
                emoji: '🌌',
                title: '天空の覇者',
                desc: 'フロア4「天空の聖域」をクリアする',
                unlocked: (best.floorsCleared || 0) >= 4,
                progress: `到達クリア ${best.floorsCleared || 0} / 4F`
            }
        ];
    }
}
