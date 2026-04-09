import Phaser from 'phaser';
import { GlobalState, updateStateAndLog } from '../state/GlobalState';
import { BondManager } from '../systems/BondManager';

export class SuYaoAI {
    private scene: Phaser.Scene;
    
    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    /**
     * 當玩家每次行動後，呼叫此系統評估蘇瑤是否連動
     */
    public evaluateAction(playerDamageDealt: number, onComplete: () => void) {
        const pState = GlobalState.player;
        const eState = GlobalState.enemy;
        const cVal = GlobalState.worldColorValue;

        let hasActed = false;

        // 判定 1: 色彩淨化優先 (worldColorValue < 50)
        if (cVal < 50) {
            hasActed = true;
            this.showActionText('蘇瑤使用了 [清心訣]！', '#00ffff', () => {
                updateStateAndLog(s => s.worldColorValue = Math.min(100, s.worldColorValue + 15));
                BondManager.addBond(10);
                onComplete();
            });
            return;
        }

        // 判定 2: 守護規則 (玩家血量 < 30%)
        const hpRatio = pState.hp / Math.max(1, pState.maxHp);
        if (hpRatio < 0.3) {
            hasActed = true;
            // 墨守天賦判定：若有防禦向天賦（例如 tal_earth 或泛指的墨守分支）加強護盾
            const isDefTalent = pState.activeTalents?.includes('tal_earth');
            const healAmount = isDefTalent ? 40 : 20;

            this.showActionText('蘇瑤使用了 [靈界護罩]！', '#00ff00', () => {
                updateStateAndLog(s => s.player.hp = Math.min(s.player.maxHp, s.player.hp + healAmount));
                BondManager.addBond(15);
                onComplete();
            });
            return;
        }

        // 判定 3: 追擊規則 (怪物血量 > 50% 且玩家有造成傷害)
        const eHpRatio = eState.hp / Math.max(1, eState.maxHp);
        if (eHpRatio > 0.5 && playerDamageDealt > 0) {
            if (Phaser.Math.FloatBetween(0, 1) <= 0.4) {
                hasActed = true;
                this.showActionText('蘇瑤追加了 [靈力衝擊]！', '#ff00ff', () => {
                    updateStateAndLog(s => s.enemy.hp = Math.max(0, s.enemy.hp - 15));
                    BondManager.addBond(20);
                    onComplete();
                });
                return;
            }
        }

        // AI 未達觸發條件，什麼都沒做
        if (!hasActed) {
             onComplete();
        }
    }

    private showActionText(msg: string, color: string, onDone: () => void) {
        // 抓取非 UI 用相機的位置，這裡抓畫面中央偏上
        const { width, height } = this.scene.cameras.main;
        const txt = this.scene.add.text(width / 2, height * 0.4, msg, {
             fontSize: '32px', color: color, fontStyle: 'bold', stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5);
        txt.setScrollFactor(0);
        txt.setDepth(500);

        this.scene.tweens.add({
            targets: txt,
            y: txt.y - 40,
            alpha: 0,
            duration: 1200,
            ease: 'Power1',
            onComplete: () => {
                txt.destroy();
                onDone();
            }
        });
    }
}
