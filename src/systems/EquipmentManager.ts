import { GlobalState, updateStateAndLog } from '../state/GlobalState';
import { Equipment, EquipmentType } from '../types/game';

class EquipmentManagerService {
    
    /**
     * 計算裝備當前等級的數值
     */
    public getRealStats(eq: Equipment) {
        const factor = 1 + (0.15 * (eq.level - 1));
        return {
            atk: Math.floor((eq.baseStats.atk || 0) * factor),
            hp: Math.floor((eq.baseStats.hp || 0) * factor),
            def: Math.floor((eq.baseStats.def || 0) * factor)
        };
    }

    /**
     * 強化裝備
     */
    public refine(eqId: string): { success: boolean, msg: string } {
        const eq = GlobalState.equipmentInventory.find(e => e.id === eqId) || 
                   Object.values(GlobalState.equipped).find(e => e?.id === eqId);
        
        if (!eq) return { success: false, msg: '找不到裝備' };

        // 消耗計算
        const shardCost = Math.floor(100 * Math.pow(1.5, eq.level - 1));
        if (GlobalState.inkShards < shardCost) return { success: false, msg: '墨晶不足' };

        // 突破檢查 (每 5 級)
        if (eq.level % 5 === 0) {
            const hasEssence = GlobalState.inventory.some(i => i.id === 'spirit_essence');
            if (!hasEssence) return { success: false, msg: '需要「筆靈精華」進行突破' };
            // 消耗精華 logic... 
        }

        // 成功率 (100% -> 50% 遞減)
        const successRate = Math.max(0.5, 1.0 - (eq.level - 1) * 0.05);
        const rolled = Math.random();

        updateStateAndLog(state => {
            state.inkShards -= shardCost;
            if (rolled <= successRate) {
                eq.level += 1;
            }
        });

        if (rolled <= successRate) {
            this.syncPlayerStats();
            return { success: true, msg: '強化成功！' };
        } else {
            return { success: false, msg: '強化失敗，墨跡未乾...' };
        }
    }

    /**
     * 穿上裝備
     */
    public equip(eqId: string) {
        const eq = GlobalState.equipmentInventory.find(e => e.id === eqId);
        if (!eq) return;

        updateStateAndLog(state => {
            const slot = eq.type === 'WEAPON' ? 'weapon' : (eq.type === 'ARMOR' ? 'armor' : 'accessory');
            const old = state.equipped[slot];
            if (old) state.equipmentInventory.push(old);
            
            state.equipped[slot] = eq;
            state.equipmentInventory = state.equipmentInventory.filter(e => e.id !== eqId);
        });

        this.syncPlayerStats();
    }

    /**
     * 同步沈雲數值
     */
    public syncPlayerStats() {
        updateStateAndLog(state => {
            const p = state.player;
            let bonusAtk = 0, bonusHp = 0, bonusDef = 0;

            Object.values(state.equipped).forEach(eq => {
                if (eq) {
                    const stats = this.getRealStats(eq);
                    bonusAtk += stats.atk;
                    bonusHp += stats.hp;
                    bonusDef += stats.def;
                }
            });

            p.atk = (p.baseAtk || 10) + bonusAtk;
            p.maxHp = (p.baseHp || 100) + bonusHp;
            p.hp = Math.min(p.maxHp, p.hp);
            p.def = (p.baseDef || 5) + bonusDef;

            // 特殊屬性加成 (突破連動)
            if (state.worldColorValue < 30) {
                 const weapon = state.equipped.weapon;
                 if (weapon && weapon.element === 'FIRE' && weapon.level >= 5) {
                     p.atk = Math.floor(p.atk * 1.1); // 額外 10% ATK
                 }
            }
        });
    }

    /**
     * 套裝共鳴檢查
     */
    public checkResonance(): string | null {
        const { weapon, armor, accessory } = GlobalState.equipped;
        if (!weapon || !armor || !accessory) return null;
        if (weapon.element === armor.element && armor.element === accessory.element && weapon.element !== 'NONE') {
            return weapon.element;
        }
        return null;
    }
}

export const EquipmentManager = new EquipmentManagerService();
