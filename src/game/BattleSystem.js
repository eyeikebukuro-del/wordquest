// バトルシステム
// ターン制バトルの進行管理・カード使用時の英単語出題フローを制御する

import { CARD_TYPES, QUIZ_MODES, addCardXP, DeckManager, CARD_DEFINITIONS } from './CardSystem.js';
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
        /** 最大エナジー */
        this.maxEnergy = player.maxEnergy + scaling.getRelicBonus('energy_bonus');
        /** 現在のエナジー */
        this.energy = this.maxEnergy;
        /** プレイヤーのブロック */
        this.playerBlock = 0;
        /** 次のクイズで消去する選択肢の数 */
        this.nextQuizHints = 0;
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
        /** 進化する古文書専用：覚醒する知性（乗算バフ） */
        this.awakeningMultiplier = 1.0;
        /** 智恵スコア（難易度に応じたボーナス） */
        this.wisdomScore = 0;
        /** ちくせきの力：バトル内永続ダメージバフ（スタック加算） */
        this.damagePermanentBuff = 0;
        /** とげのよろい：今ターンの反撃ダメージ（1ヒットごとに発動） */
        this.thornArmorDamage = 0;
        /** ウィークポイント：次の攻撃を2倍にするフラグ */
        this.nextAttackDoubled = false;
        /** ミラーコピー用：最後に使ったカードの定義ID */
        this.lastCardId = null;

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
        if (window.sm && drawn.length > 0) window.sm.playCardDraw();

        // 特別なボス戦の開始時ログ
        if (this.enemy.id === 'evolving_archive') {
            this.log.push('【特殊戦闘】覚醒する知性：正解するたびダメージが1.5倍（乗算）！ミスでリセット。');
            this.log.push('【警告】敵の攻撃力が毎ターン上昇していく！');
        }

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

        // レリック「ちえの宝石」やヒントポーションでヒント表示
        if (this.scaling.hasRelic('hint') && this.currentQuiz.choices) {
            this.currentQuiz.hintEliminated = (this.currentQuiz.hintEliminated || 0) + 1;
        }

        // ポーションによるヒント適用
        if (this.nextQuizHints > 0 && this.currentQuiz.choices) {
            this.currentQuiz.hintEliminated = (this.currentQuiz.hintEliminated || 0) + this.nextQuizHints;
            this.nextQuizHints = 0; // 消費
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
            const normalizedAnswer = answer.toLowerCase().trim();
            correct = normalizedAnswer === this.currentQuiz.answer ||
                (this.currentQuiz.aliases && this.currentQuiz.aliases.includes(normalizedAnswer));
        } else {
            correct = answer === this.currentQuiz.correctIndex;
            // 選択肢問題では、インデックスによる判定のみでOK (表示テキストが重複することは避けたため)
        }

        // 学習データ記録
        if (correct) {
            if (window.sm) window.sm.playQuizCorrect();
            this.spacedRep.recordCorrect(this.currentQuiz.word.id);
            this.scaling.incrementCombo();
            if (window.sm && this.scaling.comboCount > 1) {
                window.sm.playComboUp(this.scaling.comboCount);
            }
            this.correctCount++;
        } else {
            if (window.sm) window.sm.playQuizIncorrect();
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

            // 進化する古文書：マルチプライヤー上昇
            if (this.enemy.id === 'evolving_archive') {
                this.awakeningMultiplier *= 1.15;
                this.log.push(`覚醒する知性！ ダメージ倍率: ${this.awakeningMultiplier.toFixed(2)}倍`);
            }

            // 智恵スコア加算
            const difficulty = this.currentQuiz.word.difficulty || 1;
            const wisdomPoints = difficulty === 3 ? 800 : difficulty === 2 ? 300 : 100;
            this.wisdomScore += wisdomPoints;

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

                // レリック「ちえの宝石」のヒント適用
                if (this.scaling.hasRelic('hint') && this.currentQuiz.choices) {
                    this.currentQuiz.hintEliminated = (this.currentQuiz.hintEliminated || 0) + 1;
                }

                result.nextQuiz = this.currentQuiz;

                this.emit('quiz_result', result);
                return result;
            }
        } else {
            // 誤答ペナルティ ― カード不発
            result.cardEffect = { type: 'miss', message: 'カード不発！' };

            // 進化する古文書：マルチプライヤーリセット
            if (this.enemy.id === 'evolving_archive') {
                this.awakeningMultiplier = 1.0;
                this.log.push('覚醒する知性が解除された！');
            }
        }

        // カードを使用済みにする
        this.energy -= this.selectedCard.cost;
        if (this.selectedCard.type === CARD_TYPES.SKILL) {
            if (window.sm) window.sm.playCardExhaust();
            this.deck.exhaustCard(this.selectedCard.instanceId);
        } else {
            if (window.sm) window.sm.playCardPlay();
            this.deck.playCard(this.selectedCard.instanceId);
        }
        this.selectedCard = null;
        this.currentQuiz = null;

        // 敵のHP確認
        if (this.enemy.hp <= 0) {
            if (window.sm) window.sm.playDefeat();
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
        const result = { type: card.type, cost: card.cost, effects: [] };

        // 攻撃
        if (card.baseDamage !== undefined) {
            let damage = this.scaling.calculateDamage(card);

            // バトル永続バフ（ちくせきの力）を加算
            if (this.damagePermanentBuff > 0) {
                damage += this.damagePermanentBuff;
            }

            // 覚醒する知性マルチプライヤー適用
            if (this.awakeningMultiplier > 1.0) {
                damage = Math.ceil(damage * this.awakeningMultiplier);
            }

            // コンボボーナス（サンダーカード）
            if (card.comboBonus && this.scaling.comboCount >= 2) {
                damage += card.comboBonus;
            }

            // コンボ・ブレード（コンボ数×倍率）
            if (card.comboMultiplierBonus && this.scaling.comboCount > 0) {
                damage += this.scaling.comboCount * card.comboMultiplierBonus;
            }

            // 長文バースト（文字数×係数）
            if (card.lengthSynergy && this.currentQuiz && this.currentQuiz.word.english) {
                damage += this.currentQuiz.word.english.length * card.lengthSynergy;
                const blockAmount = this.currentQuiz.word.english.length * card.lengthSynergy;
                this.playerBlock += blockAmount;
                result.effects.push({ type: 'block', value: blockAmount });
                if (window.sm) window.sm.playBlock();
            }

            // ソウルブレード：このバトルの正解数×2の追加ダメージ
            if (card.soulBlade) {
                const bonus = this.correctCount * 2;
                damage += bonus;
                result.effects.push({ type: 'soul_bonus', value: bonus });
            }

            // いかりの炎：失ったHP÷5の追加ダメージ
            if (card.rageFlame) {
                const lostHp = this.player.maxHp - this.player.hp;
                const bonus = Math.floor(lostHp / 5);
                damage += bonus;
                result.effects.push({ type: 'rage_bonus', value: bonus });
            }

            // うずしお：手札の枚数×2の追加ダメージ
            if (card.vortex) {
                // 自分自身は手札の外なので手札枚数そのまま使う
                const handCount = this.deck.hand.length;
                const bonus = handCount * 2;
                damage += bonus;
                result.effects.push({ type: 'vortex_bonus', value: bonus, hand: handCount });
            }

            // ウィークポイント：次の攻撃2倍フラグ適用
            if (this.nextAttackDoubled) {
                damage *= 2;
                this.nextAttackDoubled = false;
                result.effects.push({ type: 'weak_point_triggered' });
            }

            // 敵のブロックを計算してダメージ適用
            const actualDamage = Math.max(0, damage - this.enemy.block);
            this.enemy.block = Math.max(0, this.enemy.block - damage);
            this.enemy.hp = Math.max(0, this.enemy.hp - actualDamage);

            // 今回のバトルの最大ダメージを記録
            if (!this.maxDamageThisBattle) this.maxDamageThisBattle = 0;
            this.maxDamageThisBattle = Math.max(this.maxDamageThisBattle, damage);

            if (window.sm) {
                if (damage >= 10) window.sm.playHeavyAttack();
                else window.sm.playAttack();
            }

            result.effects.push({ type: 'damage', value: damage, actual: actualDamage });

            // ゆきだるま：使用後にbaseDamageを永続+3
            if (card.snowball) {
                card.baseDamage += 3;
                result.effects.push({ type: 'snowball_grow', newDamage: card.baseDamage });
            }

            // ミラーコピー使用後のlastCardId更新（攻撃カードのみ記録）
            if (!card.mirrorCopy) this.lastCardId = card.id;
        }

        // 防御
        if (card.baseBlock) {
            const block = this.scaling.calculateBlock(card);
            this.playerBlock += block;
            if (window.sm) window.sm.playBlock();
            result.effects.push({ type: 'block', value: block });
        }

        // とげのよろい：このターン中の敵ヒット1回ごとに反撃ダメージを設定
        if (card.thornArmor) {
            this.thornArmorDamage = card.thornArmor;
            result.effects.push({ type: 'thorn_armor', value: card.thornArmor });
        }

        // 回復
        if (card.healAmount) {
            const heal = Math.min(card.healAmount, this.player.maxHp - this.player.hp);
            this.player.hp += heal;
            if (window.sm) window.sm.playPotion();
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

        // 毒の触媒（毒を2倍にする）
        if (card.catalyst) {
            if (this.enemyPoison > 0) {
                if (window.sm) window.sm.playPoison();
                const addedPoison = this.enemyPoison;
                this.enemyPoison *= 2;
                result.effects.push({ type: 'poison_catalyst', value: addedPoison });
            } else {
                result.effects.push({ type: 'miss', message: '敵が毒状態ではない' });
            }
        }

        // ちくせきの力：バトル内永続攻撃バフをスタック加算
        if (card.accumulate) {
            this.damagePermanentBuff += card.accumulate;
            result.effects.push({ type: 'accumulate', total: this.damagePermanentBuff });
            this.log.push(`ちくせきの力！ 永続ダメージバフ合計: +${this.damagePermanentBuff}`);
        }

        // ウィークポイント：敵の毒が3以上なら次の攻撃2倍フラグをセット
        if (card.weakPoint) {
            if (this.enemyPoison >= 3) {
                this.nextAttackDoubled = true;
                result.effects.push({ type: 'weak_point_set' });
                this.log.push('ウィークポイント！ 次の攻撃ダメージが2倍になる！');
            } else {
                result.effects.push({ type: 'weak_point_fail', poison: this.enemyPoison });
                this.log.push(`ウィークポイント不発（毒が${this.enemyPoison}、3以上必要）`);
            }
        }

        // ミラーコピー：最後に使ったカードを再実行
        if (card.mirrorCopy) {
            if (this.lastCardId) {
                // 静的インポート済みのCARD_DEFINITIONSを参照（awaitなし）
                const lastDef = CARD_DEFINITIONS[this.lastCardId];
                if (lastDef) {
                    // 攻撃カードのダメージのみコピー（副作用系は除く）
                    let copyDamage = (lastDef.baseDamage || 0) + this.damagePermanentBuff;
                    if (this.nextAttackDoubled) {
                        copyDamage *= 2;
                        this.nextAttackDoubled = false;
                    }
                    if (copyDamage > 0) {
                        const actual = Math.max(0, copyDamage - this.enemy.block);
                        this.enemy.block = Math.max(0, this.enemy.block - copyDamage);
                        this.enemy.hp = Math.max(0, this.enemy.hp - actual);
                        if (!this.maxDamageThisBattle) this.maxDamageThisBattle = 0;
                        this.maxDamageThisBattle = Math.max(this.maxDamageThisBattle, copyDamage);
                        if (window.sm) window.sm.playHeavyAttack();
                        result.effects.push({ type: 'mirror_damage', value: copyDamage, actual, copied: this.lastCardId });
                        this.log.push(`ミラーコピー：「${lastDef.name}」を複製！ ${copyDamage}ダメージ！`);
                    } else if (lastDef.poison) {
                        this.enemyPoison += lastDef.poison;
                        result.effects.push({ type: 'mirror_poison', value: lastDef.poison });
                        this.log.push(`ミラーコピー：毒${lastDef.poison}を複製！`);
                    } else {
                        result.effects.push({ type: 'mirror_no_effect' });
                    }
                } else {
                    result.effects.push({ type: 'mirror_no_card' });
                }
            } else {
                result.effects.push({ type: 'mirror_no_card' });
                this.log.push('ミラーコピー：コピーするカードがない！');
            }
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

        // スキルカード以外のlastCardId更新
        if (card.type !== 'skill' && !card.mirrorCopy) {
            this.lastCardId = card.id;
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
            if (window.sm) window.sm.playPoison();
            this.enemy.hp = Math.max(0, this.enemy.hp - this.enemyPoison);
            result.effects.push({ type: 'poison_damage', value: this.enemyPoison });
            this.enemyPoison = Math.max(0, this.enemyPoison - 1);

            if (this.enemy.hp <= 0) {
                if (window.sm) window.sm.playDefeat();
                this.state = BATTLE_STATES.VICTORY;
                this.emit('battle_end', { result: 'victory' });
                this.emit('state_change', { state: this.state });
                return result;
            }
        }

        this.enemy.block = 0;

        // 進化する古文書：毎ターン攻撃力上昇 (+2)
        if (this.enemy.id === 'evolving_archive') {
            if (!this.enemy.buffs.strength) this.enemy.buffs.strength = 0;
            this.enemy.buffs.strength += 2;
            this.log.push('古文書の知識が深まり、攻撃力が2上昇した。');
        }

        switch (intent.intent) {
            case ENEMY_INTENTS.ATTACK: {
                let damage = intent.damage;
                // 弱体化チェック
                if (this.enemyDebuffs.weakened) {
                    damage = Math.max(0, damage - this.enemyDebuffs.weakened.value);
                }
                const actualDamage = Math.max(0, damage - this.playerBlock);
                if (window.sm && this.playerBlock > 0 && damage >= this.playerBlock) window.sm.playBlockBreak();

                this.playerBlock = Math.max(0, this.playerBlock - damage);
                this.player.hp = Math.max(0, this.player.hp - actualDamage);

                if (window.sm && actualDamage > 0) window.sm.playDamage();
                else if (window.sm && actualDamage <= 0) window.sm.playBlock();

                result.effects.push({ type: 'damage', value: damage, actual: actualDamage });

                // とげのよろい：1ヒットごとに反撃ダメージ
                if (this.thornArmorDamage > 0) {
                    const thornActual = Math.max(0, this.thornArmorDamage - this.enemy.block);
                    this.enemy.block = Math.max(0, this.enemy.block - this.thornArmorDamage);
                    this.enemy.hp = Math.max(0, this.enemy.hp - thornActual);
                    result.effects.push({ type: 'thorn_counter', value: this.thornArmorDamage, actual: thornActual });
                    this.log.push(`とげのよろい！ 反撃 ${this.thornArmorDamage}ダメージ！`);
                }
                break;
            }

            case ENEMY_INTENTS.MULTI_ATTACK: {
                let totalActual = 0;
                let thornTotalCounter = 0;
                for (let i = 0; i < intent.hits; i++) {
                    let damage = intent.damage;
                    if (this.enemyDebuffs.weakened) {
                        damage = Math.max(0, damage - this.enemyDebuffs.weakened.value);
                    }
                    const actualDamage = Math.max(0, damage - this.playerBlock);
                    if (window.sm && this.playerBlock > 0 && damage >= this.playerBlock) setTimeout(() => window.sm.playBlockBreak(), i * 200);

                    this.playerBlock = Math.max(0, this.playerBlock - damage);
                    this.player.hp = Math.max(0, this.player.hp - actualDamage);

                    if (window.sm && actualDamage > 0) setTimeout(() => window.sm.playDamage(), i * 200);
                    else if (window.sm && actualDamage <= 0) setTimeout(() => window.sm.playBlock(), i * 200);

                    totalActual += actualDamage;

                    // とげのよろい：マルチヒット1回ごとに反撃ダメージ
                    if (this.thornArmorDamage > 0) {
                        const thornActual = Math.max(0, this.thornArmorDamage - this.enemy.block);
                        this.enemy.block = Math.max(0, this.enemy.block - this.thornArmorDamage);
                        this.enemy.hp = Math.max(0, this.enemy.hp - thornActual);
                        thornTotalCounter += thornActual;
                    }
                }
                result.effects.push({ type: 'multi_damage', hits: intent.hits, perHit: intent.damage, total: totalActual });
                if (thornTotalCounter > 0) {
                    result.effects.push({ type: 'thorn_counter_multi', hits: intent.hits, perHit: this.thornArmorDamage, total: thornTotalCounter });
                    this.log.push(`とげのよろい！ ${intent.hits}ヒット分反撃！ 合計 ${thornTotalCounter}ダメージ！`);
                }
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

        // 最大エナジーを再計算（レリック等）
        this.maxEnergy = this.player.maxEnergy + this.scaling.getRelicBonus('energy_bonus');
        this.energy = this.maxEnergy;

        // 次ターンエナジーバフの適用
        if (this.scaling.buffs.next_turn_energy) {
            this.energy += this.scaling.buffs.next_turn_energy.value;
        }

        // ブロックをリセット（持続ブロックは残す）
        this.playerBlock = this.persistentBlock;
        this.persistentBlock = 0;

        // とげのよろいは1ターン限定なのでリセット
        this.thornArmorDamage = 0;

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
        if (window.sm && drawn.length > 0) window.sm.playCardDraw();

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
        if (window.sm) window.sm.playPotion();

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
                this.nextQuizHints += potion.effect.value;
                if (this.state === BATTLE_STATES.QUIZ_ACTIVE && this.currentQuiz && this.currentQuiz.choices) {
                    this.currentQuiz.hintEliminated = (this.currentQuiz.hintEliminated || 0) + this.nextQuizHints;
                    this.nextQuizHints = 0;
                }
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
            enemyId: this.enemy.id,
            isBoss: this.enemy.isBoss,
            wisdomScore: this.wisdomScore,
            maxDamage: this.maxDamageThisBattle || 0
        };
    }
}
