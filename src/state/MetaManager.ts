import { GlobalState } from './GlobalState';
import { SaveManager } from './SaveManager';

export interface IMetaState {
    playthroughCount: number;
    karmaPoints: number;
    unlockedTalents: string[];
    unlockedLore: string[]; // reserved for 殘卷/圖鑑
}

class MetaManagerService {
    private metaKey = 'InkImmortalMeta_v1';
    public state: IMetaState = {
        playthroughCount: 1,
        karmaPoints: 0,
        unlockedTalents: [],
        unlockedLore: []
    };

    constructor() {
        this.loadMeta();
    }

    public loadMeta() {
        try {
            const data = localStorage.getItem(this.metaKey);
            if (data) {
                const parsed = JSON.parse(data);
                Object.assign(this.state, parsed);
                console.log("[MetaManager] Meta saved loaded", this.state);
            }
        } catch (e) {
            console.error("Failed to load MetaState:", e);
        }
    }

    public saveMeta() {
        try {
            const data = JSON.stringify(this.state);
            localStorage.setItem(this.metaKey, data);
        } catch (e) {
            console.error("Failed to save MetaState:", e);
        }
    }

    public addKarma(points: number) {
        this.state.karmaPoints += points;
        this.saveMeta();
    }

    public recordUnlockedTalents(talents: string[]) {
        talents.forEach(t => {
            if (!this.state.unlockedTalents.includes(t)) {
                this.state.unlockedTalents.push(t);
            }
        });
        this.saveMeta();
    }

    /**
     * 開啟下一輪迴 (NG+)
     */
    public startNewGamePlus() {
        this.state.playthroughCount += 1;
        this.saveMeta();

        // 重置常規存檔，但保留天賦
        SaveManager.clearSave();

        // 回歸初始狀態
        GlobalState.player.hp = GlobalState.player.maxHp;
        GlobalState.player.mp = GlobalState.player.maxMp;
        GlobalState.worldColorValue = 100;
        
        // 清空當前輪的所有旗標與庫存，保留繼承的天賦與基礎點數
        GlobalState.storyFlags = {
            talked_to_suyao: false,
            boss_forest_defeated: false
        };
        GlobalState.activeQuests = [];
        GlobalState.inventory = [];
        
        GlobalState.player.activeTalents = [...this.state.unlockedTalents];
        GlobalState.player.talentPoints = 3 + (this.state.playthroughCount - 1); // 額外開局點數

        console.log(`[MetaManager] NG+ 啟動！目前週目: ${this.state.playthroughCount}`);
    }
}

export const MetaManager = new MetaManagerService();
