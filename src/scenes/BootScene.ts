import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        const { width, height } = this.cameras.main;
        this.cameras.main.setBackgroundColor('#050505');

        // 美術字體與 Loading 進度
        const loadingText = this.add.text(width / 2, height / 2 - 50, '水 墨 幻 化 中 ...', {
            fontFamily: 'serif', fontSize: '32px', color: '#aaaaaa', letterSpacing: 5
        }).setOrigin(0.5);

        const progressBg = this.add.graphics();
        progressBg.fillStyle(0x222222, 1);
        progressBg.fillRect(width / 2 - 200, height / 2 + 30, 400, 10);

        const progressBar = this.add.graphics();

        this.load.on('progress', (value: number) => {
            progressBar.clear();
            progressBar.fillStyle(0xdddddd, 1);
            progressBar.fillRect(width / 2 - 200, height / 2 + 30, 400 * value, 10);
            
            // 隨機水墨飛濺碎布效果以點綴
            if (Phaser.Math.FloatBetween(0, 1) < 0.2) {
                this.add.circle(
                     width / 2 - 200 + (400 * value), 
                     height / 2 + 35 + Phaser.Math.Between(-15, 15), 
                     Phaser.Math.Between(2, 6), 
                     0xffffff
                ).setAlpha(0.3);
            }
        });

        this.load.on('complete', () => {
             this.tweens.add({
                 targets: [loadingText, progressBg, progressBar],
                 alpha: 0,
                 duration: 600,
                 onComplete: () => {
                      this.scene.start('TitleScene');
                 }
             });
        });

        // 模擬載入一些龐大的素材，觸發 loading 跑條以展示特效
        for (let i = 0; i < 20; i++) {
             this.load.image(`fake_asset_${i}`, 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
        }
        
        // 實際可載入：
        // this.load.image('tileset_world', '/assets/tileset_world.png');
    }
}
