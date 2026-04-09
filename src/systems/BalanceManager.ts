import Phaser from 'phaser';
import { GlobalState } from '../state/GlobalState';

export interface LootItem {
    item: string;
    weight: number;
}

class BalanceManagerService {
    
    /**
     * 進行精密的雙方攻防與浮動運算
     */
    public calculateDamage(baseDamage: number, attackerLv: number, defenderLv: number, attackerIsPlayer: boolean): { dmg: number, isCrit: boolean, isMiss: boolean } {
        const colorValue = GlobalState.worldColorValue;
        
        let isCrit = false;
        let isMiss = false;

        // 1. 命中與爆擊判定
        if (attackerIsPlayer) {
            // 色彩極低時，命中率折損 30%
            if (colorValue < 20) {
                if (Phaser.Math.FloatBetween(0, 1) < 0.3) {
                    isMiss = true;
                    return { dmg: 0, isCrit: false, isMiss: true };
                }
            }
            
            // 色彩極高時，爆擊率額外附加 15%
            const baseCritRate = 0.05; // 基礎 5% 爆率
            const finalCritRate = baseCritRate + (colorValue > 90 ? 0.15 : 0);
            
            if (Phaser.Math.FloatBetween(0, 1) < finalCritRate) {
                isCrit = true;
            }
        }

        // 2. 等級壓制補正
        const lvDiff = attackerLv - defenderLv;
        let levelMultiplier = 1 + (lvDiff * 0.1); 
        levelMultiplier = Math.max(0.5, levelMultiplier); // 避免差距過大反而變成補血

        // 3. 爆擊乘區
        const critMultiplier = isCrit ? 1.5 : 1.0;

        // 4. ±5% 傷害浮動 (RNG Variance)
        const variance = 0.95 + Phaser.Math.FloatBetween(0, 0.1);

        const dmg = Math.floor(baseDamage * levelMultiplier * critMultiplier * variance);

        return { dmg: Math.max(1, dmg), isCrit, isMiss };
    }

    /**
     * 戰利品掉落輪盤演算法
     */
    public generateLoot(pool: LootItem[], isBondFinisher: boolean = false): string[] {
        let totalWeight = 0;
        
        // 如果是墨契終結技，將較稀有(權重<30)的物品權重加倍
        const adjustedPool = pool.map(i => {
           let w = i.weight;
           if (isBondFinisher && w < 30) w *= 2;
           totalWeight += w;
           return { item: i.item, weight: w };
        });

        // 抽出一個戰利品 (可視需求設計為多次抽卡)
        let roll = Phaser.Math.FloatBetween(0, totalWeight);
        let selectedItem = '';

        for (const drop of adjustedPool) {
            if (roll <= drop.weight) {
                selectedItem = drop.item;
                break;
            }
            roll -= drop.weight;
        }

        return selectedItem ? [selectedItem] : [];
    }
}

export const BalanceManager = new BalanceManagerService();
