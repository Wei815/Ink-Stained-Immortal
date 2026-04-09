import { GlobalState } from '../state/GlobalState';
import { BalanceManager } from '../systems/BalanceManager';
import { ComboManager } from '../core/ComboManager';
import { ArrayManager } from '../systems/ArrayManager';
import { EliteAI } from '../core/EliteAI';
import { EquipmentManager } from '../systems/EquipmentManager';
import { SkillDatabase } from '../systems/SkillDatabase';

interface SimResult {
    win: boolean;
    turns: number;
    mpEmptyCount: number;
    maxDmgTakenRatio: number;
    bondFinisherCount: number;
    scenario: string;
}

class BattleSimulatorController {
    private logs: SimResult[] = [];

    public runSuite() {
        console.log("=== [Battle Simulator] 啟動自動化數值壓力測試矩陣 ===");
        this.logs = [];

        // 矩陣各執行 25 場
        this.runScenario('A: 絕境墨染', 25);
        this.runScenario('B: 屬性壓制', 25);
        this.runScenario('C: Boss 階段轉換', 25);
        this.runScenario('D: 墨契合擊頻率', 25);

        this.generateReport();
    }

    private runScenario(name: string, count: number) {
        console.log(`正在模擬場景 [${name}]...`);
        for (let i = 0; i < count; i++) {
            this.logs.push(this.simulateBattle(name));
        }
    }

    private simulateBattle(scenarioName: string): SimResult {
        // 1. 初始化戰鬥狀態 (不影響實際 GlobalState)
        const p = JSON.parse(JSON.stringify(GlobalState.player));
        const e = JSON.parse(JSON.stringify(GlobalState.enemy));
        let color = 100;
        let pAg = 0, eAg = 0;
        let turns = 0;
        let mpEmptyCount = 0;
        let maxDmgTakenRatio = 0;
        let bondFinisherCount = 0;
        let bondEnergy = 0;

        // 場景特定設置
        if (scenarioName.startsWith('A')) {
            color = 10;
            p.hp = p.maxHp * 0.5;
            p.mp = 20;
            e.isElite = true;
            e.hp *= 1.5; // 模擬 "精英怪 x2" 的壓迫感
            e.atk *= 1.2;
        } else if (scenarioName.startsWith('B')) {
            p.affinity = 'Fire';
            e.affinity = 'Water';
        } else if (scenarioName.startsWith('C')) {
            e.name = '第一章 Boss';
            e.hp *= 2;
            e.maxHp = e.hp;
        }

        // 2. 模擬戰鬥迴圈
        while (p.hp > 0 && e.hp > 0 && turns < 100) {
            // 取樣步次增長
            pAg += (p.spd + (p.activeTalents?.includes('tal_water') ? 5 : 0)) * 2.5;
            eAg += e.spd * 2.5;

            if (pAg >= 1000) {
                pAg = 0;
                turns++;
                
                // 玩家隨機決策
                const roll = Math.random();
                let dmg = p.atk;
                let cost = 0;
                let skillType: any = 'none';

                if (p.mp >= 15 && roll < 0.6) { // 60% 概率放技能
                    const skillId = roll < 0.3 ? 'S001' : 'S002';
                    const sData = SkillDatabase.getSkill(skillId);
                    if (sData) {
                        dmg = p.atk * (sData.power / 10); // 簡易公式
                        cost = sData.cost;
                        skillType = sData.element.toLowerCase();
                    }
                }

                if (cost > p.mp) {
                    cost = 0;
                    dmg = p.atk; // MP 不足變為普攻
                    mpEmptyCount++;
                }
                
                p.mp -= cost;
                bondEnergy += 20;

                // 合擊檢查
                if (bondEnergy >= 100) {
                    bondEnergy = 0;
                    bondFinisherCount++;
                    dmg *= 2; // 模擬合擊大傷
                }

                // 計算傷害
                let multiplier = 1;
                // 元素反應 (簡化版)
                if (skillType === 'water' && e.affinity === 'Fire') multiplier *= 1.5;
                if (skillType === 'fire' && e.affinity === 'Wood') multiplier *= 1.5;

                // 【絕境墨染】反擊：當色彩極低且生命垂危時，激發墨之意志，獲得 2.0x 傷害倍率並附帶吸血
                if (color < 30 && p.hp < p.maxHp * 0.4) {
                    multiplier *= 2.0;
                }

                const balance = BalanceManager.calculateDamage(dmg, 5, 5, true);
                let finalDmg = Math.floor(balance.dmg * multiplier);
                
                if (e.isElite) finalDmg = Math.floor(finalDmg * EliteAI.getInkArmorReduction(color));
                
                // 絕境吸血
                if (color < 30 && p.hp < p.maxHp * 0.4) {
                    p.hp = Math.min(p.maxHp, p.hp + finalDmg * 0.3);
                }

                e.hp -= finalDmg;
                
                // 屬性壓制平衡：若受到重創且為精英怪，自動發動「墨色變換」改變屬性抗壓
                if (e.isElite && e.hp < e.maxHp * 0.6 && e.affinity === 'Water' && multiplier > 1) {
                    e.affinity = 'Fire'; // 轉換為不怕水的屬性
                }
            }

            if (e.hp > 0 && eAg >= 1000) {
                eAg = 0;
                turns++;

                // 敵人行動
                let eDmg = e.atk;
                if (e.isElite) {
                    const ai = EliteAI.think({ state: e }, { state: p });
                    // 此處模擬 AI 效果
                    if (ai.name === '墨影護盾') e.def += 10;
                    if (ai.name === '焦墨封印') p.spd = Math.max(1, p.spd - 2);
                }

                const balance = BalanceManager.calculateDamage(eDmg, 5, 5, false);
                let multiplier = 1 + (100 - color) / 100; // 色彩加成
                
                let finalDmg = Math.floor(balance.dmg * multiplier);
                
                // 護盾與減傷
                // 【絕境墨染】：當色彩極低且生命垂危時，激發墨之意志，獲得 50% 減傷
                let dmgReduction = 1.0;
                if (color < 30 && p.hp < p.maxHp * 0.4) {
                    dmgReduction = 0.5;
                    p.mp = Math.min(p.maxMp, p.mp + 5); // 絕境回靈
                } else if (p.hp < p.maxHp * 0.3) {
                    dmgReduction = 0.8; // 常規天賦減傷
                }
                
                finalDmg = Math.floor(finalDmg * dmgReduction);

                maxDmgTakenRatio = Math.max(maxDmgTakenRatio, finalDmg / p.maxHp);
                p.hp -= finalDmg;
            }
        }

        return {
            win: p.hp > 0,
            turns: turns,
            mpEmptyCount: mpEmptyCount,
            maxDmgTakenRatio: maxDmgTakenRatio,
            bondFinisherCount: bondFinisherCount,
            scenario: scenarioName
        };
    }

    private generateReport() {
        const total = this.logs.length;
        const wins = this.logs.filter(l => l.win).length;
        const avgTurns = this.logs.reduce((s, l) => s + l.turns, 0) / total;
        const mpEmptyRate = this.logs.filter(l => l.mpEmptyCount > 0).length / total;
        const spikes = this.logs.filter(l => l.maxDmgTakenRatio > 0.7).length;

        const report = {
            total_battles: total,
            overall_win_rate: `${(wins / total * 100).toFixed(1)}%`,
            average_turns: avgTurns.toFixed(1),
            scenario_stats: {
                "A: 絕境墨染": this.getScenarioStats('A: 絕境墨染'),
                "B: 屬性壓制": this.getScenarioStats('B: 屬性壓制'),
                "C: Boss 階段轉換": this.getScenarioStats('C: Boss 階段轉換'),
                "D: 墨契合擊頻率": this.getScenarioStats('D: 墨契合擊頻率')
            },
            balance_warnings: [] as any[]
        };

        // 判定標準檢查
        if (wins / total < 0.4) report.balance_warnings.push({ issue: "整體勝率過低", reason: "玩家生存率不足" });
        if (wins / total > 0.9) report.balance_warnings.push({ issue: "整體勝率過高", reason: "戰鬥缺乏挑戰性" });
        if (avgTurns > 15) report.balance_warnings.push({ issue: "戰鬥節奏過慢", reason: "平均回合數超過 15" });
        if (mpEmptyRate > 0.3) report.balance_warnings.push({ issue: "靈力平衡風險", reason: "超過 30% 場次發生 MP 耗盡" });
        if (spikes > 10) report.balance_warnings.push({ issue: "傷害突刺過多", reason: "單次受傷超標場次 > 10" });

        console.log("=== [模擬測試報告摘要 (JSON)] ===");
        console.log(JSON.stringify(report, null, 2));
        
        if (report.balance_warnings.length > 0) {
            console.warn("!!! [警報] 檢控到數值不平衡點，請參考報告進行微調。");
        } else {
            console.log("✔️ [合格] 數值測試通過，當前平衡性良好。");
        }
    }

    private getScenarioStats(name: string) {
        const sLogs = this.logs.filter(l => l.scenario === name);
        const wins = sLogs.filter(l => l.win).length;
        return {
            win_rate: `${(wins / sLogs.length * 100).toFixed(1)}%`,
            avg_turns: (sLogs.reduce((s, l) => s + l.turns, 0) / sLogs.length).toFixed(1)
        };
    }
}

export const BattleSimulator = new BattleSimulatorController();
