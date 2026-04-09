import Phaser from 'phaser';
import { GlobalState, updateStateAndLog } from '../state/GlobalState';
import { CutsceneManager } from '../systems/CutsceneManager';

export class TalentScene extends Phaser.Scene {
    private pointsText!: Phaser.GameObjects.Text;
    
    constructor() {
        super({ key: 'TalentScene' });
    }

    create() {
        const { width, height } = this.cameras.main;

        // 背景暗化
        this.add.rectangle(0, 0, width, height, 0x000000, 0.6).setOrigin(0);

        // 畫卷底紙 (橫向長條)
        const scrollBg = this.add.graphics();
        scrollBg.fillStyle(0xf4e4bc, 1);
        const scrollW = 600, scrollH = 400;
        scrollBg.fillRoundedRect(-scrollW / 2, -scrollH / 2, scrollW, scrollH, 20);
        scrollBg.setPosition(width / 2, height / 2);
        
        // 展開動畫
        scrollBg.scaleX = 0;
        this.tweens.add({ targets: scrollBg, scaleX: 1, duration: 600, ease: 'Cubic.Out' });

        this.time.delayedCall(600, () => this.drawTalentTree(width / 2, height / 2));

        // 離開提示
        this.add.text(width / 2, height - 50, "按 TAB 鍵或 ESC 返回", { fontSize: '18px', color: '#ffffff' }).setOrigin(0.5);
        if (this.input.keyboard) {
            this.input.keyboard.addKey('TAB').on('down', () => this.resumeMainScene());
            this.input.keyboard.addKey('ESC').on('down', () => this.resumeMainScene());
        }
    }

    resumeMainScene() {
        this.scene.stop();
        this.scene.resume('MainScene');
    }

    drawTalentTree(cx: number, cy: number) {
        this.add.text(cx, cy - 160, '命定墨卷', { fontSize: '32px', color: '#333', fontFamily: 'serif' }).setOrigin(0.5);
        
        this.pointsText = this.add.text(cx, cy - 110, `剩餘靈墨：${GlobalState.player.talentPoints}`, { fontSize: '20px', color: '#0055aa' }).setOrigin(0.5);

        // 重刷筆墨按鈕
        const resetBtn = this.add.text(cx, cy + 160, '【重刷筆墨】', { fontSize: '20px', color: '#aa0000' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        resetBtn.on('pointerdown', () => this.resetTalents());

        // 三大天賦節點定義
        const nodes = [
            { id: 'tal_water', name: '流雲 (水)', desc: '+速度\n高彩度觸發連擊', x: cx - 150, y: cy + 10 },
            { id: 'tal_fire', name: '烈火 (火)', desc: '+攻擊\n墨化時倍增傷害', x: cx, y: cy + 10 },
            { id: 'tal_earth', name: '墨守 (土)', desc: '+防禦\n神木護盾加持', x: cx + 150, y: cy + 10 }
        ];

        nodes.forEach((n, index) => {
            const isActive = GlobalState.player.activeTalents?.includes(n.id);
            const circleColor = isActive ? 0x222222 : 0xdddddd; // 已點為墨色，未點為紙白
            const circle = this.add.circle(n.x, n.y, 40, circleColor).setInteractive({ useHandCursor: true });
            circle.setStrokeStyle(4, 0x000000);
            
            // 教學高亮：第一個節點
            if (GlobalState.tutorialStep === 5 && index === 0) {
                 this.tweens.add({ targets: circle, scale: 1.2, duration: 600, yoyo: true, repeat: -1 });
            }

            const txtColor = isActive ? '#fff' : '#333';
            const nameTxt = this.add.text(n.x, n.y, n.name, { fontSize: '20px', color: txtColor, fontFamily: 'serif' }).setOrigin(0.5);
            this.add.text(n.x, n.y + 60, n.desc, { fontSize: '14px', color: '#555', align: 'center' }).setOrigin(0.5);

            circle.on('pointerdown', () => {
                if (isActive) return;
                if (GlobalState.player.talentPoints! > 0) {
                    this.unlockTalent(n.id, circle, nameTxt);
                    if (GlobalState.tutorialStep === 5 && index === 0) {
                        updateStateAndLog(s => s.tutorialStep = 6);
                        this.time.delayedCall(1000, () => this.showFinalTutorialNote());
                    }
                } else {
                    // 點數不足抖動提示
                    this.tweens.add({ targets: this.pointsText, x: this.pointsText.x + 5, yoyo: true, repeat: 3, duration: 50 });
                }
            });
        });

        if (GlobalState.tutorialStep === 5) {
             this.checkTalentTutorial();
        }
    }

    private async checkTalentTutorial() {
        await CutsceneManager.play(this, [
            { type: 'CHAR_SAY', id: '蘇瑤', text: '沈大哥，這是你命格中的「命定墨卷」，戰鬥後的感悟已化為靈墨。', portrait: 'portrait_su_yao_worried' },
            { type: 'CHAR_SAY', id: '蘇瑤', text: '試著激活「流雲」節點，這能讓你在戰鬥中行動更迅速，甚至觸發連擊！', portrait: 'portrait_su_yao_worried' }
        ], {});
    }

    private async showFinalTutorialNote() {
        await CutsceneManager.play(this, [
            { type: 'CHAR_SAY', id: '蘇瑤', text: '很好！你已經掌握了墨染世界的基本法門，接下來就靠我們一起找回墨色了。', portrait: 'portrait_su_yao_worried' }
        ], {});
    }

    unlockTalent(id: string, circle: Phaser.GameObjects.Arc, nameTxt: Phaser.GameObjects.Text) {
        updateStateAndLog(state => {
            state.player.talentPoints! -= 1;
            if(!state.player.activeTalents) state.player.activeTalents = [];
            state.player.activeTalents.push(id);
            
            // 根據點擊賦予基底數值
            if(id === 'tal_water') state.player.spd += 5;
            if(id === 'tal_fire') state.player.atk += 10;
            if(id === 'tal_earth') state.player.def += 10;
        });

        // 墨跡暈染特效
        circle.setFillStyle(0x222222);
        nameTxt.setColor('#fff');
        const inkSplash = this.add.circle(circle.x, circle.y, 10, 0x000000, 0.5);
        this.tweens.add({ targets: inkSplash, scale: 5, alpha: 0, duration: 800, ease: 'Quad.Out', onComplete: () => inkSplash.destroy() });

        this.pointsText.setText(`剩餘靈墨：${GlobalState.player.talentPoints}`);
    }

    resetTalents() {
        updateStateAndLog(state => {
            const count = state.player.activeTalents?.length || 0;
            // 回收屬性
            if (state.player.activeTalents?.includes('tal_water')) state.player.spd -= 5;
            if (state.player.activeTalents?.includes('tal_fire')) state.player.atk -= 10;
            if (state.player.activeTalents?.includes('tal_earth')) state.player.def -= 10;

            state.player.talentPoints! += count;
            state.player.activeTalents = [];
        });
        
        // 重整畫面
        this.scene.restart();
    }
}
