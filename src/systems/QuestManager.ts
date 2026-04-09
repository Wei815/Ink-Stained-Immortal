import Phaser from 'phaser';
import { GlobalState, updateStateAndLog } from '../state/GlobalState';
import { Quest } from '../types/game';

// 全域任務事件發射器，用於更新 UI 或觸發特定過場
export const QuestEvents = new Phaser.Events.EventEmitter();

class QuestManagerService {
    
    /**
     * 掃描目前所有 ACTIVE 的任務，對比 storyFlags
     */
    public checkProgression() {
        let progressionChanged = false;

        GlobalState.activeQuests.forEach((quest: Quest) => {
            if (quest.status !== 'ACTIVE') return;

            let allStepsDone = true;

            quest.steps.forEach(step => {
                // 如果該步驟還沒完成，檢查觸發條件
                if (!step.isDone) {
                    if (GlobalState.storyFlags[step.triggerFlag] === true) {
                        step.isDone = true;
                        progressionChanged = true;
                        console.log(`[QuestManager] 任務 [${quest.title}] 步驟達成: ${step.description}`);
                        QuestEvents.emit('quest_step_completed', quest, step);
                    }
                }

                // 再次檢查如果還是沒完成，整卡任務就不能標示結束
                if (!step.isDone) {
                    allStepsDone = false;
                }
            });

            // 如果全部條件滿足
            if (allStepsDone) {
                quest.status = 'COMPLETED';
                progressionChanged = true;
                this.grantRewards(quest);
                console.log(`[QuestManager] 任務 [${quest.title}] 已完成！`);
                QuestEvents.emit('quest_completed', quest);
            }
        });

        // 雖然不是絕對需要重新 save，但若想觸發畫面連動，可根據 progressionChanged 廣播
        if (progressionChanged) {
            QuestEvents.emit('quest_progression_changed');
        }
    }

    /**
     * 發放獎勵
     */
    private grantRewards(quest: Quest) {
        if (!quest.rewards) return;

        updateStateAndLog(state => {
            if (quest.rewards.talentPoints) {
                state.player.talentPoints = (state.player.talentPoints || 0) + quest.rewards.talentPoints;
                console.log(`[QuestManager] 獲得天賦點數: ${quest.rewards.talentPoints}`);
            }
            if (quest.rewards.hpMax) {
                state.player.maxHp += quest.rewards.hpMax;
                state.player.hp = state.player.maxHp; // 自動補滿
                console.log(`[QuestManager] 最大生命提升至: ${state.player.maxHp}`);
            }
            if (quest.rewards.items) {
                quest.rewards.items.forEach(itemStr => {
                    // 根據物品字串產生物件簡化邏輯，在實際遊戲中可擴充 ID 映射實體道具
                    state.inventory.push({ 
                        id: itemStr, 
                        type: 'KEY_ITEM', 
                        effect: () => {}, 
                        price: 0 
                    });
                    console.log(`[QuestManager] 獲得特殊物品: ${itemStr}`);
                });
            }
        });
    }

    /**
     * 外部用來設定標籤並觸發檢查的統一介面
     */
    public setFlag(flagId: string, value: boolean) {
        if (GlobalState.storyFlags[flagId] !== value) {
            updateStateAndLog(state => {
                state.storyFlags[flagId] = value;
            });
            console.log(`[QuestManager] 旗標 [${flagId}] 狀態更新為 ${value}`);
            this.checkProgression();
        }
    }

    /**
     * 查詢任務是否完成 (供對話等外部系統使用)
     */
    public isQuestCompleted(questId: string): boolean {
        const quest = GlobalState.activeQuests.find(q => q.id === questId);
        return quest ? quest.status === 'COMPLETED' : false;
    }
}

export const QuestManager = new QuestManagerService();
