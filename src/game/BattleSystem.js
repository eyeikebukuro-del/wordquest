// バトルシステム
// ターン制バトルの進行管理・カード使用時の英単語出題フローを制御する

import { CARD_TYPES, QUIZ_MODES, addCardXP, DeckManager } from './CardSystem.js';
import { ENEMY_INTENTS, getEnemyIntent, advanceEnemyPattern } from './EnemySystem.js';

/**
 * バトルの状態
 */
export const BATTLE_STATES = {
    PLAYER_TURN: 'player_turn',
    QUIZ_ACTIVE: 'quiz_active',
    ENEMY_TURN: 'enemy_turn',
    VICTORY: 'victory',
    DEFEAT: 'defeat',
    ANIMATING: 'animating'
};

/**
 * バトルシステムクラス
 */
export class BattleSystem {
    /**
     * @param {Object} player - プレイヤー状態
     * @param {Object} enemy - 敵インスタンス
     * @param {Array} deck - デッキのカード配列
     * @param {Object} scaling - スケーリングシステム
     * @param {Object} wordDb - 英単語データベース
     * @param {Object} spacedRep - 間隔反復システム
     */
    constructor(player, enemy, deck, scaling, wordDb, spacedRep) {
        this.player = player;
        this.enemy = enemy;
        this.deck = new DeckManager(deck);
        this.scaling = scaling;
        this.wordDb = wordDb;
        this.spacedRep = spacedRep;

        /** バトル状態 */
        this.state = BATTLE_STATES.PLAYER_TURN;
        /** ターン番号 */
        this.turn = 1;
        /** 現在のエナジー */
        this.energy = player.maxEnergy;
        /** 最大エナジー */
        this.maxEnergy = player.maxEnergy + scaling.getRelicBonus('energy_bonus');
        /** プレイヤーのブロック */
        this.playerBlock = 0;
        /** 現在のクイズデータ */
        this.currentQuiz = null;
        /** 選択されたカード */
        this.selectedCard = null;
        /** バトルログ */
        this.log = [];
        /** コールバック一覧 */
        this.callbacks = {};
        /** 敵の弱体化 */
        this.enemyDebuffs = {};
        /** 敵の毒 */
        this.enemyPoison = 0;
        /** 持続ブロック */
        this.persistentBlock = 0;
        /** クイズ正答数 */
        this.correctCount = 0;
        /** クイズ連続正答中の現在カードのヒット数 */
        this.currentHitIndex = 0;

        // 次の敵の行動を計算
        this.nextEnemyIntent = getEnemyIntent(enemy);
    }

    /**
     * コールバックを登録
     * @param {string} event - イベント名
     * @param {Function} callback - コールバック関数
     */
    on(event, callback) {
        this.callbacks[event] = callback;
    }

    /**
     * コールバック発火
     */
    emit(event, data) {
        if (this.callbacks[event]) {
            this.callbacks[event](data);
        }
    }

    /**
     * バトル開始（初期手札ドロー）
     */
    start() {
        let drawCount = 5;
        if (this.scaling.hasRelic('first_draw_bonus')) {
            drawCount += this.scaling.getRelicBonus('first_draw_bonus');
        }
        const drawn = this.deck.draw(drawCount);
        this.emit('battle_start', { drawn, enemy: this.enemy });
        this.emit('state_change', { state: this.state });
    }

    /**
     * カードを選択してクイズ開始
     * @param {string} instanceId - カードインスタンスID
     * @returns {Object|null} クイズデータ
     */
    selectCard(instanceId) {
        if (this.state !== BATTLE_STATES.PLAYER_TURN) return null;

        const card = this.deck.hand.find(c => c.instanceId === instanceId);
        if (!card) return null;

        // エナジーチェック
        if (card.cost > this.energy) {
            this.emit('error', { message: 'エナジーが足りない！' });
            return null;
        }

        this.selectedCard = card;
        this.currentHitIndex = 0;
        this.state = BATTLE_STATES.QUIZ_ACTIVE;

        // 難易度に応じた単語を選択
        const maxDifficulty = this.enemy.isBoss ? 3 : Math.min(3, Math.ceil(this.scaling.getEnemyScaling(1, 0)));
        const weights = this.spacedRep.getWeights();
        const word = this.wordDb.getWeightedRandomWord(maxDifficulty, weights);

        // 出題形式の決定
        if (card.quizMode === QUIZ_MODES.TYPING) {
            this.currentQuiz = this.wordDb.generateTypingQuestion(word);
        } else {
            // 英語→日本語 or 日本語→英語 ランダム
            const type = Math.random() > 0.5 ? 'en_to_jp' : 'jp_to_en';
            this.currentQuiz = this.wordDb.generateQuestion(word, type);
        }

        // レリック「ちえの宝石」でヒント表示
        if (this.scaling.hasRelic('hint') && this.currentQuiz.choices) {
            this.currentQuiz.hintEliminated = 1;
        }

        this.emit('quiz_start', {
            quiz: this.currentQuiz,
            card: this.selectedCard
        });

        return this.currentQuiz;
    }

    /**
     * クイズに回答
     * @param {number|string} answer - 回答（4択のインデックス or タイピングの文字列）
     * @returns {Object} 回答結果
     */
    answerQuiz(answer) {
        if (this.state !== BATTLE_STATES.QUIZ_ACTIVE || !this.currentQuiz) return null;

        let correct = false;

        if (this.currentQuiz.type === 'typing') {
            correct = answer.toLowerCase().trim() === this.currentQuiz.answer;
        } else {
            correct = answer === this.currentQuiz.correctIndex;
        }

        // 学習データ記録
        if (correct) {
            this.spacedRep.recordCorrect(this.currentQuiz.word.id);
            this.scaling.incrementCombo();
            this.correctCount++;
        } else {
            this.spacedRep.recordIncorrect(this.currentQuiz.word.id);
            this.scaling.resetCombo();
        }

        const result = {
            correct,
            word: this.currentQuiz.word,
            combo: this.scaling.comboCount,
            comboText: this.scaling.getComboText(),
            comboMultiplier: this.scaling.getComboMultiplier()
        };

        if (correct) {
            // カードにXP付与
            let xpAmount = 1 + this.scaling.getRelicBonus('xp_bonus');
            const leveledUp = addCardXP(this.selectedCard);
            result.leveledUp = leveledUp;

            // カード効果発動
            this.currentHitIndex++;
            const cardResult = this.applyCardEffect(this.selectedCard);
            result.cardEffect = cardResult;

            // ダブルストライクの2問目チェック
            if (this.selectedCard.quizMode === QUIZ_MODES.CHOICE_DOUBLE &&
                this.currentHitIndex < (this.selectedCard.hits || 1)) {
                // もう1問出題
                const weights = this.spacedRep.getWeights();
                const nextWord = this.wordDb.getWeightedRandomWord(3, weights, [this.currentQuiz.word.id]);
                const type = Math.random() > 0.5 ? 'en_to_jp' : 'jp_to_en';
                this.currentQuiz = this.wordDb.generateQuestion(nextWord, type);
                result.nextQuiz = this.currentQuiz;

                this.emit('quiz_result', result);
                return result;
            }
        } else {
            // 誤答ペナルティ ― カード不発
            result.cardEffect = { type: 'miss', message: 'カード不発！' };
        }

        // カードを使用済みにする
        this.energy -= this.selectedCard.cost;
        this.deck.playCard(this.selectedCard.instanceId);
        this.selectedCard = null;
        this.currentQuiz = null;

        // 敵のHP確認
        if (this.enemy.hp <= 0) {
            this.state = BATTLE_STATES.VICTORY;
            result.battleEnd = 'victory';
        } else {
            this.state = BATTLE_STATES.PLAYER_TURN;
        }

        this.emit('quiz_result', result);
        this.emit('state_change', { state: this.state });

        return result;
    }

    /**
     * カード効果を適用
     * @param {Object} card - カードインスタンス
     * @returns {Object} 効果結果
     */
    applyCardEffect(card) {
        const result = { type: card.type, effects: [] };

        // 攻撃
        if (card.baseDamage) {
            let damage = this.scaling.calculateDamage(card);

            // コンボボーナス（サンダーカード）
            if (card.comboBonus && this.scaling.comboCount >= 2) {
                damage += card.comboBonus;
            }

            // 敵のブロックを計算
            const actualDamage = Math.max(0, damage - this.enemy.block);
            this.enemy.block = Math.max(0, this.enemy.block - damage);
            this.enemy.hp = Math.max(0, this.enemy.hp - actualDamage);

            result.effects.push({ type: 'damage', value: damage, actual: actualDamage });
        }

        // 防御
        if (card.baseBlock) {
            const block = this.scaling.calculateBlock(card);
            this.playerBlock += block;
            result.effects.push({ type: 'block', value: block });
        }

        // 回復
        if (card.healAmount) {
            const heal = Math.min(card.healAmount, this.player.maxHp - this.player.hp);
            this.player.hp += heal;
            result.effects.push({ type: 'heal', value: heal });
        }

        // ドロー
        if (card.drawCount) {
            const drawn = this.deck.draw(card.drawCount);
            result.effects.push({ type: 'draw', value: drawn.length });
        }

        // バフ
        if (card.buff) {
            this.scaling.buffs[card.buff.type] = {
                value: card.buff.value,
                turns: card.buff.turns
            };
            result.effects.push({ type: 'buff', buffType: card.buff.type });
        }

        // デバフ（敵への弱体化）
        if (card.debuff) {
            this.enemyDebuffs[card.debuff.type] = {
                value: card.debuff.value,
                turns: card.debuff.turns
            };
            result.effects.push({ type: 'debuff', debuffType: card.debuff.type });
        }

        // 毒
        if (card.poison) {
            this.enemyPoison += card.poison;
            result.effects.push({ type: 'poison', value: card.poison });
        }

        // エナジーボーナス
        if (card.energyBonus) {
            this.maxEnergy += card.energyBonus;
            result.effects.push({ type: 'energy_bonus', value: card.energyBonus });
        }

        // 持続ブロック
        if (card.persistent) {
            this.persistentBlock += card.persistBlock;
        }

        return result;
    }

    /**
     * ターン終了
     */
    endTurn() {
        if (this.state !== BATTLE_STATES.PLAYER_TURN) return;

        this.state = BATTLE_STATES.ENEMY_TURN;
        this.emit('state_change', { state: this.state });

        // 敵のターン処理
        const enemyResult = this.processEnemyTurn();

        // プレイヤーのHP確認
        if (this.player.hp <= 0) {
            this.state = BATTLE_STATES.DEFEAT;
            this.emit('battle_end', { result: 'defeat' });
            this.emit('state_change', { state: this.state });
            return;
        }

        // 次のターン準備
        this.newTurn();
    }

    /**
     * 敵のターンを処理
     * @returns {Object} 敵行動結果
     */
    processEnemyTurn() {
        const intent = this.nextEnemyIntent;
        const result = { intent, effects: [] };

        // 毒ダメージ
        if (this.enemyPoison > 0) {
            this.enemy.hp = Math.max(0, this.enemy.hp - this.enemyPoison);
            result.effects.push({ type: 'poison_damage', value: this.enemyPoison });
            this.enemyPoison = Math.max(0, this.enemyPoison - 1);

            if (this.enemy.hp <= 0) {
                this.state = BATTLE_STATES.VICTORY;
                this.emit('battle_end', { result: 'victory' });
                this.emit('state_change', { state: this.state });
                return result;
            }
        }

        this.enemy.block = 0;

        switch (intent.intent) {
            case ENEMY_INTENTS.ATTACK: {
                let damage = intent.damage;
                // 弱体化チェック
                if (this.enemyDebuffs.weakened) {
                    damage = Math.max(0, damage - this.enemyDebuffs.weakened.value);
                }
                const actualDamage = Math.max(0, damage - this.playerBlock);
                this.playerBlock = Math.max(0, this.playerBlock - damage);
                this.player.hp = Math.max(0, this.player.hp - actualDamage);
                result.effects.push({ type: 'damage', value: damage, actual: actualDamage });
                break;
            }

            case ENEMY_INTENTS.MULTI_ATTACK: {
                let totalActual = 0;
                for (let i = 0; i < intent.hits; i++) {
                    let damage = intent.damage;
                    if (this.enemyDebuffs.weakened) {
                        damage = Math.max(0, damage - this.enemyDebuffs.weakened.value);
                    }
                    const actualDamage = Math.max(0, damage - this.playerBlock);
                    this.playerBlock = Math.max(0, this.playerBlock - damage);
                    this.player.hp = Math.max(0, this.player.hp - actualDamage);
                    totalActual += actualDamage;
                }
                result.effects.push({ type: 'multi_damage', hits: intent.hits, perHit: intent.damage, total: totalActual });
                break;
            }

            case ENEMY_INTENTS.DEFEND: {
                this.enemy.block += intent.block || 0;
                result.effects.push({ type: 'block', value: intent.block });
                break;
            }

            case ENEMY_INTENTS.BUFF: {
                if (intent.buff) {
                    if (!this.enemy.buffs[intent.buff.type]) {
                        this.enemy.buffs[intent.buff.type] = 0;
                    }
                    this.enemy.buffs[intent.buff.type] += intent.buff.value;
                    result.effects.push({ type: 'buff', buffType: intent.buff.type, value: intent.buff.value });
                }
                break;
            }
        }

        // パターン進行
        advanceEnemyPattern(this.enemy);
        this.nextEnemyIntent = getEnemyIntent(this.enemy);

        this.emit('enemy_turn', result);
        return result;
    }

    /**
     * 新しいターン開始
     */
    newTurn() {
        this.turn++;
        this.energy = this.maxEnergy;

        // ブロックをリセット（持続ブロックは残す）
        this.playerBlock = this.persistentBlock;
        this.persistentBlock = 0;

        // デバフのターン経過
        for (const [key, debuff] of Object.entries(this.enemyDebuffs)) {
            debuff.turns--;
            if (debuff.turns <= 0) {
                delete this.enemyDebuffs[key];
            }
        }

        // バフのターン経過
        for (const [key, buff] of Object.entries(this.scaling.buffs)) {
            if (buff.turns !== undefined) {
                buff.turns--;
                if (buff.turns <= 0) {
                    delete this.scaling.buffs[key];
                }
            }
        }

        // 手札を捨て、新しく5枚引く
        this.deck.discardHand();
        const drawn = this.deck.draw(5);

        this.state = BATTLE_STATES.PLAYER_TURN;
        this.emit('new_turn', { turn: this.turn, drawn, energy: this.energy });
        this.emit('state_change', { state: this.state });
    }

    /**
     * ポーション使用
     * @param {string} instanceId - ポーションインスタンスID
     * @returns {Object|null} 使用結果
     */
    usePotion(instanceId) {
        const potion = this.scaling.usePotion(instanceId);
        if (!potion) return null;

        const result = { potion, effects: [] };

        switch (potion.effect.type) {
            case 'heal':
                const heal = Math.min(potion.effect.value, this.player.maxHp - this.player.hp);
                this.player.hp += heal;
                result.effects.push({ type: 'heal', value: heal });
                break;
            case 'energy':
                this.energy += potion.effect.value;
                result.effects.push({ type: 'energy', value: potion.effect.value });
                break;
            case 'damage_mult':
                this.scaling.buffs.damage_mult = { value: potion.effect.value };
                result.effects.push({ type: 'buff', value: potion.effect.value });
                break;
            case 'eliminate_choices':
                result.effects.push({ type: 'eliminate', value: potion.effect.value });
                break;
        }

        this.emit('potion_used', result);
        return result;
    }

    /**
     * バトル結果のサマリーを取得
     * @returns {Object} サマリーデータ
     */
    getBattleSummary() {
        return {
            result: this.state === BATTLE_STATES.VICTORY ? 'victory' : 'defeat',
            turns: this.turn,
            correctAnswers: this.correctCount,
            maxCombo: this.scaling.maxCombo,
            comboText: this.scaling.getComboText(),
            enemyName: this.enemy.name,
            isBoss: this.enemy.isBoss
        };
    }
}
