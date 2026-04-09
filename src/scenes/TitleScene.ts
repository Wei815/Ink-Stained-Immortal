import Phaser from 'phaser';
import { SaveManager } from '../state/SaveManager';
import { GlobalState } from '../state/GlobalState';
import { BattleSimulator } from '../systems/BattleSimulator';

export class TitleScene extends Phaser.Scene {
    constructor() {
        super({ key: 'TitleScene' });
    }

    create() {
        this.cameras.main.setBackgroundColor('#1c1c1e');
        const { width, height } = this.cameras.main;
        
        this.add.text(width / 2, height / 4, '墨染仙塵', {
            fontSize: '84px',
            color: '#e0e0e0',
            fontFamily: 'serif',
            stroke: '#000',
            strokeThickness: 10
        }).setOrigin(0.5);

        const startBtn = this.add.text(width / 2, height / 2 + 100, ' 新開始 ', { fontSize: '36px', color: '#aaaaaa', padding: { x: 20, y: 10 } }).setOrigin(0.5).setInteractive({ useHandCursor: true });
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
                if(prog === 1) this.scene.start('CinematicScene', { mode: 'OPENING' });
            });
        });

        if (SaveManager.hasSave()) {
            const continueBtn = this.add.text(width / 2, height / 2 + 180, ' 繼續旅程 ', { fontSize: '36px', color: '#aaaaaa', padding: { x: 20, y: 10 } }).setOrigin(0.5).setInteractive({ useHandCursor: true });
            continueBtn.on('pointerover', () => continueBtn.setColor('#00ff00'));
            continueBtn.on('pointerout', () => continueBtn.setColor('#aaaaaa'));
            continueBtn.on('pointerdown', () => {
                SaveManager.loadGame();
                this.cameras.main.fadeOut(500, 0, 0, 0, (cam: any, prog: number) => {
                    if(prog === 1) this.scene.start('MainScene');
                });
            });
        }

        // 開發者測試掛鉤：按 T 執行戰鬥數值模擬
        this.input.keyboard?.on('keydown-T', () => {
            BattleSimulator.runSuite();
        });
    }
}
