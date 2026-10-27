// 算術（掛け算）データベース管理
// 1×1〜19×19までの掛け算問題の生成・難易度管理・4択誤答生成を担当する

export class MathDatabase {
  constructor() {
    /** 全掛け算問題データ（1×1〜19×19の361問） */
    this.words = this.buildMultiplicationProblems();
    /** カテゴリ一覧 */
    this.categories = [...new Set(this.words.map(w => w.category))];
  }

  /**
   * 1×1〜19×19の全掛け算問題データを構築
   * @returns {Array} 問題オブジェクトの配列
   */
  buildMultiplicationProblems() {
    const problems = [];

    for (let a = 1; a <= 19; a++) {
      for (let b = 1; b <= 19; b++) {
        const product = a * b;
        const maxFactor = Math.max(a, b);
        const minFactor = Math.min(a, b);

        // 2桁の因数の個数（0, 1, 2）
        const twoDigitCount = (a >= 10 ? 1 : 0) + (b >= 10 ? 1 : 0);

        // 2桁計算ボーナス倍率（片方2桁: 1.2倍、両方2桁: 1.5倍）
        const powerMultiplier = twoDigitCount === 2 ? 1.5 : (twoDigitCount === 1 ? 1.2 : 1.0);

        // 難易度判定（小学生向けに明確に3段階へ分離）
        // 1: 九九（1×1〜9×9）および ×1, ×10 の簡単な計算
        // 2: 2桁×1桁（片方が11〜19、もう片方が2〜9）
        // 3: 2桁×2桁（両方が11〜19）
        let difficulty = 1;
        if (maxFactor <= 9 || minFactor === 1 || a === 10 || b === 10) {
          difficulty = 1;
        } else if (minFactor <= 9) {
          difficulty = 2;
        } else {
          difficulty = 3;
        }

        // カテゴリ判定（たんごリスト・学習記録表示用）
        let category = 'math_1_9';
        let emoji = '🔢';
        if (maxFactor <= 9) {
          category = 'math_1_9';
          emoji = '🔢';
        } else if (maxFactor <= 12) {
          category = 'math_10_12';
          emoji = '🧮';
        } else if (maxFactor <= 15) {
          category = 'math_13_15';
          emoji = '📐';
        } else {
          category = 'math_16_19';
          emoji = '🌟';
        }

        problems.push({
          id: 10000 + a * 100 + b,
          factorA: a,
          factorB: b,
          answerValue: product,
          // 既存のWordDatabase互換プロパティ
          english: `${a} × ${b}`,
          japanese: `${product}`,
          emoji,
          category,
          difficulty,
          twoDigitCount,
          powerMultiplier,
          isMath: true
        });
      }
    }

    return problems;
  }

  /**
   * 難易度でフィルタリングした問題を取得
   * @param {number} maxDifficulty - 最大難易度（1-3）
   * @returns {Array} フィルタリングされた問題配列
   */
  getWordsByDifficulty(maxDifficulty) {
    return this.words.filter(w => w.difficulty <= maxDifficulty);
  }

  /**
   * カテゴリでフィルタリング
   * @param {string} category - カテゴリ名
   * @returns {Array} フィルタリングされた問題配列
   */
  getWordsByCategory(category) {
    return this.words.filter(w => w.category === category);
  }

  /**
   * フロアに応じた難易度別の出題確率設定（小学生向けに段階的調整）
   * ※問題数による偏りを防ぐため、まず難易度ティアを確率抽選してから問題を選ぶ
   * @param {number} floor - 現在のフロア番号（1-3）
   * @returns {Object} 各難易度(1, 2, 3)の選択確率重み
   */
  getFloorTierProbabilities(floor) {
    const tierProbs = {
      // フロア1：九九が92%、2桁×1桁が8%（2桁×2桁は出ない）
      1: { 1: 92, 2: 8, 3: 0 },
      // フロア2：九九が65%、2桁×1桁が28%、2桁×2桁が7%
      2: { 1: 65, 2: 28, 3: 7 },
      // フロア3：九九が40%、2桁×1桁が40%、2桁×2桁が20%
      3: { 1: 40, 2: 40, 3: 20 },
      // フロア4：九九が25%、2桁×1桁が45%、2桁×2桁が30%
      4: { 1: 25, 2: 45, 3: 30 }
    };
    return tierProbs[floor] || tierProbs[4];
  }

  /**
   * ランダムに掛け算問題を1つ取得（フロア難易度ティア抽選＋学習履歴重み付き）
   * @param {number} floor - 現在のフロア番号（1-3）
   * @param {Object} weights - 問題IDをキー、スペースドレップ重みを値とするオブジェクト
   * @param {Array} excludeIds - 除外する問題ID
   * @returns {Object} 選択された問題
   */
  getWeightedRandomWord(floor, weights = {}, excludeIds = []) {
    const probs = this.getFloorTierProbabilities(floor);

    // 1. まずフロア別の確率で難易度ティア（1, 2, 3）を決定
    const totalProb = (probs[1] || 0) + (probs[2] || 0) + (probs[3] || 0);
    let tierRoll = Math.random() * totalProb;
    let selectedDifficulty = 1;
    for (const diff of [1, 2, 3]) {
      tierRoll -= (probs[diff] || 0);
      if (tierRoll <= 0) {
        selectedDifficulty = diff;
        break;
      }
    }

    // 2. 選ばれた難易度の問題プールからスペースドレップ重みで抽選
    let candidates = this.words.filter(
      w => w.difficulty === selectedDifficulty && !excludeIds.includes(w.id)
    );
    if (candidates.length === 0) {
      candidates = this.words.filter(w => !excludeIds.includes(w.id));
    }
    if (candidates.length === 0) return null;

    const weightedList = candidates.map(w => ({
      word: w,
      weight: weights[w.id] || 1
    }));

    const totalWeight = weightedList.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;

    for (const item of weightedList) {
      random -= item.weight;
      if (random <= 0) return item.word;
    }

    return candidates[candidates.length - 1];
  }

  /**
   * もっともらしい誤答選択肢（ひっかけ数値）を3つ生成
   * @param {Object} problem - 正解の問題オブジェクト
   * @returns {Array<number>} 誤答数値3つの配列
   */
  generateDistractors(problem) {
    const { factorA: a, factorB: b, answerValue: correct } = problem;
    const candidateSet = new Set();

    // 1. 段の前後ミス: (a±1)×b, a×(b±1)
    if (a > 1) candidateSet.add((a - 1) * b);
    if (a < 19) candidateSet.add((a + 1) * b);
    if (b > 1) candidateSet.add(a * (b - 1));
    if (b < 19) candidateSet.add(a * (b + 1));

    // 2. 繰り上がりミス（一の位が同じ ±10, ±20）
    if (correct > 10) candidateSet.add(correct - 10);
    candidateSet.add(correct + 10);
    if (correct > 20) candidateSet.add(correct - 20);
    candidateSet.add(correct + 20);

    // 3. 近い値（±a, ±b, ±2〜±8）
    for (const delta of [-6, -4, -3, -2, -1, 1, 2, 3, 4, 6, 8, -8]) {
      if (correct + delta > 0) {
        candidateSet.add(correct + delta);
      }
    }

    // 4. 十の位と一の位の入れ替え（2桁以上の場合）
    if (correct >= 12 && correct < 100) {
      const tens = Math.floor(correct / 10);
      const ones = correct % 10;
      if (ones !== 0 && tens !== ones) {
        candidateSet.add(ones * 10 + tens);
      }
    }

    // 正解自身と0以下を除外
    candidateSet.delete(correct);
    const validCandidates = [...candidateSet].filter(n => n > 0 && n !== correct);

    // シャッフルして3つ選ぶ（一の位が同じ候補を最低1つ混ぜると計算練習効果が高い）
    const sameUnitDigits = validCandidates.filter(n => n % 10 === correct % 10);
    const otherCandidates = validCandidates.filter(n => n % 10 !== correct % 10);

    sameUnitDigits.sort(() => Math.random() - 0.5);
    otherCandidates.sort(() => Math.random() - 0.5);

    const selected = [];
    if (sameUnitDigits.length > 0 && correct >= 20) {
      selected.push(sameUnitDigits[0]);
    }
    for (const num of [...otherCandidates, ...sameUnitDigits.slice(1)]) {
      if (selected.length >= 3) break;
      if (!selected.includes(num)) {
        selected.push(num);
      }
    }

    // 万が一足りない場合のフォールバック
    let fallbackOffset = 1;
    while (selected.length < 3) {
      const candidate = correct + fallbackOffset;
      if (candidate !== correct && !selected.includes(candidate)) {
        selected.push(candidate);
      }
      fallbackOffset++;
    }

    return selected;
  }

  /**
   * 4択問題を生成
   * @param {Object} correctProblem - 正解の掛け算問題オブジェクト
   * @returns {Object} 問題データ { question, choices, correctIndex, word, type }
   */
  generateQuestion(correctProblem) {
    const distractors = this.generateDistractors(correctProblem);
    const allNumericChoices = [...distractors, correctProblem.answerValue].sort(() => Math.random() - 0.5);
    const correctIndex = allNumericChoices.findIndex(v => v === correctProblem.answerValue);

    return {
      question: `${correctProblem.factorA} × ${correctProblem.factorB}`,
      questionEmoji: correctProblem.emoji,
      choices: allNumericChoices.map(v => String(v)),
      correctIndex,
      word: correctProblem,
      type: 'math_choice',
      twoDigitCount: correctProblem.twoDigitCount,
      powerMultiplier: correctProblem.powerMultiplier
    };
  }

  /**
   * タイピング（数値入力）問題を生成
   * @param {Object} correctProblem - 正解の掛け算問題オブジェクト
   * @returns {Object} 問題データ
   */
  generateTypingQuestion(correctProblem) {
    const answerStr = String(correctProblem.answerValue);
    return {
      question: `${correctProblem.factorA} × ${correctProblem.factorB}`,
      questionEmoji: correctProblem.emoji,
      answer: answerStr,
      aliases: [],
      hint: `${answerStr.length}けたの数`,
      word: correctProblem,
      type: 'typing',
      twoDigitCount: correctProblem.twoDigitCount,
      powerMultiplier: correctProblem.powerMultiplier
    };
  }
}
