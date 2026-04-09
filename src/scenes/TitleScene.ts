import Phaser from 'phaser';
import { SaveManager } from '../state/SaveManager';
import { GlobalState } from '../state/GlobalState';

export class TitleScene extends Phaser.Scene {
    constructor() {
        super({ key: 'TitleScene' });
    }

    create() {
        this.cameras.main.setBackgroundColor('#1c1c1e');
        const { width, height } = this.cameras.main;
        
        this.add.text(width / 2, height / 3, '墨染仙塵', {
            fontSize: '72px',
            color: '#e0e0e0',
            fontFamily: 'serif',
            stroke: '#000',
            strokeThickness: 8
        }).setOrigin(0.5);

        const startBtn = this.add.text(width / 2, height / 2 + 20, '新開始', { fontSize: '32px', color: '#aaaaaa' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        startBtn.on('pointerover', () => startBtn.setColor('#ffffff'));
        startBtn.on('pointerout', () => startBtn.setColor('#aaaaaa'));
        startBtn.on('pointerdown', () => {
            SaveManager.clearSave();
            // Reset to defaults
            GlobalState.player.hp = GlobalState.player.maxHp;
            GlobalState.player.talentPoints = 2;
            GlobalState.player.activeTalents = [];
            GlobalState.worldColorValue = 100;
            this.cameras.main.fadeOut(500, 0, 0, 0, (cam: any, prog: number) => {
                if(prog === 1) this.scene.start('MainScene');
            });
        });

        if (SaveManager.hasSave()) {
            const continueBtn = this.add.text(width / 2, height / 2 + 80, '繼續旅程', { fontSize: '32px', color: '#aaaaaa' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
            continueBtn.on('pointerover', () => continueBtn.setColor('#00ff00'));
            continueBtn.on('pointerout', () => continueBtn.setColor('#aaaaaa'));
            continueBtn.on('pointerdown', () => {
                SaveManager.loadGame();
                this.cameras.main.fadeOut(500, 0, 0, 0, (cam: any, prog: number) => {
                    if(prog === 1) this.scene.start('MainScene');
                });
            });
        }
    }
}
