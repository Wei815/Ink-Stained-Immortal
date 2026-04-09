import { GlobalState } from '../state/GlobalState';
import { MetaManager } from '../state/MetaManager';

export enum EndingType {
    ENDING_A_BAD = 'ENDING_A_BAD',
    ENDING_B_NORMAL = 'ENDING_B_NORMAL',
    ENDING_C_TRUE = 'ENDING_C_TRUE'
}

export interface EndingResult {
    type: EndingType;
    title: string;
    description: string;
    karmaEarned: number;
}

class EndingCalculatorService {
    
    /**
     * 計算當前結局與結算獎勵
     * @param isGameOver 是否因為戰死而結算 (強制壞結局+部分補償)
     */
    public calculateEnding(isGameOver: boolean = false): EndingResult {
        const colorVal = GlobalState.worldColorValue;
        const savedSuyao = GlobalState.storyFlags.saved_suyao === true;
        const truthOfInk = GlobalState.storyFlags.truth_of_ink === true;
        const playthrough = MetaManager.state.playthroughCount;

        // 計算此局貢獻的 Karma Points
        let karmaEarned = 10; // 保底參與獎
        karmaEarned += Math.floor(colorVal / 10);
        if (savedSuyao) karmaEarned += 20;

        // 保存獲得的天賦
        if (GlobalState.player.activeTalents && GlobalState.player.activeTalents.length > 0) {
            MetaManager.recordUnlockedTalents(GlobalState.player.activeTalents);
            karmaEarned += GlobalState.player.activeTalents.length * 5;
        }

        let type: EndingType;
        let title = '';
        let description = '';

        if (isGameOver) {
            type = EndingType.ENDING_A_BAD;
            title = '結局 A：濃墨吞世 (戰死)';
            description = '你無法抵禦漆黑的侵蝕。世界徹底變為純黑白，而你化為墨靈消散於天地間...';
            // 戰敗扣除一點業力
            karmaEarned = Math.max(0, karmaEarned - 15);
        } else if (colorVal < 30 || !savedSuyao) {
            // Bad Ending
            type = EndingType.ENDING_A_BAD;
            title = '結局 A：濃墨吞世';
            description = '你雖堅持到了最後，但世界已被漆黑塗滿。你緩緩閉上雙眼，聽見墨滴落下的狂笑聲...';
        } else if (colorVal > 90 && truthOfInk && playthrough >= 2) {
            // True Ending
            type = EndingType.ENDING_C_TRUE;
            title = '結局 C：墨染仙塵';
            description = '你與蘇瑤尋回了失落的真跡佈卷，筆鋒再起，為世界點綴上了永恆的生機。你們化作仙風，守護著這片水墨人間。';
            karmaEarned += 100;
        } else {
            // Normal Ending
            type = EndingType.ENDING_B_NORMAL;
            title = '結局 B：仙塵褪色';
            description = '世界雖恢復了色彩，但過往的人與事已在墨痕中淡去...留你一人，獨守竹林。';
            karmaEarned += 30;
        }

        // 寫入 Meta
        MetaManager.addKarma(karmaEarned);

        return { type, title, description, karmaEarned };
    }
}

export const EndingCalculator = new EndingCalculatorService();
