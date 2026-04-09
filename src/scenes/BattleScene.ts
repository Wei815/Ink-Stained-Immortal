import Phaser from 'phaser';
import { GlobalState, updateStateAndLog } from '../state/GlobalState';
import { SaveManager } from '../state/SaveManager';

interface BattleUnit {
    state: any; 
    sprite: Phaser.GameObjects.Sprite;
    ag: number;
    isPlayer: boolean;
    hpBarBg: Phaser.GameObjects.Graphics;
    hpBarGhost: Phaser.GameObjects.Graphics;
    hpBarFill: Phaser.GameObjects.Graphics;
    lastHpRatio: number;
}

export class BattleScene extends Phaser.Scene {
    private units: BattleUnit[] = [];
    private activeUnit: BattleUnit | null = null;
    private isAnimating: boolean = false;
    private uiContainer!: Phaser.GameObjects.Container;
    private mainLayer!: Phaser.GameObjects.Container;
    private colorMatrixFX!: Phaser.FX.ColorMatrix;

    private btnAttack!: Phaser.GameObjects.Text;
    private btnItem!: Phaser.GameObjects.Text;

    constructor() {
        super({ key: 'BattleScene' });
    }

    preload() {}

    create() {
        this.cameras.main.setBackgroundColor('#2c3e50');
        this.cameras.main.fadeIn(500);
        this.colorMatrixFX = this.cameras.main.postFX.addColorMatrix();

        const { width, height } = this.cameras.main;

        this.mainLayer = this.add.container(0, 0);

        const playerSprite = this.add.sprite(width * 0.75, height * 0.65, 'swordsman');
        playerSprite.setOrigin(0.5, 1).setScale(0.8);
        this.tweens.add({ targets: playerSprite, y: playerSprite.y + 5, yoyo: true, repeat: -1, duration: 1500 });

        const enemySprite = this.add.sprite(width * 0.25, height * 0.65, 'monster');
        enemySprite.setOrigin(0.5, 1).setScale(0.8);
        if (enemySprite.width > 0) enemySprite.flipX = false;
        this.tweens.add({ targets: enemySprite, y: enemySprite.y + 5, yoyo: true, repeat: -1, duration: 1200 });

        this.mainLayer.add([playerSprite, enemySprite]);

        this.units = [
            { state: GlobalState.player, sprite: playerSprite, ag: 0, isPlayer: true, hpBarBg: this.add.graphics(), hpBarGhost: this.add.graphics(), hpBarFill: this.add.graphics(), lastHpRatio: 1 },
            { state: GlobalState.enemy, sprite: enemySprite, ag: 0, isPlayer: false, hpBarBg: this.add.graphics(), hpBarGhost: this.add.graphics(), hpBarFill: this.add.graphics(), lastHpRatio: 1 }
        ];
        this.units.forEach(u => {
            u.lastHpRatio = u.state.hp / Math.max(1, u.state.maxHp);
            this.mainLayer.add([u.hpBarBg, u.hpBarGhost, u.hpBarFill]);
        });

        this.createUI();
        this.setupCameras(width, height);
        this.updateHPRedraw();
    }

    createUI() {
        const { width, height } = this.cameras.main;
        this.uiContainer = this.add.container(0, 0);

        const panel = this.add.graphics();
        panel.fillStyle(0x111111, 0.9);
        panel.fillRect(0, height * 0.75, width, height * 0.25);
        this.uiContainer.add(panel);

        this.uiContainer.add(this.add.text(width * 0.6, height * 0.78, '沈雲', { fontSize: '22px', color: '#fff', fontStyle: 'bold' }));

        this.btnAttack = this.add.text(80, height * 0.78, '> 普通攻擊', { fontSize: '24px', color: '#fff', fontFamily: 'monospace' }).setInteractive({ useHandCursor: true });
        this.btnAttack.on('pointerdown', () => this.handlePlayerAttack());
        
        this.btnItem = this.add.text(80, height * 0.84, '> 使用物品', { fontSize: '24px', color: '#fff', fontFamily: 'monospace' }).setInteractive({ useHandCursor: true });
        this.btnItem.on('pointerdown', () => this.handlePlayerItem());

        this.uiContainer.add([this.btnAttack, this.btnItem]);
        this.setUIVisible(false);
    }

    setUIVisible(v: boolean) {
        this.btnAttack.setVisible(v);
        this.btnItem.setVisible(v);
    }

    setupCameras(width: number, height: number) {
        this.cameras.main.ignore(this.uiContainer);
        const uiCam = this.cameras.add(0, 0, width, height);
        uiCam.ignore(this.mainLayer);
    }

    updateHPRedraw() {
        const { width, height } = this.cameras.main;
        const pu = this.units.find(u => u.isPlayer)!;
        const hx = width * 0.6, hy = height * 0.85;
        pu.hpBarBg.clear().fillStyle(0x330000).fillRect(hx, hy, 200, 12);
        pu.hpBarFill.clear().fillStyle(0x00cc00).fillRect(hx, hy, 200 * (pu.state.hp / Math.max(1, pu.state.maxHp)), 12);
        pu.hpBarBg.fillStyle(0x000033).fillRect(hx, hy + 20, 150, 8);
        pu.hpBarFill.fillStyle(0x0066ff).fillRect(hx, hy + 20, 150 * (pu.state.mp / Math.max(1, pu.state.maxMp)), 8);

        const eu = this.units.find(u => !u.isPlayer)!;
        const ex = eu.sprite.x - 50, ey = eu.sprite.y + 10;
        const eRatio = eu.state.hp / Math.max(1, eu.state.maxHp);
        eu.hpBarBg.clear().fillStyle(0x330000).fillRect(ex, ey, 100, 8);
        eu.hpBarFill.clear().fillStyle(0xff3333).fillRect(ex, ey, 100 * eRatio, 8);
    }

    update() {
        this.colorMatrixFX.grayscale(1 - (GlobalState.worldColorValue / 100));

        if (this.isAnimating || this.activeUnit) return;

        for (let unit of this.units) {
            if (unit.state.hp <= 0) continue;
            // 套用流雲天賦：+行動速度
            const spdBonus = (unit.isPlayer && GlobalState.player.activeTalents?.includes('tal_water')) ? 5 : 0;
            unit.ag += (unit.state.spd + spdBonus) * 2.5; 

            if (unit.ag >= 1000) {
                this.activeUnit = unit;
                unit.ag = 0; 
                this.startTurn(unit);
                break;
            }
        }
    }

    startTurn(unit: BattleUnit) {
        if (unit.isPlayer) {
            this.setUIVisible(true);
        } else {
            this.time.delayedCall(800, () => this.executeAttack(unit, this.units.find(u => u.isPlayer)!));
        }
    }

    handlePlayerAttack() {
        this.setUIVisible(false);
        const playerUnit = this.units.find(u => u.isPlayer)!;
        const enemyUnit = this.units.find(u => !u.isPlayer)!;
        this.executeAttack(playerUnit, enemyUnit);
    }

    handlePlayerItem() {
        this.setUIVisible(false);
        const playerUnit = this.units.find(u => u.isPlayer)!;
        
        if (GlobalState.inventory.length > 0) {
            const item = GlobalState.inventory.shift()!;
            item.effect(GlobalState.player);
            
            const txt = this.add.text(playerUnit.sprite.x, playerUnit.sprite.y - 120, `使用道具`, { fontSize: '24px', color: '#00ffff' }).setOrigin(0.5);
            this.mainLayer.add(txt);
            this.tweens.add({ targets: txt, y: txt.y - 50, alpha: 0, duration: 1000, onComplete: () => txt.destroy() });
            
            this.updateHPRedraw();
            
            // 結束回合
            this.time.delayedCall(1000, () => {
                this.activeUnit = null; 
                this.checkWinCondition();
            });
        } else {
            const txt = this.add.text(playerUnit.sprite.x, playerUnit.sprite.y - 120, `背包已空！`, { fontSize: '20px', color: '#aaaaaa' }).setOrigin(0.5);
            this.mainLayer.add(txt);
            this.tweens.add({ targets: txt, y: txt.y - 50, alpha: 0, duration: 1000, onComplete: () => txt.destroy() });
            this.time.delayedCall(1000, () => {
                this.activeUnit = null; 
            });
        }
    }

    executeAttack(attacker: BattleUnit, defender: BattleUnit) {
        this.isAnimating = true;
        const startX = attacker.sprite.x;
        const targetX = defender.isPlayer ? defender.sprite.x + 60 : defender.sprite.x - 60;

        this.tweens.add({
            targets: attacker.sprite,
            x: targetX,
            duration: 200,
            ease: 'Power2',
            onComplete: () => {
                this.applyImpact(attacker, defender);
                
                this.time.delayedCall(250, () => {
                    this.tweens.add({
                        targets: attacker.sprite,
                        x: startX,
                        duration: 300,
                        ease: 'Cubic.Out',
                        onComplete: () => {
                            this.isAnimating = false;
                            this.activeUnit = null; 
                            this.checkWinCondition();
                        }
                    });
                });
            }
        });
    }

    applyImpact(attacker: BattleUnit, defender: BattleUnit) {
        let baseDmg = attacker.state.atk - defender.state.def;
        if (baseDmg < 1) baseDmg = 1;
        
        let multiplier = 1;
        let isSuperEffective = false;
        
        if (attacker.state.affinity === 'Water' && defender.state.affinity === 'Fire') {
            multiplier = 1.5;
            isSuperEffective = true;
        }

        // 烈火天賦判定：色彩度越低，攻擊加乘突破 1.2 倍
        let isFireTalentTriggered = false;
        if (attacker.isPlayer && GlobalState.player.activeTalents?.includes('tal_fire') && GlobalState.worldColorValue <= 50) {
            multiplier *= 1.2;
            isFireTalentTriggered = true;
        }

        if (!attacker.isPlayer && GlobalState.worldColorValue <= 30) {
            multiplier *= 1.5; 
        }

        const finalDmg = Math.floor(baseDmg * multiplier * Phaser.Math.FloatBetween(0.9, 1.1));
        
        defender.state.hp = Math.max(0, defender.state.hp - finalDmg);
        updateStateAndLog(state => {
            if(defender.isPlayer) state.player.hp = defender.state.hp;
            else state.enemy.hp = defender.state.hp;
        });

        this.triggerDamageVisuals(defender, finalDmg, isSuperEffective, isFireTalentTriggered);
    }

    triggerDamageVisuals(defender: BattleUnit, dmg: number, isSuperEffective: boolean, fireTalent: boolean) {
        const origX = defender.sprite.x;
        const origY = defender.sprite.y;
        this.tweens.add({
            targets: defender.sprite,
            x: origX + Phaser.Math.Between(-8, 8), y: origY + Phaser.Math.Between(-8, 8),
            yoyo: true, repeat: 3, duration: 40,
            onComplete:() => { defender.sprite.setPosition(origX, origY); }
        });

        defender.sprite.setTintFill(0xff0000);
        this.time.delayedCall(120, () => defender.sprite.clearTint());

        const spark = this.add.circle(defender.sprite.x, defender.sprite.y - defender.sprite.displayHeight/2, 20, 0xffaa00);
        this.mainLayer.add(spark);
        this.tweens.add({
            targets: spark, scale: 2.5, alpha: 0, duration: 300, ease: 'Quad.Out',
            onComplete: () => spark.destroy()
        });

        // 烈火天賦專屬視覺：紫色爆發數字
        let dmgColor = isSuperEffective ? '#ffd700' : '#ff3333';
        if (fireTalent) dmgColor = '#ff00ff';

        const dmgText = this.add.text(defender.sprite.x, defender.sprite.y - defender.sprite.displayHeight - 20, `-${dmg}`, {
            fontSize: isSuperEffective || fireTalent ? '40px' : '32px',
            color: dmgColor, 
            fontFamily: 'Impact, sans-serif', stroke: '#000', strokeThickness: 5
        }).setOrigin(0.5);
        this.mainLayer.add(dmgText);

        this.tweens.add({
            targets: dmgText, y: dmgText.y - 60, alpha: 0, duration: 800, ease: 'Power1',
            onComplete: () => dmgText.destroy()
        });

        const oldRatio = defender.lastHpRatio;
        const newRatio = defender.state.hp / Math.max(1, defender.state.maxHp);
        
        const barX = defender.isPlayer ? this.cameras.main.width * 0.6 : defender.sprite.x - 50;
        const barY = defender.isPlayer ? this.cameras.main.height * 0.85 : defender.sprite.y + 10;
        const barW = defender.isPlayer ? 200 : 100;
        
        defender.hpBarGhost.clear().fillStyle(0xffa07a).fillRect(barX, barY, barW * oldRatio, defender.isPlayer ? 12 : 8);
        defender.lastHpRatio = newRatio;
        
        this.updateHPRedraw();

        this.tweens.addCounter({
            from: oldRatio, to: newRatio, duration: 600, ease: 'Quad.Out', delay: 150,
            onUpdate: (tween) => {
                const val = tween?.getValue() ?? oldRatio;
                defender.hpBarGhost.clear().fillStyle(0xcc5500).fillRect(barX, barY, barW * val, defender.isPlayer ? 12 : 8);
            },
            onComplete: () => defender.hpBarGhost.clear()
        });
    }

    checkWinCondition() {
        const enemy = this.units.find(u => !u.isPlayer)!;
        if (enemy.state.hp <= 0) {
            enemy.sprite.setTintFill(0x888888);
            this.time.delayedCall(1200, () => {
                enemy.state.hp = enemy.state.maxHp; 
                SaveManager.saveGame(); // 戰鬥勝利存檔
                this.cameras.main.fadeOut(800, 0, 0, 0, (cam: any, prog: number) => {
                    if (prog === 1) this.scene.start('MainScene');
                });
            });
            return;
        }
        
        const player = this.units.find(u => u.isPlayer)!;
        if (player.state.hp <= 0) {
            player.sprite.setTintFill(0xff0000);
            this.time.delayedCall(1500, () => {
                player.state.hp = player.state.maxHp;
                this.scene.start('TitleScene'); // 死亡回到標題
            });
        }
    }
}
