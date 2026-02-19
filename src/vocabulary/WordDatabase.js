// 英単語データベース管理
// 単語の検索、フィルタリング、問題生成を担当する
import wordData from './words.json';

export class WordDatabase {
  constructor() {
    /** 全単語データ */
    this.words = wordData.words;
    /** カテゴリ一覧 */
    this.categories = [...new Set(this.words.map(w => w.category))];
  }

  /**
   * 難易度でフィルタリングした単語を取得
   * @param {number} maxDifficulty - 最大難易度（1-3）
   * @returns {Array} フィルタリングされた単語配列
   */
  getWordsByDifficulty(maxDifficulty) {
    return this.words.filter(w => w.difficulty <= maxDifficulty);
  }

  /**
   * カテゴリでフィルタリング
   * @param {string} category - カテゴリ名
   * @returns {Array} フィルタリングされた単語配列
   */
  getWordsByCategory(category) {
    return this.words.filter(w => w.category === category);
  }

  /**
   * ランダムに単語を1つ取得（重み付き）
   * @param {number} maxDifficulty - 最大難易度
   * @param {Object} weights - 単語IDをキー、重みを値とするオブジェクト
   * @param {Array} excludeIds - 除外する単語ID
   * @returns {Object} 選択された単語
   */
  getWeightedRandomWord(maxDifficulty, weights = {}, excludeIds = []) {
    const candidates = this.getWordsByDifficulty(maxDifficulty)
      .filter(w => !excludeIds.includes(w.id));

    if (candidates.length === 0) return null;

    // 重み付きランダム選択
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
   * 4択問題を生成
   * @param {Object} correctWord - 正解の単語オブジェクト
   * @param {string} questionType - 出題タイプ（'en_to_jp' or 'jp_to_en'）
   * @returns {Object} 問題データ { question, choices, correctIndex, word }
   */
  generateQuestion(correctWord, questionType = 'en_to_jp') {
    // 同じカテゴリから誤答候補を取得
    let wrongCandidates = this.words.filter(
      w => w.id !== correctWord.id && w.category === correctWord.category
    );

    // 候補が足りない場合は他のカテゴリからも取得
    if (wrongCandidates.length < 3) {
      const otherWords = this.words.filter(
        w => w.id !== correctWord.id && w.category !== correctWord.category
      );
      wrongCandidates = [...wrongCandidates, ...otherWords];
    }

    // ランダムに3つ選択
    const shuffled = wrongCandidates.sort(() => Math.random() - 0.5);
    const wrongChoices = shuffled.slice(0, 3);

    // 正解を含む4択を作成してシャッフル
    const allChoices = [...wrongChoices, correctWord].sort(() => Math.random() - 0.5);
    const correctIndex = allChoices.findIndex(c => c.id === correctWord.id);

    if (questionType === 'en_to_jp') {
      return {
        question: correctWord.english,
        questionEmoji: correctWord.emoji,
        choices: allChoices.map(c => c.japanese),
        correctIndex,
        word: correctWord,
        type: questionType
      };
    } else {
      return {
        question: correctWord.japanese,
        questionEmoji: correctWord.emoji,
        choices: allChoices.map(c => c.english),
        correctIndex,
        word: correctWord,
        type: questionType
      };
    }
  }

  /**
   * タイピング問題を生成
   * @param {Object} correctWord - 正解の単語オブジェクト
   * @returns {Object} 問題データ
   */
  generateTypingQuestion(correctWord) {
    return {
      question: correctWord.japanese,
      questionEmoji: correctWord.emoji,
      answer: correctWord.english.toLowerCase(),
      hint: correctWord.english[0] + '_'.repeat(correctWord.english.length - 1),
      word: correctWord,
      type: 'typing'
    };
  }
}
