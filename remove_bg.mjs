// ボス画像の残りチェッカーボード模様を追加除去するスクリプト
import { Jimp } from 'jimp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHARACTERS_DIR = path.join(__dirname, 'public', 'characters');

/**
 * 改良版: フラッドフィル + チェッカーボードパターン検出で背景を完全に除去
 */
async function removeBackground(imagePath) {
    console.log(`処理中: ${imagePath}`);
    const image = await Jimp.read(imagePath);
    const w = image.width;
    const h = image.height;

    // より厳密なチェッカーボード検出
    // チェッカーボードは通常 8x8 or 16x16 の白/灰色の交互パターン
    function isCheckerboardOrBg(x, y) {
        const color = image.getPixelColor(x, y);
        const r = (color >> 24) & 0xFF;
        const g = (color >> 16) & 0xFF;
        const b = (color >> 8) & 0xFF;
        const a = color & 0xFF;

        if (a < 10) return true; // 既に透明

        // 彩度をチェック（無彩色=グレー系かどうか）
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const saturation = max === 0 ? 0 : (max - min) / max;

        // 無彩色で明るめのグレー〜白
        if (saturation < 0.08 && min > 140) return true;

        return false;
    }

    // BFS型フラッドフィル
    const visited = new Uint8Array(w * h);
    const queue = [];

    // 四辺からスタート
    for (let x = 0; x < w; x++) {
        queue.push(x * 1000000 + 0);          // (x, 0)
        queue.push(x * 1000000 + (h - 1));     // (x, h-1)
    }
    for (let y = 0; y < h; y++) {
        queue.push(0 * 1000000 + y);            // (0, y)
        queue.push((w - 1) * 1000000 + y);      // (w-1, y)
    }

    let transparentCount = 0;

    while (queue.length > 0) {
        const encoded = queue.shift();
        const x = Math.floor(encoded / 1000000);
        const y = encoded % 1000000;

        if (x < 0 || x >= w || y < 0 || y >= h) continue;
        const idx = y * w + x;
        if (visited[idx]) continue;
        visited[idx] = 1;

        if (!isCheckerboardOrBg(x, y)) continue;

        // 背景ピクセルを透明にする
        image.setPixelColor(0x00000000, x, y);
        transparentCount++;

        // 隣接ピクセルをキューに追加
        queue.push((x + 1) * 1000000 + y);
        queue.push((x - 1) * 1000000 + y);
        queue.push(x * 1000000 + (y + 1));
        queue.push(x * 1000000 + (y - 1));
    }

    console.log(`  → ${transparentCount}ピクセルを透過化`);

    // エッジの半透明化（アンチエイリアス改善）
    // キャラクターの境界にある明るいピクセルを半透明にする
    let edgeCount = 0;
    for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
            const color = image.getPixelColor(x, y);
            const a = color & 0xFF;
            if (a === 0) continue; // 既に透明

            const r = (color >> 24) & 0xFF;
            const g = (color >> 16) & 0xFF;
            const b = (color >> 8) & 0xFF;

            // 隣接ピクセルに透明がいくつあるか数える
            let transparentNeighbors = 0;
            for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
                const nc = image.getPixelColor(x + dx, y + dy);
                if ((nc & 0xFF) === 0) transparentNeighbors++;
            }

            // 境界ピクセルで、かつ明るいグレー系なら半透明にする
            if (transparentNeighbors >= 2) {
                const max = Math.max(r, g, b);
                const min = Math.min(r, g, b);
                const saturation = max === 0 ? 0 : (max - min) / max;
                if (saturation < 0.15 && min > 120) {
                    image.setPixelColor(0x00000000, x, y);
                    edgeCount++;
                }
            }
        }
    }
    console.log(`  → ${edgeCount}エッジピクセルを修正`);

    await image.write(imagePath);
    console.log(`  → 保存完了: ${imagePath}`);
}

async function main() {
    const targets = ['evolving_archive.png', 'word_king.png'];
    for (const filename of targets) {
        const filepath = path.join(CHARACTERS_DIR, filename);
        try {
            await removeBackground(filepath);
        } catch (e) {
            console.error(`エラー (${filename}):`, e.message);
        }
    }
    console.log('\\n全画像の透過処理が完了しました！');
}

main();
