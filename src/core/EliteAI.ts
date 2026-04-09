import { GlobalState, updateStateAndLog } from '../state/GlobalState';
import { ComboManager } from './ComboManager';
import { EntityStats } from '../types/game';

export interface AIAction {
    name: string;
    type: 'attack' | 'skill' | 'buff' | 'debuff';
    telegraph: 'RED' | 'PURPLE' | 'GOLD' | null;
    execute: (unit: any, target: any) => void;
}

class EliteAIController {
    /**
     * 行為樹根節點：優先級選取器
     */
    public think(unit: any, player: any): AIAction {
        const uState = unit.state as EntityStats;
        const pState = player.state as EntityStats;
        const color = GlobalState.worldColorValue;

        // 1. 生存分支 (Emergency)
        if (uState.hp < uState.maxHp * 0.3 && color < 50) {
            return {
                name: '墨影護盾',
                type: 'buff',
                telegraph: 'GOLD',
                execute: (u, p) => {
                    updateStateAndLog(s => {
                        s.enemy.def += 20; 
                        s.worldColorValue = Math.max(0, s.worldColorValue - 10);
                    });
                }
            };
        }

        // 2. 壓制分支 (Suppression)
        // 判定：若玩家剛放完連招 (History 為空) 或靈力不足
        if (ComboManager.skillHistory.length === 0 || pState.mp < 10) {
            return {
                name: '焦墨封印',
                type: 'debuff',
                telegraph: 'PURPLE',
                execute: (u, p) => {
                    updateStateAndLog(s => s.player.spd = Math.max(1, s.player.spd - 5));
                }
            };
        }

        // 3. 屬性針對分支 (Counter-Pick)
        const lastSkill = ComboManager.skillHistory[ComboManager.skillHistory.length - 1];
        if (lastSkill) {
            // 邏輯：偵測玩家屬性並切換至克制或抵抗屬性
            // 簡化：直接切換為該屬性以獲得對應抗性(假設同屬性有基礎抗性)
            return {
                name: '墨色變換',
                type: 'buff',
                telegraph: 'RED',
                execute: (u, p) => {
                    updateStateAndLog(s => {
                         // 切換自身屬性為玩家剛使用的屬性 (達成防禦性共感)
                         if (lastSkill.includes('fire')) s.enemy.affinity = 'Fire';
                         if (lastSkill.includes('swift')) s.enemy.affinity = 'Water';
                    });
                }
            };
        }

        // 4. 常規進攻
        return {
            name: '墨染重擊',
            type: 'attack',
            telegraph: null,
            execute: (u, p) => {
                // 基礎攻擊邏輯交由 BattleScene.executeAttack
            }
        };
    }

    /**
     * 計算墨染護甲減傷
     */
    public getInkArmorReduction(color: number): number {
        // 公式：1 - (100 - color) / 200 => 0 色彩時 0.5 減傷
        // 最高減傷設為 70% (0.3 倍率)
        const rawArmor = (100 - color) / 100; // 0~1
        const reduction = Math.min(0.7, rawArmor * 0.7); 
        return 1 - reduction;
    }
}

export const EliteAI = new EliteAIController();
