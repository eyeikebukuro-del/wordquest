// WordQuest メインエントリポイント
// ゲームエンジンとUIの統合、イベントバインディングを担当する

import { GameEngine, SCREENS } from './game/GameEngine.js';
import { CARD_TYPES, addCardXP } from './game/CardSystem.js';
import { BATTLE_STATES } from './game/BattleSystem.js';
import { NODE_TYPES, NODE_ICONS, FLOOR_THEMES } from './game/MapGenerator.js';
import { RELIC_DEFINITIONS, POTION_DEFINITIONS } from './game/ScalingSystem.js';

// ゲームエンジンのインスタンス
const game = new GameEngine();

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

  return `
    <div class="card ${typeClass} ${sizeClass} ${disabledClass}" data-instance-id="${card.instanceId}" data-card-id="${card.id}">
      <div class="card-cost">${card.cost}</div>
      <div class="card-emoji">${card.emoji}</div>
      <div class="card-name">${card.name}</div>
      <div class="card-desc">${card.description}</div>
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
  container.style.background = theme.bgGradient;

  // フロアタイトル
  document.getElementById('floor-title').textContent = `${theme.emoji} ${theme.name}`;

  // プレイヤーステータス更新
  document.getElementById('map-hp').textContent = game.player.hp;
  document.getElementById('map-max-hp').textContent = game.player.maxHp;
  document.getElementById('map-gold').textContent = game.player.gold;
  document.getElementById('deck-count').textContent = game.playerDeck.length;

  // レリック表示
  document.getElementById('map-relics').innerHTML = game.scaling.relics.map(r => r.emoji).join('');
  // ポーション表示
  document.getElementById('map-potions').innerHTML = game.scaling.potions.map(p => p.emoji).join('');

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

      // ノード名ラベル
      const labelMap = {
        [NODE_TYPES.BATTLE]: 'バトル',
        [NODE_TYPES.ELITE]: 'エリート',
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

  // DOMへの追加完了後、少し待ってから線を引く（要素の位置が確定してから描画するため）
  setTimeout(drawMapConnections, 50);
}

// === マップルート（線）描画 ===
function drawMapConnections() {
  const map = game.getCurrentMap();
  if (!map) return;

  const canvas = document.getElementById('map-canvas');
  const container = document.getElementById('map-nodes');
  const ctx = canvas.getContext('2d');

  // Canvasのサイズをコンテナに合わせる
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // コンテナのスクロールやOffsetを考慮して線を引くための基準
  const containerRect = container.getBoundingClientRect();

  // 線の描画
  for (const conn of map.connections) {
    const fromNode = map.nodes.find(n => n.id === conn.from);
    const toNode = map.nodes.find(n => n.id === conn.to);
    if (!fromNode || !toNode) continue;

    const fromEl = container.querySelector(`[data-node-id="${fromNode.id}"]`);
    const toEl = container.querySelector(`[data-node-id="${toNode.id}"]`);
    if (!fromEl || !toEl) continue;

    const fromRect = fromEl.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();

    // コンテナ内での相対座標を計算 (要素の中心)
    const x1 = fromRect.left - containerRect.left + (fromRect.width / 2);
    const y1 = fromRect.top - containerRect.top + (fromRect.height / 2);
    const x2 = toRect.left - containerRect.left + (toRect.width / 2);
    const y2 = toRect.top - containerRect.top + (toRect.height / 2);

    // 円の半径を考慮して線の長さを短くする (丸の中に線が入り込まないように)
    // ノードのサイズ（PCなら約60px、モバイルなら50px）を考慮し、半径分を引く
    const radius = fromRect.width / 2;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const angle = Math.atan2(dy, dx);
    const startX = x1 + Math.cos(angle) * radius;
    const startY = y1 + Math.sin(angle) * radius;
    const endX = x2 - Math.cos(angle) * radius;
    const endY = y2 - Math.sin(angle) * radius;

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);

    // スタイル決定
    ctx.lineWidth = 3;
    if (fromNode.visited && toNode.visited) {
      // 踏破済みルート
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.setLineDash([]);
    } else if (fromNode.visited || fromNode.available || fromNode.layer === 0) {
      // 次に到達可能なルート、またはスタートから繋がるルートを強調
      ctx.strokeStyle = '#f1c40f'; // yellow
      ctx.setLineDash([8, 8]); // 点線
      ctx.lineDashOffset = -performance.now() / 50; // ちょっとしたアニメーション用（一回描画でも良い）
    } else {
      // 未到達の先のルート
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.setLineDash([]);
    }

    ctx.stroke();
  }
}

// === バトルレンダリング ===
let currentBattle = null;

function renderBattle() {
  if (!game.battle) return;
  currentBattle = game.battle;

  const b = currentBattle;
  const enemy = b.enemy;
  const player = b.player;

  // 背景色を敵のフロアに応じて変更（画像ベース）
  const bgMap = {
    1: 'url(./assets/bg_forest.png)',
    2: 'url(./assets/bg_cave.png)',
    3: 'url(./assets/bg_tower.png)'
  };
  const battleField = document.querySelector('.battle-field');
  if (battleField) {
    battleField.style.backgroundImage = bgMap[game.currentFloor] || bgMap[1];
  }

  // 敵の効果をリスニング
  currentBattle.on('enemy_turn', (result) => {
    showEnemyTurnEffects(result);
  });

  // 敵表示
  const enemyEmojiEl = document.getElementById('enemy-emoji');
  enemyEmojiEl.classList.remove('anim-death', 'anim-hit'); // 前のバトルのアニメーションをリセット
  enemyEmojiEl.textContent = enemy.emoji;
  enemyEmojiEl.style.fontSize = enemy.isBoss ? '5rem' : '4rem';
  document.getElementById('enemy-name').textContent = enemy.name + (enemy.isElite ? ' ⭐' : '');

  updateBattleUI();

  // バトル開始
  b.start();
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
    }
    intentEl.textContent = intentText;
    intentEl.className = 'enemy-intent ' + intentClass;
  }

  // 敵ステータス（バフ/毒等）
  const statusEl = document.getElementById('enemy-status');
  let statusHTML = '';
  if (enemy.block > 0) statusHTML += `<span class="status-badge">🛡️${enemy.block}</span>`;
  if (enemy.buffs.strength) statusHTML += `<span class="status-badge">💪+${enemy.buffs.strength}</span>`;
  if (b.enemyPoison > 0) statusHTML += `<span class="status-badge">🟣${b.enemyPoison}</span>`;
  statusEl.innerHTML = statusHTML;

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
    const canPlay = card.cost <= b.energy && b.state === BATTLE_STATES.PLAYER_TURN;
    const cardEl = document.createElement('div');
    cardEl.innerHTML = createCardHTML(card, false, canPlay);
    const cardNode = cardEl.firstElementChild;

    if (!canPlay) {
      cardNode.classList.add('disabled');
    }

    cardNode.classList.add('anim-card-draw');

    cardNode.addEventListener('click', () => {
      if (b.state !== BATTLE_STATES.PLAYER_TURN || card.cost > b.energy) return;
      onCardSelect(card.instanceId);
    });

    handCards.appendChild(cardNode);
  }

  // ターン終了ボタンの状態
  document.getElementById('btn-end-turn').disabled = b.state !== BATTLE_STATES.PLAYER_TURN;
}

function renderPotions() {
  const potionSlots = document.getElementById('potion-slots');
  potionSlots.innerHTML = '';
  for (const potion of game.scaling.potions) {
    const slot = document.createElement('div');
    slot.className = 'potion-slot';
    slot.textContent = potion.emoji;
    slot.title = `${potion.name}: ${potion.description}`;
    slot.addEventListener('click', () => {
      if (currentBattle && currentBattle.state === BATTLE_STATES.PLAYER_TURN) {
        const result = currentBattle.usePotion(potion.instanceId);
        if (result) {
          updateBattleUI();
          renderHand();
          renderPotions();
        }
      }
    });
    potionSlots.appendChild(slot);
  }
}

// === クイズ表示 ===
function onCardSelect(instanceId) {
  const quiz = currentBattle.selectCard(instanceId);
  if (!quiz) return;
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
  const labelText = quiz.type === 'en_to_jp' ? 'この英語の意味は？'
    : quiz.type === 'jp_to_en' ? 'この日本語を英語で言うと？' : 'スペルを入力しよう！';

  questionEl.innerHTML = `
    <span class="question-emoji">${quiz.questionEmoji || ''}</span>
    <span class="question-text">${quiz.question}</span>
    <span class="question-label">${labelText}</span>
  `;

  // 選択肢 or タイピング
  const choicesEl = document.getElementById('quiz-choices');
  const typingEl = document.getElementById('quiz-typing');
  const resultEl = document.getElementById('quiz-result');
  resultEl.style.display = 'none';

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

    quiz.choices.forEach((choice, i) => {
      const btn = document.createElement('button');
      btn.className = 'quiz-choice';
      btn.textContent = choice;

      // ヒントで選択肢を消す
      if (quiz.hintEliminated && i !== quiz.correctIndex) {
        const eliminatedCount = quiz.choices.filter((_, idx) => idx !== quiz.correctIndex).length;
        if (Math.random() < quiz.hintEliminated / eliminatedCount) {
          btn.classList.add('eliminated');
        }
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

  // 結果表示
  resultEl.style.display = 'block';
  if (result.correct) {
    let txt = `⭕ 正解！${result.comboText ? ' ' + result.comboText : ''}`;
    if (result.leveledUp) txt += ' ⬆️ カードレベルアップ！';
    resultEl.className = 'quiz-result correct';
    resultEl.textContent = txt;
    // (ここではテキスト更新のみ行い、アニメーションはウィンドウを閉じた後に実行する)
  } else {
    const correctAnswer = quiz.type === 'typing' ? quiz.answer : quiz.choices[quiz.correctIndex];
    resultEl.className = 'quiz-result incorrect';
    resultEl.textContent = `❌ 残念…正解は「${correctAnswer}」`;
  }

  // 次のクイズ(ダブルストライク)またはクイズ終了
  if (result.nextQuiz) {
    setTimeout(() => {
      showQuiz(result.nextQuiz);
    }, 1200);
    return;
  }

  // クイズ閉じる
  setTimeout(() => {
    document.getElementById('quiz-area').style.display = 'none';
    updateBattleUI();
    renderHand();

    // ↓ ウィンドウが閉じた直後にアニメーションとエフェクトを再生する ↓
    if (result.correct && result.cardEffect && result.cardEffect.effects) {
      const isMeteor = result.cardEffect.type === 'attack' && result.cardEffect.cost >= 3;

      for (const eff of result.cardEffect.effects) {
        if (eff.type === 'damage') {
          playAttackEffect(false, isMeteor); // 敵への攻撃 (isMeteorでエフェクト分岐)
          // 少し遅れてダメージ数字を表示する
          setTimeout(() => {
            showDamageNumber(eff.actual !== undefined ? eff.actual : eff.value, 'damage', false);
            // 敵ヒットアニメ
            const enemyEmoji = document.getElementById('enemy-emoji');
            enemyEmoji.classList.add('anim-hit');
            setTimeout(() => enemyEmoji.classList.remove('anim-hit'), 400);
          }, 300);
        } else if (eff.type === 'block') {
          showDamageNumber(eff.value, 'block', true);
        } else if (eff.type === 'heal') {
          showDamageNumber(eff.value, 'heal', true);
        }
      }
    }
    // ↑ アニメーション追加ここまで ↑

    // バトル終了チェック
    if (result.battleEnd === 'victory') {
      const enemyEmoji = document.getElementById('enemy-emoji');
      enemyEmoji.classList.add('anim-death');
      setTimeout(() => {
        game.onBattleEnd('victory');
      }, 700);
    }
  }, 1500);
}

function playAttackEffect(isPlayer = false, isMeteor = false) {
  const container = isPlayer ? document.querySelector('.player-area') : document.querySelector('.enemy-area');
  if (!container) return;

  const effectEl = document.createElement('div');
  effectEl.className = isMeteor ? 'meteor-effect' : 'slash-effect';
  effectEl.style.top = isMeteor ? '-20px' : '20%';
  effectEl.style.left = isMeteor ? '20%' : '20%';
  container.appendChild(effectEl);

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

function showEnemyTurnEffects(result) {
  let totalDamage = 0;
  let blockedAll = false;

  if (!result || !result.effects) return;

  for (const eff of result.effects) {
    if (eff.type === 'damage' || eff.type === 'multi_damage') {
      const actual = eff.actual !== undefined ? eff.actual : eff.total;
      const expected = eff.type === 'damage' ? eff.value : (eff.perHit * eff.hits);

      if (actual > 0) {
        playAttackEffect(true, false); // プレイヤーへの攻撃（敵からメテオは来ない想定）
        setTimeout(() => showDamageNumber(actual, 'damage', true), 300);
        totalDamage += actual;
      } else if (expected > 0 && actual === 0) {
        blockedAll = true;
      }
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

  // 敵ターン実行
  currentBattle.endTurn();

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
    const enemyEmoji = document.getElementById('enemy-emoji');
    enemyEmoji.classList.add('anim-death');
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
    } else if (reward.type === 'potion') {
      const potion = POTION_DEFINITIONS[reward.potionId];
      if (potion) {
        item.innerHTML = `<span class="reward-emoji">${potion.emoji}</span><span class="reward-desc">${potion.name}: ${potion.description}</span>`;
        item.addEventListener('click', () => {
          if (!item.classList.contains('claimed')) {
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

// === ショップレンダリング ===
function renderShop() {
  if (!game.currentShop) return;

  document.getElementById('shop-gold').textContent = game.player.gold;
  const itemsEl = document.getElementById('shop-items');
  itemsEl.innerHTML = '';

  for (const item of game.currentShop.items) {
    const el = document.createElement('div');
    el.className = 'shop-item';
    if (item.sold) el.classList.add('sold');

    el.innerHTML = `
      <span class="shop-item-emoji">${item.emoji}</span>
      <span class="shop-item-name">${item.name || ''}</span>
      ${item.description ? `<span style="font-size:0.65rem;color:var(--text-muted)">${item.description}</span>` : ''}
      <span class="shop-item-price">💰 ${item.price}</span>
    `;

    el.addEventListener('click', () => {
      if (item.sold || game.player.gold < item.price) return;

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
          showCardSelect([...game.playerDeck], (card) => {
            addCardXP(card);
            addCardXP(card);
            addCardXP(card);
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
    <div class="stat-row"><span class="stat-label">到達フロア</span><span class="stat-value">${game.currentFloor} / 3</span></div>
    <div class="stat-row"><span class="stat-label">勝利バトル</span><span class="stat-value">${game.stats.battlesWon}</span></div>
    <div class="stat-row"><span class="stat-label">最大コンボ</span><span class="stat-value">${game.stats.maxCombo}</span></div>
  `;

  // 弱点単語
  const weakIds = game.spacedRep.getWeakWords(8);
  const weakEl = document.getElementById('gameover-weak-words');
  if (weakIds.length > 0) {
    const words = weakIds.map(id => {
      const word = game.wordDb.words.find(w => w.id === id);
      return word ? `<span class="weak-word-tag">${word.emoji} ${word.english} = ${word.japanese}</span>` : '';
    }).join('');
    weakEl.innerHTML = `<p style="font-size:var(--font-sm);color:var(--text-secondary);margin-bottom:4px">📝 にがてな単語</p><div class="weak-word-list">${words}</div>`;
  } else {
    weakEl.innerHTML = '';
  }

  game.saveManager.saveBestRun(game.stats);
}

function renderVictory() {
  const statsEl = document.getElementById('victory-stats');

  // スコア計算
  const enemiesScore = (game.stats.enemiesDefeated || 0) * 50;
  const comboScore = (game.stats.maxCombo || 0) * 100;
  const damageScore = (game.stats.maxDamage || 0) * 10;
  const goldScore = (game.player.gold || 0) * 1;
  const baseScore = 1000;
  const totalScore = baseScore + enemiesScore + comboScore + damageScore + goldScore;

  statsEl.innerHTML = `
    <div class="stat-row"><span class="stat-label">クリアボーナス</span><span class="stat-value">+${baseScore}点</span></div>
    <div class="stat-row"><span class="stat-label">倒した敵 (${game.stats.enemiesDefeated || 0}体)</span><span class="stat-value">+${enemiesScore}点</span></div>
    <div class="stat-row"><span class="stat-label">最大コンボ (${game.stats.maxCombo || 0})</span><span class="stat-value">+${comboScore}点</span></div>
    <div class="stat-row"><span class="stat-label">最大ダメージ (${game.stats.maxDamage || 0})</span><span class="stat-value">+${damageScore}点</span></div>
    <div class="stat-row"><span class="stat-label">所持ゴールド (${game.player.gold || 0}G)</span><span class="stat-value">+${goldScore}点</span></div>
    <div class="stat-row" style="margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.2); font-size: 1.2em; font-weight: bold; color: var(--accent-yellow);">
      <span class="stat-label">最終スコア</span><span class="stat-value">${totalScore}点</span>
    </div>
  `;

  // リーダーボードに保存
  const scoreData = {
    date: Date.now(),
    character: 'ワードマスター', // 現状固定
    emoji: '🧙‍♂️',
    score: totalScore
  };
  if (game.saveManager.saveLeaderboardScore) {
    game.saveManager.saveLeaderboardScore(scoreData);
  }
  game.saveManager.saveBestRun(game.stats);
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

// === 学習記録表示 ===
function showStats() {
  const modal = document.getElementById('modal-stats');
  modal.style.display = 'block';

  const stats = game.spacedRep.getStats();
  const best = game.saveManager.loadBestRun();
  const leaderboard = game.saveManager.getLeaderboard ? game.saveManager.getLeaderboard() : [];

  let topHtml = '';
  if (leaderboard.length > 0) {
    const listItems = leaderboard.map((lb, i) => {
      const dateStr = new Date(lb.date).toLocaleDateString();
      return `
        <div style="display:flex; justify-content:space-between; padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.05); align-items: center;">
          <div><span style="display:inline-block; width:20px; color: var(--text-muted);">${i + 1}.</span> ${lb.emoji} ${lb.character}</div>
          <div><span style="font-weight:bold; color:var(--accent-yellow);">${lb.score}</span> <span style="font-size:0.7em; color:var(--text-muted);">${dateStr}</span></div>
        </div>
      `;
    }).join('');

    topHtml = `
      <div style="margin-top:20px; text-align:left;">
        <h3 style="text-align:center; color: var(--accent-yellow); margin-bottom: 15px;">🏆 リーダーボード TOP10</h3>
        <div style="background: var(--bg-tertiary); border-radius: 8px; padding: 10px;">
          ${listItems}
        </div>
      </div>
    `;
  } else {
    topHtml = `
      <div style="margin-top:20px; text-align:left;">
        <h3 style="text-align:center; color: var(--accent-yellow); margin-bottom: 15px;">🏆 リーダーボード TOP10</h3>
        <div style="background: var(--bg-tertiary); border-radius: 8px; padding: 20px; text-align:center; color: var(--text-muted);">
          まだきろくがありません
        </div>
      </div>
    `;
  }

  document.getElementById('stats-content').innerHTML = `
    <div class="stats-grid">
      <div class="stats-card">
        <div class="stats-card-value" style="color:var(--accent-green)">${stats.accuracy}%</div>
        <div class="stats-card-label">正答率</div>
      </div>
      <div class="stats-card">
        <div class="stats-card-value" style="color:var(--accent-blue)">${stats.totalAttempted}</div>
        <div class="stats-card-label">出題単語数</div>
      </div>
      <div class="stats-card">
        <div class="stats-card-value" style="color:var(--accent-purple)">${stats.wordsLearned}</div>
        <div class="stats-card-label">覚えた単語</div>
      </div>
      <div class="stats-card">
        <div class="stats-card-value" style="color:var(--accent-red)">${stats.weakWords}</div>
        <div class="stats-card-label">にがてな単語</div>
      </div>
    </div>
    <div style="text-align:center;color:var(--text-secondary);font-size:var(--font-sm);margin-top:15px;">
      <p>総プレイ回数: ${best.totalRuns || 0} / クリアしたフロア: ${best.floorsCleared || 0}</p>
    </div>
    ${topHtml}
  `;
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
  if (game && game.state === GAME_STATES.MAP && document.getElementById('screen-map').classList.contains('active')) {
    drawMapConnections();
  }
});

document.addEventListener('DOMContentLoaded', () => {
  // メニュー
  document.getElementById('btn-new-game').addEventListener('click', () => {
    // game.startNewRun(); からキャラクター選択画面への遷移に変更
    showScreen('char-select');
  });

  // キャラクター選択画面
  document.getElementById('btn-start-adventure').addEventListener('click', () => {
    game.startNewRun();
  });

  document.getElementById('btn-back-menu').addEventListener('click', () => {
    showScreen('menu');
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
    showCardSelect([...game.playerDeck], (card) => {
      addCardXP(card);
      addCardXP(card);
      addCardXP(card);
      game.changeScreen(SCREENS.MAP);
    });
  });

  // イベント
  document.getElementById('btn-close-event').addEventListener('click', () => {
    game.changeScreen(SCREENS.MAP);
  });

  // ゲームオーバー
  document.getElementById('btn-retry').addEventListener('click', () => {
    game.startNewRun();
  });

  document.getElementById('btn-to-menu').addEventListener('click', () => {
    showScreen('menu');
  });

  // クリア
  document.getElementById('btn-victory-retry').addEventListener('click', () => {
    game.startNewRun();
  });

  document.getElementById('btn-victory-menu').addEventListener('click', () => {
    showScreen('menu');
  });

  // モーダル閉じる
  document.getElementById('btn-close-deck').addEventListener('click', () => {
    document.getElementById('modal-deck').style.display = 'none';
  });

  document.getElementById('btn-close-stats').addEventListener('click', () => {
    document.getElementById('modal-stats').style.display = 'none';
  });
});
