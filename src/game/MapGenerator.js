// マップ生成システム
// ローグライク型の階層マップを自動生成する

/**
 * ノードタイプ定義
 */
export const NODE_TYPES = {
    BATTLE: 'battle',
    ELITE: 'elite',
    BURNING_ELITE: 'burning_elite',
    TREASURE: 'treasure',
    SHOP: 'shop',
    REST: 'rest',
    EVENT: 'event',
    BOSS: 'boss',
    START: 'start'
};

/**
 * フロアテーマ定義
 */
export const FLOOR_THEMES = {
    1: { name: 'まよいの森', emoji: '🌲', color: '#27ae60', bgGradient: 'linear-gradient(180deg, #1a3a1a 0%, #0d1f0d 100%)' },
    2: { name: 'やみの洞窟', emoji: '🕳️', color: '#8e44ad', bgGradient: 'linear-gradient(180deg, #2d1b4e 0%, #1a0d2e 100%)' },
    3: { name: '知恵の塔', emoji: '🏰', color: '#e74c3c', bgGradient: 'linear-gradient(180deg, #4a1a1a 0%, #2d0d0d 100%)' },
    4: { name: '天空の聖域', emoji: '🌌', color: '#3498db', bgGradient: 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)' }
};

/**
 * ノードタイプごとのアイコン
 */
export const NODE_ICONS = {
    [NODE_TYPES.BATTLE]: '⚔️',
    [NODE_TYPES.ELITE]: '💀',
    [NODE_TYPES.BURNING_ELITE]: '🔥',
    [NODE_TYPES.TREASURE]: '💎',
    [NODE_TYPES.SHOP]: '🛒',
    [NODE_TYPES.REST]: '🏕️',
    [NODE_TYPES.EVENT]: '❓',
    [NODE_TYPES.BOSS]: '👑',
    [NODE_TYPES.START]: '🚩'
};

/**
 * マップを生成する
 * @param {number} floor - フロア番号（1-3）
 * @returns {Object} マップデータ { nodes, connections, floor, theme }
 */
export function generateMap(floor) {
    const theme = FLOOR_THEMES[floor];
    const layers = 6; // 開始 + 4中間 + ボス
    const nodesPerLayer = 3;
    const nodes = [];
    const connections = [];

    // 開始ノード
    nodes.push({
        id: 'start',
        type: NODE_TYPES.START,
        layer: 0,
        position: 1,
        visited: true,
        available: false,
        x: 0.5,
        y: 0
    });

    // 中間層ノード生成
    for (let layer = 1; layer < layers - 1; layer++) {
        // この層のノード数（2-3）
        const count = Math.random() > 0.4 ? 3 : 2;
        const types = generateLayerTypes(layer, layers);

        for (let pos = 0; pos < count; pos++) {
            const type = types[pos % types.length];
            const nodeId = `node_${layer}_${pos}`;
            nodes.push({
                id: nodeId,
                type,
                layer,
                position: pos,
                visited: false,
                available: false,
                x: (pos + 0.5) / count,
                y: layer / (layers - 1)
            });
        }
    }

    // ボスノード
    nodes.push({
        id: 'boss',
        type: NODE_TYPES.BOSS,
        layer: layers - 1,
        position: 0,
        visited: false,
        available: false,
        x: 0.5,
        y: 1.0
    });

    // 接続を生成
    for (let layer = 0; layer < layers - 1; layer++) {
        const currentLayerNodes = nodes.filter(n => n.layer === layer);
        const nextLayerNodes = nodes.filter(n => n.layer === layer + 1);

        for (const current of currentLayerNodes) {
            // 各ノードから最低1つ、最大2つの接続
            const maxConnections = Math.min(2, nextLayerNodes.length);
            const numConnections = Math.max(1, Math.floor(Math.random() * maxConnections) + 1);

            // 位置の近いノードを優先して接続
            const sorted = [...nextLayerNodes].sort((a, b) =>
                Math.abs(a.x - current.x) - Math.abs(b.x - current.x)
            );

            for (let i = 0; i < numConnections; i++) {
                const target = sorted[i];
                const connId = `${current.id}->${target.id}`;
                if (!connections.find(c => c.id === connId)) {
                    connections.push({
                        id: connId,
                        from: current.id,
                        to: target.id
                    });
                }
            }
        }

        // 全ての次層ノードが接続されているか確認
        for (const next of nextLayerNodes) {
            const hasIncoming = connections.some(c => c.to === next.id);
            if (!hasIncoming) {
                // 最も近い現在層ノードから接続
                const closest = currentLayerNodes.reduce((best, n) =>
                    Math.abs(n.x - next.x) < Math.abs(best.x - next.x) ? n : best
                );
                connections.push({
                    id: `${closest.id}->${next.id}`,
                    from: closest.id,
                    to: next.id
                });
            }
        }
    }

    // 開始ノードから到達可能なノードを available に設定
    const startConnections = connections.filter(c => c.from === 'start');
    for (const conn of startConnections) {
        const node = nodes.find(n => n.id === conn.to);
        if (node) node.available = true;
    }

    return { nodes, connections, floor, theme };
}

/**
 * 層のノードタイプを決定
 * @param {number} layer - 層番号
 * @param {number} totalLayers - 全体の層数
 * @returns {Array} ノードタイプの配列
 */
function generateLayerTypes(layer, totalLayers) {
    const midPoint = Math.floor(totalLayers / 2);

    if (layer === 1) {
        // 最初の層は通常バトルのみ
        return [NODE_TYPES.BATTLE, NODE_TYPES.BATTLE, NODE_TYPES.BATTLE];
    }

    if (layer === totalLayers - 2) {
        // ボス前は休憩 + ショップ
        return [NODE_TYPES.REST, NODE_TYPES.SHOP, NODE_TYPES.BATTLE];
    }

    // 中間層はランダム（重み付き）
    const pool = [];
    const weights = {
        [NODE_TYPES.BATTLE]: 40,
        [NODE_TYPES.ELITE]: layer >= midPoint ? 20 : 10,
        [NODE_TYPES.SHOP]: 15,
        [NODE_TYPES.REST]: 15,
        [NODE_TYPES.EVENT]: 10
    };

    // ランダムにタイプを選択
    const types = [];
    for (let i = 0; i < 3; i++) {
        const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
        let r = Math.random() * totalWeight;
        for (const [type, weight] of Object.entries(weights)) {
            r -= weight;
            if (r <= 0) {
                types.push(type);
                break;
            }
        }
    }

    // 同じタイプが3つにならないようにする
    if (types.every(t => t === types[0])) {
        types[1] = NODE_TYPES.BATTLE;
    }

    // 第2層には必ず1つ「💎 宝箱（レリック確定）」ノードを配置（ノード数が2個の場合でも確実に出るよう0または1番目に配置）
    if (layer === 2) {
        types[Math.floor(Math.random() * 2)] = NODE_TYPES.TREASURE;
    }

    // 第3層には必ず1つ「🔥 強敵エリート（レアカード＆レリック確定のハイリスク・ハイリターン）」ノードを配置
    if (layer === 3) {
        types[Math.floor(Math.random() * 2)] = NODE_TYPES.BURNING_ELITE;
    }

    return types;
}

/**
 * ノード訪問時に次のノードを available にする
 * @param {Object} map - マップデータ
 * @param {string} nodeId - 訪問ノードID
 */
export function visitNode(map, nodeId) {
    const node = map.nodes.find(n => n.id === nodeId);
    if (!node) return;

    node.visited = true;
    node.available = false;

    // 同じ層の他のノードをunavailableに
    map.nodes.forEach(n => {
        if (n.layer === node.layer && n.id !== nodeId) {
            n.available = false;
        }
    });

    // 次の層のノードをavailableに
    const outgoing = map.connections.filter(c => c.from === nodeId);
    for (const conn of outgoing) {
        const target = map.nodes.find(n => n.id === conn.to);
        if (target && !target.visited) {
            target.available = true;
        }
    }
}
