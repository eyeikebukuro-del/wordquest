// セーブマネージャー＆オンラインランキング管理
// ゲームデータのLocalStorage保存およびクラウドリーダーボード同期を管理する

import { CARD_DEFINITIONS } from '../game/CardSystem.js';

const SAVE_KEY = 'wordquest_save';
const BEST_KEY = 'wordquest_best';
const LB_CACHE_KEY = 'wordquest_online_lb_cache_v3';
const PLAYER_NAME_KEY = 'wordquest_player_name';
const MY_BEST_ENTRY_KEY = 'wordquest_my_best_entry_v3';

// クラウド同期エンドポイント（CORS対応・認証不要の公開リーダーボードチャネル）
const NTFY_TOPIC_URL = 'https://ntfy.sh/wordquest_prod_lb_v3_iszk';
const KV_APP_KEY = 'ehjyh4v4';
const KV_BASE_URL = `https://keyvalue.immanuel.co/api/KeyVal`;
const CARD_KEY_LIST = Object.keys(CARD_DEFINITIONS);

/**
 * プレイヤー名から危険なHTML記号を除去して安全化する
 */
export function sanitizePlayerName(rawName) {
    const cleaned = String(rawName || '')
        .replace(/[<>&"'`/\\]/g, '')
        .trim()
        .slice(0, 10);
    return cleaned || 'ななしの冒険者';
}

function toBase64Url(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(b64) {
    const padded = b64.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(padded);
    const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
}

function encodeCompactSlot(entry) {
    const charCode = entry.characterId === 'mathmaster' ? 1 : entry.characterId === 'kungfumaster' ? 2 : 0;
    const compactDeck = (entry.deck || []).slice(0, 5).map(d => [
        Math.max(0, CARD_KEY_LIST.indexOf(d.id)),
        d.level || 1,
        d.count || 1
    ]);
    return toBase64Url(JSON.stringify({
        i: String(entry.id || '').slice(0, 10),
        n: sanitizePlayerName(entry.name).slice(0, 8),
        c: charCode,
        a: entry.ascensionLevel || 0,
        s: entry.score || 0,
        d: entry.date || '',
        k: compactDeck
    }));
}

function decodeCompactSlot(b64) {
    try {
        const clean = String(b64 || '').replace(/[^A-Za-z0-9_-]/g, '');
        if (!clean || clean === 'null') return null;
        const obj = JSON.parse(fromBase64Url(clean));
        if (!obj || typeof obj.s !== 'number' || !obj.i) return null;
        const charMap = [
            { id: 'wordmaster', name: 'ワードマスター', emoji: '🧙‍♂️' },
            { id: 'mathmaster', name: '算術マスター', emoji: '🧮' },
            { id: 'kungfumaster', name: 'カンフーマスター', emoji: '🥋' }
        ];
        const ch = charMap[obj.c] || charMap[0];
        const deck = Array.isArray(obj.k) ? obj.k.map(([idx, lvl, cnt]) => {
            const cid = CARD_KEY_LIST[idx] || 'slash';
            const def = CARD_DEFINITIONS[cid] || { name: cid, emoji: '🃏', rarity: 'common' };
            return {
                id: cid,
                name: def.name,
                emoji: def.emoji || '🃏',
                level: lvl || 1,
                rarity: def.rarity || 'common',
                count: cnt || 1
            };
        }) : [];
        return {
            id: obj.i,
            name: sanitizePlayerName(obj.n),
            characterId: ch.id,
            character: ch.name,
            emoji: ch.emoji,
            ascensionLevel: obj.a || 0,
            score: obj.s,
            date: obj.d || '',
            deck,
            relics: []
        };
    } catch {
        return null;
    }
}

/**
 * 初期ベンチマークランカー（リセット済み・空配列）
 */
const INITIAL_BENCHMARK_ENTRIES = [];

/**
 * 現在日付を YYYY/MM/DD 形式で返す
 * @param {number} [ts] - タイムスタンプ
 * @returns {string} YYYY/MM/DD
 */
export function formatDateYMD(ts = Date.now()) {
    const d = new Date(ts);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}/${mm}/${dd}`;
}

/**
 * プレイヤーデッキを集計してランキング保存用の配列に変換する
 * @param {Array} playerDeck - カードインスタンス配列
 * @returns {Array} [{ id, name, emoji, level, rarity, count }, ...]
 */
export function summarizeDeck(playerDeck = []) {
    const map = new Map();
    for (const card of playerDeck) {
        if (!card) continue;
        const key = `${card.id}_${card.level || 1}`;
        if (map.has(key)) {
            map.get(key).count++;
        } else {
            map.set(key, {
                id: card.id,
                name: card.name,
                emoji: card.emoji || '🃏',
                level: card.level || 1,
                rarity: card.rarity || 'common',
                count: 1
            });
        }
    }
    const rarityScore = { rare: 3, uncommon: 2, common: 1 };
    return Array.from(map.values()).sort((a, b) => {
        const rDiff = (rarityScore[b.rarity] || 1) - (rarityScore[a.rarity] || 1);
        if (rDiff !== 0) return rDiff;
        if (b.level !== a.level) return b.level - a.level;
        return b.count - a.count;
    });
}

export class SaveManager {
    /**
     * 前回入力したプレイヤー名を取得
     */
    getPlayerName() {
        try {
            return localStorage.getItem(PLAYER_NAME_KEY) || '';
        } catch {
            return '';
        }
    }

    /**
     * プレイヤー名を保存
     */
    savePlayerName(name) {
        try {
            localStorage.setItem(PLAYER_NAME_KEY, name);
        } catch {
            // 無視
        }
    }

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
     * 進行中の冒険データをセーブ（中断セーブ＆オートセーブ用）
     * @param {Object} runState - 現在のラン状態
     */
    saveActiveRun(runState) {
        try {
            localStorage.setItem(SAVE_KEY, JSON.stringify({
                ...runState,
                savedAt: Date.now()
            }));
        } catch {
            // ストレージ容量超過等は無視
        }
    }

    /**
     * 中断セーブデータを読み込む
     * @returns {Object|null} 保存されたラン状態
     */
    loadActiveRun() {
        try {
            const raw = localStorage.getItem(SAVE_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed || !parsed.player || !parsed.maps) return null;
            return parsed;
        } catch {
            return null;
        }
    }

    /**
     * 中断セーブデータが存在するか
     * @returns {boolean}
     */
    hasActiveRun() {
        return Boolean(this.loadActiveRun());
    }

    /**
     * 中断セーブデータを削除（ゲームオーバー・クリア時）
     */
    clearActiveRun() {
        try {
            localStorage.removeItem(SAVE_KEY);
        } catch {
            // 無視
        }
    }

    /**
     * ローカルキャッシュされた全ランキングエントリーを取得
     */
    getCachedEntries() {
        try {
            const raw = localStorage.getItem(LB_CACHE_KEY);
            const cached = raw ? JSON.parse(raw) : [];
            return this.mergeEntries(INITIAL_BENCHMARK_ENTRIES, cached);
        } catch {
            return [...INITIAL_BENCHMARK_ENTRIES];
        }
    }

    /**
     * エントリー配列を重複排除してスコア降順でマージする
     */
    mergeEntries(...lists) {
        const byId = new Map();
        for (const list of lists) {
            if (!Array.isArray(list)) continue;
            for (const item of list) {
                if (!item || typeof item.score !== 'number') continue;
                const id = item.id || `${item.name}_${item.score}_${item.date || ''}`;
                const normalized = {
                    ...item,
                    id,
                    date: item.date || formatDateYMD(item.timestamp || Date.now()),
                    deck: Array.isArray(item.deck) ? item.deck : [],
                    relics: Array.isArray(item.relics) ? item.relics : []
                };
                if (!byId.has(id) || byId.get(id).score < normalized.score) {
                    byId.set(id, normalized);
                }
            }
        }
        return Array.from(byId.values())
            .sort((a, b) => b.score - a.score || (a.timestamp || 0) - (b.timestamp || 0))
            .slice(0, 200);
    }

    /**
     * 自分の自己ベストエントリーを取得
     */
    getMyBestEntry() {
        try {
            const raw = localStorage.getItem(MY_BEST_ENTRY_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    /**
     * 自分の自己ベストエントリーを更新
     */
    saveMyBestEntry(entry) {
        try {
            const current = this.getMyBestEntry();
            if (!current || entry.score >= current.score) {
                localStorage.setItem(MY_BEST_ENTRY_KEY, JSON.stringify(entry));
            }
        } catch {
            // 無視
        }
    }

    /**
     * オンラインランキングにスコア・名前・キャラ・デッキ構成・日付を送信
     * @param {Object} entryData - 送信するスコアデータ
     * @returns {Promise<{ entries: Array, myRank: number, totalPlayers: number, entry: Object }>}
     */
    async submitOnlineScore(entryData) {
        const now = Date.now();
        const cleanName = sanitizePlayerName(entryData.name);
        this.savePlayerName(cleanName);

        // 重複排除でクラウド・ローカル共通になる8文字のユニークIDを生成
        const shortId = entryData.id || `w${(now % 10000000).toString(36)}${Math.random().toString(36).slice(2, 5)}`;

        const entry = {
            id: shortId,
            name: cleanName,
            characterId: entryData.characterId || 'wordmaster',
            character: entryData.character || 'ワードマスター',
            emoji: entryData.emoji || '🧙‍♂️',
            ascensionLevel: entryData.ascensionLevel || 0,
            score: Number(entryData.score) || 0,
            bossName: entryData.bossName || 'ボス',
            date: entryData.date || formatDateYMD(now),
            timestamp: now,
            relics: entryData.relics || [],
            deck: entryData.deck || [],
            isMine: true
        };

        // 1. ローカルキャッシュ＆自己ベストに即座に保存
        this.saveMyBestEntry(entry);
        let merged = this.mergeEntries(this.getCachedEntries(), [entry]);
        try {
            localStorage.setItem(LB_CACHE_KEY, JSON.stringify(merged));
        } catch {
            // 無視
        }

        // テストモード（9999ダメージ等）使用時は本番クラウドを汚染しないようローカル反映のみにする
        if (entryData.isTestMode) {
            return this.fetchOnlineLeaderboard(entry);
        }

        // 2. クラウドストリーム（ntfy.sh）へ非同期POST
        try {
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), 3500);
            await fetch(NTFY_TOPIC_URL, {
                method: 'POST',
                body: JSON.stringify(entry),
                signal: ctrl.signal
            });
            clearTimeout(timer);
        } catch {
            // オフライン時はローカルキャッシュで継続
        }

        // 3. 最新のオンラインランキングを取得して順位を算出
        const onlineData = await this.fetchOnlineLeaderboard(entry);

        // 4. 永続クラウドスロット（TOP10全員分 wq_v3_p10_0〜wq_v3_p10_9）をバックグラウンドで同期更新
        if (onlineData.myRank && onlineData.myRank <= 10) {
            const top10ToSync = (onlineData.top10 || []).slice(0, 10);
            top10ToSync.forEach((item, idx) => {
                const encoded = encodeCompactSlot(item);
                fetch(`${KV_BASE_URL}/UpdateValue/${KV_APP_KEY}/wq_v3_p10_${idx}/${encoded}`, {
                    method: 'POST'
                }).catch(() => {});
            });
        }

        return onlineData;
    }

    /**
     * オンラインランキングを取得し、TOP10と自分の現在順位を返す
     * @param {Object|null} [targetEntry] - 順位を特定したいエントリー（省略時は自己ベスト）
     * @returns {Promise<{ top10: Array, entries: Array, myRank: number|null, myEntry: Object|null, totalPlayers: number }>}
     */
    async fetchOnlineLeaderboard(targetEntry = null) {
        const localEntries = this.getCachedEntries();
        let cloudEntries = [];

        try {
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), 3500);
            const [ntfyRes, ...slotResponses] = await Promise.allSettled([
                fetch(`${NTFY_TOPIC_URL}/json?poll=1&since=0`, { signal: ctrl.signal }),
                ...Array.from({ length: 10 }, (_, i) =>
                    fetch(`${KV_BASE_URL}/GetValue/${KV_APP_KEY}/wq_v3_p10_${i}`, { signal: ctrl.signal })
                )
            ]);
            clearTimeout(timer);

            if (ntfyRes.status === 'fulfilled' && ntfyRes.value.ok) {
                const text = await ntfyRes.value.text();
                const lines = text.split(/\r?\n/).filter(Boolean);
                for (const line of lines) {
                    try {
                        const evt = JSON.parse(line);
                        if (evt && evt.event === 'message' && evt.message) {
                            const parsed = JSON.parse(evt.message);
                            if (parsed && typeof parsed.score === 'number') {
                                cloudEntries.push(parsed);
                            }
                        }
                    } catch {
                        // 個別行のパースエラーは無視
                    }
                }
            }

            for (const sr of slotResponses) {
                if (sr.status === 'fulfilled' && sr.value.ok) {
                    try {
                        const rawSlot = await sr.value.text();
                        const decoded = decodeCompactSlot(rawSlot);
                        if (decoded) cloudEntries.push(decoded);
                    } catch {
                        // 無視
                    }
                }
            }
        } catch {
            // ネットワークエラー時はローカルキャッシュを使用
        }

        const myBest = targetEntry || this.getMyBestEntry();
        const extra = myBest ? [myBest] : [];
        const allEntries = this.mergeEntries(localEntries, cloudEntries, extra);

        // 自分のエントリーに isMine フラグを付与
        const myId = myBest ? myBest.id : null;
        for (const item of allEntries) {
            if (myId && item.id === myId) {
                item.isMine = true;
            }
        }

        try {
            localStorage.setItem(LB_CACHE_KEY, JSON.stringify(allEntries));
        } catch {
            // 無視
        }

        let myRank = null;
        let myEntry = null;
        if (myBest) {
            const idx = allEntries.findIndex(e => e.id === myBest.id);
            if (idx !== -1) {
                myRank = idx + 1;
                myEntry = allEntries[idx];
            }
        }

        return {
            top10: allEntries.slice(0, 10),
            entries: allEntries,
            myRank,
            myEntry,
            totalPlayers: allEntries.length
        };
    }

    /**
     * 後方互換用：ローカルリーダーボード取得
     */
    getLeaderboard() {
        return this.getCachedEntries().slice(0, 10);
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

