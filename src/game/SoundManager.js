export class SoundManager {
    constructor() {
        // AudioContextの初期化（ユーザー操作時にresumeする必要があるため最初はsuspendedになる場合があります）
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.5;
        this.masterGain.connect(this.ctx.destination);
    }

    // --- Helper. オシレーター（ブザーや鐘、ドーンという音）の再生 ---
    _playTone(type, freqStart, freqEnd, duration, vol, detune = 0, attack = 0.01) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freqStart, this.ctx.currentTime);
        if (freqEnd) {
            osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), this.ctx.currentTime + duration);
        }
        if (detune) osc.detune.value = detune;

        // 包絡線（エンベロープ）
        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(vol, this.ctx.currentTime + attack);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + duration);
    }

    // --- Helper. ノイズ（シュッ、バシッ、ドゴォなどの音）の再生 ---
    _playNoise(duration, filterType, filterFreqStart, filterFreqEnd, vol, attack = 0.01) {
        if (!this.ctx) return;
        const bufferSize = this.ctx.sampleRate * Math.max(duration, 0.1);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        // ホワイトノイズ生成
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        // フィルターで音色作り（高音＝紙や剣、低音＝打撃や爆発）
        const filter = this.ctx.createBiquadFilter();
        filter.type = filterType;
        filter.frequency.setValueAtTime(filterFreqStart, this.ctx.currentTime);
        if (filterFreqEnd) {
            filter.frequency.exponentialRampToValueAtTime(filterFreqEnd, this.ctx.currentTime + duration);
        }

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(vol, this.ctx.currentTime + attack);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        noise.start(this.ctx.currentTime);
        noise.stop(this.ctx.currentTime + duration);
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // ==========================================
    // 1. UI・画面遷移・操作音
    // ==========================================
    playUIHover() {
        this._playTone('sine', 800, 1000, 0.05, 0.2);
    }
    playUIClick() {
        this._playTone('sine', 600, 300, 0.05, 0.3);
    }
    playMapNode() {
        // トンッ（羊皮紙やマップノードを叩く音）
        this._playNoise(0.1, 'lowpass', 1000, 200, 0.5);
        this._playTone('sine', 150, 50, 0.1, 0.3);
    }
    playGameStart() {
        // ゴオオォン（ドラの音）
        this._playTone('square', 100, 20, 1.5, 0.3);
        this._playTone('sawtooth', 150, 30, 1.5, 0.2, 10);
        this._playNoise(1.5, 'lowpass', 800, 100, 0.5);
    }

    // ==========================================
    // 2. バトル：カード操作
    // ==========================================
    playCardDraw() {
        // シュッ（紙が擦れる音・高域）
        this._playNoise(0.15, 'bandpass', 4000, 4000, 0.4);
    }
    playCardSelect() {
        // さっ（持ち上げる音・やや低域）
        this._playNoise(0.1, 'lowpass', 2000, 500, 0.3);
    }
    playCardPlay() {
        // シュパッ（エナジー消費を伴う鋭い風切り音）
        this._playNoise(0.3, 'bandpass', 1000, 4000, 0.4);
        this._playTone('sine', 300, 800, 0.2, 0.2);
    }
    playCardExhaust() {
        // シュゥゥ…（カードが霊的に消滅する音）
        this._playNoise(0.8, 'bandpass', 2000, 300, 0.3, 0.2);
        this._playTone('sine', 400, 200, 0.8, 0.2, 0, 0.2);
    }

    // ==========================================
    // 3. バトル：攻撃・防御・エフェクト
    // ==========================================
    playAttack() {
        // ザシュッ（鋭い剣撃）
        this._playTone('sawtooth', 800, 100, 0.2, 0.3);
        this._playNoise(0.15, 'highpass', 2000, 5000, 0.5);
    }
    playHeavyAttack() {
        // ドスッ！（重い一撃）
        this._playTone('square', 200, 40, 0.4, 0.4);
        this._playNoise(0.3, 'lowpass', 1500, 100, 0.6);
    }
    playBlock() {
        // ガキン！（金属的な防御音）
        this._playTone('square', 400, 400, 0.2, 0.2);
        this._playTone('square', 600, 600, 0.2, 0.2, 15);
        this._playTone('sawtooth', 850, 850, 0.2, 0.1);
        this._playNoise(0.1, 'highpass', 3000, 3000, 0.3);
    }
    playBlockBreak() {
        // パリーン（シールドが割れる音）
        this._playNoise(0.4, 'highpass', 4000, 1000, 0.6);
        this._playTone('square', 1000, 200, 0.3, 0.3);
    }
    playDamage() {
        // ウッ（鈍いダメージ音）
        this._playTone('triangle', 150, 50, 0.3, 0.4);
        this._playNoise(0.2, 'lowpass', 800, 200, 0.5);
    }
    playDefeat() {
        // ドゴォン（消滅爆発）
        this._playNoise(1.5, 'lowpass', 1000, 50, 0.8, 0.1);
        this._playTone('square', 100, 10, 1.5, 0.5, 0, 0.1);
    }
    playPoison() {
        // ジュワッ（酸のような音）
        this._playNoise(0.5, 'bandpass', 3000, 1000, 0.4, 0.1);
        this._playTone('sine', 200, 600, 0.1, 0.1);
        setTimeout(() => this._playTone('sine', 300, 800, 0.1, 0.1), 100);
    }

    // ==========================================
    // 4. クイズ・学習関連
    // ==========================================
    playQuizCorrect() {
        // ピコーン！（Aメジャー和音）
        this._playTone('sine', 880, 880, 0.5, 0.2);  // A5
        this._playTone('sine', 1108, 1108, 0.5, 0.2);// C#6
        this._playTone('sine', 1318, 1318, 0.5, 0.2);// E6
    }
    playQuizIncorrect() {
        // ブー（不協和音のブザー）
        this._playTone('sawtooth', 150, 150, 0.4, 0.3);
        this._playTone('sawtooth', 158, 158, 0.4, 0.3);
    }
    playComboUp(comboCount) {
        // コンボが上がるごとにピッチが上がるチャイム
        const baseFreq = 880 * (1 + (comboCount * 0.05));
        this._playTone('sine', baseFreq, baseFreq, 0.4, 0.2);
        this._playTone('sine', baseFreq * 1.5, baseFreq * 1.5, 0.4, 0.1);
    }

    // ==========================================
    // 5. アイテム・イベント
    // ==========================================
    playGold() {
        // チャリン（高音の金属反響）
        this._playTone('sine', 2000, 2000, 0.2, 0.1);
        setTimeout(() => this._playTone('sine', 3000, 3000, 0.3, 0.1), 50);
        setTimeout(() => this._playTone('sine', 2500, 2500, 0.2, 0.1), 100);
    }
    playPotion() {
        // シュワ・ゴクッ（ポーションの泡）
        this._playTone('sine', 400, 800, 0.1, 0.2);
        setTimeout(() => this._playTone('sine', 500, 1000, 0.1, 0.2), 100);
        setTimeout(() => this._playTone('sine', 300, 600, 0.1, 0.2), 200);
        this._playNoise(0.4, 'bandpass', 2000, 4000, 0.3);
    }
    playRelic() {
        // キラーン（レリック獲得・発動）
        this._playTone('sine', 1500, 1500, 1.0, 0.1, 0, 0.2);
        this._playTone('sine', 2500, 2500, 1.0, 0.1, 0, 0.2);
        this._playTone('triangle', 3000, 3000, 0.5, 0.05, 0, 0.1);
    }
}
