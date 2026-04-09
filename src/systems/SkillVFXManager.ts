import Phaser from 'phaser';
import { GlobalState } from '../state/GlobalState';

export type ElementalType = 'WATER' | 'FIRE' | 'INK' | 'EARTH';

class SkillVFXManagerService {
    private scene!: Phaser.Scene;
    private emitters: Record<string, Phaser.GameObjects.Particles.ParticleEmitter> = {};
    private particlePool!: Phaser.GameObjects.Group;

    public init(scene: Phaser.Scene) {
        this.scene = scene;
        this.emitters = {};
        
        // 1. 【流雲·水】發射器
        this.emitters['WATER'] = this.scene.add.particles(0, 0, 'ink_drop', {
            speed: { min: 50, max: 150 },
            scale: { start: 0.3, end: 1.2 },
            alpha: { start: 0.8, end: 0 },
            lifespan: 1200,
            blendMode: 'ADD',
            emitting: false
        });

        // 2. 【烈火·火】發射器
        this.emitters['FIRE'] = this.scene.add.particles(0, 0, 'ink_drop', {
            speed: { min: 100, max: 300 },
            angle: { min: 240, max: 300 }, // 向上噴發
            scale: { start: 0.2, end: 0.8 },
            gravityY: -200,
            lifespan: 800,
            emitting: false
        });

        // 3. 【墨守·土 / 濃墨】發射器
        this.emitters['INK'] = this.scene.add.particles(0, 0, 'ink_drop', {
            speed: { min: 20, max: 60 },
            scale: { start: 1, end: 3 },
            alpha: { start: 0.6, end: 0 },
            lifespan: 2000,
            emitting: false
        });
        
        // 將發射器設為高層級
        Object.values(this.emitters).forEach(e => e.setDepth(2000));
    }

    public createElementalEffect(type: ElementalType, x: number, y: number) {
        const emitter = this.emitters[type === 'EARTH' ? 'INK' : type];
        if (!emitter) return;

        // 根據 GlobalState 動態調整屬性
        this.applyColorDynamics(emitter, type);
        
        emitter.explode(30, x, y);
    }

    public createHitSplash(x: number, y: number) {
        const emitter = this.emitters['INK'];
        if (!emitter) return;
        
        emitter.setConfig({
            speed: { min: 100, max: 400 },
            scale: { start: 0.5, end: 0.1 },
            alpha: { start: 1, end: 0 },
            lifespan: 400
        });
        
        emitter.explode(20, x, y);
    }

    public createGhostTrail(target: Phaser.GameObjects.Sprite, color: number = 0xffffff) {
        // 利用 brush_stroke 產生殘影
        const emitter = this.scene.add.particles(target.x, target.y, 'brush_stroke', {
            speed: 0,
            scale: target.scale,
            alpha: { start: 0.4, end: 0 },
            lifespan: 300,
            emitting: true,
            frequency: 50,
            duration: 500,
            follow: target,
            tint: color
        });
        emitter.setDepth(target.depth - 1);
        this.scene.time.delayedCall(600, () => emitter.destroy());
    }

    /**
     * 精英怪專屬：墨光呼吸特效
     */
    public createEliteAura(target: Phaser.GameObjects.Sprite) {
        const aura = this.scene.add.particles(0, 0, 'ink_drop', {
            speed: 20,
            scale: { start: 0.5, end: 1.5 },
            alpha: { start: 0.3, end: 0 },
            lifespan: 1000,
            frequency: 100,
            follow: target,
            blendMode: 'ADD'
        });
        aura.setDepth(target.depth - 1);
        
        // 呼吸縮放效果
        this.scene.tweens.add({
            targets: target,
            scale: target.scale * 1.05,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Cubic.InOut'
        });

        return aura;
    }

    private applyColorDynamics(emitter: Phaser.GameObjects.Particles.ParticleEmitter, type: ElementalType) {
        const colorValue = GlobalState.worldColorValue;
        
        // 1. 顏色處理 (TintColor)
        let tints = [0xffffff];
        let alphaScale = 1;
        let lifespanScale = 1;

        if (colorValue > 80) {
            // 高色彩狀態：Glow + 飽和
            if (type === 'WATER') tints = [0x2E5A88, 0xA1D2E2];
            if (type === 'FIRE') tints = [0xD94625, 0xF2A01F];
            if (type === 'INK' || type === 'EARTH') tints = [0x1A1A1A, 0x444444];
            emitter.setBlendMode('ADD');
        } else if (colorValue < 30) {
            // 低色彩狀態：純灰階 + 短命
            tints = [0x444444, 0x888888];
            lifespanScale = 0.7;
            emitter.setBlendMode('NORMAL');
        } else {
            // 一般狀態
            if (type === 'WATER') tints = [0x4E7A98, 0x82C2D2];
            if (type === 'FIRE') tints = [0xB93615, 0xD2900F];
            if (type === 'INK' || type === 'EARTH') tints = [0x1A1A1A, 0x333333];
            emitter.setBlendMode('NORMAL');
        }

        // 依照 3.60 API，直接更新 config 並重設色彩
        emitter.setConfig({
            tint: tints,
            lifespan: 800 * lifespanScale // 這裡用基準值模擬
        });
    }
}

export const SkillVFXManager = new SkillVFXManagerService();
