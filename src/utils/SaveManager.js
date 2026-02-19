// セーブマネージャー
// ゲームデータのLocalStorageへの保存/読み込みを管理

const SAVE_KEY = 'wordquest_save';
const BEST_KEY = 'wordquest_best';

export class SaveManager {
    /**
     * ゲームプレイの最高記録を保存
     * @param {Object} stats - 統計データ
     */
    saveBestRun(stats) {
        try {
            const current = this.loadBestRun();
            const updated = {
                floorsCleared: Math.max(current.floorsCleared || 0, stats.floorsCleared || 0),
                maxCombo: Math.max(current.maxCombo || 0, stats.maxCombo || 0),
                totalBattlesWon: (current.totalBattlesWon || 0) + (stats.battlesWon || 0),
                totalRuns: (current.totalRuns || 0) + 1,
                lastPlayed: Date.now()
            };
            localStorage.setItem(BEST_KEY, JSON.stringify(updated));
        } catch {
            // ストレージエラー無視
        }
    }

    /**
     * 最高記録を読み込み
     * @returns {Object} 最高記録データ
     */
    loadBestRun() {
        try {
            const data = localStorage.getItem(BEST_KEY);
            return data ? JSON.parse(data) : {};
        } catch {
            return {};
        }
    }

    /**
     * 全データをクリア
     */
    clearAll() {
        try {
            localStorage.removeItem(SAVE_KEY);
            localStorage.removeItem(BEST_KEY);
        } catch {
            // ストレージエラー無視
        }
    }
}
