import Phaser from 'phaser';

export interface CGLayers {
    base: Phaser.GameObjects.Image;
    line: Phaser.GameObjects.Image;
    wash: Phaser.GameObjects.Image;
}

class CinematicManagerService {
    private scene!: Phaser.Scene;
    private renderTexture!: Phaser.GameObjects.RenderTexture;
    private mask!: Phaser.Display.Masks.BitmapMask;

    public init(scene: Phaser.Scene) {
        this.scene = scene;
        const { width, height } = this.scene.cameras.main;
        
        // 建立用於遮罩的 RenderTexture
        this.renderTexture = this.scene.add.renderTexture(0, 0, width, height).setVisible(false);
        this.mask = this.renderTexture.createBitmapMask();
    }

    /**
     * 建立具有三層結構的 CG 物件
     */
    public createCGLayers(textureKey: string): CGLayers {
        if (!this.scene) throw new Error("CinematicManager not initialized");
        const { width, height } = this.scene.cameras.main;
        
        const base = this.scene.add.image(width / 2, height / 2, textureKey).setMask(this.mask);
        const line = this.scene.add.image(width / 2, height / 2, textureKey).setMask(this.mask).setAlpha(0);
        const wash = this.scene.add.image(width / 2, height / 2, textureKey).setMask(this.mask).setAlpha(0);

        // 呼吸效應 (Wash Layer)
        this.scene.tweens.add({
            targets: wash,
            scale: 1.02,
            duration: 3000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        return { base, line, wash };
    }

    /**
     * 模擬筆刷劃過顯現圖像
     */
    public async revealInk(duration: number = 2000) {
        if (!this.scene) return;
        const { width, height } = this.scene.cameras.main;
        const brush = this.scene.make.image({ key: 'vfx_brush_mask', add: false });
        
        return new Promise<void>((resolve) => {
            this.scene!.tweens.add({
                targets: { val: 0 },
                val: 1,
                duration: duration,
                onUpdate: (tween) => {
                    const x = width * (tween as any).getValue();
                    // 在 RenderTexture 上畫出筆刷軌跡
                    this.renderTexture!.draw(brush, x, height / 2);
                },
                onComplete: () => resolve()
            });
        });
    }

    /**
     * 滴墨字幕特效
     */
    public showDrippingSubtitle(text: string, x: number, y: number) {
        const txt = this.scene.add.text(x, y, text, {
            fontFamily: 'serif',
            fontSize: '32px',
            color: '#ffffff',
            stroke: '#000',
            strokeThickness: 2
        }).setOrigin(0.5).setAlpha(0);

        // 文字浮現
        this.scene.tweens.add({
            targets: txt,
            alpha: 1,
            y: y - 10,
            duration: 1000
        });

        // 滴墨粒子
        const emitter = this.scene.add.particles(x, y, 'ink_drop', {
            speedY: { min: 50, max: 150 },
            speedX: { min: -10, max: 10 },
            scale: { start: 0.1, end: 0.5 },
            alpha: { start: 0.6, end: 0 },
            lifespan: 1000,
            quantity: 1,
            frequency: 200,
            emitting: true
        });

        this.scene!.time.delayedCall(3000, () => {
            this.scene!.tweens.add({
                targets: [txt, emitter],
                alpha: 0,
                duration: 1000,
                onComplete: () => {
                    txt.destroy();
                    emitter.destroy();
                }
            });
        });
    }

    /**
     * 清除遮罩
     */
    public clearMask() {
        this.renderTexture.clear();
    }
}

export const CinematicManager = new CinematicManagerService();
