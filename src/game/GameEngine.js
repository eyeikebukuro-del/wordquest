// ゲームエンジン
// ゲーム全体の状態管理と画面遷移を制御するメインコントローラー

import { WordDatabase } from '../vocabulary/WordDatabase.js';
import { SpacedRepetition } from '../vocabulary/SpacedRepetition.js';
import { createStarterDeck, createCard } from './CardSystem.js';
import { BattleSystem } from './BattleSystem.js';
import { createEnemy, getRandomEnemy, getFloorBoss, ELITE_ENEMIES } from './EnemySystem.js';
import { generateMap, visitNode, NODE_TYPES } from './MapGenerator.js';
import { generateBattleRewards, generateShopItems, generateEvent } from './RewardSystem.js';
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
            maxCombo: 0
        };
    }

    /**
     * 新しいランを開始
     */
    startNewRun() {
        // プレイヤー初期化
        this.player = {
            hp: 60,
            maxHp: 60,
            gold: 50,
            maxEnergy: 3,
            name: '言葉の勇者'
        };

        // デッキ初期化
        this.playerDeck = createStarterDeck();

        // スケーリングリセット
        this.scaling = new ScalingSystem();

        // フロア1のマップ生成
        this.currentFloor = 1;
        this.maps = {};
        this.maps[1] = generateMap(1);
        this.currentNodeId = 'start';
        this.nodesVisited = 0;

        // 統計リセット
        this.stats = {
            battlesWon: 0,
            totalCorrect: 0,
            totalIncorrect: 0,
            floorsCleared: 0,
            maxCombo: 0
        };

        this.changeScreen(SCREENS.MAP);
    }

    /**
     * ノードを選択して移動
     * @param {string} nodeId - ノードID
     */
    selectNode(nodeId) {
        const map = this.maps[this.currentFloor];
        const node = map.nodes.find(n => n.id === nodeId);
        if (!node || !node.available) return;

        visitNode(map, nodeId);
        this.currentNodeId = nodeId;
        this.nodesVisited++;

        // ノードタイプに応じて画面遷移
        switch (node.type) {
            case NODE_TYPES.BATTLE:
                this.startBattle(false);
                break;
            case NODE_TYPES.ELITE:
                this.startBattle(true);
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
     * 通常バトルまたはエリートバトルを開始
     * @param {boolean} isElite - エリートかどうか
     */
    startBattle(isElite = false) {
        const enemyId = isElite
            ? ELITE_ENEMIES[this.currentFloor][Math.floor(Math.random() * ELITE_ENEMIES[this.currentFloor].length)]
            : getRandomEnemy(this.currentFloor);

        const scalingFactor = this.scaling.getEnemyScaling(this.currentFloor, this.nodesVisited);
        const enemy = createEnemy(enemyId, scalingFactor, isElite);

        this.battle = new BattleSystem(
            this.player,
            enemy,
            [...this.playerDeck],
            this.scaling,
            this.wordDb,
            this.spacedRep
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
            this.wordDb,
            this.spacedRep
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
            this.stats.maxCombo = Math.max(this.stats.maxCombo, this.scaling.maxCombo);

            // レリック「いやしの指輪」効果
            if (this.scaling.hasRelic('heal_after_battle')) {
                const healAmount = this.scaling.getRelicBonus('heal_after_battle');
                this.player.hp = Math.min(this.player.maxHp, this.player.hp + healAmount);
            }

            // ボス勝利の場合
            const map = this.maps[this.currentFloor];
            const node = map.nodes.find(n => n.id === this.currentNodeId);
            if (node && node.type === NODE_TYPES.BOSS) {
                this.stats.floorsCleared++;

                if (this.currentFloor >= 3) {
                    // ゲームクリア
                    this.changeScreen(SCREENS.VICTORY);
                    return;
                }
            }

            // 報酬生成
            this.currentRewards = generateBattleRewards(this.battle.enemy, this.scaling);
            this.changeScreen(SCREENS.REWARD);
        } else {
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
        this.player.gold += amount;
    }

    /**
     * 報酬画面を閉じて次へ進む
     */
    closeRewards() {
        const map = this.maps[this.currentFloor];
        const node = map.nodes.find(n => n.id === this.currentNodeId);

        // ボス勝利後は次のフロアへ
        if (node && node.type === NODE_TYPES.BOSS && this.currentFloor < 3) {
            this.currentFloor++;
            this.maps[this.currentFloor] = generateMap(this.currentFloor);
            this.currentNodeId = 'start';
        }

        this.changeScreen(SCREENS.MAP);
    }

    /**
     * ショップを開く
     */
    openShop() {
        this.currentShop = generateShopItems(this.scaling);
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
            case 'potion':
                this.scaling.addPotion(item.potionId);
                break;
            case 'remove_card':
                return true; // UI側でカード選択画面を表示
        }

        return true;
    }

    /**
     * デッキからカードを除去
     * @param {number} deckIndex - デッキインデックス
     */
    removeCardFromDeck(deckIndex) {
        if (deckIndex >= 0 && deckIndex < this.playerDeck.length) {
            this.playerDeck.splice(deckIndex, 1);
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
                const card = createCard(getRandomCards(1)[0]);
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

        return result;
    }

    /**
     * 画面遷移
     * @param {string} screen - 遷移先画面
     */
    changeScreen(screen) {
        this.currentScreen = screen;
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
}
