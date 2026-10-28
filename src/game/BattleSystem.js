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
     * @param {number} currentFloor - 現在のフロア番号
     */
    constructor(player, enemy, deck, scaling, wordDb, spacedRep, currentFloor = 1) {
        this.player = player;
        this.enemy = enemy;
        this.deck = new DeckManager(deck);
        this.scaling = scaling;
        this.wordDb = wordDb;
        this.spacedRep = spacedRep;
        /** 現在のフロア（クイズ難易度制御用） */
        this.currentFloor = currentFloor;

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
        /** ウィークポイント：次の攻撃の倍率（1=通常、2=2倍、3=3倍...） */
        this.nextAttackMultiplier = 1;
        /** ミラーコピー用：最後に使ったカードの定義ID */
        this.lastCardId = null;
        /** このターンに使用したカード枚数（レリック「不動の扇」用） */
        this.cardsPlayedThisTurn = 0;
        /** レリック「成長の魔剣」用の累計正解カウント */
        this.kunaiCorrectCount = 0;

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
     * 敵の攻撃力バフ（strength）を加算し、今ターンの行動予定（nextEnemyIntent）へ即座に反映する
     * @param {number} amount - 加算する攻撃力
     */
    addEnemyStrength(amount) {
        if (!this.enemy.buffs) this.enemy.buffs = {};
        this.enemy.buffs.strength = (this.enemy.buffs.strength || 0) + amount;
        this.nextEnemyIntent = getEnemyIntent(this.enemy);
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

        // 特別なボス・モンスターのギミック開始時ログ
        if (this.enemy.id === 'evolving_archive') {
            this.log.push('【特殊戦闘】覚醒する知性：正解するたびダメージが1.5倍（乗算）！ミスでリセット。');
            this.log.push('【警告】敵の攻撃力が毎ターン上昇していく！');
        } else if (this.enemy.gimmickDesc) {
            this.log.push(`【ギミック】${this.enemy.gimmickDesc}`);
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

        // ボスギミック「女王の逆鱗（enrage_skill）」：防御・スキルカード（攻撃以外）を使った瞬間に敵の攻撃力+2＆今ターンの行動予定にも即時反映
        if ((card.type === CARD_TYPES.SKILL || card.type === CARD_TYPES.DEFENSE) && this.enemy.gimmick === 'enrage_skill') {
            const enrage = this.enemy.enrageValue || 2;
            this.addEnemyStrength(enrage);
            this.selectedCard.triggeredEnrage = enrage;
            this.log.push(`🐝 女王の逆鱗！ 補助カード使用に反応して敵の攻撃力+${enrage}！`);
        }

        // フロアに応じた難易度重み付きで問題を選択（1Fボス等でもフロア基準の難易度を維持）
        const quizFloor = this.currentFloor || 1;
        const weights = this.spacedRep.getWeights();
        const word = this.wordDb.getWeightedRandomWord(quizFloor, weights);

        // 出題形式の決定
        if (card.quizMode === QUIZ_MODES.TYPING) {
            this.currentQuiz = this.wordDb.generateTypingQuestion(word);
        } else {
            // 英語→日本語 or 日本語→英語 ランダム
            const type = Math.random() > 0.5 ? 'en_to_jp' : 'jp_to_en';
            this.currentQuiz = this.wordDb.generateQuestion(word, type);
        }

        // ポーション効果をこのカードの連撃全体に適用するため保持
        if (this.nextQuizHints > 0) {
            this.selectedCard.potionHints = (this.selectedCard.potionHints || 0) + this.nextQuizHints;
            this.nextQuizHints = 0; // 消費
        }

        // レリック「ちえの宝石」とヒントポーションのヒント適用
        const totalHints = (this.scaling.hasRelic('hint') ? 1 : 0) + (this.selectedCard.potionHints || 0);
        if (totalHints > 0 && this.currentQuiz.choices) {
            this.currentQuiz.hintEliminated = (this.currentQuiz.hintEliminated || 0) + totalHints;
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
            comboMultiplier: this.scaling.getComboMultiplier(),
            mathBonusText: (correct && this.currentQuiz.word && this.currentQuiz.word.twoDigitCount >= 2)
                ? '🌟2けた×2けた威力1.5倍!'
                : (correct && this.currentQuiz.word && this.currentQuiz.word.twoDigitCount === 1)
                    ? '🔥2けた計算威力1.2倍!'
                    : ''
        };

        if (correct) {
            // カードにXP付与（レリック「言葉の巻物」のxp_bonusを反映）
            const xpAmount = 1 + this.scaling.getRelicBonus('xp_bonus');
            let leveledUp = false;
            for (let i = 0; i < xpAmount; i++) {
                if (addCardXP(this.selectedCard)) {
                    leveledUp = true;
                }
            }
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

            // レリック「成長の魔剣（kunai_scaling）」：3問正解ごとにバトル中の全攻撃ダメージ+3
            if (this.scaling.hasRelic('kunai_scaling')) {
                this.kunaiCorrectCount++;
                if (this.kunaiCorrectCount % 3 === 0) {
                    const bonus = this.scaling.getRelicBonus('kunai_scaling');
                    this.damagePermanentBuff += bonus;
                    result.kunaiTriggered = bonus;
                    this.log.push(`🗡️ 成長の魔剣！ 3回正解で永続ダメージ+${bonus}（合計+${this.damagePermanentBuff}）！`);
                }
            }

            // レリック「知恵の歯車（diff3_energy_draw）」：難易度★3正解でエナジー+1＆1枚ドロー
            if (difficulty >= 3 && this.scaling.hasRelic('diff3_energy_draw')) {
                this.energy += 1;
                const drawn = this.deck.draw(1);
                result.wisdomGearTriggered = true;
                this.log.push(`⚙️ 知恵の歯車！ 難易度★3正解でエナジー+1＆カード${drawn.length}枚ドロー！`);
            }

            // ボスギミック「時の審判（chrono_judgment）」：3コンボ以上でエナジー+1回復
            if (this.enemy.gimmick === 'chrono_judgment' && this.scaling.comboCount >= 3) {
                this.energy += 1;
                result.chronoBonus = true;
                this.log.push('⏳ 時の審判ボーナス！ 3コンボ以上の正解でエナジー+1回復！');
            }

            const cardResult = this.applyCardEffect(this.selectedCard);
            result.cardEffect = cardResult;

            // ダブルストライク等の連撃問題チェック
            if ((this.selectedCard.quizMode === QUIZ_MODES.CHOICE_DOUBLE || this.selectedCard.quizMode === QUIZ_MODES.CHOICE_TRIPLE) &&
                this.currentHitIndex < (this.selectedCard.hits || 1)) {
                // もう1問出題
                const weights = this.spacedRep.getWeights();
                const nextWord = this.wordDb.getWeightedRandomWord(this.currentFloor || 1, weights, [this.currentQuiz.word.id]);
                const type = Math.random() > 0.5 ? 'en_to_jp' : 'jp_to_en';
                this.currentQuiz = this.wordDb.generateQuestion(nextWord, type);

                // レリック「ちえの宝石」とヒントポーションのヒント適用
                const totalHints = (this.scaling.hasRelic('hint') ? 1 : 0) + (this.selectedCard.potionHints || 0);
                if (totalHints > 0 && this.currentQuiz.choices) {
                    this.currentQuiz.hintEliminated = (this.currentQuiz.hintEliminated || 0) + totalHints;
                }

                result.nextQuiz = this.currentQuiz;

                this.emit('quiz_result', result);
                return result;
            }

            // レリック「不動の扇（fan_block）」：1ターンに3枚カードを使うたびブロック+6
            this.cardsPlayedThisTurn++;
            if (this.scaling.hasRelic('fan_block') && this.cardsPlayedThisTurn % 3 === 0) {
                const fanBlock = this.scaling.getRelicBonus('fan_block');
                this.playerBlock += fanBlock;
                if (result.cardEffect && result.cardEffect.effects) {
                    result.cardEffect.effects.push({ type: 'block', value: fanBlock });
                }
                result.fanTriggered = fanBlock;
                this.log.push(`🪭 不動の扇！ このターン3枚目のカード使用でブロック+${fanBlock}！`);
            }
        } else {
            // 誤答ペナルティ ― カード不発
            result.cardEffect = { type: 'miss', message: 'カード不発！' };

            // 進化する古文書：マルチプライヤーリセット
            if (this.enemy.id === 'evolving_archive') {
                this.awakeningMultiplier = 1.0;
                this.log.push('覚醒する知性が解除された！');
            }

            // 敵ギミック：ミス時ペナルティ（知識吸収・呪いの言霊・王の威圧・時の審判）
            if (this.enemy.absorbOnMiss) {
                const healVal = Math.min(this.enemy.absorbOnMiss, this.enemy.maxHp - this.enemy.hp);
                this.enemy.hp += healVal;
                this.addEnemyStrength(3);
                result.gimmickPenalty = `🌌 知識吸収！ 敵のHP+${healVal}・攻撃力+3！`;
                this.log.push(result.gimmickPenalty);
            } else if (this.enemy.gimmick === 'curse_weaken' || this.enemy.gimmick === 'king_pressure') {
                this.enemy.block += 10;
                this.addEnemyStrength(2);
                result.gimmickPenalty = `${this.enemy.emoji} ミスにより敵のブロック+10・攻撃力+2！`;
                this.log.push(result.gimmickPenalty);
            } else if (this.enemy.gimmick === 'chrono_judgment') {
                this.addEnemyStrength(3);
                result.gimmickPenalty = '⏳ 時の審判：ミスにより敵の攻撃力+3！';
                this.log.push(result.gimmickPenalty);
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

        // 敵のHP確認（撃破音はmain.js側でエフェクト完了後に再生するため、ここでは鳴らさない）
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
        const result = { type: card.type, cost: card.cost, effects: [] };
        // 算術マスターの2桁計算威力ボーナス倍率（1桁同士: 1.0, 片方2桁: 1.2, 両方2桁: 1.5）
        const mathPowerMult = (this.currentQuiz && this.currentQuiz.word && this.currentQuiz.word.powerMultiplier)
            ? this.currentQuiz.word.powerMultiplier
            : 1.0;

        // ボスギミック「女王の逆鱗（enrage_skill）」：selectCard時点で発動済みのためエフェクト情報のみ記録
        if (card.triggeredEnrage) {
            result.effects.push({ type: 'enemy_enrage', value: card.triggeredEnrage });
            delete card.triggeredEnrage;
        }

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

            // コンボボーナス（サンダーカード・累乗インパクト）
            if (card.comboBonus && this.scaling.comboCount >= 2) {
                damage += card.comboBonus;
            }

            // コンボ・ブレード / 黄金比スパイラル（コンボ数×倍率）
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

            // インド式魔導砲（2桁を含む計算のとき追加ダメージ）
            if (card.twoDigitBonusDamage && this.currentQuiz && this.currentQuiz.word && this.currentQuiz.word.twoDigitCount >= 1) {
                damage += card.twoDigitBonusDamage;
            }

            // 積のバースト（答えの各桁の合計×係数のダメージ＆ブロック）
            if (card.digitSumSynergy && this.currentQuiz && this.currentQuiz.word && this.currentQuiz.word.answerValue !== undefined) {
                const digitSum = String(this.currentQuiz.word.answerValue)
                    .split('')
                    .reduce((sum, ch) => sum + (parseInt(ch, 10) || 0), 0);
                const synergyVal = Math.ceil(digitSum * card.digitSumSynergy * mathPowerMult);
                damage += synergyVal;
                this.playerBlock += synergyVal;
                result.effects.push({ type: 'block', value: synergyVal });
                if (window.sm) window.sm.playBlock();
            }

            // 大数カノン（答え÷係数の追加ダメージ）
            if (card.answerScaleDivisor && this.currentQuiz && this.currentQuiz.word && this.currentQuiz.word.answerValue !== undefined) {
                const scaleBonus = Math.floor(this.currentQuiz.word.answerValue / card.answerScaleDivisor);
                damage += scaleBonus;
            }

            // 剛拳砕き（10画以上の漢字のとき追加ダメージ）
            if (card.highStrokeBonusDamage && this.currentQuiz && this.currentQuiz.word && this.currentQuiz.word.strokes >= 10) {
                damage += card.highStrokeBonusDamage;
            }

            // 画数バースト（漢字の画数×係数のダメージ＆ブロック）
            if (card.strokeSynergy && this.currentQuiz && this.currentQuiz.word && this.currentQuiz.word.strokes !== undefined) {
                const strokeVal = this.currentQuiz.word.strokes * card.strokeSynergy;
                damage += strokeVal;
                this.playerBlock += strokeVal;
                result.effects.push({ type: 'block', value: strokeVal });
                if (window.sm) window.sm.playBlock();
            }

            // ソウルブレード / 定理の刃：このバトルの正解数×2の追加ダメージ
            if (card.soulBlade) {
                const bonus = this.correctCount * 2;
                damage += bonus;
                result.effects.push({ type: 'soul_bonus', value: bonus });
            }

            // いかりの炎 / パラドックスの炎：失ったHP÷5の追加ダメージ
            if (card.rageFlame) {
                const lostHp = this.player.maxHp - this.player.hp;
                const bonus = Math.floor(lostHp / 5);
                damage += bonus;
                result.effects.push({ type: 'rage_bonus', value: bonus });
            }

            // うずしお / 因数うずしお：手札の枚数×2の追加ダメージ
            if (card.vortex) {
                // 自分自身は手札の外なので手札枚数そのまま使う
                const handCount = this.deck.hand.length;
                const bonus = handCount * 2;
                damage += bonus;
                result.effects.push({ type: 'vortex_bonus', value: bonus, hand: handCount });
            }

            // 算術マスター：2桁計算威力ボーナス適用
            if (mathPowerMult > 1.0) {
                damage = Math.ceil(damage * mathPowerMult);
            }

            // ウィークポイント / 2倍角の公式：次の攻撃倍率適用
            if (this.nextAttackMultiplier > 1) {
                damage *= this.nextAttackMultiplier;
                result.effects.push({ type: 'weak_point_triggered', multiplier: this.nextAttackMultiplier });
                this.nextAttackMultiplier = 1;
            }

            // ギミック「風の衣（flight）」：飛翔中は受ける攻撃ダメージ半減
            if (this.enemy.flightActive && !window.TEST_9999_DAMAGE) {
                damage = Math.ceil(damage * 0.5);
            }

            // テストプレイ専用：9999ダメージONモード
            if (window.TEST_9999_DAMAGE) {
                damage = 9999;
                window.USED_TEST_CHEAT = true;
            }

            // 敵のブロックを計算してダメージ適用
            const hadBlockBefore = this.enemy.block > 0;
            const actualDamage = Math.max(0, damage - this.enemy.block);
            this.enemy.block = Math.max(0, this.enemy.block - damage);
            this.enemy.hp = Math.max(0, this.enemy.hp - actualDamage);

            // 今回のバトルの最大ダメージを記録（9999テストモード時はスコアが壊れないよう通常ダメージ相当に制限）
            if (!this.maxDamageThisBattle) this.maxDamageThisBattle = 0;
            this.maxDamageThisBattle = Math.max(this.maxDamageThisBattle, window.TEST_9999_DAMAGE ? 30 : damage);

            // 攻撃音はmain.js側でエフェクトタイミングに合わせて再生するためここでは鳴らさない

            result.effects.push({ type: 'damage', value: damage, actual: actualDamage });

            // ギミック「溶岩装甲（magma_armor）」：ブロックを完全に破壊すると装甲クラッシュで10ダメージ＆弱体化
            if (hadBlockBefore && this.enemy.block === 0 && this.enemy.gimmick === 'magma_armor' && this.enemy.hp > 0) {
                const breakDmg = 10;
                this.enemy.hp = Math.max(0, this.enemy.hp - breakDmg);
                this.enemyDebuffs.weakened = { value: 3, turns: 2 };
                result.effects.push({ type: 'armor_break', value: breakDmg });
                this.log.push('🌋 溶岩装甲クラッシュ！ 装甲が砕けて10ダメージ＆弱体化！');
            }

            // ギミック「居眠り（slumber）」：HPダメージを受けると目覚めて攻撃力アップ
            if (this.enemy.asleepTurns > 0 && actualDamage > 0 && this.enemy.hp > 0) {
                this.enemy.asleepTurns = 0;
                const wakeStr = this.enemy.wakeUpStrength || 4;
                this.enemy.buffs.strength = (this.enemy.buffs.strength || 0) + wakeStr;
                this.nextEnemyIntent = getEnemyIntent(this.enemy);
                result.effects.push({ type: 'enemy_wakeup', value: wakeStr });
                this.log.push(`🔥 ${this.enemy.name}が目を覚ました！ 怒りで攻撃力+${wakeStr}！`);
            }

            // ギミック「風の衣（flight）」：1ターンに規定回数ヒットさせると撃墜して追加8ダメージ
            if (this.enemy.flightActive && this.enemy.hp > 0) {
                this.enemy.hitsTakenThisTurn = (this.enemy.hitsTakenThisTurn || 0) + 1;
                if (this.enemy.hitsTakenThisTurn >= (this.enemy.flightHitsRequired || 2)) {
                    this.enemy.flightActive = false;
                    const crashDmg = 8;
                    this.enemy.hp = Math.max(0, this.enemy.hp - crashDmg);
                    result.effects.push({ type: 'flight_crash', value: crashDmg });
                    this.log.push(`🌪️ 風の衣がやぶれて撃墜！ 追加${crashDmg}ダメージ！`);
                }
            }

            // ギミック「水晶のトゲ（passiveThorns）」：攻撃時にトゲ反撃ダメージ（HP1は必ず残る親切設計）
            if (this.enemy.passiveThorns > 0 && this.enemy.hp > 0) {
                const thornsDmg = this.enemy.passiveThorns;
                const actualThorns = Math.max(0, thornsDmg - this.playerBlock);
                this.playerBlock = Math.max(0, this.playerBlock - thornsDmg);
                this.player.hp = Math.max(1, this.player.hp - actualThorns);
                result.effects.push({ type: 'enemy_thorns', value: thornsDmg, actual: actualThorns });
                this.log.push(`💎 トゲの反撃！ プレイヤーに${thornsDmg}ダメージ！`);
            }

            // ゆきだるま / 等差ストーム：使用後にbaseDamageを永続成長
            if (card.snowball) {
                const buff = card.snowballBuff || 3;
                card.baseDamage += buff;
                result.effects.push({ type: 'snowball_grow', newDamage: card.baseDamage });
            }

            // ミラーコピー用：全カードのlastCardId更新
            if (!card.mirrorCopy) this.lastCardId = card.id;
        }

        // 防御
        if (card.baseBlock) {
            let block = this.scaling.calculateBlock(card);
            if (mathPowerMult > 1.0) {
                block = Math.ceil(block * mathPowerMult);
            }
            this.playerBlock += block;
            if (window.sm) window.sm.playBlock();
            result.effects.push({ type: 'block', value: block });
        }

        // とげのよろい / コンパスの針：このターン中の敵ヒット1回ごとに反撃ダメージを加算
        if (card.thornArmor) {
            this.thornArmorDamage += card.thornArmor;
            result.effects.push({ type: 'thorn_armor', value: this.thornArmorDamage });
        }

        // 回復
        if (card.healAmount) {
            const rawHeal = mathPowerMult > 1.0 ? Math.ceil(card.healAmount * mathPowerMult) : card.healAmount;
            const heal = Math.min(rawHeal, this.player.maxHp - this.player.hp);
            this.player.hp += heal;
            if (window.sm) window.sm.playPotion();
            result.effects.push({ type: 'heal', value: heal });
        }

        // ドロー
        if (card.drawCount) {
            const drawn = this.deck.draw(card.drawCount);
            result.effects.push({ type: 'draw', value: drawn.length });
        }

        // バフ（重ねがけ対応：加算）
        if (card.buff) {
            const existing = this.scaling.buffs[card.buff.type];
            if (existing) {
                existing.value += (card.buff.value - 1); // strength: 1.5→+0.5加算で2.0
                existing.turns = Math.max(existing.turns, card.buff.turns);
            } else {
                this.scaling.buffs[card.buff.type] = {
                    value: card.buff.value,
                    turns: card.buff.turns
                };
            }
            result.effects.push({ type: 'buff', buffType: card.buff.type });
        }

        // デバフ（敵への弱体化・重ねがけ対応：加算）
        if (card.debuff) {
            const existing = this.enemyDebuffs[card.debuff.type];
            if (existing) {
                existing.value += card.debuff.value;
                existing.turns = Math.max(existing.turns, card.debuff.turns);
            } else {
                this.enemyDebuffs[card.debuff.type] = {
                    value: card.debuff.value,
                    turns: card.debuff.turns
                };
            }
            result.effects.push({ type: 'debuff', debuffType: card.debuff.type });
        }

        // 毒（レリック「ベノムスカル」のpoison_bonusを反映）
        if (card.poison) {
            const poisonAmount = card.poison + this.scaling.getRelicBonus('poison_bonus');
            this.enemyPoison += poisonAmount;
            result.effects.push({ type: 'poison', value: poisonAmount });
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

        // ウィークポイント：次の攻撃倍率+1（累積加算）
        if (card.weakPoint) {
            this.nextAttackMultiplier += 1;
            result.effects.push({ type: 'weak_point_set', multiplier: this.nextAttackMultiplier });
            this.log.push(`ウィークポイント！ 次の攻撃ダメージが${this.nextAttackMultiplier}倍になる！`);
        }

        // ミラーコピー：最後に使ったカードを再実行（全カード対応）
        if (card.mirrorCopy) {
            if (this.lastCardId) {
                const lastDef = CARD_DEFINITIONS[this.lastCardId];
                if (lastDef) {
                    let hasEffect = false;

                    // 攻撃ダメージのコピー
                    if (lastDef.baseDamage) {
                        let copyDamage = (lastDef.baseDamage || 0) + this.damagePermanentBuff;
                        if (card.mirrorRatio && card.mirrorRatio !== 1) {
                            copyDamage = Math.floor(copyDamage * card.mirrorRatio);
                        }
                        if (this.nextAttackMultiplier > 1) {
                            copyDamage *= this.nextAttackMultiplier;
                            this.nextAttackMultiplier = 1;
                        }
                        if (window.TEST_9999_DAMAGE) {
                            copyDamage = 9999;
                        }
                        const actual = Math.max(0, copyDamage - this.enemy.block);
                        this.enemy.block = Math.max(0, this.enemy.block - copyDamage);
                        this.enemy.hp = Math.max(0, this.enemy.hp - actual);
                        if (!this.maxDamageThisBattle) this.maxDamageThisBattle = 0;
                        this.maxDamageThisBattle = Math.max(this.maxDamageThisBattle, copyDamage);
                        if (window.sm) window.sm.playHeavyAttack();
                        result.effects.push({ type: 'mirror_damage', value: copyDamage, actual, copied: this.lastCardId });
                        hasEffect = true;
                    }

                    // ブロックのコピー
                    if (lastDef.baseBlock) {
                        let copyBlock = this.scaling.calculateBlock(lastDef);
                        this.playerBlock += copyBlock;
                        result.effects.push({ type: 'block', value: copyBlock });
                        hasEffect = true;
                    }

                    // 毒のコピー
                    if (lastDef.poison) {
                        const copyPoison = lastDef.poison + this.scaling.getRelicBonus('poison_bonus');
                        this.enemyPoison += copyPoison;
                        result.effects.push({ type: 'mirror_poison', value: copyPoison });
                        hasEffect = true;
                    }

                    // 回復のコピー
                    if (lastDef.healAmount) {
                        const heal = Math.min(lastDef.healAmount, this.player.maxHp - this.player.hp);
                        this.player.hp += heal;
                        result.effects.push({ type: 'heal', value: heal });
                        hasEffect = true;
                    }

                    // ドローのコピー
                    if (lastDef.drawCount) {
                        const drawn = this.deck.draw(lastDef.drawCount);
                        result.effects.push({ type: 'draw', value: drawn.length });
                        hasEffect = true;
                    }

                    // ちくせきの力のコピー
                    if (lastDef.accumulate) {
                        this.damagePermanentBuff += lastDef.accumulate;
                        result.effects.push({ type: 'accumulate', total: this.damagePermanentBuff });
                        this.log.push(`ミラーコピー：ちくせきの力！ 永続ダメージバフ合計: +${this.damagePermanentBuff}`);
                        hasEffect = true;
                    }

                    // 毒の触媒（もうどく2倍化）のコピー
                    if (lastDef.catalyst) {
                        if (this.enemyPoison > 0) {
                            if (window.sm) window.sm.playPoison();
                            const addedPoison = this.enemyPoison;
                            this.enemyPoison *= 2;
                            result.effects.push({ type: 'poison_catalyst', value: addedPoison });
                            this.log.push(`ミラーコピー：毒の触媒！ 毒が${addedPoison}→${this.enemyPoison}に倍増！`);
                        }
                        hasEffect = true;
                    }

                    // バフのコピー（パワーアップ等・重ねがけ対応）
                    if (lastDef.buff) {
                        const existingBuff = this.scaling.buffs[lastDef.buff.type];
                        if (existingBuff) {
                            existingBuff.value += (lastDef.buff.value - 1);
                            existingBuff.turns = Math.max(existingBuff.turns, lastDef.buff.turns);
                        } else {
                            this.scaling.buffs[lastDef.buff.type] = {
                                value: lastDef.buff.value,
                                turns: lastDef.buff.turns
                            };
                        }
                        result.effects.push({ type: 'buff', buffType: lastDef.buff.type });
                        hasEffect = true;
                    }

                    // デバフのコピー（アイスランス等・重ねがけ対応）
                    if (lastDef.debuff) {
                        const existingDebuff = this.enemyDebuffs[lastDef.debuff.type];
                        if (existingDebuff) {
                            existingDebuff.value += lastDef.debuff.value;
                            existingDebuff.turns = Math.max(existingDebuff.turns, lastDef.debuff.turns);
                        } else {
                            this.enemyDebuffs[lastDef.debuff.type] = {
                                value: lastDef.debuff.value,
                                turns: lastDef.debuff.turns
                            };
                        }
                        result.effects.push({ type: 'debuff', debuffType: lastDef.debuff.type });
                        hasEffect = true;
                    }

                    // とげのよろいのコピー（加算）
                    if (lastDef.thornArmor) {
                        this.thornArmorDamage += lastDef.thornArmor;
                        result.effects.push({ type: 'thorn_armor', value: this.thornArmorDamage });
                        hasEffect = true;
                    }

                    // ウィークポイントのコピー（累積加算）
                    if (lastDef.weakPoint) {
                        this.nextAttackMultiplier += 1;
                        result.effects.push({ type: 'weak_point_set', multiplier: this.nextAttackMultiplier });
                        this.log.push(`ミラーコピー：ウィークポイント！ 次の攻撃ダメージが${this.nextAttackMultiplier}倍になる！`);
                        hasEffect = true;
                    }

                    // 持続ブロックのコピー（バリア）
                    if (lastDef.persistent && lastDef.persistBlock) {
                        this.persistentBlock += lastDef.persistBlock;
                        result.effects.push({ type: 'persist_block', value: lastDef.persistBlock });
                        hasEffect = true;
                    }

                    if (hasEffect) {
                        this.log.push(`ミラーコピー：「${lastDef.name}」を複製！`);
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

        // ミラーコピー以外の全カードでlastCardIdを更新
        if (!card.mirrorCopy) {
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

        // 毒で敵が倒れた場合：UI側で演出表示後にVICTORYへ遷移するためフラグを返す
        if (enemyResult && enemyResult.poisonKill) {
            // 状態遷移はUI側で遅延実行する
            return enemyResult;
        }

        // プレイヤーのHP確認 (processEnemyTurn内で既に勝利している場合はスキップ)
        if (this.state === BATTLE_STATES.VICTORY || this.state === BATTLE_STATES.DEFEAT) {
            return;
        }

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
                // 毒で敵が倒れた場合、UI側で演出を表示するためフラグだけ立てて返す
                result.poisonKill = true;
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

                    if (this.enemy.hp <= 0) {
                        if (window.sm) window.sm.playDefeat();
                        this.state = BATTLE_STATES.VICTORY;
                        this.emit('battle_end', { result: 'victory' });
                        this.emit('state_change', { state: this.state });
                        return result;
                    }
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

                        if (this.enemy.hp <= 0) {
                            // 途中で倒れた場合はそこで終了
                            result.effects.push({ type: 'multi_damage', hits: i + 1, perHit: intent.damage, total: totalActual });
                            result.effects.push({ type: 'thorn_counter_multi', hits: i + 1, perHit: this.thornArmorDamage, total: thornTotalCounter });
                            this.log.push(`とげのよろい！ 反撃で敵を倒した！`);
                            if (window.sm) window.sm.playDefeat();
                            this.state = BATTLE_STATES.VICTORY;
                            this.emit('battle_end', { result: 'victory' });
                            this.emit('state_change', { state: this.state });
                            return result;
                        }
                    }
                }
                result.effects.push({ type: 'multi_damage', hits: intent.hits, perHit: intent.damage, total: totalActual });
                if (thornTotalCounter > 0) {
                    result.effects.push({ type: 'thorn_counter_multi', hits: intent.hits, perHit: this.thornArmorDamage, total: thornTotalCounter });
                    this.log.push(`とげのよろい！ ${intent.hits}ヒット分反撃！ 合計 ${thornTotalCounter}ダメージ！`);
                }
                break;
            }

            case ENEMY_INTENTS.SLEEP: {
                this.enemy.asleepTurns = Math.max(0, (this.enemy.asleepTurns || 1) - 1);
                result.effects.push({ type: 'sleep', remaining: this.enemy.asleepTurns });
                if (this.enemy.asleepTurns === 0) {
                    const wakeStr = this.enemy.wakeUpStrength || 4;
                    this.enemy.buffs.strength = (this.enemy.buffs.strength || 0) + wakeStr;
                    this.log.push(`🔥 ${this.enemy.name}が目を覚ました！ 攻撃力+${wakeStr}！`);
                } else {
                    this.log.push(`💤 ${this.enemy.name}はぐっすり眠っている…`);
                }
                break;
            }

            case ENEMY_INTENTS.DEFEND: {
                this.enemy.block += intent.block || 0;
                result.effects.push({ type: 'block', value: intent.block });
                if (this.enemy.gimmick === 'regen_defend') {
                    const healVal = Math.min(this.enemy.regenValue || 6, this.enemy.maxHp - this.enemy.hp);
                    if (healVal > 0) {
                        this.enemy.hp += healVal;
                        result.effects.push({ type: 'enemy_heal', value: healVal });
                        this.log.push(`🌳 森の再生！ ${this.enemy.name}のHPが${healVal}回復した！`);
                    }
                }
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
                if (this.enemy.gimmick === 'dragon_roar') {
                    this.enemy.block += 8;
                    result.effects.push({ type: 'block', value: 8 });
                    this.log.push('🐉 竜の咆哮！ 攻撃力上昇と同時にブロック+8！');
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
        // 1ターン内のカード使用枚数と敵の被ヒット数をリセット
        this.cardsPlayedThisTurn = 0;
        if (this.enemy) {
            this.enemy.hitsTakenThisTurn = 0;
        }

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
