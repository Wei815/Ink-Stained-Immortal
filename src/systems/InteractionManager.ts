import Phaser from 'phaser';
import { GlobalState, updateStateAndLog } from '../state/GlobalState';
import { MetaManager } from '../state/MetaManager';

export interface InteractiveEntity {
    id: string;
    type: 'LoreFragment' | 'DriedWell' | 'ElementalSwitch' | 'Bush';
    x: number;
    y: number;
    radius: number;
    sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Arc | Phaser.GameObjects.Rectangle;
    data?: any;
    isConsumed?: boolean;
}

class InteractionManagerService {
    private scene!: Phaser.Scene;
    private entities: InteractiveEntity[] = [];
    private playerObj!: Phaser.GameObjects.Sprite | any;

    public init(scene: Phaser.Scene, player: any) {
        this.scene = scene;
        this.playerObj = player;
        this.entities = [];
    }

    public registerEntity(entity: InteractiveEntity) {
        this.entities.push(entity);
    }

    public destroyEntity(id: string) {
        const index = this.entities.findIndex(e => e.id === id);
        if (index > -1) {
            const ent = this.entities[index];
            ent.sprite.destroy();
            this.entities.splice(index, 1);
        }
    }

    public update() {
        if (!this.scene || !this.playerObj) return;

        const px = this.playerObj.x;
        const py = this.playerObj.y;

        for (const ent of this.entities) {
            if (ent.isConsumed) continue;

            const dist = Phaser.Math.Distance.Between(px, py, ent.x, ent.y);
            
            // 墨池專屬持續傷害邏輯 (有害地形)
            if (ent.type === 'DriedWell' && dist < ent.radius && GlobalState.worldColorValue < 40) {
                 if (this.scene.time.now % 1000 < 50) { // 近乎每秒觸發
                     updateStateAndLog(s => s.player.mp = Math.max(0, s.player.mp - 5));
                     this.showFloatingText('魔力流失', '#aa00ff', ent.x, ent.y);
                 }
            }

            // 交互式草叢：自動觸發 (走過去就拾取)
            if (ent.type === 'Bush' && dist < ent.radius) {
                const shards = ent.data?.shards || 1;
                this.showFloatingText(`+${shards} 墨晶`, '#00ff00', ent.x, ent.y);
                updateStateAndLog(s => s.inkShards += shards);
                ent.isConsumed = true;
                
                // 踏碎特效
                this.scene.tweens.add({
                    targets: ent.sprite, scale: 2, alpha: 0, duration: 400,
                    onComplete: () => this.destroyEntity(ent.id)
                });
            }
        }
    }

    public handleInteraction() {
        if (!this.scene || !this.playerObj) return;

        const px = this.playerObj.x;
        const py = this.playerObj.y;

        for (const ent of this.entities) {
            if (ent.isConsumed) continue;

            const dist = Phaser.Math.Distance.Between(px, py, ent.x, ent.y);
            // 當前互動半徑，一般設定為大於物件的碰撞體即可
            if (dist < ent.radius + 30) {
                this.executeInteraction(ent);
                break; // 一次只互動一個
            }
        }
    }

    private executeInteraction(ent: InteractiveEntity) {
        switch (ent.type) {
            case 'LoreFragment':
                this.showFloatingText('解鎖：筆靈殘卷！', '#ffff00', ent.x, ent.y - 30);
                MetaManager.state.unlockedLore.push(ent.id);
                MetaManager.saveMeta();
                ent.isConsumed = true;
                
                this.scene.tweens.add({
                    targets: ent.sprite, alpha: 0, y: ent.y - 50, duration: 1000,
                    onComplete: () => this.destroyEntity(ent.id)
                });
                break;

            case 'DriedWell':
                if (GlobalState.worldColorValue < 40) {
                    this.showFloatingText('蘇瑤注靈：墨池淨化！', '#00ffff', ent.x, ent.y - 40);
                    // 淨化特效
                    updateStateAndLog(s => {
                        s.worldColorValue = Math.min(100, s.worldColorValue + 20);
                        s.player.hp = Math.min(s.player.maxHp, s.player.hp + 50);
                    });
                    
                    if (ent.sprite instanceof Phaser.GameObjects.Arc || ent.sprite instanceof Phaser.GameObjects.Rectangle) {
                        ent.sprite.setFillStyle(0x00ccff); // 變藍色溫泉
                    } else if (ent.sprite.setTint) {
                        ent.sprite.setTint(0x00ccff);
                    }
                    
                    ent.isConsumed = true; // 變成一次性淨化點，淨化後不再扣 MP
                } else {
                    this.showFloatingText('靈氣充沛，無需注靈。', '#ffffff', ent.x, ent.y - 40);
                }
                break;

            case 'ElementalSwitch':
                const reqColor = ent.data?.reqColor || 50;
                const reqTalent = ent.data?.reqTalent || '';
                
                const hasTalent = GlobalState.player.activeTalents?.includes(reqTalent);
                const hasColor = GlobalState.worldColorValue > reqColor;
                
                if (hasTalent && hasColor) {
                    this.showFloatingText('命定機關：解鎖隱藏力量！', '#ff00ff', ent.x, ent.y - 40);
                    updateStateAndLog(s => s.player.talentPoints = (s.player.talentPoints || 0) + 1);
                    ent.isConsumed = true;
                    this.scene.tweens.add({ targets: ent.sprite, scale: 1.5, alpha: 0, duration: 800 });
                } else {
                    this.showFloatingText(`條件未滿 (需色彩>${reqColor} & 裝備特定天賦)`, '#cccccc', ent.x, ent.y - 40);
                }
                break;
        }
    }

    private showFloatingText(msg: string, color: string, x: number, y: number) {
        const txt = this.scene.add.text(x, y, msg, { fontSize: '20px', color: color, stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);
        txt.setDepth(2000);
        this.scene.tweens.add({
            targets: txt, y: y - 50, alpha: 0, duration: 1500, ease: 'Power1',
            onComplete: () => txt.destroy()
        });
    }
}

export const InteractionManager = new InteractionManagerService();
