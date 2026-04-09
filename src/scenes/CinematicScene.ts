import Phaser from 'phaser';
import { CinematicManager } from '../systems/CinematicManager';
import { ImmersionManager } from '../systems/ImmersionManager';
import { MetaManager } from '../state/MetaManager';
import { EndingType } from '../systems/EndingCalculator';

export interface CinematicConfig {
    mode: 'OPENING' | 'ENDING';
    endingType?: EndingType;
}

export class CinematicScene extends Phaser.Scene {
    private config!: CinematicConfig;

    constructor() {
        super({ key: 'CinematicScene' });
    }

    init(data: CinematicConfig) {
        this.config = data;
    }

    create() {
        CinematicManager.init(this);
        ImmersionManager.bindScene(this);
        
        if (this.config.mode === 'OPENING') {
            this.playOpening();
        } else {
            this.playEnding();
        }

        // 跳過機制
        const isSkippable = MetaManager.state.playthroughCount > 1;
        if (isSkippable) {
            const skipText = this.add.text(this.cameras.main.width - 150, 50, '[ESC] 跳過回憶', { fontSize: '20px', color: '#888888' }).setAlpha(0);
            this.tweens.add({ targets: skipText, alpha: 1, duration: 2000 });
            
            this.input.keyboard?.on('keydown-ESC', () => {
                this.finishCinematic();
            });
        }
    }

    private async playOpening() {
        const { width, height } = this.cameras.main;
        
        // 1. 磨墨聲
        ImmersionManager.stopAllAudio(); 
        CinematicManager.showDrippingSubtitle('（磨墨聲...）', width / 2, height * 0.8);
        
        await this.delay(1500);

        // 2. Logo 橫空出世
        const logo = this.add.image(width / 2, height / 2, 'logo_ink').setAlpha(0).setScale(1.2);
        this.tweens.add({
            targets: logo,
            alpha: 1,
            scale: 1,
            duration: 2000,
            ease: 'Power2'
        });

        await this.delay(3000);
        this.tweens.add({ targets: logo, alpha: 0, duration: 1000 });

        // 3. 沈雲顯現
        this.showSubtitle('「世間本無色，皆由筆下生。」', height * 0.5);
        await this.delay(2000);
        
        // 4. 重點：墨染轉場至第一章
        this.finishCinematic();
    }

    private async playEnding() {
        const { width, height } = this.cameras.main;
        const type = this.config.endingType || EndingType.ENDING_B_NORMAL;

        // 根據結局紀錄存檔
        MetaManager.recordEnding(type);

        // 1. 筆刷顯現背景
        const layers = CinematicManager.createCGLayers('cg_ending_a'); 
        await CinematicManager.revealInk(3000);

        // 2. 結局字幕
        const endingText = type === EndingType.ENDING_A_BAD ? '結局 A：濃墨吞世' : '結局 B：仙塵褪色';
        this.showSubtitle(endingText, height * 0.3);
        
        await this.delay(4000);

        // 3. 落款印章
        const seal = this.add.image(width * 0.8, height * 0.8, 'seal_finish').setAlpha(0).setScale(2);
        this.tweens.add({
            targets: seal,
            alpha: 1,
            scale: 0.5,
            duration: 500,
            ease: 'Bounce.easeOut'
        });

        await this.delay(3000);
        this.scene.start('TitleScene');
    }

    private showSubtitle(text: string, y: number) {
        CinematicManager.showDrippingSubtitle(text, this.cameras.main.width / 2, y);
    }

    private finishCinematic() {
        this.cameras.main.fadeOut(1000, 255, 255, 255); // 閃白轉場
        this.cameras.main.once('camerafadeoutcomplete', () => {
             if (this.config.mode === 'OPENING') {
                this.scene.start('MainScene');
             } else {
                this.scene.start('TitleScene');
             }
        });
    }

    private delay(ms: number) {
        return new Promise(resolve => this.time.delayedCall(ms, resolve));
    }
}
