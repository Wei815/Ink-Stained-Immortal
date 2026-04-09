import Phaser from 'phaser';
import { EndingCalculator, EndingResult } from '../systems/EndingCalculator';
import { MetaManager } from '../state/MetaManager';

export class SummaryScene extends Phaser.Scene {
    private result!: EndingResult;

    constructor() {
        super({ key: 'SummaryScene' });
    }

    init(data: { isGameOver: boolean }) {
        // 在載入時立即計算結局與發放點數
        this.result = EndingCalculator.calculateEnding(data.isGameOver || false);
    }

    create() {
        this.cameras.main.setBackgroundColor('#050505');
        const { width, height } = this.cameras.main;

        this.cameras.main.fadeIn(1500, 0, 0, 0);

        this.add.text(width / 2, height * 0.2, '輪 迴 結 算', {
            fontSize: '48px', color: '#ffffee', fontFamily: 'serif', letterSpacing: 10
        }).setOrigin(0.5);

        this.add.text(width / 2, height * 0.35, this.result.title, {
            fontSize: '36px', color: '#ff5555', fontFamily: 'serif'
        }).setOrigin(0.5);

        this.add.text(width / 2, height * 0.5, this.result.description, {
            fontSize: '24px', color: '#cccccc', fontFamily: 'sans-serif',
            wordWrap: { width: width * 0.8 }, align: 'center', lineSpacing: 15
        }).setOrigin(0.5);

        this.add.text(width / 2, height * 0.7, `本局獲得 宿命值 (Karma): +${this.result.karmaEarned}`, {
            fontSize: '28px', color: '#00ffff', fontStyle: 'bold'
        }).setOrigin(0.5);

        this.add.text(width / 2, height * 0.78, `[ 當前累積宿命值: ${MetaManager.state.karmaPoints} | 進入週目: ${MetaManager.state.playthroughCount + 1} ]`, {
            fontSize: '20px', color: '#aaaa77'
        }).setOrigin(0.5);

        const btn = this.add.text(width / 2, height * 0.9, '> 踏入下一輪迴 (NG+) <', {
            fontSize: '32px', color: '#ffffff', fontStyle: 'bold'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        this.tweens.add({ targets: btn, alpha: 0.3, yoyo: true, repeat: -1, duration: 1200 });

        btn.on('pointerdown', () => {
             // 呼叫切換週目重置邏輯
             MetaManager.startNewGamePlus();
             
             this.cameras.main.fadeOut(1000, 255, 255, 255, (cam: any, prog: number) => {
                  if (prog === 1) {
                      this.scene.start('CinematicScene', { 
                          mode: 'ENDING', 
                          endingType: this.result.type 
                      });
                  }
             });
        });
    }
}
