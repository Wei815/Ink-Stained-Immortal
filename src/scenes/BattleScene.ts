import Phaser from 'phaser';
import { GlobalState, updateStateAndLog } from '../state/GlobalState';
import { SaveManager } from '../state/SaveManager';
import { BossEntity } from '../core/BossEntity';
import { QuestManager } from '../systems/QuestManager';
import { ImmersionManager } from '../systems/ImmersionManager';
import { SuYaoAI } from '../core/SuYaoAI';
import { BondManager } from '../systems/BondManager';
import { UIManager } from '../systems/UIManager';
import { ComboManager, SKILL_DB, SkillDefinition } from '../core/ComboManager';
import { BalanceManager, LootItem } from '../systems/BalanceManager';

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

    private btnAttack!: Phaser.GameObjects.Container;
    private btnItem!: Phaser.GameObjects.Container;
    private btnLink!: Phaser.GameObjects.Container;
    private bossEntity!: BossEntity;
    private suyaoAI!: SuYaoAI;

    constructor() {
        super({ key: 'BattleScene' });
    }

    preload() {}

    create() {
        this.cameras.main.setBackgroundColor('#2c3e50');
        this.cameras.main.fadeIn(500);
        this.colorMatrixFX = this.cameras.main.postFX.addColorMatrix();
        ImmersionManager.bindScene(this);

        const { width, height } = this.cameras.main;

        this.mainLayer = this.add.container(0, 0);

        const playerSprite = this.add.sprite(width * 0.75, height * 0.65, 'swordsman');
        playerSprite.setOrigin(0.5, 1).setScale(0.8);
        this.tweens.add({ targets: playerSprite, y: playerSprite.y + 5, yoyo: true, repeat: -1, duration: 1500 });

        const enemySprite = this.add.sprite(width * 0.25, height * 0.65, 'monster');
        enemySprite.setOrigin(0.5, 1).setScale(0.8);
        if (enemySprite.width > 0) enemySprite.flipX = false;
        this.tweens.add({ targets: enemySprite, y: enemySprite.y + 5, yoyo: true, repeat: -1, duration: 1200 });

        this.bossEntity = new BossEntity(this, enemySprite, GlobalState.enemy);
        this.suyaoAI = new SuYaoAI(this);

        this.mainLayer.add([playerSprite, enemySprite]);

        this.units = [
            { state: GlobalState.player, sprite: playerSprite, ag: 0, isPlayer: true, hpBarBg: this.add.graphics(), hpBarGhost: this.add.graphics(), hpBarFill: this.add.graphics(), lastHpRatio: 1 },
            { state: GlobalState.enemy, sprite: enemySprite, ag: 0, isPlayer: false, hpBarBg: this.add.graphics(), hpBarGhost: this.add.graphics(), hpBarFill: this.add.graphics(), lastHpRatio: 1 }
        ];

        // 憐憫機制 (Pity System)：若失敗超過 3 次，賦予守護 Buff
        if (GlobalState.bossFailCount >= 3) {
            updateStateAndLog(s => {
                const buffAmount = Math.floor(s.player.maxHp * 0.2);
                s.player.hp = Math.min(s.player.maxHp, s.player.hp + buffAmount);
            });
            const pityText = this.add.text(width * 0.5, height * 0.4, '【蘇瑤的守護】生命值恢復 20%', { fontSize: '28px', color: '#ffaaaa', strokeThickness: 4 }).setOrigin(0.5);
            this.tweens.add({ targets: pityText, y: pityText.y - 50, alpha: 0, delay: 2000, duration: 1000, onComplete: () => pityText.destroy() });
            GlobalState.bossFailCount = 0; // 重置
        }

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

        const panel = UIManager.createInkWindow(this, 0, height * 0.75, width, height * 0.25);
        this.uiContainer.add(panel);

        this.uiContainer.add(this.add.text(width * 0.6, height * 0.78, '沈雲', { fontSize: '22px', color: '#fff', fontStyle: 'bold' }));

        this.btnAttack = UIManager.createInkButton(this, 150, height * 0.82, '流雲·疾', () => this.handlePlayerSkill('skill_swift'));
        this.btnItem = UIManager.createInkButton(this, 300, height * 0.82, '流雲·炎', () => this.handlePlayerSkill('skill_fire'));

        this.btnLink = UIManager.createInkButton(this, width * 0.8, height * 0.82, '[墨契: 揮毫]', () => {
             if (this.isAnimating) return;
             this.setUIVisible(false);
             this.isAnimating = true;
             BondManager.executeUltimate(this, () => {
                  this.isAnimating = false;
                  this.activeUnit = null;
                  this.checkWinCondition();
             });
        });
        this.btnLink.setVisible(false);

        this.uiContainer.add([this.btnAttack, this.btnItem, this.btnLink]);
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

        this.btnLink.setVisible(BondManager.isFull() && this.activeUnit?.isPlayer === true);

        if (this.bossEntity) {
            this.bossEntity.updateInkParticles();
        }

        if (this.isAnimating || this.activeUnit) return;

        for (let unit of this.units) {
            if (unit.state.hp <= 0) continue;

            if (!unit.isPlayer && this.bossEntity && this.bossEntity.isInvulnerable) {
                continue;
            }

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

    handlePlayerSkill(skillId: string) {
        this.setUIVisible(false);
        const playerUnit = this.units.find(u => u.isPlayer)!;
        const enemyUnit = this.units.find(u => !u.isPlayer)!;
        
        let targetSkill = SKILL_DB[skillId];
        ComboManager.recordSkill(skillId);
        
        const comboSkill = ComboManager.checkComboAndConsume();
        let isCombo = false;
        
        if (comboSkill) {
             targetSkill = comboSkill;
             isCombo = true;
             
             // 畫面提示 Combo 觸發
             const txt = this.add.text(playerUnit.sprite.x, playerUnit.sprite.y - 120, `筆意爆發：${comboSkill.name}！`, { fontSize: '30px', color: '#ffaaaa', fontStyle: 'bold', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5);
             this.mainLayer.add(txt);
             this.tweens.add({ targets: txt, scale: 1.5, alpha: 0, duration: 1500, ease: 'Power2', onComplete: () => txt.destroy() });
        }

        this.executeAttack(playerUnit, enemyUnit, targetSkill, isCombo);
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

    executeAttack(attacker: BattleUnit, defender: BattleUnit, skill?: SkillDefinition, isCombo: boolean = false) {
        this.isAnimating = true;
        const startX = attacker.sprite.x;
        const targetX = defender.isPlayer ? defender.sprite.x + 60 : defender.sprite.x - 60;

        let frameCount = 0;

        this.tweens.add({
            targets: attacker.sprite,
            x: targetX,
            duration: 200,
            ease: 'Power2',
            onUpdate: () => {
                frameCount++;
                // 水系高速技能或 Combo 時產生殘影 (Ghost Trail)
                if (frameCount % 2 === 0 && (skill?.type === 'water' || isCombo)) {
                     const ghost = this.add.sprite(attacker.sprite.x, attacker.sprite.y, attacker.sprite.texture.key);
                     ghost.setOrigin(0.5, 1).setScale(0.8).setTintFill(0x88ccff).setAlpha(0.6);
                     ghost.flipX = attacker.sprite.flipX; // 同步朝向
                     this.mainLayer.addAt(ghost, 0); // 放在較底層
                     this.tweens.add({
                          targets: ghost, alpha: 0, duration: 300, onComplete: () => ghost.destroy()
                     });
                }
            },
            onComplete: () => {
                this.applyImpact(attacker, defender, skill, isCombo);
                
                this.time.delayedCall(250, () => {
                    this.tweens.add({
                        targets: attacker.sprite,
                        x: startX,
                        duration: 300,
                        ease: 'Cubic.Out',
                        onComplete: () => {
                            if (attacker.isPlayer) {
                                // 評估 AI 連動
                                this.suyaoAI.evaluateAction(attacker.state.atk, () => {
                                    this.isAnimating = false;
                                    this.activeUnit = null; 
                                    this.checkWinCondition();
                                });
                            } else {
                                this.isAnimating = false;
                                this.activeUnit = null; 
                                this.checkWinCondition();
                            }
                        }
                    });
                });
            }
        });
    }

    applyImpact(attacker: BattleUnit, defender: BattleUnit, skill?: SkillDefinition, isCombo: boolean = false) {
        let baseDmg = attacker.state.atk; // 取消舊的線性相減，交給亂數引擎
        
        let reactionText = '';
        const attackerLv = attacker.isPlayer ? 5 : 5; // 暫設等值
        const defenderLv = defender.isPlayer ? 5 : 5;
        
        const balanceResult = BalanceManager.calculateDamage(baseDmg, attackerLv, defenderLv, attacker.isPlayer);
        let finalDmg = balanceResult.dmg;
        let isSuperEffective = false;

        if (balanceResult.isMiss) {
            const txt = this.add.text(defender.sprite.x, defender.sprite.y - 60, `MISS`, { fontSize: '40px', color: '#aaaaaa', fontStyle: 'italic', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5);
            this.mainLayer.add(txt);
            this.tweens.add({ targets: txt, x: txt.x - 20, alpha: 0, duration: 800, onComplete: () => txt.destroy() });
            
            // 閃避殘影
            const ghost = this.add.sprite(defender.sprite.x + 20, defender.sprite.y, defender.sprite.texture.key).setAlpha(0.5);
            this.mainLayer.addAt(ghost, 0);
            this.tweens.add({ targets: ghost, x: ghost.x + 30, alpha: 0, duration: 300, onComplete: () => ghost.destroy() });
            return;
        }

        // 技能倍率與元素反應
        let multiplier = 1;
        if (skill) {
             multiplier *= skill.powerMultiplier;
             
             // 墨蒸反應：若施放火系且目標為水屬性(預設火岩精為火，我們假設被蘇瑤打會上水浸，這裡簡單將 target 視為有水屬特徵來觸發)
             // 這裡以 ComboManager 代勞核算
             // 假定如果怪物血量低於 80% 身上可能被上了水浸
             const hasWater = !defender.isPlayer && ((defender.state.hp / defender.state.maxHp) < 0.8);
             const reaction = ComboManager.applyElementalReaction(skill.type, hasWater);
             if (reaction.reactionName) {
                  multiplier *= reaction.multiplier;
                  reactionText = reaction.reactionName;
             }
        }
        
        if (attacker.state.affinity === 'Water' && defender.state.affinity === 'Fire') {
            multiplier *= 1.5;
            isSuperEffective = true;
        }

        // 烈火天賦判定：色彩度越低，攻擊加乘突破 1.2 倍
        let isFireTalentTriggered = false;
        if (attacker.isPlayer && GlobalState.player.activeTalents?.includes('tal_fire') && GlobalState.worldColorValue <= 50) {
            multiplier *= 1.2;
            isFireTalentTriggered = true;
        }

        if (!attacker.isPlayer) {
            multiplier *= (1 + (100 - GlobalState.worldColorValue) / 100);
        }

        finalDmg = Math.floor(finalDmg * multiplier);
        if (balanceResult.isCrit) reactionText = reactionText ? `CRIT! ${reactionText}` : 'CRIT!';
        
        // 打擊停頓 (Hit-Stop Frame Freeze) 演出
        if (isCombo || reactionText || isSuperEffective || balanceResult.isCrit) {
             this.tweens.pauseAll();
             setTimeout(() => {
                  if (this && this.tweens) this.tweens.resumeAll();
             }, 80); // 卡幀 0.08 秒
        }

        defender.state.hp = Math.max(0, defender.state.hp - finalDmg);
        updateStateAndLog(state => {
            if(defender.isPlayer) state.player.hp = defender.state.hp;
            else state.enemy.hp = defender.state.hp;
        });

        if (!defender.isPlayer && this.bossEntity) {
            this.bossEntity.checkAndHandlePhaseTransition();
        }

        // 動態受擊硬直 (Hit Stun)
        const stunRatio = finalDmg / defender.state.maxHp;
        this.triggerDamageVisuals(defender, finalDmg, isSuperEffective, isFireTalentTriggered, reactionText, stunRatio);
    }

    triggerDamageVisuals(defender: BattleUnit, dmg: number, isSuperEffective: boolean, fireTalent: boolean, reactionText: string = '', stunRatio: number = 0) {
        const origX = defender.sprite.x;
        const origY = defender.sprite.y;
        
        // Stun 烈度越高，抖動幅度跟次數越扯
        const shakeDist = 8 + (stunRatio * 40);
        const shakeRepeats = 3 + Math.floor(stunRatio * 5);

        this.tweens.add({
            targets: defender.sprite,
            x: origX + Phaser.Math.Between(-shakeDist, shakeDist), y: origY + Phaser.Math.Between(-shakeDist, shakeDist),
            yoyo: true, repeat: shakeRepeats, duration: 40,
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

        // 傷害飄字動態拋物線
        let dmgColor = isSuperEffective || reactionText ? '#ffd700' : '#ff3333';
        if (fireTalent) dmgColor = '#ff00ff';
        
        let displayStr = `-${dmg}`;
        if (reactionText) displayStr = `${reactionText} ${displayStr}`;

        const dmgText = this.add.text(defender.sprite.x, defender.sprite.y - defender.sprite.displayHeight - 20, displayStr, {
            fontSize: isSuperEffective || fireTalent || reactionText ? '50px' : '36px',
            color: dmgColor, 
            fontFamily: 'Impact, sans-serif', stroke: '#000', strokeThickness: 5
        }).setOrigin(0.5);
        this.mainLayer.add(dmgText);

        const targetDmgX = defender.sprite.x + Phaser.Math.Between(-80, 80);
        this.tweens.add({
            targets: dmgText,
            x: targetDmgX,
            y: dmgText.y - 120,
            alpha: { from: 1, to: 0 },
            duration: 1000,
            ease: 'Power1',
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
                QuestManager.setFlag('boss_forest_defeated', true);
                GlobalState.bossFailCount = 0;

                // 戰利品結算 (假設剛才是墨契揮毫，則 isBondFinisher = true)
                // 這裡簡化：只要滿墨契結束就視為合擊完成
                const lootPool: LootItem[] = [
                    { item: '墨晶 x50', weight: 70 },
                    { item: '筆靈殘卷 x1', weight: 25 },
                    { item: '命定墨寶 x1', weight: 5 }
                ];
                const drops = BalanceManager.generateLoot(lootPool, BondManager.isFull());
                console.log("[Loot] 獲得掉落物: ", drops.join(', '));
                
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
            updateStateAndLog(s => s.bossFailCount += 1); // 增加計敗數
            this.time.delayedCall(1500, () => {
                player.state.hp = player.state.maxHp;
                this.cameras.main.fadeOut(800, 0, 0, 0, (cam: any, prog: number) => {
                    if (prog === 1) this.scene.start('SummaryScene', { isGameOver: true });
                });
            });
        }
    }
}
