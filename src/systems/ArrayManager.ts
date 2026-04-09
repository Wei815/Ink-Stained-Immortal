import { GlobalState, updateStateAndLog } from '../state/GlobalState';
import { ArrayType } from '../types/game';

class ArrayManagerService {
    /**
     * 法寶被動：行動後觸發 (潤魂青玉)
     */
    public checkPostActionTreasure() {
        if (GlobalState.suyaoTreasure === 'JADE' && GlobalState.worldColorValue > 70) {
            if (Math.random() < 0.5) {
                updateStateAndLog(s => {
                    const mpGain = Math.floor(s.player.maxMp * 0.05);
                    s.player.mp = Math.min(s.player.maxMp, s.player.mp + mpGain);
                });
                return { msg: '潤魂青玉：靈力滋養', color: '#00ffff' };
            }
        }
        return null;
    }

    /**
     * 法寶被動：受傷時觸發 (聚靈古鏡)
     */
    public checkOnDamageTreasure(dmg: number) {
        if (GlobalState.suyaoTreasure === 'MIRROR' && GlobalState.worldColorValue < 30) {
            const colorGain = Math.floor(dmg * 0.15);
            updateStateAndLog(s => s.worldColorValue = Math.min(100, s.worldColorValue + colorGain));
            return { msg: '聚靈古鏡：受傷轉色', color: '#ffff00' };
        }
        return null;
    }

    /**
     * 陣法邏輯：召喚陣法
     */
    public activateArray(type: ArrayType) {
        updateStateAndLog(s => {
            s.battleArray = { type, turns: 3 };
        });
    }

    /**
     * 陣法邏輯：回合推進
     */
    public advanceArrayTurn() {
        if (GlobalState.battleArray) {
            updateStateAndLog(s => {
                if (s.battleArray) {
                    s.battleArray.turns -= 1;
                    if (s.battleArray.turns <= 0) {
                        s.battleArray = null;
                    }
                }
            });
        }
    }

    /**
     * 陣法邏輯：克制重置 (五行聯動)
     */
    public resetArrayDuration() {
        if (GlobalState.battleArray) {
            updateStateAndLog(s => {
                if (s.battleArray) {
                    s.battleArray.turns = 3;
                    s.worldColorValue = Math.min(100, s.worldColorValue + 10);
                }
            });
            return true;
        }
        return false;
    }

    /**
     * 陣法效果：傷害加乘 (清心陣)
     */
    public getElementalMultiplier(): number {
        return (GlobalState.battleArray?.type === 'CLEANSING') ? 2.0 : 1.5;
    }

    /**
     * 陣法效果：減傷補正 (墨守陣)
     */
    public getDamageReduction(): number {
        return (GlobalState.battleArray?.type === 'INK_LOCK') ? 0.5 : 1.0;
    }

    /**
     * 陣法效果：色彩是否鎖定
     */
    public isColorLocked(): boolean {
        return GlobalState.battleArray?.type === 'INK_LOCK';
    }
}

export const ArrayManager = new ArrayManagerService();
