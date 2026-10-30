export class SoundManager {
    constructor() {
        // AudioContextの初期化（ユーザー操作時にresumeする必要があるため最初はsuspendedになる場合があります）
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.5;
        this.masterGain.connect(this.ctx.destination);

        // BGM専用GainNode（英単語発音時のダッキングやミュート制御用）
        this.bgmGain = this.ctx.createGain();
        this.bgmGain.gain.value = 0.22;
        this.bgmGain.connect(this.ctx.destination);
        this.bgmMuted = localStorage.getItem('wordquest_bgm_muted') === '1';
        this.currentBgmType = null;
        this.bgmTimer = null;
        this.bgmStep = 0;

        // 英単語ネイティブ発音用のAudioキャッシュとWeb Speech API英語ボイスの事前ロード
        this.audioCache = new Map();
        this.currentWordAudio = null;
        this.englishVoice = null;
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            const loadEnglishVoice = () => {
                const voices = window.speechSynthesis.getVoices() || [];
                // 日本語音声エンジン（Haruka等）を厳密に除外し、純粋な英語ネイティブ音声のみを選択
                const enVoices = voices.filter(v =>
                    v.lang &&
                    v.lang.toLowerCase().startsWith('en') &&
                    !/ja|japanese|日本語|haruka|ayumi|ichiro|sayaka|kyoko|otoya/i.test(v.name + ' ' + v.lang)
                );
                this.englishVoice =
                    enVoices.find(v => /Google US English/i.test(v.name)) ||
                    enVoices.find(v => /Aria|Jenny|Guy|Samantha|Alex|Daniel|Karen/i.test(v.name)) ||
                    enVoices.find(v => v.lang === 'en-US' || v.lang === 'en_US') ||
                    enVoices[0] ||
                    null;
            };
            loadEnglishVoice();
            window.speechSynthesis.onvoiceschanged = loadEnglishVoice;
        }
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

    // iOS/SafariなどのPWA起動時にオーディオコンテキストを強制アクティブにするためのハック
    unlock() {
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        // 無音を再生してコンテキストを強制アクティブにする
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        gain.gain.value = 0;
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(0);
        osc.stop(this.ctx.currentTime + 0.001);
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
    playHeal() {
        // ファァァン…（温かい回復音）
        this._playTone('sine', 523.25, 659.25, 0.35, 0.18, 0, 0.05);
        setTimeout(() => this._playTone('sine', 659.25, 783.99, 0.35, 0.18, 0, 0.05), 110);
        setTimeout(() => this._playTone('triangle', 1046.5, 1046.5, 0.45, 0.15, 0, 0.05), 220);
    }

    // ==========================================
    // 5.5. BGMシンセサイザー（通常バトルBGM / ボスバトルBGM / マップBGM）
    // ==========================================
    _playBgmNote(type, freq, duration, vol, detune = 0) {
        if (!this.ctx || this.bgmMuted || !freq) return;
        this.resume();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, now);
        if (detune) osc.detune.value = detune;

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(vol, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0008, now + duration);

        osc.connect(gain);
        gain.connect(this.bgmGain);
        osc.start(now);
        osc.stop(now + duration + 0.01);
    }

    _playBgmPerc(isKick = true, vol = 0.18) {
        if (!this.ctx || this.bgmMuted) return;
        const now = this.ctx.currentTime;
        if (isKick) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(130, now);
            osc.frequency.exponentialRampToValueAtTime(32, now + 0.12);
            gain.gain.setValueAtTime(vol, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
            osc.connect(gain);
            gain.connect(this.bgmGain);
            osc.start(now);
            osc.stop(now + 0.14);
        } else {
            // ハイハット・スネア系リズムノイズ
            const bufferSize = Math.floor(this.ctx.sampleRate * 0.06);
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.setValueAtTime(5500, now);
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(vol * 0.55, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.bgmGain);
            noise.start(now);
            noise.stop(now + 0.06);
        }
    }

    /**
     * 英単語発音時にBGMを一時的に小さくする（ダッキング）
     */
    _duckBGM() {
        if (!this.ctx || !this.bgmGain) return;
        const now = this.ctx.currentTime;
        this.bgmGain.gain.cancelScheduledValues(now);
        this.bgmGain.gain.setValueAtTime(0.04, now);
        this.bgmGain.gain.linearRampToValueAtTime(0.22, now + 1.3);
    }

    /**
     * BGMのON/OFFを切り替える
     * @returns {boolean} ミュート状態（true=消音）
     */
    toggleBGM() {
        this.bgmMuted = !this.bgmMuted;
        localStorage.setItem('wordquest_bgm_muted', this.bgmMuted ? '1' : '0');
        if (this.bgmMuted) {
            if (this.bgmGain && this.ctx) {
                this.bgmGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
            }
        } else {
            if (this.bgmGain && this.ctx) {
                this.bgmGain.gain.setValueAtTime(0.22, this.ctx.currentTime);
            }
        }
        return this.bgmMuted;
    }

    /**
     * 現在再生中のBGMを停止する
     */
    stopBGM() {
        if (this.bgmTimer) {
            clearInterval(this.bgmTimer);
            this.bgmTimer = null;
        }
        this.currentBgmType = null;
    }

    /**
     * 通常バトルBGMを開始（疾走感のあるヒロイック・ファンタジー戦闘曲）
     * @param {number} floor - 現在のフロア（1〜4でキーが少しずつ変化）
     */
    startBattleBGM(floor = 1) {
        const typeKey = `battle_${floor}`;
        if (this.currentBgmType === typeKey && this.bgmTimer) return;
        this.stopBGM();
        this.currentBgmType = typeKey;
        this.bgmStep = 0;

        // フロアごとに少しずつピッチを変えて雰囲気を変化させる（1F:Am, 2F:Bm, 3F:Cm, 4F:C#m）
        const pitchShift = [1.0, 1.0, 1.06, 1.12, 1.18][floor] || 1.0;

        // 32ステップ（2小節ループ）のヒロイック戦闘メロディ (Am -> F -> G -> E7)
        const melody = [
            440, 0, 523.25, 587.33, 659.25, 0, 587.33, 523.25,
            659.25, 0, 783.99, 659.25, 587.33, 523.25, 493.88, 0,
            349.23, 0, 440, 523.25, 587.33, 0, 659.25, 587.33,
            493.88, 0, 587.33, 659.25, 783.99, 659.25, 659.25, 0
        ];
        const bass = [
            110, 110, 220, 110, 110, 110, 220, 110,
            87.31, 87.31, 174.61, 87.31, 87.31, 87.31, 174.61, 87.31,
            98.0, 98.0, 196.0, 98.0, 98.0, 98.0, 196.0, 98.0,
            82.41, 82.41, 164.81, 82.41, 98.0, 98.0, 123.47, 130.81
        ];
        const arp = [
            329.63, 440, 523.25, 440, 329.63, 440, 523.25, 440,
            261.63, 349.23, 440, 349.23, 261.63, 349.23, 440, 349.23,
            293.66, 392.0, 493.88, 392.0, 293.66, 392.0, 493.88, 392.0,
            246.94, 329.63, 415.30, 329.63, 293.66, 392.0, 493.88, 587.33
        ];

        const stepMs = 155; // 約193BPMの8分音符ステップ
        this.bgmTimer = setInterval(() => {
            if (this.bgmMuted) return;
            const s = this.bgmStep % 32;
            const mFreq = melody[s] ? melody[s] * pitchShift : 0;
            const bFreq = bass[s] ? bass[s] * pitchShift : 0;
            const aFreq = arp[s] ? arp[s] * pitchShift : 0;

            if (mFreq > 0) this._playBgmNote('triangle', mFreq, 0.24, 0.22);
            if (bFreq > 0) this._playBgmNote('sawtooth', bFreq, 0.14, 0.12);
            if (aFreq > 0 && s % 2 === 1) this._playBgmNote('sine', aFreq, 0.12, 0.09);

            if (s % 4 === 0) this._playBgmPerc(true, 0.2);
            else if (s % 2 === 0) this._playBgmPerc(false, 0.14);

            this.bgmStep++;
        }, stepMs);
    }

    /**
     * ボスバトル＆強敵エリートBGMを開始（緊迫感あふれる高速シンフォニック・ボス戦曲）
     * @param {number} floor - 現在のフロア
     */
    startBossBGM(floor = 1) {
        const typeKey = `boss_${floor}`;
        if (this.currentBgmType === typeKey && this.bgmTimer) return;
        this.stopBGM();
        this.currentBgmType = typeKey;
        this.bgmStep = 0;

        const pitchShift = floor >= 4 ? 1.12 : (floor === 3 ? 1.06 : 1.0);

        // ハーモニックマイナー＆フリジアンの威圧感あるボス戦メロディ
        const melody = [
            587.33, 0, 587.33, 622.25, 587.33, 523.25, 466.16, 440.0,
            587.33, 0, 698.46, 659.25, 587.33, 554.37, 587.33, 0,
            698.46, 0, 698.46, 783.99, 880.0, 783.99, 698.46, 659.25,
            622.25, 587.33, 554.37, 587.33, 659.25, 554.37, 440.0, 0
        ];
        const bass = [
            146.83, 146.83, 293.66, 146.83, 155.56, 155.56, 146.83, 130.81,
            146.83, 146.83, 293.66, 146.83, 138.59, 138.59, 146.83, 146.83,
            174.61, 174.61, 349.23, 174.61, 164.81, 164.81, 329.63, 164.81,
            155.56, 146.83, 138.59, 146.83, 110.0, 110.0, 220.0, 110.0
        ];
        const arp = [
            440.0, 587.33, 698.46, 880.0, 466.16, 587.33, 698.46, 932.33,
            440.0, 587.33, 698.46, 880.0, 415.30, 554.37, 659.25, 830.61,
            523.25, 698.46, 880.0, 1046.5, 493.88, 659.25, 783.99, 987.77,
            466.16, 587.33, 698.46, 880.0, 415.30, 554.37, 659.25, 880.0
        ];

        const stepMs = 128; // 高速ドライビングビート
        this.bgmTimer = setInterval(() => {
            if (this.bgmMuted) return;
            const s = this.bgmStep % 32;
            const mFreq = melody[s] ? melody[s] * pitchShift : 0;
            const bFreq = bass[s] ? bass[s] * pitchShift : 0;
            const aFreq = arp[s] ? arp[s] * pitchShift : 0;

            if (mFreq > 0) {
                this._playBgmNote('sawtooth', mFreq, 0.19, 0.16);
                this._playBgmNote('square', mFreq * 0.5, 0.18, 0.10, 6);
            }
            if (bFreq > 0) this._playBgmNote('sawtooth', bFreq, 0.12, 0.16);
            if (aFreq > 0) this._playBgmNote('triangle', aFreq, 0.09, 0.09);

            if (s % 2 === 0) this._playBgmPerc(true, 0.24);
            else this._playBgmPerc(false, 0.16);

            this.bgmStep++;
        }, stepMs);
    }

    /**
     * マップ探索BGMを開始（神秘的で静かな塔の探索アルペジオ）
     * @param {number} floor - 現在のフロア
     */
    startMapBGM(floor = 1) {
        const typeKey = `map_${floor}`;
        if (this.currentBgmType === typeKey && this.bgmTimer) return;
        this.stopBGM();
        this.currentBgmType = typeKey;
        this.bgmStep = 0;

        const pitchShift = [1.0, 1.0, 0.94, 1.06, 1.18][floor] || 1.0;
        const notes = [
            220.0, 329.63, 440.0, 523.25, 440.0, 329.63, 293.66, 329.63,
            196.0, 293.66, 392.0, 493.88, 392.0, 293.66, 261.63, 293.66
        ];

        this.bgmTimer = setInterval(() => {
            if (this.bgmMuted) return;
            const s = this.bgmStep % 16;
            const freq = notes[s] * pitchShift;
            this._playBgmNote('sine', freq, 0.42, 0.09);
            if (s % 4 === 0) {
                this._playBgmNote('triangle', freq * 0.5, 0.75, 0.06);
            }
            this.bgmStep++;
        }, 320);
    }

    // ==========================================
    // 6. 英単語ネイティブ発音読み上げ（実録音辞書音声 ＋ Web Speech APIフォールバック）
    // ==========================================
    /**
     * 英単語を本物のネイティブ発音（Oxford米語辞書録音データを最優先）で読み上げる
     * Windows環境で日本語音声（Haruka等）が「he」を「エイチイー」と読んだり日本語訛りになる問題を完全に回避
     * @param {string} text - 読み上げる英単語テキスト
     */
    speakEnglish(text) {
        if (!text || typeof window === 'undefined') return;
        const cleanWord = String(text).trim().toLowerCase();
        if (!cleanWord) return;

        // 発音がはっきり聞こえるようにBGMを一時ダッキング
        this._duckBGM();

        // 再生中の音声があれば停止
        if (this.currentWordAudio) {
            try {
                this.currentWordAudio.pause();
                this.currentWordAudio.currentTime = 0;
            } catch {
                // 無視
            }
        }
        if ('speechSynthesis' in window) {
            try { window.speechSynthesis.cancel(); } catch { /* 無視 */ }
        }

        // 1. Google Oxford米語辞書MP3 ➔ 2. 米語辞書音声ストリーム(type=2: US English) ➔ 3. 英語ネイティブTTS の3段階フォールバック
        const urls = [];
        if (/^[a-z]+$/.test(cleanWord)) {
            urls.push(`https://ssl.gstatic.com/dictionary/static/sounds/20200429/${cleanWord}--_us_1.mp3`);
        }
        urls.push(`https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(cleanWord)}&type=2`);

        const tryPlayUrl = (index) => {
            if (index >= urls.length) {
                this._speakWithNativeTTS(cleanWord);
                return;
            }
            const audio = new Audio(urls[index]);
            this.currentWordAudio = audio;
            let handled = false;
            const fallback = () => {
                if (handled) return;
                handled = true;
                tryPlayUrl(index + 1);
            };
            audio.onerror = fallback;
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.catch(fallback);
            }
        };

        tryPlayUrl(0);
    }

    /**
     * オフライン時等のフォールバック用ネイティブTTS再生
     * @param {string} cleanWord - 小文字化済み英単語
     */
    _speakWithNativeTTS(cleanWord) {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
        try {
            window.speechSynthesis.cancel();
            // 2文字単語（he, in, on等）がアルファベット読み（エイチイー）されないよう小文字のまま設定
            const utter = new SpeechSynthesisUtterance(cleanWord);
            utter.lang = 'en-US';
            utter.rate = 0.9;
            utter.pitch = 1.0;
            utter.volume = 1.0;

            if (this.englishVoice) {
                utter.voice = this.englishVoice;
            }
            window.speechSynthesis.speak(utter);
        } catch {
            // 無視
        }
    }
}
