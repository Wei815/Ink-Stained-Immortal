import { EntityStats, LootPool } from '../types/game';

export interface EnemyDefinition extends EntityStats {
    lootPool: LootPool;
    description: string;
}

export const ENEMY_DB: Record<string, EnemyDefinition> = {
    'defender_ink_soldier': {
        id: 'defender_ink_soldier',
        name: '墨甲殘兵',
        level: 3,
        hp: 300,
        maxHp: 300,
        mp: 0,
        maxMp: 0,
        atk: 15,
        def: 10,
        spd: 5,
        luk: 2,
        affinity: 'Earth',
        aiType: 'DEFENSIVE',
        description: '身披乾涸墨甲的士兵，防禦極高，色彩值低時會嘗試自爆。',
        lootPool: {
            shards: [10, 20],
            possibleDrops: [
                { item: '靈族露水', chance: 0.2, amount: [1, 1] }
            ]
        }
    },
    'agile_shadow_bird': {
        id: 'agile_shadow_bird',
        name: '墨影邪雕',
        level: 2,
        hp: 120,
        maxHp: 120,
        mp: 30,
        maxMp: 30,
        atk: 25,
        def: 2,
        spd: 20,
        luk: 15,
        affinity: 'Water',
        aiType: 'AGILE',
        description: '如幻影般迅捷的邪鳥，沈雲需切換流雲天賦方可壓制其閃避。',
        lootPool: {
            shards: [15, 25],
            possibleDrops: [
                { item: '墨晶', chance: 0.5, amount: [5, 10] }
            ]
        }
    },
    'corrosive_mist': {
        id: 'corrosive_mist',
        name: '蝕色幻霧',
        level: 4,
        hp: 180,
        maxHp: 180,
        mp: 50,
        maxMp: 50,
        atk: 10,
        def: 5,
        spd: 10,
        luk: 5,
        affinity: 'Fire',
        aiType: 'CORROSIVE',
        description: '會吞噬色彩的詭異霧氣，每回合強制扣除場景色彩值。',
        lootPool: {
            shards: [20, 40],
            possibleDrops: [
                { item: '命定素材', chance: 0.1, amount: [1, 1] }
            ]
        }
    }
};

export class EnemyDatabase {
    static getEnemy(id: string): EnemyDefinition {
        return ENEMY_DB[id] || ENEMY_DB['defender_ink_soldier'];
    }

    static getRandomEnemy(colorValue: number): EnemyDefinition {
        const pool = Object.values(ENEMY_DB);
        
        // 如果世界色彩度低，提高稀有怪或腐蝕怪的出現率 (這裡簡易隨機)
        if (colorValue < 30) {
            // 隨機選一個
            return pool[Math.floor(Math.random() * pool.length)];
        }
        
        // 默認返回隨機的一個
        return pool[Math.floor(Math.random() * pool.length)];
    }
}
