import { GlobalState, updateStateAndLog } from '../state/GlobalState';
import { ArrayManager } from '../systems/ArrayManager';

export interface SkillDefinition {
    id: string;
    name: string;
    type: 'water' | 'fire' | 'neutral';
    powerMultiplier: number;
    colorCost: number;
}

export const SKILL_DB: Record<string, SkillDefinition> = {
    'skill_swift': { id: 'skill_swift', name: '流雲·疾', type: 'water', powerMultiplier: 1.0, colorCost: 0 },
    'skill_fire': { id: 'skill_fire', name: '流雲·炎', type: 'fire', powerMultiplier: 1.5, colorCost: 0 },
    'skill_ultima': { id: 'skill_ultima', name: '流雲·歸元', type: 'water', powerMultiplier: 2.5, colorCost: -10 }
};

class ComboManagerService {
    public skillHistory: string[] = [];

    public recordSkill(skillId: string) {
        this.skillHistory.push(skillId);
        if (this.skillHistory.length > 3) {
            this.skillHistory.shift();
        }
    }

    public checkComboAndConsume(): SkillDefinition | null {
        const len = this.skillHistory.length;
        if (len >= 2) {
            const p1 = this.skillHistory[len - 2];
            const p2 = this.skillHistory[len - 1];

            // 範例連招：疾 -> 疾 => 觸發 歸元
            if (p1 === 'skill_swift' && p2 === 'skill_swift') {
                 this.skillHistory = []; // consume
                 return SKILL_DB['skill_ultima'];
            }
        }
        return null; // NO COMBO
    }

    public applyElementalReaction(skillType: 'water' | 'fire' | 'neutral', targetHasWater: boolean): { multiplier: number, reactionName: string } {
        // 五行連鎖：墨蒸
        if (skillType === 'fire' && targetHasWater) {
            updateStateAndLog(s => s.worldColorValue = Math.max(0, s.worldColorValue - 5));
            const baseMult = ArrayManager.getElementalMultiplier(); 
            return { multiplier: baseMult * 1.5, reactionName: '墨蒸' };
        }
        return { multiplier: 1.0, reactionName: '' };
    }

    public resetHistory() {
        this.skillHistory = [];
    }
}

export const ComboManager = new ComboManagerService();
