import codecs

file_path = r"c:\Users\石塚　匡彦\.gemini\antigravity\scratch\wordquest\src\game\CardSystem.js"

with codecs.open(file_path, 'r', 'utf-8') as f:
    content = f.read()

# getCardDescription replacements
getCardDesc_old = """export function getCardDescription(card) {
    // カードIDごとに、現在の数値を反映した説明を生成
    const suffix = card.type === CARD_TYPES.SKILL ? ' 廃棄する。' : '';
    switch (card.id) {
        // === 攻撃カード ===
        case 'slash':
            return `⚔️ ${card.baseDamage}ダメージ！ちからいっぱいきりつける！`;
        case 'fireball':
            return `🔥 ${card.baseDamage}ダメージ！燃えさかる火の玉！`;
        case 'double_strike':
            return `⚡ ${card.baseDamage}ダメージを${card.hits}回！クイズを${card.hits}問いる！`;
        case 'thunder':
            return `⛈️ ${card.baseDamage}ダメージ！コンボ中はさらに+${card.comboBonus}！`;
        case 'ice_lance':
            return `🧊 ${card.baseDamage}ダメージ＋敵の攻撃力を${card.debuff.value}さげる（${card.debuff.turns}ターン）`;
        case 'meteor':
            return `☄️ ${card.baseDamage}ダメージ！空から岩をおとす大技！`;
        case 'quick_slash':
            return `💨 ${card.baseDamage}ダメージ！コスト0でつかえる！`;
        case 'poison_blade':
            return `🗡️ ${card.baseDamage}ダメージ＋毒${card.poison}！毒は毎ターン敵にダメージ！`;
        case 'combo_blade':
            return `🔪 ${card.baseDamage}ダメージ＋コンボ数×${card.comboMultiplierBonus}の追加ダメージ！`;
        case 'longword_burst':
            return `📚 英単語の文字数×${card.lengthSynergy}のダメージとブロック！`;
        case 'soul_blade':
            return `💀 ${card.baseDamage}ダメージ＋このバトルの正解数×2のダメージ！じわじわ強くなる！`;
        case 'rage_flame':
            return `😡 ${card.baseDamage}ダメージ＋失ったHP÷5のダメージ！ピンチほど燃えあがる！`;
        case 'snowball':
            return `⛄ ${card.baseDamage}ダメージ！使うたびに永久+${card.snowballBuff}！（現在${card.baseDamage}→次は${card.baseDamage + card.snowballBuff}）`;
        case 'vortex':
            return `🌊 ${card.baseDamage}ダメージ＋手札の枚数×2のダメージ！カードを引いてから使おう！`;

        // === 防御カード ===
        case 'shield':
            return `🛡️ ${card.baseBlock}ブロック！敵のこうげきをふせぐ！`;
        case 'iron_wall':
            return `🏰 ${card.baseBlock}ブロック！鉄の壁で守りをかためる！`;
        case 'counter':
            return `🔄 ${card.baseBlock}ブロック＋${card.baseDamage}ダメージ！守りながらやりかえす！`;
        case 'barrier':
            return `✨ ${card.baseBlock}ブロック！つぎのターンも${card.persistBlock}ブロックのこる！`;
        case 'thorn_armor':
            return `🦔 ${card.baseBlock}ブロック！このターン、敵が攻撃してくるたびに${card.thornArmor}ダメージ返す！`;

        // === スキルカード ===
        case 'heal':
            return `💚 HPを${card.healAmount}かいふく！` + suffix;
        case 'power_up': {
            const pct = Math.round((card.buff.value - 1) * 100);
            return `💪 つぎの攻撃のダメージが+${pct}%！` + suffix;
        }
        case 'draw_card':
            return `🃏 カードを${card.drawCount}まいひく！` + suffix;
        case 'focus':
            return `🔮 つぎのターン、エナジー+${card.buff.value}！コスト0！` + suffix;
        case 'mega_heal':
            return `💖 HPを${card.healAmount}かいふく！ピンチのときのたのもしい味方！` + suffix;
        case 'poison_catalyst':
            return `🧪 毒${card.poison}を与えて、敵の毒を2倍に！` + suffix;
        case 'accumulate':
            return `🌀 全攻撃ダメージが永久+${card.accumulate}！今すぐ重ねよう！` + suffix;
        case 'weak_point':
            return `🎯 敵の毒が${card.weakPointThreshold}以上なら、つぎの攻撃が2倍！コスト0！` + suffix;
        case 'mirror_copy': {
            const ratioStr = card.mirrorRatio > 1 ? `（威力${card.mirrorRatio}倍！）` : '';
            return `🪞 さっきつかったカードをもう1回${ratioStr}！` + suffix;
        }

        default:
            return card.description;
    }
}"""

getCardDesc_new = """export function getCardDescription(card) {
    // カードIDごとに、現在の数値を反映した説明を生成
    const suffix = card.type === CARD_TYPES.SKILL ? '（1回だけ）' : '';
    switch (card.id) {
        // === 攻撃カード ===
        case 'slash':
            return `⚔️ ${card.baseDamage}ダメージ！ちからいっぱいきりつける！`;
        case 'fireball':
            return `🔥 ${card.baseDamage}ダメージ！燃えさかる火の玉！`;
        case 'double_strike':
            return `⚡ ${card.baseDamage}ダメージを${card.hits}回！クイズを${card.hits}問とく！`;
        case 'thunder':
            return `⛈️ ${card.baseDamage}ダメージ！コンボ中はさらに+${card.comboBonus}ダメージ！`;
        case 'ice_lance':
            return `🧊 ${card.baseDamage}ダメージ！敵の攻撃力を${card.debuff.value}さげる（${card.debuff.turns}ターン）`;
        case 'meteor':
            return `☄️ ${card.baseDamage}ダメージ！空から岩をおとす大技！`;
        case 'quick_slash':
            return `💨 ${card.baseDamage}ダメージ！コスト0でつかえる！`;
        case 'poison_blade':
            return `🗡️ ${card.baseDamage}ダメージ＋毒${card.poison}！毒は毎ターンダメージ！`;
        case 'combo_blade':
            return `🔪 ${card.baseDamage}ダメージ＋コンボ数×${card.comboMultiplierBonus}ダメージ！`;
        case 'longword_burst':
            return `📚 文字数×${card.lengthSynergy}のダメージとブロック！`;
        case 'soul_blade':
            return `💀 ${card.baseDamage}ダメージ！さらに正解数×2ダメージ追加！`;
        case 'rage_flame':
            return `😡 ${card.baseDamage}ダメージ！さらに、へったHP÷5ダメージ！`;
        case 'snowball':
            return `⛄ ${card.baseDamage}ダメージ！使うたびにずっと+${card.snowballBuff}ダメージ！`;
        case 'vortex':
            return `🌊 ${card.baseDamage}ダメージ！さらに手札のまい数×2ダメージ！`;

        // === 防御カード ===
        case 'shield':
            return `🛡️ ${card.baseBlock}ブロック！敵の攻撃をふせぐ！`;
        case 'iron_wall':
            return `🏰 ${card.baseBlock}ブロック！鉄の壁でかためる！`;
        case 'counter':
            return `🔄 ${card.baseBlock}ブロック！さらに${card.baseDamage}ダメージ！`;
        case 'barrier':
            return `✨ ${card.baseBlock}ブロック！次のターンも${card.persistBlock}ブロック残る！`;
        case 'thorn_armor':
            return `🦔 ${card.baseBlock}ブロック！攻撃されるたびに${card.thornArmor}ダメージ返す！`;

        // === スキルカード ===
        case 'heal':
            return `💚 HPを${card.healAmount}かいふく！` + suffix;
        case 'power_up': {
            const pct = Math.round((card.buff.value - 1) * 100);
            return `💪 次の攻撃のダメージが+${pct}%！` + suffix;
        }
        case 'draw_card':
            return `🃏 カードを${card.drawCount}まい引く！` + suffix;
        case 'focus':
            return `🔮 次のターン、エナジー+${card.buff.value}！コスト0！` + suffix;
        case 'mega_heal':
            return `💖 HPを${card.healAmount}かいふく！ピンチの味方！` + suffix;
        case 'poison_catalyst':
            return `🧪 毒${card.poison}を与える！さらに敵の毒を2倍にする！` + suffix;
        case 'accumulate':
            return `🌀 全攻撃ダメージがずっと+${card.accumulate}！` + suffix;
        case 'weak_point':
            return `🎯 敵の毒が${card.weakPointThreshold}以上なら次の攻撃が2倍！` + suffix;
        case 'mirror_copy': {
            const ratioStr = card.mirrorRatio > 1 ? `（威力${card.mirrorRatio}倍！）` : '';
            return `🪞 前のカードをもう1回使う${ratioStr}！` + suffix;
        }

        default:
            return card.description;
    }
}"""

content = content.replace(getCardDesc_old, getCardDesc_new)

if getCardDesc_old not in content and getCardDesc_new in content:
    print("Replaced getCardDescription successfully.")
else:
    print("FAILED to replace getCardDescription.")

# Suffix replacement
suffix_old = '''    // スキルカードは使用後に廃棄されることを明記
    if (card.type === CARD_TYPES.SKILL) {
        card.description += ' 廃棄する。';
    }'''

suffix_new = '''    // スキルカードは使用後に廃棄されることを明記
    if (card.type === CARD_TYPES.SKILL) {
        card.description += '（1回だけ）';
    }'''

content = content.replace(suffix_old, suffix_new)

if suffix_new in content:
    print("Replaced suffix successfully.")

# Update CARD_DEFINITIONS
replacements = [
    ("description: '🔥 14ダメージ！燃えさかる火の玉をなげつける！',", "description: '🔥 14ダメージ！燃えさかる火の玉！',"),
    ("description: '⚡ 5ダメージを2回！クイズを2問とくよ！',", "description: '⚡ 5ダメージを2回！クイズを2問とく！',"),
    ("description: '⛈️ 10ダメージ！コンボ中はさらに+5！',", "description: '⛈️ 10ダメージ！コンボ中はさらに+5ダメージ！',"),
    ("description: '🧊 4ダメージ＋敵の攻撃力を2さげる（1ターン）',", "description: '🧊 4ダメージ！敵の攻撃力を2さげる（1ターン）',"),
    ("description: '🗡️ 3ダメージ＋毒3！毒は毎ターン敵にダメージ！',", "description: '🗡️ 3ダメージ＋毒3！毒は毎ターンダメージ！',"),
    ("description: '🔪 10ダメージ＋コンボ数×5の追加ダメージ！',", "description: '🔪 10ダメージ＋コンボ数×5ダメージ！',"),
    ("description: '📚 英単語の文字数×3のダメージとブロック！',", "description: '📚 文字数×3のダメージとブロック！',"),
    ("description: '💀 4ダメージ＋このバトルの正解数×2のダメージ！じわじわ強くなる！',", "description: '💀 4ダメージ！さらに正解数×2ダメージ追加！',"),
    ("description: '😡 3ダメージ＋失ったHP÷5のダメージ！ピンチほど燃え上がる！',", "description: '😡 3ダメージ！さらに、へったHP÷5ダメージ！',"),
    ("description: '⛄ 初めはたった1ダメージ！でも使うたびに永久+3！雪だるま式に強くなる！',", "description: '⛄ 1ダメージ！使うたびにずっと+3ダメージ！',"),
    ("description: '🌊 2ダメージ＋手札の枚数×2のダメージ！カードを引いてから使おう！',", "description: '🌊 2ダメージ！さらに手札のまい数×2ダメージ！',"),

    ("description: '🛡️ 5ブロック！敵のこうげきをふせぐ！',", "description: '🛡️ 5ブロック！敵の攻撃をふせぐ！',"),
    ("description: '🏰 12ブロック！鉄の壁で守りをかためる！',", "description: '🏰 12ブロック！鉄の壁でかためる！',"),
    ("description: '🔄 3ブロック＋3ダメージ！守りながらやりかえす！',", "description: '🔄 3ブロック！さらに3ダメージ！',"),
    ("description: '✨ 8ブロック！つぎのターンも4ブロックのこる！',", "description: '✨ 8ブロック！次のターンも4ブロック残る！',"),
    ("description: '🦔 4ブロック！このターン、敵が攻撃してくるたびに3ダメージ返す！',", "description: '🦔 4ブロック！攻撃されるたびに3ダメージ返す！',"),

    ("description: '💪 つぎの攻撃のダメージが+50%！',", "description: '💪 次の攻撃のダメージが+50%！',"),
    ("description: '🃏 カードを2まいひく！',", "description: '🃏 カードを2まい引く！',"),
    ("description: '🔮 つぎのターン、エナジーが+1！コスト0！',", "description: '🔮 次のターン、エナジー+1！コスト0！',"),
    ("description: '💖 HPを12かいふく！ピンチのときのたのもしい味方！',", "description: '💖 HPを12かいふく！ピンチの味方！',"),
    ("description: '🧪 毒5を与えて、さらに敵の毒を2倍に！毒デッキの必殺技！',", "description: '🧪 毒5を与える！さらに敵の毒を2倍にする！',"),
    ("description: '🌀 このバトル中、全攻撃のダメージが永久に+3！何回でも重ねられる！',", "description: '🌀 全攻撃ダメージがずっと+3！',"),
    ("description: '🎯 敵の毒が3以上なら、つぎの攻撃が2倍に！コスト0！',", "description: '🎯 敵の毒が3以上なら次の攻撃が2倍！コスト0！',"),
    ("description: '🪞 さっきつかったカードをもう1回！どんな大技もコピー！',", "description: '🪞 前のカードをもう1回使う！',")
]

for old, new in replacements:
    if old not in content:
        print(f"Warning: could not find {old}")
    content = content.replace(old, new)


with codecs.open(file_path, 'w', 'utf-8') as f:
    f.write(content)
print("Updated all replacements.")
