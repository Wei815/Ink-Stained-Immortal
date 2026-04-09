import Phaser from 'phaser';
import { GlobalState, updateStateAndLog } from '../state/GlobalState';

class BondManagerService {
    public bondValue: number = 0;
    
    public addBond(amount: number) {
        this.bondValue = Phaser.Math.Clamp(this.bondValue + amount, 0, 100);
    }
    
    public isFull(): boolean {
        return this.bondValue >= 100;
    }
    
    public resetBond() {
        this.bondValue = 0;
    }

    public executeUltimate(scene: Phaser.Scene, onComplete: () => void) {
        this.resetBond();
        
        // 視覺：強行轉換為純白背景特寫
        const whiteOverlay = scene.add.graphics();
        whiteOverlay.fillStyle(0xffffff, 1);
        const { width, height } = scene.cameras.main;
        whiteOverlay.fillRect(0, 0, width, height);
        whiteOverlay.setDepth(10000).setAlpha(0);
        whiteOverlay.setScrollFactor(0);

        // 蘇瑤、沈雲揮毫線條特效
        const brushStroke = scene.add.graphics();
        brushStroke.setDepth(10001);
        brushStroke.setScrollFactor(0);
        
        scene.tweens.add({
            targets: whiteOverlay,
            alpha: 1,
            duration: 500,
            onComplete: () => {
                // 特寫文字
                const text = scene.add.text(width/2, height/2, '天 外 墨 染', {
                    fontSize: '80px', color: '#000000', fontFamily: 'serif', fontStyle: 'bold', letterSpacing: 15
                }).setOrigin(0.5).setDepth(10002).setScale(0.1);
                text.setScrollFactor(0);

                scene.tweens.add({
                    targets: text, scale: 1.2, duration: 400, ease: 'Back.out',
                    onComplete: () => {
                        // 畫大條的黑色毛筆破空痕跡
                        brushStroke.lineStyle(120, 0x000000, 0.9);
                        brushStroke.beginPath();
                        brushStroke.moveTo(-100, height * 0.2);
                        brushStroke.lineTo(width + 100, height * 0.8);
                        brushStroke.strokePath();

                        scene.cameras.main.shake(800, 0.05);

                        scene.time.delayedCall(1200, () => {
                            // 恢復色彩與退場
                            scene.tweens.add({
                                targets: [whiteOverlay, text, brushStroke], alpha: 0, duration: 800,
                                onComplete: () => {
                                    whiteOverlay.destroy();
                                    text.destroy();
                                    brushStroke.destroy();
                                    
                                    // 結算狀態：血量恢復，怪物大受傷，色彩強勢回填至 100
                                    updateStateAndLog(state => {
                                        state.worldColorValue = 100;
                                        // 合擊無情大傷害
                                        state.enemy.hp = Math.max(0, state.enemy.hp - 999);
                                        // 治癒沈雲
                                        state.player.hp = Math.min(state.player.maxHp, Math.floor(state.player.maxHp));
                                    });
                                    onComplete();
                                }
                            });
                        });
                    }
                });
            }
        });
    }
}

export const BondManager = new BondManagerService();
