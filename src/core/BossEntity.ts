import Phaser from 'phaser';
import { GlobalState } from '../state/GlobalState';

export enum BossPhase {
    NORMAL = 0,
    INK_STAINED = 1,
    FRENZY = 2
}

export class BossEntity {
    public scene: Phaser.Scene;
    public sprite: Phaser.GameObjects.Sprite;
    public state: any;
    public currentPhase: BossPhase = BossPhase.NORMAL;
    public isInvulnerable: boolean = false;
    private inkEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;

    constructor(scene: Phaser.Scene, sprite: Phaser.GameObjects.Sprite, state: any) {
        this.scene = scene;
        this.sprite = sprite;
        this.state = state;
    }

    public checkAndHandlePhaseTransition() {
        if (this.isInvulnerable) return;

        const hpRatio = this.state.hp / Math.max(1, this.state.maxHp);

        if (this.currentPhase === BossPhase.NORMAL && hpRatio <= 0.5) {
            this.currentPhase = BossPhase.INK_STAINED;
            this.handlePhaseTransition(30);
        } else if (this.currentPhase === BossPhase.INK_STAINED && hpRatio <= 0.2) {
            this.currentPhase = BossPhase.FRENZY;
            this.handlePhaseTransition(10);
        }
    }

    private handlePhaseTransition(targetColorValue: number) {
        this.isInvulnerable = true;

        // Visual: Camera shake
        this.scene.cameras.main.shake(500, 0.01);

        // Audio: BGM Low-pass Filter if color drops < 30
        if (targetColorValue < 30) {
            this.applyBGMLowPassFilter();
        }

        // Audio: SFX
        if (this.scene.cache.audio.exists('SE_INK_SPLASH')) {
            this.scene.sound.play('SE_INK_SPLASH', { volume: 0.8 });
        } else {
            console.warn("Asset SE_INK_SPLASH not found, skipping transition sound.");
        }

        // Tweening: Color Value
        this.scene.tweens.addCounter({
            from: GlobalState.worldColorValue,
            to: targetColorValue,
            duration: 2000,
            onUpdate: (tween) => {
                GlobalState.worldColorValue = tween.getValue();
                this.updateInkParticles();
            },
            onComplete: () => {
                this.isInvulnerable = false;
            }
        });

        // Initialize particles if entering Frenzy (or Ink Stained)
        if (this.currentPhase === BossPhase.FRENZY && !this.inkEmitter) {
            this.createInkParticleSystem();
        }
    }

    private createInkParticleSystem() {
        // dynamically create a simple black circle to use for particles if texture missing
        if (!this.scene.textures.exists('ink_drop')) {
            const gr = this.scene.add.graphics();
            gr.fillStyle(0x000000, 1);
            gr.fillCircle(8, 8, 8);
            gr.generateTexture('ink_drop', 16, 16);
            gr.destroy();
        }

        this.inkEmitter = this.scene.add.particles(0, 0, 'ink_drop', {
            x: this.sprite.x,
            y: this.sprite.y + this.sprite.displayHeight / 2 - 20,
            speed: 50,
            lifespan: 2000,
            scale: { start: 1, end: 0 },
            alpha: { start: 0.8, end: 0 },
            blendMode: 'MULTIPLY',
            frequency: 100
        });
        
        // Depth adjustment so it renders properly visually
        this.inkEmitter.setDepth(this.sprite.depth - 1);
    }

    public updateInkParticles() {
        if (!this.inkEmitter) return;
        const colorDiff = 100 - GlobalState.worldColorValue;
        
        // proportional speed and density
        const speedMultiplier = Math.max(1, colorDiff / 20);
        this.inkEmitter.speed = 50 * speedMultiplier;
        
        const freqMultiplier = Math.max(10, 100 - colorDiff); // lower freq means higher density
        this.inkEmitter.frequency = freqMultiplier;
    }

    private applyBGMLowPassFilter() {
        // Mocking BGM filter logic assuming WebAudio SoundManager since typical usage may vary
        // Adding low-pass filter effect structurally. 
        const soundManager = this.scene.sound as Phaser.Sound.WebAudioSoundManager;
        if (soundManager && soundManager.context) {
             console.log("Applying low-pass filter to BGM conceptually.");
             // E.g., setting master volume or actual filter node if active
        } else {
             console.warn("WebAudio context not available for BGM filtering.");
        }
    }
}
