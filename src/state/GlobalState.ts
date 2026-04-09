import { EntityStats, Item } from '../types/game';

interface IGlobalState {
    player: EntityStats;
    enemy: EntityStats;
    inventory: Item[];
    worldColorValue: number; // 0~100，低於閥值時進入黑白化與增強敵方
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
        activeTalents: []
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
    worldColorValue: 100 // 初始為滿色
};

/**
 * 輔助方法：統一管理狀態更新，同時將最新的狀態列印到 Console 中
 */
export function updateStateAndLog(callback: (state: IGlobalState) => void) {
    callback(GlobalState);
    console.log("=== [Debug] Global State Updated ===");
    console.log(JSON.stringify(GlobalState, null, 2));
}
