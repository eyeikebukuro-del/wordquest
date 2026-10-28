// WordQuest メインエントリポイント
// ゲームエンジンとUIの統合、イベントバインディングを担当する

import { GameEngine, SCREENS } from './game/GameEngine.js';
import { CARD_TYPES, addCardXP, getCardDescription } from './game/CardSystem.js';
import { BATTLE_STATES } from './game/BattleSystem.js';
import { NODE_TYPES, NODE_ICONS, FLOOR_THEMES, generateMap } from './game/MapGenerator.js';
import { RELIC_DEFINITIONS, POTION_DEFINITIONS } from './game/ScalingSystem.js';
import { WordDatabase } from './vocabulary/WordDatabase.js';
import { MathDatabase } from './vocabulary/MathDatabase.js';
import { KanjiDatabase } from './vocabulary/KanjiDatabase.js';
import { summarizeDeck, formatDateYMD } from './utils/SaveManager.js';

// マップ背景画像のアセットインポート (Viteで正しくパス解決させるため)
import bgForestMap from './assets/bg_forest_map.png';
import bgCaveMap from './assets/bg_cave_map.png';
import bgTowerMap from './assets/bg_tower_map.png';
import bgSkyMap from './assets/bg_sky_map.png';
import { SoundManager } from './game/SoundManager.js';

// ゲームエンジンのインスタンス
const game = new GameEngine();

// デバッグ用: ボス戦テスト関数
// コンソールから testBoss('evolving_archive') や testBoss('word_king') で即座にボス戦を開始
window.testBoss = async (bossId) => {
  const { createEnemy } = await import('./game/EnemySystem.js');
  const { BattleSystem } = await import('./game/BattleSystem.js');
  game.startNewRun();
  game.currentFloor = 2; // フロア3（塔）の背景を使用
  const enemy = createEnemy(bossId, 1.0);
  game.battle = new BattleSystem(
    game.player, enemy, [...game.playerDeck],
    game.scaling, game.wordDb, game.spacedRep
  );
  game.scaling.comboCount = 0;
  game.changeScreen('battle');
};

// オーディオマネージャの設定
window.sm = new SoundManager();

// モバイル(PWA/Web App)環境でのオーディオコンテキストロック解除
const unlockAudio = () => {
  window.sm.unlock();
  document.removeEventListener('touchstart', unlockAudio);
  document.removeEventListener('touchend', unlockAudio);
  document.removeEventListener('click', unlockAudio);
};
document.addEventListener('touchstart', unlockAudio, { once: true, passive: true });
document.addEventListener('touchend', unlockAudio, { once: true, passive: true });
document.addEventListener('click', unlockAudio, { once: true, passive: true });

// グローバルなUI音（ホバー・クリック）のイベントデリゲーション
document.body.addEventListener('mouseover', (e) => {
  if (e.target.closest('button') || e.target.closest('.card') || e.target.closest('.char-card')) {
    // 連続して鳴りすぎないようにするための簡単なチェックなども後で入れられます
    window.sm.playUIHover();
  }
});
// PCでは mousedown、モバイルでは mousedown(合成イベント) またはタッチ操作によるUIクリック音
document.body.addEventListener('mousedown', (e) => {
  window.sm.resume(); // オーディオコンテキストの再開
  if (e.target.closest('button')) {
    window.sm.playUIClick();
  }
});

// === 画面管理 ===
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active', 'entering');
  });
  const target = document.getElementById(`screen-${screenId}`);
  if (target) {
    target.classList.add('active', 'entering');
  }
}

// === カードHTML生成 ===
function createCardHTML(card, isLarge = false, clickable = true) {
  const typeClass = card.type === CARD_TYPES.ATTACK ? 'attack'
    : card.type === CARD_TYPES.DEFENSE ? 'defense' : 'skill';
  const sizeClass = isLarge ? 'card-large' : '';
  const disabledClass = (!clickable) ? 'disabled' : '';
  // レアリティCSSクラスを追加（rare/uncommon/common）
  const rarityClass = card.rarity ? `rarity-${card.rarity}` : '';

  return `
    <div class="card ${typeClass} ${sizeClass} ${disabledClass} ${rarityClass}" data-instance-id="${card.instanceId}" data-card-id="${card.id}" data-rarity="${card.rarity || 'common'}">
      <div class="card-cost">${card.cost}</div>
      <div class="card-emoji">${card.emoji}</div>
      <div class="card-name">${card.name}</div>
      <div class="card-desc">${getCardDescription(card)}</div>
      <div class="card-rarity-badge">${card.rarity === 'rare' ? 'R' : (card.rarity === 'uncommon' ? 'U' : 'N')}</div>
      ${card.level > 1 ? `<div class="card-level">Lv.${card.level}</div>` : ''}
    </div>
  `;
}

// === マップレンダリング ===
function renderMap() {
  const map = game.getCurrentMap();
  if (!map) return;

  const theme = FLOOR_THEMES[game.currentFloor];
  const container = document.getElementById('map-container');
  // 背景画像とグラデーションの合成（フロア1〜4）
  let bgImage = '';
  if (game.currentFloor === 1) bgImage = bgForestMap;
  else if (game.currentFloor === 2) bgImage = bgCaveMap;
  else if (game.currentFloor === 3) bgImage = bgTowerMap;
  else if (game.currentFloor === 4) bgImage = bgSkyMap;

  if (bgImage) {
    container.style.background = `url(${bgImage}) center center / cover no-repeat, ${theme.bgGradient}`;
    container.style.backgroundBlendMode = 'overlay'; // 既存のカラーと自然にブレンドする
  } else {
    container.style.background = theme.bgGradient;
  }

  // フロアタイトル
  const ascBadge = game.ascensionLevel > 0 ? ` (🏆Lv.${game.ascensionLevel})` : '';
  document.getElementById('floor-title').textContent = `${theme.emoji} ${theme.name}${ascBadge}`;

  // プレイヤーステータス更新
  document.getElementById('map-hp').textContent = game.player.hp;
  document.getElementById('map-max-hp').textContent = game.player.maxHp;
  document.getElementById('map-gold').textContent = game.player.gold;
  document.getElementById('deck-count').textContent = game.playerDeck.length;

  // レリック表示（タップ可能な個別要素）
  const relicsContainer = document.getElementById('map-relics');
  relicsContainer.innerHTML = '';
  for (const relic of game.scaling.relics) {
    const span = document.createElement('span');
    span.className = 'relic-item';
    span.textContent = relic.emoji;
    span.addEventListener('click', (e) => {
      e.stopPropagation();
      showItemTooltip(relic.emoji, relic.name, relic.description, e);
    });
    relicsContainer.appendChild(span);
  }

  // ポーション表示（タップ可能な個別要素）
  const potionsContainer = document.getElementById('map-potions');
  potionsContainer.innerHTML = '';
  for (const potion of game.scaling.potions) {
    const span = document.createElement('span');
    span.className = 'potion-item';
    span.textContent = potion.emoji;
    span.addEventListener('click', (e) => {
      e.stopPropagation();
      showItemTooltip(potion.emoji, potion.name, potion.description, e);
    });
    potionsContainer.appendChild(span);
  }

  // ノード描画
  const nodesContainer = document.getElementById('map-nodes');
  nodesContainer.innerHTML = '';

  // 層ごとにノードをグループ化
  const maxLayer = Math.max(...map.nodes.map(n => n.layer));
  for (let layer = 0; layer <= maxLayer; layer++) {
    const layerNodes = map.nodes.filter(n => n.layer === layer);
    const layerDiv = document.createElement('div');
    layerDiv.className = 'map-layer';

    for (const node of layerNodes) {
      const nodeDiv = document.createElement('div');
      nodeDiv.className = 'map-node';
      nodeDiv.dataset.nodeId = node.id; // ルート描画用にIDを付与
      nodeDiv.innerHTML = NODE_ICONS[node.type] || '❓';

      if (node.available) nodeDiv.classList.add('available');
      if (node.visited) nodeDiv.classList.add('visited');
      if (node.id === game.currentNodeId) nodeDiv.classList.add('current');
      if (!node.available && !node.visited) nodeDiv.classList.add('locked');
      if (node.type === NODE_TYPES.BOSS) nodeDiv.classList.add('boss');
      if (node.type === NODE_TYPES.BURNING_ELITE) nodeDiv.classList.add('burning-elite');
      if (node.type === NODE_TYPES.TREASURE) nodeDiv.classList.add('treasure');

      // ノード名ラベル
      const labelMap = {
        [NODE_TYPES.BATTLE]: 'バトル',
        [NODE_TYPES.ELITE]: 'エリート',
        [NODE_TYPES.BURNING_ELITE]: '強敵🔥',
        [NODE_TYPES.TREASURE]: '宝箱💎',
        [NODE_TYPES.SHOP]: 'ショップ',
        [NODE_TYPES.REST]: '休憩',
        [NODE_TYPES.EVENT]: 'イベント',
        [NODE_TYPES.BOSS]: 'ボス',
        [NODE_TYPES.START]: 'スタート'
      };
      const label = document.createElement('span');
      label.className = 'map-node-label';
      label.textContent = labelMap[node.type] || '';
      nodeDiv.appendChild(label);

      if (node.available || window.DEBUG_MODE) {
        nodeDiv.addEventListener('click', () => {
          if (window.sm) window.sm.playMapNode();
          game.selectNode(node.id);
        });
        if (window.DEBUG_MODE && !node.available) {
          nodeDiv.style.cursor = 'pointer';
        }
      }

      layerDiv.appendChild(nodeDiv);
    }

    nodesContainer.appendChild(layerDiv);
  }

  // DOMへの追加完了後、レイアウト確定を待ってから線を引く
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      drawMapConnections();
    });
  });
}

// === アイテム効果ポップアップ表示 ===
function showItemTooltip(emoji, name, description, event) {
  // 既存のツールチップを閉じる
  closeItemTooltip();

  // オーバーレイ（タップで閉じるための透明背景）
  const overlay = document.createElement('div');
  overlay.className = 'item-tooltip-overlay';
  overlay.addEventListener('click', closeItemTooltip);

  // ツールチップ本体
  const tooltip = document.createElement('div');
  tooltip.className = 'item-tooltip';
  tooltip.id = 'active-item-tooltip';
  tooltip.innerHTML = `
    <div class="item-tooltip-name">${emoji} ${name}</div>
    <div class="item-tooltip-desc">${description}</div>
  `;

  document.body.appendChild(overlay);
  document.body.appendChild(tooltip);

  // 位置を計算（タップ位置の下に表示、画面外に出ないよう調整）
  const rect = tooltip.getBoundingClientRect();
  let x = event.clientX - rect.width / 2;
  let y = event.clientY + 12;

  // 画面右端からはみ出さないよう調整
  if (x + rect.width > window.innerWidth - 8) {
    x = window.innerWidth - rect.width - 8;
  }
  if (x < 8) x = 8;

  // 画面下端からはみ出す場合は上に表示
  if (y + rect.height > window.innerHeight - 8) {
    y = event.clientY - rect.height - 12;
  }

  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${y}px`;
}

// ツールチップを閉じる
function closeItemTooltip() {
  const tooltip = document.getElementById('active-item-tooltip');
  if (tooltip) tooltip.remove();
  const overlay = document.querySelector('.item-tooltip-overlay');
  if (overlay) overlay.remove();
}

// === マップルート（線）描画 ===
function drawMapConnections() {
  const map = game.getCurrentMap();
  if (!map) return;

  const canvas = document.getElementById('map-canvas');
  const mapContainer = document.getElementById('map-container');
  const nodesContainer = document.getElementById('map-nodes');
  const ctx = canvas.getContext('2d');

  // Canvasのサイズをマップコンテナに合わせる（devicePixelRatio対応）
  const dpr = window.devicePixelRatio || 1;
  const containerWidth = mapContainer.clientWidth;
  const containerHeight = mapContainer.clientHeight;
  canvas.width = containerWidth * dpr;
  canvas.height = containerHeight * dpr;
  canvas.style.width = `${containerWidth}px`;
  canvas.style.height = `${containerHeight}px`;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, containerWidth, containerHeight);

  // コンテナの位置を基準にする
  const containerRect = mapContainer.getBoundingClientRect();

  // 線の描画
  for (const conn of map.connections) {
    const fromNode = map.nodes.find(n => n.id === conn.from);
    const toNode = map.nodes.find(n => n.id === conn.to);
    if (!fromNode || !toNode) continue;

    const fromEl = nodesContainer.querySelector(`[data-node-id="${fromNode.id}"]`);
    const toEl = nodesContainer.querySelector(`[data-node-id="${toNode.id}"]`);
    if (!fromEl || !toEl) continue;

    const fromRect = fromEl.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();

    // マップコンテナ内での相対座標を計算（要素の中心）
    const x1 = fromRect.left - containerRect.left + (fromRect.width / 2);
    const y1 = fromRect.top - containerRect.top + (fromRect.height / 2);
    const x2 = toRect.left - containerRect.left + (toRect.width / 2);
    const y2 = toRect.top - containerRect.top + (toRect.height / 2);

    // 円の半径を正確に計算し、+4pxオフセットで確実に円の外側から描画
    const fromRadius = (fromRect.width / 2) + 4;
    const toRadius = (toRect.width / 2) + 4;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // 距離がノードの半径の合計より短い場合は描画しない
    if (dist <= fromRadius + toRadius) continue;

    const angle = Math.atan2(dy, dx);
    const startX = x1 + Math.cos(angle) * fromRadius;
    const startY = y1 + Math.sin(angle) * fromRadius;
    const endX = x2 - Math.cos(angle) * toRadius;
    const endY = y2 - Math.sin(angle) * toRadius;

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);

    // スタイル決定
    ctx.lineWidth = 2;
    if (fromNode.visited && toNode.visited) {
      // 踏破済みルート（白実線で強調）
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.setLineDash([]);
    } else if (fromNode.visited || fromNode.layer === 0) {
      // 現在地から次に到達可能なルートを強調
      if (toNode.available) {
        ctx.strokeStyle = '#f1c40f'; // yellow
        ctx.setLineDash([8, 8]); // 点線
        ctx.lineDashOffset = -performance.now() / 50;
      } else {
        // 現在地から繋がっていない遠い未来の線
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.setLineDash([]);
      }
    } else {
      // 未到達の先の予測ルート
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.setLineDash([]);
    }

    ctx.stroke();
  }
}

// === バトルレンダリング ===
let currentBattle = null;
let drawnCards = new Set(); // 描画済みカードを記憶し、再描画時のアニメーション重複（チラツキ）を防ぐ
let isAnimating = false; // エフェクト中のカード連打防止フラグ

function renderBattle() {
  if (!game.battle) return;
  currentBattle = game.battle;
  isAnimating = false; // バトル開始時にリセット
  const b = currentBattle;
  const enemy = b.enemy;
  const player = b.player;

  // 背景色を敵のフロアに応じて変更（画像ベース）
  const bgMap = {
    1: 'url(./assets/bg_forest.png)',
    2: 'url(./assets/bg_cave.png)',
    3: 'url(./assets/bg_tower.png)',
    4: 'url(./assets/bg_sky.png)'
  };
  const battleField = document.querySelector('.battle-field');
  if (battleField) {
    battleField.style.backgroundImage = bgMap[game.currentFloor] || bgMap[1];
  }

  // 敵の効果をリスニング
  currentBattle.on('enemy_turn', (result) => {
    showEnemyTurnEffects(result);
  });

  // プレイヤー表示（選択キャラクターに応じた立ち絵・名前・絵文字を反映）
  const playerEmojiEl = document.getElementById('player-emoji');
  const playerImageEl = document.getElementById('player-image');
  const playerNameEl = document.querySelector('.player-name');
  if (playerNameEl) {
    playerNameEl.textContent = player.name || 'プレイヤー';
  }
  if (playerEmojiEl && player.emoji) {
    playerEmojiEl.textContent = player.emoji;
  }

  const playerHasImage = Boolean(player.image);
  const playerImageSrc = player.image || './characters/wordmaster.png';

  if (playerHasImage) {
    playerImageEl.src = playerImageSrc;
    playerImageEl.style.display = 'block';
    playerEmojiEl.style.display = 'none';
  } else {
    playerImageEl.style.display = 'none';
    playerEmojiEl.style.display = 'block';
  }

  // 敵表示
  const enemyEmojiEl = document.getElementById('enemy-emoji');
  const enemyImageEl = document.getElementById('enemy-image');

  enemyEmojiEl.classList.remove('anim-death', 'anim-hit');
  enemyImageEl.classList.remove('anim-death', 'anim-hit');

  if (enemy.image) {
    enemyImageEl.onerror = () => {
      enemyImageEl.style.display = 'none';
      enemyEmojiEl.style.display = 'block';
      enemyEmojiEl.textContent = enemy.emoji;
      enemyEmojiEl.style.fontSize = enemy.isBoss ? '5rem' : '4rem';
    };
    enemyImageEl.src = enemy.image;
    enemyImageEl.style.display = 'block';
    enemyEmojiEl.style.display = 'none';
    if (enemy.isBoss) {
      enemyImageEl.classList.add('boss');
    } else {
      enemyImageEl.classList.remove('boss');
    }
  } else {
    enemyImageEl.style.display = 'none';
    enemyEmojiEl.style.display = 'block';
    enemyEmojiEl.textContent = enemy.emoji;
    enemyEmojiEl.style.fontSize = enemy.isBoss ? '5rem' : '4rem';
  }

  document.getElementById('enemy-name').textContent = enemy.name + (enemy.isBurningElite ? ' 🔥' : (enemy.isElite ? ' ⭐' : ''));

  const gimmickBanner = document.getElementById('enemy-gimmick-banner');
  if (gimmickBanner) {
    if (enemy.gimmickDesc) {
      gimmickBanner.textContent = enemy.gimmickDesc;
      gimmickBanner.style.display = 'block';
    } else {
      gimmickBanner.style.display = 'none';
    }
  }

  updateBattleUI();

  // バトル開始
  b.start();
  drawnCards.clear(); // バトル開始時に描画履歴をリセット
  renderHand();
}

function updateBattleUI() {
  const b = currentBattle;
  if (!b) return;

  const player = b.player;
  const enemy = b.enemy;

  // プレイヤーHP
  const hpPercent = (player.hp / player.maxHp) * 100;
  const hpBar = document.getElementById('player-hp-bar');
  hpBar.style.width = `${hpPercent}%`;
  hpBar.className = 'hp-bar' + (hpPercent < 30 ? ' low' : hpPercent < 60 ? ' mid' : '');
  document.getElementById('player-hp-text').textContent = `${player.hp}/${player.maxHp}`;

  // エナジー
  document.getElementById('energy-display').textContent = `${b.energy}/${b.maxEnergy}`;

  // ブロック
  const blockDisplay = document.getElementById('block-display');
  blockDisplay.textContent = `🛡️ ${b.playerBlock}`;
  blockDisplay.style.opacity = b.playerBlock > 0 ? '1' : '0';

  // 敵HP
  const enemyHpPercent = (enemy.hp / enemy.maxHp) * 100;
  const enemyHpBar = document.getElementById('enemy-hp-bar');
  enemyHpBar.style.width = `${enemyHpPercent}%`;
  enemyHpBar.className = 'hp-bar enemy-hp-bar' + (enemyHpPercent < 30 ? ' low' : enemyHpPercent < 60 ? ' mid' : '');
  document.getElementById('enemy-hp-text').textContent = `${enemy.hp}/${enemy.maxHp}`;

  // 敵のインテント
  const intent = b.nextEnemyIntent;
  const intentEl = document.getElementById('enemy-intent');
  if (intent) {
    let intentText = '';
    let intentClass = '';
    switch (intent.intent) {
      case 'attack':
        intentText = `${intent.emoji} ${intent.damage}`;
        intentClass = 'attack';
        break;
      case 'multi_attack':
        intentText = `${intent.emoji} ${intent.damage}×${intent.hits}`;
        intentClass = 'attack';
        break;
      case 'defend':
        intentText = `${intent.emoji} ${intent.block || ''}`;
        intentClass = 'defend';
        break;
      case 'buff':
        intentText = `${intent.emoji}`;
        intentClass = 'buff';
        break;
      case 'sleep':
        intentText = `${intent.emoji} 居眠り`;
        intentClass = 'defend';
        break;
    }
    intentEl.textContent = intentText;
    intentEl.className = 'enemy-intent ' + intentClass;
  }

  // 敵ステータス（バフ/毒/ギミック等）
  const statusEl = document.getElementById('enemy-status');
  let statusHTML = '';
  if (enemy.block > 0) statusHTML += `<span class="status-badge">🛡️${enemy.block}</span>`;
  if (enemy.buffs.strength) statusHTML += `<span class="status-badge">💪+${enemy.buffs.strength}</span>`;
  if (b.enemyPoison > 0) statusHTML += `<span class="status-badge status-poison">🟣${b.enemyPoison}</span>`;
  if (enemy.passiveThorns > 0) statusHTML += `<span class="status-badge status-thorn">💎トゲ${enemy.passiveThorns}</span>`;
  if (enemy.flightActive) {
    const remHits = Math.max(1, (enemy.flightHitsRequired || 2) - (enemy.hitsTakenThisTurn || 0));
    statusHTML += `<span class="status-badge status-buff">🌪️飛翔(あと${remHits}撃)</span>`;
  }
  if (enemy.asleepTurns > 0) statusHTML += `<span class="status-badge">💤睡眠(${enemy.asleepTurns}T)</span>`;
  // 敵デバフ（weakened等）
  if (b.enemyDebuffs) {
    for (const [key, debuff] of Object.entries(b.enemyDebuffs)) {
      if (debuff.turns > 0) {
        if (key === 'weakened') statusHTML += `<span class="status-badge status-debuff">⬇️-${debuff.value} (${debuff.turns}T)</span>`;
      }
    }
  }
  statusEl.innerHTML = statusHTML;

  // プレイヤーステータス（バフ/デバフアイコン）
  const playerStatusEl = document.getElementById('player-status');
  let playerStatusHTML = '';
  if (b.scaling && b.scaling.buffs) {
    if (b.scaling.buffs.strength && b.scaling.buffs.strength.turns > 0) {
      const pct = Math.round((b.scaling.buffs.strength.value - 1) * 100);
      playerStatusHTML += `<span class="status-badge status-buff">💪+${pct}%</span>`;
    }
    if (b.scaling.buffs.next_turn_energy && b.scaling.buffs.next_turn_energy.turns > 0) {
      playerStatusHTML += `<span class="status-badge status-buff">⚡+${b.scaling.buffs.next_turn_energy.value}</span>`;
    }
  }
  if (b.damagePermanentBuff > 0) {
    playerStatusHTML += `<span class="status-badge status-buff">🌀+${b.damagePermanentBuff}</span>`;
  }
  if (b.thornArmorDamage > 0) {
    playerStatusHTML += `<span class="status-badge status-thorn">🦔${b.thornArmorDamage}</span>`;
  }
  if (b.nextAttackMultiplier > 1) {
    playerStatusHTML += `<span class="status-badge status-buff">🎯×${b.nextAttackMultiplier}</span>`;
  }
  if (b.playerBlock > 0) {
    playerStatusHTML += `<span class="status-badge">🛡️${b.playerBlock}</span>`;
  }
  playerStatusEl.innerHTML = playerStatusHTML;

  // コンボ
  const comboText = b.scaling.getComboText();
  const comboEl = document.getElementById('combo-display');
  comboEl.textContent = comboText;
  if (comboText) comboEl.classList.add('anim-combo');

  // ポーション
  renderPotions();
}

function renderHand() {
  const b = currentBattle;
  if (!b) return;

  const handCards = document.getElementById('hand-cards');
  handCards.innerHTML = '';

  for (const card of b.deck.hand) {
    const canPlay = card.cost <= b.energy && b.state === BATTLE_STATES.PLAYER_TURN && !isAnimating;
    const cardEl = document.createElement('div');
    cardEl.innerHTML = createCardHTML(card, false, canPlay);
    const cardNode = cardEl.firstElementChild;

    if (!canPlay) {
      cardNode.classList.add('disabled');
    }

    // 新しく手札に加わった（描画履歴にない）カードのみアニメーションを付与し、チラつきを防ぐ
    if (!drawnCards.has(card.instanceId)) {
      cardNode.classList.add('anim-card-draw');
      // レアカードのシマー（キラキラ）も、新規描画時のみアニメを適用する
      if (card.rarity === 'rare') {
        cardNode.classList.add('shimmer-animate');
      }
      drawnCards.add(card.instanceId);
    }

    cardNode.addEventListener('click', () => {
      if (isAnimating) return; // エフェクト中はカード選択をブロック
      if (b.state !== BATTLE_STATES.PLAYER_TURN || card.cost > b.energy) return;
      onCardSelect(card.instanceId);
    });

    handCards.appendChild(cardNode);
  }

  // ターン終了ボタンの状態
  document.getElementById('btn-end-turn').disabled = b.state !== BATTLE_STATES.PLAYER_TURN || isAnimating;
}

// === 確認ダイアログ ===
function showConfirmDialog(contentHTML) {
  return new Promise((resolve) => {
    const modal = document.getElementById('modal-confirm');
    document.getElementById('confirm-content').innerHTML = contentHTML;
    modal.style.display = 'block';

    const yesBtn = document.getElementById('btn-confirm-yes');
    const noBtn = document.getElementById('btn-confirm-no');

    const cleanup = () => {
      modal.style.display = 'none';
      yesBtn.replaceWith(yesBtn.cloneNode(true));
      noBtn.replaceWith(noBtn.cloneNode(true));
    };

    document.getElementById('btn-confirm-yes').addEventListener('click', () => {
      cleanup();
      resolve(true);
    });
    document.getElementById('btn-confirm-no').addEventListener('click', () => {
      cleanup();
      resolve(false);
    });
  });
}

function renderPotions() {
  const potionSlots = document.getElementById('potion-slots');
  potionSlots.innerHTML = '';
  const maxSlots = 3;

  // 実際のポーションスロット
  for (const potion of game.scaling.potions) {
    const slot = document.createElement('div');
    slot.className = 'potion-slot filled';
    slot.innerHTML = `<span class="potion-emoji">${potion.emoji}</span>`;
    slot.title = `${potion.name}: ${potion.description}`;
    slot.addEventListener('click', async () => {
      if (currentBattle && (currentBattle.state === BATTLE_STATES.PLAYER_TURN || currentBattle.state === BATTLE_STATES.QUIZ_ACTIVE)) {
        const confirmed = await showConfirmDialog(`
          <div style="text-align:center;">
            <div style="font-size:2rem;">${potion.emoji}</div>
            <div style="font-weight:700; margin:8px 0;">${potion.name}</div>
            <div style="color:var(--text-secondary); font-size:0.85rem;">${potion.description}</div>
            <div style="margin-top:12px; font-weight:600;">つかいますか？</div>
          </div>
        `);
        if (!confirmed) return;
        const result = currentBattle.usePotion(potion.instanceId);
        if (result) {
          updateBattleUI();
          renderHand();
          renderPotions();
          if (currentBattle.state === BATTLE_STATES.QUIZ_ACTIVE && result.effects.some(e => e.type === 'eliminate')) {
            showQuiz(currentBattle.currentQuiz);
          }
        }
      }
    });
    potionSlots.appendChild(slot);
  }

  // 空スロットを埋める
  const emptyCount = maxSlots - game.scaling.potions.length;
  for (let i = 0; i < emptyCount; i++) {
    const emptySlot = document.createElement('div');
    emptySlot.className = 'potion-slot empty';
    emptySlot.innerHTML = '<span class="potion-empty-icon">─</span>';
    potionSlots.appendChild(emptySlot);
  }
}

// === クイズ表示 ===
function onCardSelect(instanceId) {
  if (isAnimating) return; // エフェクト中はカード選択をブロック
  if (window.sm) window.sm.playCardSelect();
  const quiz = currentBattle.selectCard(instanceId);
  if (!quiz) return;
  // カードを使った瞬間に発動するギミック（女王の逆鱗など）を即座にUIと敵インテントに反映
  updateBattleUI();
  if (currentBattle.selectedCard && currentBattle.selectedCard.triggeredEnrage) {
    showDamageNumber(`🐝逆鱗 💪+${currentBattle.selectedCard.triggeredEnrage}`, 'thorn', false);
  }
  showQuiz(quiz);
}

function showQuiz(quiz) {
  const quizArea = document.getElementById('quiz-area');
  quizArea.style.display = 'block';

  // カード情報
  const card = currentBattle.selectedCard;
  document.getElementById('quiz-card-info').innerHTML =
    `${card.emoji} ${card.name}を使う！正しいこたえを選ぼう`;

  // 問題表示
  const questionEl = document.getElementById('quiz-question');
  const labelText = quiz.type === 'math_choice' ? 'こたえは いくつ？'
    : quiz.type === 'kanji_read' ? '【 】の漢字のよみかたは？'
    : quiz.type === 'kanji_write' ? '【 】に入る漢字はどれ？'
    : quiz.type === 'en_to_jp' ? 'この英語の意味は？'
    : quiz.type === 'jp_to_en' ? 'この日本語を英語で言うと？' : 'こたえを入力しよう！';

  let mathBonusBadge = '';
  if (quiz.twoDigitCount >= 2) {
    mathBonusBadge = `<div class="math-bonus-badge tier-2">🌟 2けた×2けたボーナス！ 威力1.5倍！</div>`;
  } else if (quiz.twoDigitCount === 1) {
    mathBonusBadge = `<div class="math-bonus-badge tier-1">🔥 2けた計算ボーナス！ 威力1.2倍！</div>`;
  } else if (quiz.grade && quiz.strokes) {
    mathBonusBadge = `<div class="math-bonus-badge tier-1">📖 小学${quiz.grade}年生の漢字（${quiz.strokes}画）</div>`;
  }

  // 英単語問題（英語→日本語）の場合はネイティブ発音ボタンを表示＆自動読み上げ
  const isEnglishWordQuiz = quiz.word && !quiz.word.isMath && !quiz.word.isKanji;
  const canSpeakNow = isEnglishWordQuiz && quiz.type === 'en_to_jp';
  const speakBtnHtml = canSpeakNow
    ? `<div><button type="button" id="btn-quiz-speak" class="quiz-speak-btn">🔊 発音をきく</button></div>`
    : '';

  questionEl.innerHTML = `
    ${mathBonusBadge}
    <span class="question-emoji">${quiz.questionEmoji || ''}</span>
    <span class="question-text">${quiz.question}</span>
    <span class="question-label">${labelText}</span>
    ${speakBtnHtml}
  `;

  if (canSpeakNow) {
    if (window.sm) window.sm.speakEnglish(quiz.word.english);
    const speakBtn = document.getElementById('btn-quiz-speak');
    if (speakBtn) {
      speakBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.sm) window.sm.speakEnglish(quiz.word.english);
      });
    }
  }

  // 選択肢 or タイピング
  const choicesEl = document.getElementById('quiz-choices');
  const typingEl = document.getElementById('quiz-typing');
  const resultEl = document.getElementById('quiz-result');
  resultEl.style.display = 'none';
  resultEl.className = 'quiz-result';
  // 前のクイズのハイライトを完全にリセット
  choicesEl.innerHTML = '';

  if (quiz.type === 'typing') {
    choicesEl.style.display = 'none';
    typingEl.style.display = 'flex';
    const input = document.getElementById('typing-input');
    input.value = '';
    input.placeholder = `ヒント: ${quiz.hint}`;
    setTimeout(() => input.focus(), 100);
  } else {
    typingEl.style.display = 'none';
    choicesEl.style.display = 'grid';
    choicesEl.innerHTML = '';

    // 消去する不正解のインデックスを決定する（再描画時に状態を維持するため quiz オブジェクトに保存）
    if (!quiz.eliminatedIndices) {
      quiz.eliminatedIndices = new Set();
    }

    if (quiz.hintEliminated && quiz.hintEliminated > quiz.eliminatedIndices.size) {
      const wrongIndices = quiz.choices
        .map((_, idx) => idx)
        .filter(idx => idx !== quiz.correctIndex && !quiz.eliminatedIndices.has(idx));

      // ランダムにシャッフルして必要な数だけ消去
      wrongIndices.sort(() => Math.random() - 0.5);
      const eliminateCount = Math.min(quiz.hintEliminated - quiz.eliminatedIndices.size, wrongIndices.length);
      for (let i = 0; i < eliminateCount; i++) {
        quiz.eliminatedIndices.add(wrongIndices[i]);
      }
    }

    quiz.choices.forEach((choice, i) => {
      const btn = document.createElement('button');
      btn.className = 'quiz-choice';
      btn.textContent = choice;

      // ヒントで選択肢を消す
      if (quiz.eliminatedIndices.has(i)) {
        btn.classList.add('eliminated');
      }

      btn.addEventListener('click', () => {
        if (btn.classList.contains('disabled') || btn.classList.contains('eliminated')) return;
        onQuizAnswer(i, quiz);
      });

      choicesEl.appendChild(btn);
    });
  }

  renderHand();
}

function onQuizAnswer(answer, quiz) {
  const result = currentBattle.answerQuiz(answer);
  if (!result) return;

  // 回答直後に敵バフ・インテント・エナジー変化を即座にUIへ反映
  updateBattleUI();

  // エフェクト中フラグを立てる（カード連打防止）
  isAnimating = true;

  const resultEl = document.getElementById('quiz-result');
  const choicesEl = document.getElementById('quiz-choices');

  // 選択肢の正誤表示
  if (quiz.type !== 'typing') {
    const buttons = choicesEl.querySelectorAll('.quiz-choice');
    buttons.forEach((btn, i) => {
      btn.classList.add('disabled');
      if (i === quiz.correctIndex) btn.classList.add('correct');
      if (i === answer && !result.correct) btn.classList.add('incorrect');
    });
  }

  // 日本語→英語 や タイピング問題では回答直後に英単語のネイティブ発音を読み上げる
  if (quiz.word && !quiz.word.isMath && !quiz.word.isKanji && quiz.type !== 'en_to_jp') {
    if (window.sm) window.sm.speakEnglish(quiz.word.english);
  }

  // 結果表示
  resultEl.style.display = 'block';
  if (result.correct) {
    let txt = `⭕ 正解！${result.comboText ? ' ' + result.comboText : ''}`;
    if (result.mathBonusText) txt += ` ${result.mathBonusText}`;
    if (result.leveledUp) txt += ' ⬆️ カードレベルアップ！';
    if (result.kunaiTriggered) txt += ` 🗡️魔剣+${result.kunaiTriggered}！`;
    if (result.wisdomGearTriggered) txt += ' ⚙️歯車エナジー+1&ドロー！';
    if (result.chronoBonus) txt += ' ⏳時の審判エナジー+1！';
    if (result.fanTriggered) txt += ` 🪭扇ブロック+${result.fanTriggered}！`;
    resultEl.className = 'quiz-result correct';
    resultEl.textContent = txt;
  } else {
    const correctAnswer = quiz.type === 'typing' ? quiz.answer : quiz.choices[quiz.correctIndex];
    resultEl.className = 'quiz-result incorrect';
    let missTxt = `❌ 残念…正解は「${correctAnswer}」`;
    if (result.gimmickPenalty) missTxt += ` （${result.gimmickPenalty}）`;
    resultEl.textContent = missTxt;
  }

  // 次のクイズ(ダブルストライク)またはクイズ終了
  if (result.nextQuiz) {
    setTimeout(() => {
      isAnimating = false; // ダブルストライク2問目に進む前にリセット
      showQuiz(result.nextQuiz);
    }, 1200);
    return;
  }

  // クイズ閉じる → エフェクトの順に演出する
  setTimeout(() => {
    document.getElementById('quiz-area').style.display = 'none';
    updateBattleUI();

    // ↓ エフェクトと音のタイミング制御 ↓
    if (result.correct && result.cardEffect && result.cardEffect.effects) {
      const isMeteor = result.cardEffect.type === 'attack' && result.cardEffect.cost >= 3;
      const isVictory = result.battleEnd === 'victory';

      for (const eff of result.cardEffect.effects) {
        if (eff.type === 'damage' || eff.type === 'mirror_damage') {
          // 正解音から300ms遅延してスラッシュエフェクト＋音を同時再生
          setTimeout(() => {
            playAttackEffect(false, isMeteor, eff.value);
          }, 300);

          // スラッシュから300ms後にダメージ数字＋ヒットアニメ
          setTimeout(() => {
            showDamageNumber(eff.actual !== undefined ? eff.actual : eff.value, 'damage', false);
            const hitTarget = game.battle.enemy.image ? document.getElementById('enemy-image') : document.getElementById('enemy-emoji');
            hitTarget.classList.add('anim-hit');
            setTimeout(() => hitTarget.classList.remove('anim-hit'), 400);
          }, 600);
        } else if (eff.type === 'block') {
          showDamageNumber(eff.value, 'block', true);
        } else if (eff.type === 'heal') {
          showDamageNumber(eff.value, 'heal', true);
        } else if (eff.type === 'flight_crash' || eff.type === 'armor_break') {
          setTimeout(() => showDamageNumber(eff.value, 'damage', false), 700);
        } else if (eff.type === 'enemy_thorns' && eff.actual > 0) {
          setTimeout(() => showDamageNumber(eff.actual, 'thorn', true), 700);
        }
      }

      // 撃破時の音と演出タイミング: スラッシュ完了後に余裕をもって撃破音
      if (isVictory) {
        setTimeout(() => {
          if (window.sm) window.sm.playDefeat();
          const deathTarget = game.battle.enemy.image ? document.getElementById('enemy-image') : document.getElementById('enemy-emoji');
          deathTarget.classList.add('anim-death');
          setTimeout(() => {
            isAnimating = false;
            game.onBattleEnd('victory');
          }, 700);
        }, 1200); // スラッシュ(300ms) + ダメージ表示(600ms) + 余韻(300ms)
        return; // 勝利時はここで終了（renderHandしない）
      }
    }
    // ↑ エフェクトここまで ↑

    // エフェクト完了後にアニメ中フラグを解除して手札再表示
    setTimeout(() => {
      isAnimating = false;
      renderHand();
    }, 800); // エフェクト演出分の待機
  }, 1500);
}

function playAttackEffect(isPlayer = false, isMeteor = false, damage = 0) {
  const container = isPlayer ? document.querySelector('.player-area') : document.querySelector('.enemy-area');
  if (!container) return;

  const effectEl = document.createElement('div');
  effectEl.className = isMeteor ? 'meteor-effect' : 'slash-effect';
  effectEl.style.top = isMeteor ? '-20px' : '20%';
  effectEl.style.left = isMeteor ? '20%' : '20%';
  container.appendChild(effectEl);

  // エフェクト表示と同時に攻撃音を再生（完全同期）
  if (window.sm) {
    if (damage >= 10) window.sm.playHeavyAttack();
    else window.sm.playAttack();
  }

  setTimeout(() => effectEl.remove(), isMeteor ? 700 : 500);
}

function showDamageNumber(value, type, isPlayer = false) {
  const container = isPlayer ? document.querySelector('.player-area') : document.querySelector('.enemy-area');
  if (!container) return;

  const el = document.createElement('div');
  el.className = `damage-number ${type}`;

  let prefix = '';
  if (typeof value === 'number') {
    prefix = type === 'heal' || type === 'block' ? '+' : type === 'damage' ? '-' : '';
  }

  el.textContent = `${prefix}${value}`;
  el.style.left = `${40 + Math.random() * 20}%`;
  el.style.top = '30%';
  container.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

// === フロートメッセージ（ショップ・報酬用） ===
function showFloatMessage(message, targetEl) {
  const msg = document.createElement('div');
  msg.textContent = message;
  msg.style.cssText = `
    position: fixed;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.85);
    color: #ff6b6b;
    padding: 12px 24px;
    border-radius: 8px;
    font-weight: 700;
    font-size: 1.1rem;
    z-index: 9999;
    pointer-events: none;
    animation: floatUp 1.5s ease-out forwards;
    border: 1px solid rgba(255, 107, 107, 0.3);
  `;
  document.body.appendChild(msg);
  setTimeout(() => msg.remove(), 1500);
}

function showEnemyTurnEffects(result) {
  let totalDamage = 0;
  let blockedAll = false;

  if (!result || !result.effects) return;

  for (const eff of result.effects) {
    if (eff.type === 'damage' || eff.type === 'multi_damage') {
      const actual = eff.actual !== undefined ? eff.actual : eff.total;
      const expected = eff.type === 'damage' ? eff.value : (eff.perHit * eff.hits);

      if (actual > 0) {
        playAttackEffect(true, false);
        setTimeout(() => showDamageNumber(actual, 'damage', true), 300);
        totalDamage += actual;
      } else if (expected > 0 && actual === 0) {
        blockedAll = true;
      }
    }

    // 毒ダメージ専用エフェクト（紫フロート）
    if (eff.type === 'poison_damage' && eff.value > 0) {
      setTimeout(() => {
        showDamageNumber(eff.value, 'poison', false);
        // 敵に毒ヒットアニメーション
        const hitTarget = currentBattle && currentBattle.enemy.image
          ? document.getElementById('enemy-image')
          : document.getElementById('enemy-emoji');
        if (hitTarget) {
          hitTarget.classList.add('anim-poison-hit');
          setTimeout(() => hitTarget.classList.remove('anim-poison-hit'), 500);
        }
      }, 100);
    }

    // とげのよろい反撃エフェクト
    if (eff.type === 'thorn_counter' && eff.value > 0) {
      setTimeout(() => showDamageNumber(eff.value, 'thorn', false), 400);
    }
  }

  if (blockedAll && totalDamage === 0) {
    showDamageNumber('Block!', 'block', true);
  }

  if (totalDamage > 0) {
    const battleScreen = document.getElementById('screen-battle');
    battleScreen.classList.add('anim-player-damage');
    setTimeout(() => battleScreen.classList.remove('anim-player-damage'), 600);
  }
}

// === ターン終了 ===
function onEndTurn() {
  if (!currentBattle || currentBattle.state !== BATTLE_STATES.PLAYER_TURN) return;

  // 敵ターン実行（戻り値でpoisonKillを判定）
  const enemyResult = currentBattle.endTurn();

  // 毒で敵が倒れた場合：ダメージフロート→HPバー更新→死亡アニメの順に演出
  if (enemyResult && enemyResult.poisonKill) {
    // まずUI更新して毒ダメージフロート＆HPバー減少を見せる
    updateBattleUI();
    showEnemyTurnEffects(enemyResult);

    // 毒エフェクト表示後、1秒待ってから死亡アニメと勝利処理
    setTimeout(() => {
      if (window.sm) window.sm.playDefeat();
      currentBattle.state = BATTLE_STATES.VICTORY;

      const deathTarget = currentBattle.enemy.image
        ? document.getElementById('enemy-image')
        : document.getElementById('enemy-emoji');
      deathTarget.classList.add('anim-death');

      setTimeout(() => {
        currentBattle.emit('battle_end', { result: 'victory' });
        currentBattle.emit('state_change', { state: currentBattle.state });
        game.onBattleEnd('victory');
      }, 700);
    }, 1000);
    return;
  }

  // 敗北チェック
  if (currentBattle.state === BATTLE_STATES.DEFEAT) {
    const battleScreen = document.getElementById('screen-battle');
    battleScreen.classList.add('anim-player-damage');
    setTimeout(() => {
      battleScreen.classList.remove('anim-player-damage');
      game.onBattleEnd('defeat');
    }, 600);
    return;
  }

  // 毒などで敵が倒れた場合（勝利チェック）
  if (currentBattle.state === BATTLE_STATES.VICTORY) {
    const deathTarget = game.battle.enemy.image ? document.getElementById('enemy-image') : document.getElementById('enemy-emoji');
    deathTarget.classList.add('anim-death');
    setTimeout(() => {
      game.onBattleEnd('victory');
    }, 700);
    return;
  }

  // UI更新
  updateBattleUI();
  renderHand();
}

// === 報酬レンダリング ===
function renderRewards() {
  const rewards = game.currentRewards;
  if (!rewards) return;

  const map = game.getCurrentMap();
  const node = map ? map.nodes.find(n => n.id === game.currentNodeId) : null;
  const rewardTitleEl = document.querySelector('.reward-title');
  if (rewardTitleEl) {
    rewardTitleEl.textContent = (node && node.type === NODE_TYPES.TREASURE) ? '💎 宝箱を発見！' : '🎉 勝利！';
  }

  const listEl = document.getElementById('reward-list');
  listEl.innerHTML = '';

  for (const reward of rewards) {
    const item = document.createElement('div');
    item.className = 'reward-item';

    if (reward.type === 'gold') {
      item.innerHTML = `<span class="reward-emoji">${reward.emoji}</span><span class="reward-desc">${reward.description}</span>`;
      item.addEventListener('click', () => {
        if (!item.classList.contains('claimed')) {
          game.addGold(reward.amount);
          item.classList.add('claimed');
          item.innerHTML += ' ✅';
        }
      });
    } else if (reward.type === 'card') {
      item.innerHTML = `<span class="reward-emoji">${reward.emoji}</span><span class="reward-desc">${reward.description}</span>`;
      item.addEventListener('click', () => {
        if (!item.classList.contains('claimed')) {
          showCardSelect(reward.cards, (selectedCard) => {
            game.selectRewardCard(selectedCard);
            item.classList.add('claimed');
            item.innerHTML = `<span class="reward-emoji">🃏</span><span class="reward-desc">${selectedCard.name}を獲得！ ✅</span>`;
          });
        }
      });
    } else if (reward.type === 'relic') {
      const relic = RELIC_DEFINITIONS[reward.relicId];
      if (relic) {
        item.innerHTML = `<span class="reward-emoji">${relic.emoji}</span><span class="reward-desc">${relic.name}: ${relic.description}</span>`;
        item.addEventListener('click', () => {
          if (!item.classList.contains('claimed')) {
            game.scaling.addRelic(reward.relicId);
            if (relic.effect.type === 'max_hp_bonus') {
              game.player.maxHp += relic.effect.value;
              game.player.hp += relic.effect.value;
            }
            item.classList.add('claimed');
            item.innerHTML += ' ✅';
          }
        });
      }
    } else if (reward.type === 'relic_choice') {
      item.innerHTML = `<span class="reward-emoji">${reward.emoji}</span><span class="reward-desc">${reward.description}</span>`;
      item.addEventListener('click', () => {
        if (!item.classList.contains('claimed')) {
          showRelicSelect(reward.relicIds, (selectedRelicId) => {
            const relic = RELIC_DEFINITIONS[selectedRelicId];
            if (relic) {
              game.scaling.addRelic(selectedRelicId);
              if (relic.effect.type === 'max_hp_bonus') {
                game.player.maxHp += relic.effect.value;
                game.player.hp += relic.effect.value;
              }
              item.classList.add('claimed');
              item.innerHTML = `<span class="reward-emoji">${relic.emoji}</span><span class="reward-desc">${relic.name}を獲得！ ✅</span>`;
            }
          });
        }
      });
    } else if (reward.type === 'potion') {
      const potion = POTION_DEFINITIONS[reward.potionId];
      if (potion) {
        item.innerHTML = `<span class="reward-emoji">${potion.emoji}</span><span class="reward-desc">${potion.name}: ${potion.description}</span>`;
        item.addEventListener('click', () => {
          if (!item.classList.contains('claimed')) {
            if (game.scaling.potions.length >= 3) {
              showFloatMessage('ポーションがいっぱいです！', item);
              return;
            }
            const added = game.scaling.addPotion(reward.potionId);
            if (added) {
              item.classList.add('claimed');
              item.innerHTML += ' ✅';
            }
          }
        });
      }
    }

    listEl.appendChild(item);
  }
}

// === カード選択モーダル ===
function showCardSelect(cards, onSelect) {
  const modal = document.getElementById('modal-card-select');
  modal.style.display = 'block';

  const list = document.getElementById('card-select-list');
  list.innerHTML = '<div class="card-select-row">' +
    cards.map(c => createCardHTML(c, true)).join('') +
    '</div>';

  list.querySelectorAll('.card').forEach((cardEl, idx) => {
    cardEl.addEventListener('click', () => {
      onSelect(cards[idx]);
      modal.style.display = 'none';
    });
  });

  document.getElementById('btn-skip-card').onclick = () => {
    modal.style.display = 'none';
  };
}

// === レリック選択モーダル ===
function showRelicSelect(relicIds, onSelect) {
  const modal = document.getElementById('modal-card-select');
  modal.style.display = 'block';

  // タイトルの書き換え
  const titleEl = document.getElementById('card-select-title') || modal.querySelector('h2');
  if (titleEl) titleEl.textContent = 'レリックを選んでください';

  const list = document.getElementById('card-select-list');
  list.innerHTML = '<div class="card-select-row" style="display:flex; flex-wrap:wrap; justify-content:center; gap:20px;">' +
    relicIds.map(id => {
      const relic = RELIC_DEFINITIONS[id];
      return `
        <div class="card relic-card" data-relic-id="${id}" style="width:150px; height:auto; min-height:160px; padding:15px; display:flex; flex-direction:column; align-items:center; justify-content:flex-start;">
          <div style="font-size:3rem; margin-bottom:8px;">${relic.emoji}</div>
          <div style="font-size:1.1rem; font-weight:bold; margin-bottom:8px; text-align:center; line-height:1.2;">${relic.name}</div>
          <div style="font-size:0.85rem; text-align:center; line-height:1.4; color:var(--text-secondary);">${relic.description}</div>
        </div>
        `;
    }).join('') +
    '</div>';

  list.querySelectorAll('.relic-card').forEach((cardEl) => {
    cardEl.addEventListener('click', () => {
      onSelect(cardEl.dataset.relicId);
      modal.style.display = 'none';
      if (titleEl) titleEl.textContent = 'カードを選んでください'; // リセット
    });
  });

  document.getElementById('btn-skip-card').onclick = () => {
    modal.style.display = 'none';
    if (titleEl) titleEl.textContent = 'カードを選んでください'; // リセット
  };
}

// === ショップレンダリング ===
function renderShop() {
  if (!game.currentShop) return;

  document.getElementById('shop-gold').textContent = game.player.gold;
  const itemsEl = document.getElementById('shop-items');
  itemsEl.innerHTML = '';

  // セクション分け
  const sections = [
    { label: '🃏 カード', items: game.currentShop.items.filter(i => i.type === 'card') },
    { label: '✨ レリック', items: game.currentShop.items.filter(i => i.type === 'relic') },
    { label: '🧪 ポーション', items: game.currentShop.items.filter(i => i.type === 'potion') },
    { label: '🛠️ サービス', items: game.currentShop.items.filter(i => i.type === 'remove_card') }
  ];

  for (const section of sections) {
    if (section.items.length === 0) continue;

    // セクション見出し
    const header = document.createElement('div');
    header.className = 'shop-section-header';
    header.textContent = section.label;
    itemsEl.appendChild(header);

    for (const item of section.items) {
      const el = document.createElement('div');
      el.className = 'shop-item';
      if (item.sold) el.classList.add('sold');

      const displayName = item.name || '';
      const displayDesc = item.description || '';

      el.innerHTML = `
        <span class="shop-item-emoji">${item.emoji}</span>
        <span class="shop-item-name">${displayName}</span>
        ${displayDesc ? `<span class="shop-item-desc">${displayDesc}</span>` : ''}
        <span class="shop-item-price">💰 ${item.price}</span>
      `;

      el.addEventListener('click', async () => {
        if (item.sold) return;

        // 所持金チェック
        if (game.player.gold < item.price) {
          showFloatMessage('お金が足りない！', el);
          return;
        }

        // ポーション上限チェック
        if (item.type === 'potion' && game.scaling.potions.length >= 3) {
          showFloatMessage('ポーションがいっぱいです！', el);
          return;
        }

        // 購入確認ポップアップ
        const confirmed = await showConfirmDialog(`
          <div style="text-align:center;">
            <div style="font-size:2rem;">${item.emoji}</div>
            <div style="font-weight:700; margin:8px 0;">${displayName}</div>
            ${displayDesc ? `<div style="color:var(--text-secondary); font-size:0.85rem;">${displayDesc}</div>` : ''}
            <div style="margin-top:12px; color:var(--accent-yellow); font-weight:600;">💰 ${item.price} ゴールド</div>
            <div style="margin-top:8px; font-weight:600;">こうにゅうしますか？</div>
          </div>
        `);
        if (!confirmed) return;

        if (item.type === 'remove_card') {
          if (game.buyItem(item)) {
            showDeckForRemoval();
            item.sold = true;
            el.classList.add('sold');
            document.getElementById('shop-gold').textContent = game.player.gold;
          }
        } else {
          if (game.buyItem(item)) {
            item.sold = true;
            el.classList.add('sold');
            document.getElementById('shop-gold').textContent = game.player.gold;
          }
        }
      });

      itemsEl.appendChild(el);
    }
  }
}

function showDeckForRemoval() {
  const modal = document.getElementById('modal-card-select');
  modal.style.display = 'block';
  document.getElementById('card-select-title').textContent = '除去するカードを選んでください';

  const list = document.getElementById('card-select-list');
  list.innerHTML = '<div class="card-select-row">' +
    game.playerDeck.map((c, i) => `<div data-deck-index="${i}">${createCardHTML(c, true)}</div>`).join('') +
    '</div>';

  list.querySelectorAll('[data-deck-index]').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.deckIndex);
      game.removeCardFromDeck(idx);
      modal.style.display = 'none';
    });
  });

  document.getElementById('btn-skip-card').onclick = () => {
    modal.style.display = 'none';
  };
}

// === イベントレンダリング ===
function renderEvent() {
  const event = game.currentEvent;
  if (!event) return;

  document.getElementById('event-title').textContent = `${event.emoji} ${event.title}`;
  document.getElementById('event-desc').textContent = event.description;
  document.getElementById('event-result').style.display = 'none';
  document.getElementById('btn-close-event').style.display = 'none';

  const choicesEl = document.getElementById('event-choices');
  choicesEl.style.display = 'flex';
  choicesEl.innerHTML = '';

  for (const choice of event.choices) {
    const btn = document.createElement('button');
    btn.className = 'event-choice-btn';
    btn.textContent = choice.text;

    btn.addEventListener('click', () => {
      const result = game.applyEventEffect(choice.effect);
      const resultEl = document.getElementById('event-result');
      resultEl.textContent = result.message;
      resultEl.style.display = 'block';
      resultEl.style.background = 'var(--bg-glass)';
      choicesEl.style.display = 'none';

      if (result.needCardSelect) {
        document.getElementById('btn-close-event').style.display = 'none';
        setTimeout(() => {
          const upgradable = game.playerDeck.filter(c => c.level < 3);
          if (upgradable.length === 0) {
            game.changeScreen(SCREENS.MAP);
            return;
          }
          showCardSelect(upgradable, (card) => {
            const targetLevel = card.level + 1;
            while (card.level < targetLevel && card.level < 3) {
              addCardXP(card);
            }
            game.changeScreen(SCREENS.MAP);
          });
        }, 1000);
      } else if (choice.effect && choice.effect.type === 'random_card' && result.card) {
        // カードをもらうイベントの場合、モーダルを開いてカードを表示（選ばなくても獲得済み）
        document.getElementById('btn-close-event').style.display = 'none';
        setTimeout(() => {
          showCardSelect([result.card], (card) => {
            game.changeScreen(SCREENS.MAP);
          });
          // スキップボタンを「つぎへ」という名前に変えて動作させる（視覚的配慮）
          const skipBtn = document.getElementById('btn-skip-card');
          const originalText = skipBtn.textContent;
          skipBtn.textContent = 'つぎへ';

          skipBtn.onclick = () => {
            document.getElementById('modal-card-select').style.display = 'none';
            skipBtn.textContent = originalText;
            game.changeScreen(SCREENS.MAP);
          };
        }, 1000);
      } else {
        document.getElementById('btn-close-event').style.display = 'block';
      }
    });

    choicesEl.appendChild(btn);
  }
}

// === ゲームオーバー/クリアレンダリング ===
function renderGameOver() {
  const statsEl = document.getElementById('gameover-stats');
  statsEl.innerHTML = `
    <div class="stat-row"><span class="stat-label">到達フロア</span><span class="stat-value">${game.currentFloor} / 4</span></div>
    <div class="stat-row"><span class="stat-label">勝利バトル</span><span class="stat-value">${game.stats.battlesWon}</span></div>
    <div class="stat-row"><span class="stat-label">最大コンボ</span><span class="stat-value">${game.stats.maxCombo}</span></div>
  `;

  // 弱点単語・計算問題・漢字問題
  const weakIds = game.spacedRep.getWeakWords(8);
  const weakEl = document.getElementById('gameover-weak-words');
  const allItems = [...game.wordDb.words, ...game.mathDb.words, ...game.kanjiDb.words];
  const weakLabel = game.characterId === 'mathmaster'
    ? '📝 にがてな計算'
    : game.characterId === 'kungfumaster'
      ? '📝 にがてな漢字'
      : '📝 にがてな単語';
  if (weakIds.length > 0) {
    const words = weakIds.map(id => {
      const word = allItems.find(w => String(w.id) === String(id));
      return word ? `<span class="weak-word-tag">${word.emoji} ${word.english} = ${word.japanese}</span>` : '';
    }).join('');
    weakEl.innerHTML = `<p style="font-size:var(--font-sm);color:var(--text-secondary);margin-bottom:4px">${weakLabel}</p><div class="weak-word-list">${words}</div>`;
  } else {
    weakEl.innerHTML = '';
  }

  game.saveManager.saveBestRun(game.stats);
}

function escapeHTML(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * オンラインランキングの1行HTMLを生成する
 * @param {Object} lb - ランキングエントリー
 * @param {number} rank - 順位（1始まり）
 * @param {string} prefix - DOM IDプレフィックス
 * @returns {string} HTML文字列
 */
function renderLeaderboardRowHTML(lb, rank, prefix = 'lb') {
  const rankBadge = rank === 1 ? '🥇 1位' : rank === 2 ? '🥈 2位' : rank === 3 ? '🥉 3位' : `${rank}位`;
  const ascTag = lb.ascensionLevel > 0 ? `<span class="lb-asc-badge">🏆Lv.${lb.ascensionLevel}</span>` : '';
  const mineTag = lb.isMine ? `<span class="lb-mine-badge">✨あなた</span>` : '';
  const dateStr = escapeHTML(lb.date || formatDateYMD(lb.timestamp || Date.now()));
  const safeName = escapeHTML(lb.name || 'ななしの冒険者');
  const safeBoss = escapeHTML(lb.bossName || 'ボス');
  const deckList = Array.isArray(lb.deck) ? lb.deck : [];
  const totalCards = deckList.reduce((sum, c) => sum + (c.count || 1), 0);
  const topCardsPreview = deckList.slice(0, 3).map(c =>
    `<span class="lb-card-chip rarity-${c.rarity || 'common'}">${c.emoji}${escapeHTML(c.name)}${c.level > 1 ? `Lv.${c.level}` : ''}${c.count > 1 ? `×${c.count}` : ''}</span>`
  ).join('');
  const fullDeckHTML = deckList.map(c =>
    `<span class="lb-card-chip rarity-${c.rarity || 'common'}">${c.emoji} ${escapeHTML(c.name)} Lv.${c.level || 1} ×${c.count || 1}</span>`
  ).join('');
  const relicsHTML = Array.isArray(lb.relics) && lb.relics.length > 0
    ? `<div class="lb-relics-row">✨ レリック: ${lb.relics.map(r => escapeHTML(r)).join(' ')}</div>`
    : '';
  const detailId = `${prefix}-deck-detail-${rank}-${escapeHTML(lb.id)}`;

  return `
    <div class="lb-row ${lb.isMine ? 'lb-row-mine' : ''} ${rank <= 3 ? `lb-rank-${rank}` : ''}">
      <div class="lb-row-main">
        <div class="lb-left">
          <span class="lb-rank">${rankBadge}</span>
          <span class="lb-name">${safeName}</span>
          ${mineTag}
          <span class="lb-char">${escapeHTML(lb.emoji || '🧙‍♂️')} ${escapeHTML(lb.character || 'ワードマスター')}</span>
          ${ascTag}
        </div>
        <div class="lb-right">
          <span class="lb-score">${Number(lb.score || 0).toLocaleString()}点</span>
          <span class="lb-date">📅 ${dateStr}</span>
        </div>
      </div>
      <div class="lb-row-sub">
        <div class="lb-deck-preview">
          <span class="lb-deck-label">🃏 主力:</span>
          ${topCardsPreview || '<span style="color:var(--text-muted);font-size:0.72rem;">基本デッキ</span>'}
        </div>
        ${deckList.length > 0 ? `<button type="button" class="lb-deck-toggle-btn" data-target="${detailId}">🃏 デッキ構成(${totalCards}枚) ▼</button>` : ''}
      </div>
      <div id="${detailId}" class="lb-deck-drawer" style="display:none;">
        <div class="lb-deck-drawer-title">🃏 クリア時のデッキ構成（全${totalCards}枚 / 撃破ボス: ${safeBoss}）</div>
        <div class="lb-deck-chips-wrap">${fullDeckHTML}</div>
        ${relicsHTML}
      </div>
    </div>
  `;
}

/**
 * オンラインランキング全体（TOP10 ＋ 11位以下の場合は自分の現在順位のみ）のHTMLを生成
 */
function renderOnlineLeaderboardBlockHTML(lbData, prefix = 'lb') {
  const top10 = lbData.top10 || [];
  const myRank = lbData.myRank;
  const myEntry = lbData.myEntry;
  const totalPlayers = lbData.totalPlayers || top10.length;

  let myRankBanner = '';
  if (myRank && myEntry) {
    if (myRank <= 10) {
      myRankBanner = `
        <div class="lb-my-rank-banner top10">
          👑 <strong>全国 TOP 10 ランクイン！</strong> 現在の順位：<strong>全国 第 ${myRank} 位</strong> / ${totalPlayers}人中（${Number(myEntry.score).toLocaleString()}点）
        </div>
      `;
    } else {
      myRankBanner = `
        <div class="lb-my-rank-banner outside">
          📍 あなたの現在の順位：<strong>全国 第 ${myRank} 位</strong> / ${totalPlayers}人中（TOP10まであと <strong>${Number((top10[9]?.score || 0) - myEntry.score + 100).toLocaleString()}点</strong>！）
        </div>
      `;
    }
  }

  const top10HTML = top10.length > 0
    ? top10.map((item, idx) => renderLeaderboardRowHTML(item, idx + 1, prefix)).join('')
    : `<div style="text-align:center; padding: 20px; color: var(--text-muted); font-size: 0.85rem;">🏆 まだ記録がありません。クリアして最初の全国1位になろう！</div>`;

  // 11位以下の場合は「・・・」の下に現在の自分の順位のみを表示
  let outsideTop10HTML = '';
  if (myRank && myRank > 10 && myEntry) {
    outsideTop10HTML = `
      <div class="lb-separator">・・・（11位以下はあなたの現在順位のみ表示）・・・</div>
      <div class="lb-current-rank-only-wrap">
        <div class="lb-current-rank-header">📍 あなたの現在の順位（全国 第 ${myRank} 位 / ${totalPlayers}人中）</div>
        ${renderLeaderboardRowHTML(myEntry, myRank, `${prefix}-me`)}
      </div>
    `;
  }

  return `
    <div class="online-lb-container">
      <div class="online-lb-header">
        <span>🌐 全国オンラインランキング TOP 10</span>
        <span class="online-lb-count">参加者: ${totalPlayers}名</span>
      </div>
      ${myRankBanner}
      <div class="online-lb-list">
        ${top10HTML}
      </div>
      ${outsideTop10HTML}
    </div>
  `;
}

/**
 * ランキング内の「🃏 デッキ構成 ▼」開閉ボタンにイベントをバインド
 */
function bindLeaderboardEvents(containerEl) {
  if (!containerEl) return;
  containerEl.querySelectorAll('.lb-deck-toggle-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const targetId = btn.dataset.target;
      const drawer = document.getElementById(targetId);
      if (!drawer) return;
      const isHidden = drawer.style.display === 'none';
      drawer.style.display = isHidden ? 'block' : 'none';
      btn.textContent = btn.textContent.replace(isHidden ? '▼' : '▲', isHidden ? '▲' : '▼');
    });
  });
}

function renderVictory() {
  const statsEl = document.getElementById('victory-stats');

  // スコア計算
  const enemiesScore = (game.stats.enemiesDefeated || 0) * 200;
  const comboScore = (game.stats.maxCombo || 0) * 400;
  const wisdomBonus = Math.floor((game.stats.totalWisdomScore || 0) * 0.6);

  // ダメージスコア
  const maxDamage = game.stats.maxDamage || 0;
  const damageScore = Math.floor(maxDamage * 50);

  // ボス撃破ボーナス
  let bossBonus = 0;
  if (game.stats.lastBossId === 'astral_eater') bossBonus = 16000;
  else if (game.stats.lastBossId === 'omni_deity') bossBonus = 15000;
  else if (game.stats.lastBossId === 'evolving_archive') bossBonus = 10000;
  else if (game.stats.lastBossId === 'word_king') bossBonus = 5000;
  else if (game.stats.lastBossId === 'magma_behemoth') bossBonus = 4000;
  else if (game.stats.lastBossId === 'cave_dragon') bossBonus = 3000;
  else if (game.stats.lastBossId === 'queen_bee') bossBonus = 2500;
  else if (game.stats.lastBossId === 'forest_guardian') bossBonus = 2000;

  const goldScore = (game.player?.gold || 0) * 10;
  const baseScore = 5000;
  const ascMult = 1 + (game.ascensionLevel || 0) * 0.15;
  const rawScore = baseScore + enemiesScore + comboScore + damageScore + wisdomBonus + bossBonus + goldScore;
  const totalScore = Math.round(rawScore * ascMult);

  const todayStr = formatDateYMD();
  const summarizedDeck = summarizeDeck(game.playerDeck || []);
  const relicEmojis = (game.scaling?.relics || []).map(r => r.emoji);
  const savedName = game.saveManager.getPlayerName() || '';
  const deckChipsHTML = summarizedDeck.map(c =>
    `<span class="lb-card-chip rarity-${c.rarity || 'common'}">${c.emoji} ${c.name} Lv.${c.level} ×${c.count}</span>`
  ).join('');

  statsEl.innerHTML = `
    <div class="stat-row"><span class="stat-label">📅 クリア達成日</span><span class="stat-value">${todayStr}</span></div>
    <div class="stat-row"><span class="stat-label">👤 キャラクター</span><span class="stat-value">${game.player?.emoji || '🧙‍♂️'} ${game.player?.name || 'ワードマスター'} (🏆Lv.${game.ascensionLevel || 0})</span></div>
    <div class="stat-row"><span class="stat-label">クリアボーナス</span><span class="stat-value">+${baseScore}点</span></div>
    <div class="stat-row"><span class="stat-label">ボス撃破 (${game.stats.lastBossName || 'ボス'})</span><span class="stat-value">+${bossBonus}点</span></div>
    <div class="stat-row"><span class="stat-label">倒した敵 (${game.stats.enemiesDefeated || 0}体)</span><span class="stat-value">+${enemiesScore}点</span></div>
    <div class="stat-row"><span class="stat-label">最大コンボ (${game.stats.maxCombo || 0})</span><span class="stat-value">+${comboScore}点</span></div>
    <div class="stat-row"><span class="stat-label">最大ダメージ (${maxDamage})</span><span class="stat-value">+${damageScore}点</span></div>
    <div class="stat-row"><span class="stat-label">智恵ボーナス</span><span class="stat-value">+${wisdomBonus}点</span></div>
    <div class="stat-row"><span class="stat-label">所持ゴールド (${game.player?.gold || 0}G)</span><span class="stat-value">+${goldScore}点</span></div>
    ${game.ascensionLevel > 0 ? `<div class="stat-row"><span class="stat-label">登塔レベル倍率 (Lv.${game.ascensionLevel})</span><span class="stat-value">×${ascMult.toFixed(2)}</span></div>` : ''}
    <div class="stat-row" style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.2); font-size: 1.2em; font-weight: bold; color: var(--accent-yellow);">
      <span class="stat-label">最終スコア</span><span class="stat-value">${totalScore.toLocaleString()}点</span>
    </div>

    <div class="victory-deck-box">
      <div class="victory-deck-title">🃏 クリア時のデッキ構成（全${(game.playerDeck || []).length}枚）</div>
      <div class="lb-deck-chips-wrap">${deckChipsHTML}</div>
      ${relicEmojis.length > 0 ? `<div class="lb-relics-row">✨ 所持レリック: ${relicEmojis.join(' ')}</div>` : ''}
    </div>

    <div class="victory-submit-box" id="victory-submit-box">
      <div class="victory-submit-title">🌐 全国オンラインランキングにスコア＆デッキを登録！</div>
      <div class="victory-submit-row">
        <input type="text" id="victory-player-name" class="victory-name-input" maxlength="10" placeholder="なまえを入力（10文字まで）" value="${savedName}" />
        <button type="button" id="btn-submit-online-score" class="btn btn-primary btn-small">🏆 ランキング送信</button>
      </div>
      <div id="victory-submit-status" class="victory-submit-status"></div>
    </div>

    <div id="victory-share-area" style="display:none; margin-top:10px; text-align:center;">
      <button type="button" id="btn-share-x" class="btn-share-x">🐦 X（旧Twitter）で順位＆デッキをポストする！</button>
    </div>

    <div id="victory-online-leaderboard" style="margin-top:12px;">
      <div style="text-align:center; color:var(--text-muted); font-size:0.8rem;">🌐 オンラインランキングを読み込み中...</div>
    </div>
  `;

  game.saveManager.saveBestRun(game.stats);

  const lbContainer = document.getElementById('victory-online-leaderboard');
  // 初回表示：現在のランキング一覧を非同期取得して表示
  game.saveManager.fetchOnlineLeaderboard().then(lbData => {
    if (lbContainer) {
      lbContainer.innerHTML = renderOnlineLeaderboardBlockHTML(lbData, 'vic-lb');
      bindLeaderboardEvents(lbContainer);
    }
  });

  // 名前送信ボタンのイベント
  const submitBtn = document.getElementById('btn-submit-online-score');
  const nameInput = document.getElementById('victory-player-name');
  const statusEl = document.getElementById('victory-submit-status');
  const shareArea = document.getElementById('victory-share-area');
  const shareBtn = document.getElementById('btn-share-x');

  if (submitBtn && nameInput) {
    submitBtn.addEventListener('click', async () => {
      if (submitBtn.disabled) return;
      const playerName = nameInput.value.trim() || 'ななしの冒険者';
      submitBtn.disabled = true;
      submitBtn.textContent = '⏳ 送信中...';
      statusEl.textContent = 'クラウドへスコアとデッキ構成を送信しています...';

      const isTestMode = Boolean(window.USED_TEST_CHEAT || window.TEST_9999_DAMAGE || window.DEBUG_MODE);
      const onlineData = await game.saveManager.submitOnlineScore({
        name: playerName,
        characterId: game.characterId || 'wordmaster',
        character: game.player?.name || 'ワードマスター',
        emoji: game.player?.emoji || '🧙‍♂️',
        ascensionLevel: game.ascensionLevel || 0,
        score: totalScore,
        bossName: game.stats.lastBossName || 'ボス',
        date: todayStr,
        relics: relicEmojis,
        deck: summarizedDeck,
        isTestMode
      });

      submitBtn.textContent = '✅ 登録完了！';
      nameInput.disabled = true;

      if (onlineData.myRank <= 10) {
        statusEl.innerHTML = `🎉 <strong>全国 第 ${onlineData.myRank} 位</strong>（TOP 10！）にランクインしました！`;
      } else {
        statusEl.innerHTML = `📍 登録完了！ あなたの現在の順位：<strong>全国 第 ${onlineData.myRank} 位</strong> / ${onlineData.totalPlayers}人中`;
      }

      if (lbContainer) {
        lbContainer.innerHTML = renderOnlineLeaderboardBlockHTML(onlineData, 'vic-lb');
        bindLeaderboardEvents(lbContainer);
      }

      // X(Twitter)シェアボタンを表示
      if (shareArea && shareBtn) {
        shareArea.style.display = 'block';
        const topCardsText = summarizedDeck.slice(0, 3).map(c => `${c.emoji}${c.name}Lv.${c.level}`).join(' / ');
        const tweetText = `【WordQuest ⚔️ 知恵と冒険の塔】\n${game.player?.emoji || '🧙‍♂️'}${game.player?.name || 'ワードマスター'}(🏆Lv.${game.ascensionLevel || 0})でクリア！\n🏆 全国ランキング：第${onlineData.myRank}位（${totalScore.toLocaleString()}点）\n🃏 主力デッキ：${topCardsText}\n📅 ${todayStr}\n#WordQuest\nhttps://eyeikebukuro-del.github.io/wordquest/`;
        shareBtn.onclick = () => {
          window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`, '_blank', 'noopener,noreferrer');
        };
      }
    });
  }
}

// === デッキ表示 ===
function showDeck() {
  const modal = document.getElementById('modal-deck');
  modal.style.display = 'block';

  const list = document.getElementById('deck-list');
  list.innerHTML = '<div class="deck-grid">' +
    game.playerDeck.map(c => createCardHTML(c, false, false)).join('') +
    '</div>';
}

// === 全国オンラインランキングモーダル表示 ===
let currentRankingFilter = 'all';

function showRanking(filterChar = 'all') {
  currentRankingFilter = filterChar;
  const modal = document.getElementById('modal-ranking');
  if (!modal) return;
  modal.style.display = 'block';

  const filterEl = document.getElementById('ranking-filter');
  if (filterEl) {
    filterEl.innerHTML = `
      <button type="button" class="wordlist-cat-btn ${filterChar === 'all' ? 'active' : ''}" data-rchar="all">🌟 総合ランキング</button>
      <button type="button" class="wordlist-cat-btn ${filterChar === 'wordmaster' ? 'active' : ''}" data-rchar="wordmaster">🧙‍♂️ ワードマスター</button>
      <button type="button" class="wordlist-cat-btn ${filterChar === 'mathmaster' ? 'active' : ''}" data-rchar="mathmaster">🧮 算術マスター</button>
      <button type="button" class="wordlist-cat-btn ${filterChar === 'kungfumaster' ? 'active' : ''}" data-rchar="kungfumaster">🥋 カンフーマスター</button>
    `;
    filterEl.querySelectorAll('.wordlist-cat-btn').forEach(btn => {
      btn.addEventListener('click', () => showRanking(btn.dataset.rchar));
    });
  }

  const contentEl = document.getElementById('ranking-content');
  if (!contentEl) return;
  contentEl.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding:24px;">🌐 全国オンラインランキングを読み込み中...</div>`;

  game.saveManager.fetchOnlineLeaderboard().then(lbData => {
    let entries = lbData.entries || [];
    if (filterChar !== 'all') {
      entries = entries.filter(e => e.characterId === filterChar);
    }
    const myEntry = entries.find(e => e.isMine) || (filterChar === 'all' ? lbData.myEntry : null);
    const myRank = myEntry ? (entries.findIndex(e => e.id === myEntry.id) + 1) : null;

    const filteredData = {
      top10: entries.slice(0, 10),
      entries,
      myRank: myRank > 0 ? myRank : null,
      myEntry,
      totalPlayers: entries.length
    };
    contentEl.innerHTML = renderOnlineLeaderboardBlockHTML(filteredData, 'modal-lb');
    bindLeaderboardEvents(contentEl);
  });
}

// === 学習記録表示 ===
function showStats() {
  const modal = document.getElementById('modal-stats');
  modal.style.display = 'block';

  const stats = game.spacedRep.getStats();
  const best = game.saveManager.loadBestRun();
  const mastery = game.getMasteryBonus();
  const achievements = game.getAchievements();
  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const leaderboard = game.saveManager.getLeaderboard ? game.saveManager.getLeaderboard() : [];

  const badgesHtml = `
    <div style="margin-top:18px; text-align:left;">
      <h3 style="text-align:center; color: var(--accent-yellow); margin-bottom: 6px;">🏅 称号・バッジコレクション (${unlockedCount} / ${achievements.length})</h3>
      <div class="mastery-banner">
        🎁 図鑑マスター報酬：冒険スタート時の最大HP <strong>+${mastery.hpBonus}</strong>（✅${mastery.masteredTotal}問 / 👑${mastery.crownedTotal}個）
      </div>
      <div class="badge-grid">
        ${achievements.map(a => `
          <div class="badge-card ${a.unlocked ? 'unlocked' : 'locked'}">
            <div class="badge-emoji">${a.unlocked ? a.emoji : '🔒'}</div>
            <div class="badge-title">${a.title}</div>
            <div class="badge-desc">${a.desc}</div>
            <div class="badge-progress">${a.unlocked ? '✨ 獲得ずみ！' : a.progress}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  const topHtml = `
    <div id="stats-online-leaderboard" style="margin-top:20px; text-align:left;">
      <div style="text-align:center; color:var(--text-muted); padding:16px;">🌐 全国オンラインランキングを読み込み中...</div>
    </div>
  `;

  document.getElementById('stats-content').innerHTML = `
    <div class="stats-grid">
      <div class="stats-card">
        <div class="stats-card-value" style="color:var(--accent-green)">${stats.accuracy}%</div>
        <div class="stats-card-label">正答率</div>
      </div>
      <div class="stats-card">
        <div class="stats-card-value" style="color:var(--accent-blue)">${stats.totalAttempted}</div>
        <div class="stats-card-label">出題数</div>
      </div>
      <div class="stats-card">
        <div class="stats-card-value" style="color:var(--accent-purple)">${stats.wordsLearned}</div>
        <div class="stats-card-label">マスター数</div>
      </div>
      <div class="stats-card">
        <div class="stats-card-value" style="color:var(--accent-red)">${stats.weakWords}</div>
        <div class="stats-card-label">にがてな問題</div>
      </div>
    </div>
    <div style="text-align:center;color:var(--text-secondary);font-size:var(--font-sm);margin-top:15px;">
      <p>総プレイ回数: ${best.totalRuns || 0} / クリアしたフロア: ${best.floorsCleared || 0}</p>
    </div>
    ${badgesHtml}
    ${topHtml}
  `;

  const statsLbEl = document.getElementById('stats-online-leaderboard');
  game.saveManager.fetchOnlineLeaderboard().then(lbData => {
    if (statsLbEl) {
      statsLbEl.innerHTML = renderOnlineLeaderboardBlockHTML(lbData, 'stats-lb');
      bindLeaderboardEvents(statsLbEl);
    }
  });
}

// === 画面遷移ハンドラー ===
game.onScreenChange = (screen) => {
  showScreen(screen);

  switch (screen) {
    case SCREENS.MAP:
      renderMap();
      break;
    case SCREENS.BATTLE:
      renderBattle();
      break;
    case SCREENS.REWARD:
      renderRewards();
      break;
    case SCREENS.SHOP:
      renderShop();
      break;
    case SCREENS.EVENT:
      renderEvent();
      break;
    case SCREENS.GAME_OVER:
      renderGameOver();
      break;
    case SCREENS.VICTORY:
      renderVictory();
      break;
  }
};

// === イベントリスナー等 ===
window.addEventListener('resize', () => {
  if (window.innerWidth <= 768) {
    document.body.classList.add('mobile');
  } else {
    document.body.classList.remove('mobile');
  }

  // マップ画面を開いている時はリサイズに合わせて線を再描画
  if (game && game.currentScreen === SCREENS.MAP && document.getElementById('screen-map').classList.contains('active')) {
    drawMapConnections();
  }
});

document.addEventListener('DOMContentLoaded', () => {
  // 現在選択中のキャラクターIDと登塔レベル（アセンション）
  let selectedCharacterId = 'wordmaster';
  let selectedAscensionLevel = 0;

  const ASCENSION_DESCRIPTIONS = {
    0: '標準の難易度で楽しく学べます（スコア倍率 ×1.0）',
    1: '【Lv.1 強敵】すべての敵のHP・攻撃力が +8% 上昇（スコア倍率 ×1.15）',
    2: '【Lv.2 猛攻】すべての敵のHP・攻撃力が +16% 上昇（スコア倍率 ×1.30）',
    3: '【Lv.3 達人】敵ステータス +24% UP（スコア倍率 ×1.45）',
    4: '【Lv.4 鉄人】敵ステータス +32% UP（スコア倍率 ×1.60）',
    5: '【Lv.5 神域】敵ステータス +40% UP！最高峰の試練（スコア倍率 ×1.75）'
  };

  document.querySelectorAll('#ascension-buttons .asc-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#ascension-buttons .asc-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedAscensionLevel = parseInt(btn.dataset.asc || '0', 10);
      const descEl = document.getElementById('ascension-desc');
      if (descEl) descEl.textContent = ASCENSION_DESCRIPTIONS[selectedAscensionLevel] || '';
      if (window.sm) window.sm.playUIClick();
    });
  });

  // テストプレイ専用ツールバー（ローカル実行時または ?test=1 のみ表示）
  const isLocalTest = location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.search.includes('test=1');
  const testToolbar = document.getElementById('test-play-toolbar');
  if (isLocalTest && testToolbar) {
    testToolbar.style.display = 'flex';
    const btn9999 = document.getElementById('btn-test-9999');
    const btnTestMap = document.getElementById('btn-test-map');
    const btnNextFloor = document.getElementById('btn-test-next-floor');
    const btnTestBoss = document.getElementById('btn-test-boss');

    if (btn9999) {
      btn9999.addEventListener('click', () => {
        window.TEST_9999_DAMAGE = !window.TEST_9999_DAMAGE;
        window.USED_TEST_CHEAT = true;
        btn9999.textContent = `⚡ 9999ダメージ: ${window.TEST_9999_DAMAGE ? 'ON' : 'OFF'}`;
        btn9999.classList.toggle('active', window.TEST_9999_DAMAGE);
      });
    }

    if (btnTestMap) {
      btnTestMap.addEventListener('click', () => {
        window.DEBUG_MODE = !window.DEBUG_MODE;
        window.USED_TEST_CHEAT = true;
        btnTestMap.textContent = `🗺️ 自由移動: ${window.DEBUG_MODE ? 'ON' : 'OFF'}`;
        btnTestMap.classList.toggle('active', window.DEBUG_MODE);
        if (game.currentScreen === SCREENS.MAP) {
          renderMap();
        }
      });
    }

    if (btnNextFloor) {
      btnNextFloor.addEventListener('click', () => {
        window.USED_TEST_CHEAT = true;
        if (!game.player) {
          game.startNewRun(selectedCharacterId, selectedAscensionLevel);
        }
        game.currentFloor = (game.currentFloor % 4) + 1;
        if (!game.maps[game.currentFloor]) {
          game.maps[game.currentFloor] = generateMap(game.currentFloor);
        }
        game.currentNodeId = 'start';
        isAnimating = false;
        game.changeScreen(SCREENS.MAP);
      });
    }

    if (btnTestBoss) {
      btnTestBoss.addEventListener('click', () => {
        window.USED_TEST_CHEAT = true;
        if (!game.player) {
          game.startNewRun(selectedCharacterId, selectedAscensionLevel);
        }
        if (!game.maps[game.currentFloor]) {
          game.maps[game.currentFloor] = generateMap(game.currentFloor);
        }
        game.currentNodeId = 'boss';
        isAnimating = false;
        game.startBossBattle();
      });
    }

    const btnTestVictory = document.getElementById('btn-test-victory');
    if (btnTestVictory) {
      btnTestVictory.addEventListener('click', () => {
        window.USED_TEST_CHEAT = true;
        if (!game.player) {
          game.startNewRun(selectedCharacterId, selectedAscensionLevel);
        }
        game.stats.enemiesDefeated = Math.max(game.stats.enemiesDefeated || 0, 12);
        game.stats.maxCombo = Math.max(game.stats.maxCombo || 0, 9);
        game.stats.maxDamage = Math.max(game.stats.maxDamage || 0, 68);
        game.stats.totalWisdomScore = Math.max(game.stats.totalWisdomScore || 0, 4500);
        game.stats.lastBossId = 'omni_deity';
        game.stats.lastBossName = '全知の神 オムニ・ディエティ';
        isAnimating = false;
        game.changeScreen(SCREENS.VICTORY);
      });
    }
  }

  // メニュー
  document.getElementById('btn-new-game').addEventListener('click', () => {
    // キャラクター選択画面への遷移とスクロール初期化
    showScreen('char-select');
    setTimeout(() => {
      const charGrid = document.querySelector('.char-grid');
      if (charGrid) charGrid.scrollLeft = 0;
    }, 10); // 画面アクティブ化の時間を少し待つことで確実に適用させる
  });

  // キャラクター選択画面：「冒険にしゅっぱつ！」ボタン
  document.getElementById('btn-start-adventure').addEventListener('click', () => {
    if (window.sm) window.sm.playGameStart();
    game.startNewRun(selectedCharacterId, selectedAscensionLevel);
  });

  // キャラクターカード（解放済）のクリックで選択切り替え（既に選択中ならそのまま出撃も可能）
  document.querySelectorAll('.char-card:not(.locked)').forEach(card => {
    card.addEventListener('click', () => {
      const charId = card.dataset.char || 'wordmaster';
      document.querySelectorAll('.char-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      selectedCharacterId = charId;
      if (window.sm) window.sm.playUIClick();
    });
  });

  document.getElementById('btn-back-menu').addEventListener('click', () => {
    showScreen('menu');
  });

  document.getElementById('btn-ranking')?.addEventListener('click', () => showRanking('all'));
  document.getElementById('btn-close-ranking')?.addEventListener('click', () => {
    document.getElementById('modal-ranking').style.display = 'none';
  });
  document.getElementById('btn-stats').addEventListener('click', showStats);

  // マップ
  document.getElementById('btn-view-deck').addEventListener('click', showDeck);

  // バトル
  document.getElementById('btn-end-turn').addEventListener('click', onEndTurn);

  // タイピング入力
  document.getElementById('typing-submit').addEventListener('click', () => {
    const input = document.getElementById('typing-input');
    if (input.value.trim()) {
      onQuizAnswer(input.value, currentBattle?.currentQuiz);
    }
  });

  document.getElementById('typing-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const input = document.getElementById('typing-input');
      if (input.value.trim()) {
        onQuizAnswer(input.value, currentBattle?.currentQuiz);
      }
    }
  });

  // 報酬
  document.getElementById('btn-close-reward').addEventListener('click', () => {
    game.closeRewards();
  });

  // ショップ
  document.getElementById('btn-close-shop').addEventListener('click', () => {
    game.changeScreen(SCREENS.MAP);
  });

  // 休憩
  document.getElementById('btn-rest-heal').addEventListener('click', () => {
    game.rest('heal');
  });

  document.getElementById('btn-rest-upgrade').addEventListener('click', () => {
    const upgradable = game.playerDeck.filter(c => c.level < 3);
    if (upgradable.length === 0) return; // 全カードがレベル3
    showCardSelect(upgradable, (card) => {
      const targetLevel = card.level + 1;
      // ターゲットレベルに達するまでXPを追加し続ける
      while (card.level < targetLevel && card.level < 3) {
        addCardXP(card);
      }
      game.changeScreen(SCREENS.MAP);
    });
  });

  // イベント
  document.getElementById('btn-close-event').addEventListener('click', () => {
    game.changeScreen(SCREENS.MAP);
  });

  // ゲームオーバー
  document.getElementById('btn-to-menu').addEventListener('click', () => {
    location.reload(); // 完全状態リセットのためリロード
  });

  // クリア
  document.getElementById('btn-victory-menu').addEventListener('click', () => {
    location.reload(); // 完全状態リセットのためリロード
  });

  // モーダル閉じる
  document.getElementById('btn-close-deck').addEventListener('click', () => {
    document.getElementById('modal-deck').style.display = 'none';
  });

  document.getElementById('btn-close-stats').addEventListener('click', () => {
    document.getElementById('modal-stats').style.display = 'none';
  });

  // === たんご・かけ算・かんじリスト ===
  const wordListDb = new WordDatabase();
  const mathListDb = new MathDatabase();
  const kanjiListDb = new KanjiDatabase();
  const CATEGORY_LABELS = {
    food: '🍎 たべもの', animal: '🐱 どうぶつ', color: '🎨 いろ',
    number: '🔢 かず', body: '🤚 からだ', family: '👨‍👩‍👧 かぞく',
    school: '🏫 がっこう', nature: '🌳 しぜん', weather: '☀️ てんき',
    clothes: '👕 ふく', home: '🏠 おうち', action: '🏃 うごき',
    feeling: '😊 きもち', place: '🏞️ ばしょ', time: '⏰ じかん',
    shape: '🔺 かたち', transport: '🚗 のりもの', toy: '🎮 おもちゃ',
    pronoun: '🙋 だいめいし', person: '🧑 ひと', object: '📦 もの', other: '✨ その他',
    math_1_9: '🔢 九九 (1〜9の段)',
    math_10_12: '🧮 かけ算 (10〜12の段)',
    math_13_15: '📐 かけ算 (13〜15の段)',
    math_16_19: '🌟 かけ算 (16〜19の段)',
    kanji_g1: '🌱 小1の漢字',
    kanji_g2: '🌿 小2の漢字',
    kanji_g3: '🥋 小3の漢字',
    kanji_g4: '🐉 小4の漢字'
  };

  function showWordList(filterCat = 'all') {
    const modal = document.getElementById('modal-wordlist');
    modal.style.display = 'block';

    const learningData = game.spacedRep.learningData;
    const mastery = game.getMasteryBonus();
    const bannerEl = document.getElementById('wordlist-mastery-banner');
    if (bannerEl) {
      bannerEl.innerHTML = `🎁 図鑑マスター報酬：<strong>最大HP +${mastery.hpBonus}</strong>（✅マスター ${mastery.masteredTotal}問 / 👑王冠 ${mastery.crownedTotal}個）`;
    }

    const allListItems = [...wordListDb.words, ...mathListDb.words, ...kanjiListDb.words];

    // カテゴリフィルタボタン生成
    const filterEl = document.getElementById('wordlist-filter');
    const cats = [...wordListDb.categories, ...mathListDb.categories, ...kanjiListDb.categories];
    filterEl.innerHTML =
      `<button class="wordlist-cat-btn ${filterCat === 'all' ? 'active' : ''}" data-cat="all">🌟 ぜんぶ</button>` +
      `<button class="wordlist-cat-btn ${filterCat === 'all_english' ? 'active' : ''}" data-cat="all_english">🧙‍♂️ えいご</button>` +
      `<button class="wordlist-cat-btn ${filterCat === 'all_math' ? 'active' : ''}" data-cat="all_math">🧮 かけ算 (1×1〜19×19)</button>` +
      `<button class="wordlist-cat-btn ${filterCat === 'all_kanji' ? 'active' : ''}" data-cat="all_kanji">🥋 かんじ (小1〜小4)</button>` +
      cats.map(c => `<button class="wordlist-cat-btn ${filterCat === c ? 'active' : ''}" data-cat="${c}">${CATEGORY_LABELS[c] || c}</button>`).join('');

    filterEl.querySelectorAll('.wordlist-cat-btn').forEach(btn => {
      btn.addEventListener('click', () => showWordList(btn.dataset.cat));
    });

    // 単語・計算・漢字リスト生成
    const contentEl = document.getElementById('wordlist-content');
    let words = allListItems;
    if (filterCat === 'all_english') {
      words = wordListDb.words;
    } else if (filterCat === 'all_math') {
      words = mathListDb.words;
    } else if (filterCat === 'all_kanji') {
      words = kanjiListDb.words;
    } else if (filterCat !== 'all') {
      words = allListItems.filter(w => w.category === filterCat);
    }

    // カテゴリごとにグルーピング
    const grouped = {};
    words.forEach(w => {
      if (!grouped[w.category]) grouped[w.category] = [];
      grouped[w.category].push(w);
    });

    let html = '';
    for (const [cat, catWords] of Object.entries(grouped)) {
      // カテゴリ進捗計算
      const totalWords = catWords.length;
      const attemptedWords = catWords.filter(w => learningData[w.id]).length;
      const progressPct = Math.round((attemptedWords / totalWords) * 100);

      html += `<div class="wordlist-category">`;
      html += `<h3 class="wordlist-cat-title">${CATEGORY_LABELS[cat] || cat} (${progressPct}%)</h3>`;
      html += `<div class="cat-progress-container"><div class="cat-progress-bar" style="width: ${progressPct}%"></div></div>`;
      html += `<div class="wordlist-grid">`;
      catWords.forEach(w => {
        const data = learningData[w.id] || { correct: 0, incorrect: 0, weight: 1 };
        const masteryIcon = data.correct >= 5 ? '👑' : (data.correct >= 2 ? '✅' : '');
        const diffStars = '⭐'.repeat(w.difficulty);
        const isEnglishWord = !w.isMath && !w.isKanji;
        const speakBtn = isEnglishWord
          ? `<button type="button" class="wordlist-speak-btn" data-speak="${w.english}" title="発音をきく">🔊</button>`
          : '';

        html += `<div class="wordlist-item diff-${w.difficulty}">
          <span class="wordlist-emoji">${w.emoji}</span>
          <div class="wordlist-english-area">
            <span class="wordlist-english">${w.english}</span>
            <span class="wordlist-japanese">${w.japanese}</span>
          </div>
          ${speakBtn}
          <div class="wordlist-stats">
            <span class="word-mastery">${masteryIcon}</span>
            <span class="word-count-badge correct">○ ${data.correct}</span>
            <span class="word-count-badge incorrect">× ${data.incorrect}</span>
          </div>
          <span class="wordlist-diff">${diffStars}</span>
        </div>`;
      });
      html += `</div></div>`;
    }
    contentEl.innerHTML = html;

    // 図鑑内の英語発音ボタンイベントを設定
    contentEl.querySelectorAll('.wordlist-speak-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const text = btn.dataset.speak;
        if (window.sm && text) window.sm.speakEnglish(text);
      });
    });
  }

  document.getElementById('btn-word-list').addEventListener('click', () => showWordList());
  document.getElementById('btn-close-wordlist').addEventListener('click', () => {
    document.getElementById('modal-wordlist').style.display = 'none';
  });

  // === 🥋 にがて克服トレーニング道場 ===
  let dojoStreak = 0;
  let currentDojoSubject = 'all';

  function showDojoModal(subject = currentDojoSubject) {
    currentDojoSubject = subject;
    const modal = document.getElementById('modal-dojo');
    modal.style.display = 'block';

    const filterEl = document.getElementById('dojo-filter');
    filterEl.innerHTML = `
      <button class="wordlist-cat-btn ${subject === 'all' ? 'active' : ''}" data-subj="all">🌟 ぜんぶ</button>
      <button class="wordlist-cat-btn ${subject === 'english' ? 'active' : ''}" data-subj="english">🧙‍♂️ えいご</button>
      <button class="wordlist-cat-btn ${subject === 'math' ? 'active' : ''}" data-subj="math">🧮 かけ算</button>
      <button class="wordlist-cat-btn ${subject === 'kanji' ? 'active' : ''}" data-subj="kanji">🥋 かんじ</button>
    `;
    filterEl.querySelectorAll('.wordlist-cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        dojoStreak = 0;
        showDojoModal(btn.dataset.subj);
      });
    });

    renderNextDojoQuestion();
  }

  function renderNextDojoQuestion() {
    const contentEl = document.getElementById('dojo-content');
    const learningData = game.spacedRep.learningData || {};

    let pool = [];
    if (currentDojoSubject === 'english') pool = wordListDb.words.filter(w => !w.english.includes(' '));
    else if (currentDojoSubject === 'math') pool = mathListDb.words;
    else if (currentDojoSubject === 'kanji') pool = kanjiListDb.words;
    else pool = [...wordListDb.words.filter(w => !w.english.includes(' ')), ...mathListDb.words, ...kanjiListDb.words];

    // 苦手問題（weight > 1.5 または incorrect > 0 かつ weight > 1.0）を抽出
    const weakPool = pool.filter(w => {
      const d = learningData[w.id];
      return d && (d.weight > 1.5 || (d.incorrect > 0 && d.weight > 1.0));
    });

    const isFreePractice = weakPool.length === 0;
    const targetItem = isFreePractice
      ? pool[Math.floor(Math.random() * pool.length)]
      : weakPool[Math.floor(Math.random() * weakPool.length)];

    // データベース別に4択クイズを生成
    let quiz;
    const randomDir = Math.random() > 0.5 ? 'en_to_jp' : 'jp_to_en';
    if (targetItem.isMath) {
      quiz = mathListDb.generateQuestion(targetItem);
    } else if (targetItem.isKanji) {
      quiz = kanjiListDb.generateQuestion(targetItem, randomDir);
    } else {
      quiz = wordListDb.generateQuestion(targetItem, randomDir);
    }

    const labelText = quiz.type === 'math_choice' ? 'こたえは いくつ？'
      : quiz.type === 'kanji_read' ? '【 】の漢字のよみかたは？'
      : quiz.type === 'kanji_write' ? '【 】に入る漢字はどれ？'
      : quiz.type === 'en_to_jp' ? 'この英語の意味は？'
      : 'この日本語を英語で言うと？';

    const isEnglish = !targetItem.isMath && !targetItem.isKanji;
    const canSpeakNow = isEnglish && quiz.type === 'en_to_jp';

    contentEl.innerHTML = `
      <div class="dojo-arena">
        <div class="dojo-header-stats">
          <span>🎯 のこり苦手問題: <strong style="color:var(--accent-red)">${weakPool.length}問</strong></span>
          <span>🔥 れんぞく正解: <strong style="color:var(--accent-yellow)">${dojoStreak}回</strong></span>
        </div>
        ${isFreePractice ? `<div style="font-size:0.78rem; color:var(--accent-green); margin-bottom:4px;">✨ この分野のにがて問題は 0個 です！（自由特訓モード）</div>` : ''}
        <div class="dojo-dummy-wrap">
          <div id="dojo-dummy-icon" class="dojo-dummy-icon">🪵</div>
          <div style="text-align:left;">
            <div style="font-weight:800; font-size:0.95rem;">特訓の木人（もくじん）</div>
            <div style="font-size:0.75rem; color:var(--text-secondary);">正解して苦手をうちやぶろう！</div>
          </div>
        </div>
        <div style="font-size:0.8rem; color:var(--text-secondary);">${labelText}</div>
        <div class="dojo-quiz-question">${quiz.questionEmoji || ''} ${quiz.question}</div>
        ${canSpeakNow ? `<button type="button" id="btn-dojo-speak" class="quiz-speak-btn" style="margin-bottom:10px;">🔊 発音をきく</button>` : ''}
        <div class="dojo-choices" id="dojo-choices">
          ${quiz.choices.map((c, idx) => `<button type="button" class="quiz-choice" data-idx="${idx}">${c}</button>`).join('')}
        </div>
        <div id="dojo-result" class="quiz-result" style="display:none; margin-top:10px; width:100%; text-align:center;"></div>
      </div>
    `;

    if (canSpeakNow && window.sm) {
      window.sm.speakEnglish(targetItem.english);
      const speakBtn = document.getElementById('btn-dojo-speak');
      if (speakBtn) {
        speakBtn.addEventListener('click', () => window.sm.speakEnglish(targetItem.english));
      }
    }

    const choiceBtns = contentEl.querySelectorAll('#dojo-choices .quiz-choice');
    const resultEl = document.getElementById('dojo-result');
    const dummyIcon = document.getElementById('dojo-dummy-icon');

    choiceBtns.forEach((btn, idx) => {
      btn.addEventListener('click', () => {
        if (btn.classList.contains('disabled')) return;
        choiceBtns.forEach(b => b.classList.add('disabled'));

        const correct = idx === quiz.correctIndex;
        choiceBtns[quiz.correctIndex].classList.add('correct');
        if (!correct) btn.classList.add('incorrect');

        if (isEnglish && quiz.type !== 'en_to_jp' && window.sm) {
          window.sm.speakEnglish(targetItem.english);
        }

        resultEl.style.display = 'block';
        if (correct) {
          dojoStreak++;
          if (window.sm) {
            window.sm.playQuizCorrect();
            setTimeout(() => window.sm.playAttack(), 150);
          }
          if (dummyIcon) {
            dummyIcon.classList.add('hit');
            setTimeout(() => dummyIcon.classList.remove('hit'), 300);
          }
          const graduated = game.spacedRep.recordDojoCorrect(targetItem.id);
          resultEl.className = 'quiz-result correct';
          resultEl.textContent = graduated
            ? `⭕ 正解！ 🎉 にがてを克服したよ！`
            : `⭕ 正解！ ナイス特訓！（${dojoStreak}れんぞく！）`;
        } else {
          dojoStreak = 0;
          if (window.sm) window.sm.playQuizIncorrect();
          game.spacedRep.recordIncorrect(targetItem.id);
          resultEl.className = 'quiz-result incorrect';
          resultEl.textContent = `❌ 残念… 正解は「${quiz.choices[quiz.correctIndex]}」`;
        }

        setTimeout(() => {
          if (document.getElementById('modal-dojo').style.display !== 'none') {
            renderNextDojoQuestion();
          }
        }, 1200);
      });
    });
  }

  const btnDojo = document.getElementById('btn-dojo');
  if (btnDojo) {
    btnDojo.addEventListener('click', () => {
      dojoStreak = 0;
      showDojoModal('all');
    });
  }
  const btnCloseDojo = document.getElementById('btn-close-dojo');
  if (btnCloseDojo) {
    btnCloseDojo.addEventListener('click', () => {
      document.getElementById('modal-dojo').style.display = 'none';
    });
  }
});
