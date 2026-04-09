import { EntityStats, Item, Quest } from '../types/game';
import { GameSignals, Events } from '../events/GameSignals';

let _worldColorValue = 100;
let _visionState = false;

interface IGlobalState {
    player: EntityStats;
    enemy: EntityStats;
    inventory: Item[];
    worldColorValue: number; // 0~100，低於閥值時進入黑白化與增強敵方
    visionState: boolean; // 是否開啟靈界視覺 (蘇瑤之眼)
    storyFlags: Record<string, boolean>;
    activeQuests: Quest[];
    bossFailCount: number; // 戰敗憐憫計數器
}

export const GlobalState: IGlobalState = {
    player: {
        id: 'player_01',
        name: '沈雲',
        level: 1,
        hp: 100,
        maxHp: 100,
        mp: 50,
        maxMp: 50,
        atk: 10,
        def: 5,
        spd: 12,
        luk: 5,
        affinity: 'Water',
        talentPoints: 2, 
        activeTalents: [],
        pos: { x: 200, y: 300, facing: 'down' }
    },
    enemy: {
        id: 'monster_01',
        name: '火岩山精',
        level: 1,
        hp: 120,
        maxHp: 120,
        mp: 0,
        maxMp: 0,
        atk: 8,
        def: 3,
        spd: 9,
        luk: 2,
        affinity: 'Fire',
        talentPoints: 0,
        activeTalents: []
    },
    inventory: [
        { id: 'item_clearcolor', type: 'CONSUMABLE', price: 50, effect: (target) => { GlobalState.worldColorValue = 100; } },
        { id: 'item_healhp', type: 'CONSUMABLE', price: 20, effect: (target) => { target.hp = Math.min(target.maxHp, target.hp + 50); } }
    ],
    get worldColorValue() {
        return _worldColorValue;
    },
    set worldColorValue(newVal: number) {
        if (_worldColorValue !== newVal) {
            const oldVal = _worldColorValue;
            _worldColorValue = newVal;
            GameSignals.emit(Events.COLOR_VALUE_CHANGED, newVal, oldVal);
        }
    },
    get visionState() {
        return _visionState;
    },
    set visionState(newVal: boolean) {
        if (_visionState !== newVal) {
            _visionState = newVal;
            GameSignals.emit(Events.VISION_STATE_CHANGED, newVal);
        }
    },
    storyFlags: {
        talked_to_suyao: false,
        boss_forest_defeated: false
    },
    activeQuests: [
        {
            id: 'q_001_intro',
            title: '墨染初現',
            status: 'ACTIVE',
            steps: [
                { description: '在竹林中與蘇瑤交談', isDone: false, triggerFlag: 'talked_to_suyao' },
                { description: '擊敗墨化的守林人', isDone: false, triggerFlag: 'boss_forest_defeated' }
            ],
            rewards: { talentPoints: 1 } // 解鎖第一層流雲
        }
    ],
    bossFailCount: 0
};

/**
 * 輔助方法：統一管理狀態更新，同時將最新的狀態列印到 Console 中
 */
export function updateStateAndLog(callback: (state: IGlobalState) => void) {
    callback(GlobalState);
    console.log("=== [Debug] Global State Updated ===");
    console.log(JSON.stringify(GlobalState, null, 2));
}
