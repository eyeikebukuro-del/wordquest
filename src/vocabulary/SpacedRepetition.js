// 間隔反復学習システム
// 間違えた単語の出題頻度を上げ、正答単語の頻度を下げる

const STORAGE_KEY = 'wordquest_learning_data';

export class SpacedRepetition {
    constructor() {
        /** 各単語の学習データ { wordId: { correct, incorrect, weight, lastSeen } } */
        this.learningData = this.load();
    }

    /**
     * LocalStorageからデータを読み込む
     * @returns {Object} 学習データ
     */
    load() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : {};
        } catch {
            return {};
        }
    }

    /**
     * LocalStorageにデータを保存
     */
    save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.learningData));
        } catch {
            // ストレージ容量オーバー時は古いデータを削除
            console.warn('ストレージ容量不足。古いデータを整理中...');
        }
    }

    /**
     * 正答を記録
     * @param {number} wordId - 単語ID
     */
    recordCorrect(wordId) {
        if (!this.learningData[wordId]) {
            this.learningData[wordId] = { correct: 0, incorrect: 0, weight: 1, lastSeen: 0 };
        }
        const data = this.learningData[wordId];
        data.correct++;
        // 重みを下げる（最低0.3）- 正答が増えるほど出題されにくくなる
        data.weight = Math.max(0.3, data.weight * 0.7);
        data.lastSeen = Date.now();
        this.save();
    }

    /**
     * 誤答を記録
     * @param {number} wordId - 単語ID
     */
    recordIncorrect(wordId) {
        if (!this.learningData[wordId]) {
            this.learningData[wordId] = { correct: 0, incorrect: 0, weight: 1, lastSeen: 0 };
        }
        const data = this.learningData[wordId];
        data.incorrect++;
        // 重みを上げる（最大5.0）- 間違えるほど出題されやすくなる
        data.weight = Math.min(5.0, data.weight * 1.8);
        data.lastSeen = Date.now();
        this.save();
    }

    /**
     * 全単語の出題重みを取得
     * @returns {Object} { wordId: weight }
     */
    getWeights() {
        const weights = {};
        for (const [id, data] of Object.entries(this.learningData)) {
            weights[parseInt(id)] = data.weight;
        }
        return weights;
    }

    /**
     * 弱点単語リスト取得（重みが高い順）
     * @param {number} limit - 取得件数
     * @returns {Array} 弱点単語IDの配列
     */
    getWeakWords(limit = 10) {
        return Object.entries(this.learningData)
            .filter(([, data]) => data.weight > 1.5)
            .sort(([, a], [, b]) => b.weight - a.weight)
            .slice(0, limit)
            .map(([id]) => parseInt(id));
    }

    /**
     * 学習統計を取得
     * @returns {Object} 統計データ
     */
    getStats() {
        const entries = Object.values(this.learningData);
        const totalCorrect = entries.reduce((sum, d) => sum + d.correct, 0);
        const totalIncorrect = entries.reduce((sum, d) => sum + d.incorrect, 0);
        const wordsLearned = entries.filter(d => d.correct >= 3 && d.weight < 1.0).length;
        const weakWords = entries.filter(d => d.weight > 1.5).length;

        return {
            totalCorrect,
            totalIncorrect,
            accuracy: totalCorrect + totalIncorrect > 0
                ? Math.round(totalCorrect / (totalCorrect + totalIncorrect) * 100)
                : 0,
            wordsLearned,
            weakWords,
            totalAttempted: entries.length
        };
    }

    /**
     * 学習データをリセット
     */
    reset() {
        this.learningData = {};
        this.save();
    }
}
