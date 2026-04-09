/** 
 * @schema EntityStats
 * 核心戰鬥與屬性定義 
 */
export interface EntityStats {
    id: string;
    name: string;
    level: number;
    hp: number; 
    maxHp: number;
    mp: number; 
    maxMp: number;
    atk: number; 
    def: number;
    spd: number; 
    luk: number;
    affinity: 'Gold' | 'Wood' | 'Water' | 'Fire' | 'Earth';
    // 基礎數值 (不含裝備)
    baseAtk?: number;
    baseHp?: number;
    baseDef?: number;
    talentPoints?: number;
    activeTalents?: string[];
    aiType?: 'DEFENSIVE' | 'AGILE' | 'CORROSIVE' | 'BOSS';
    pos?: { x: number, y: number, facing: string };
    // 精英怪與行為樹擴充
    isElite?: boolean;
    poise?: number; // 霸體值
    telegraph?: 'RED' | 'PURPLE' | 'GOLD' | null;
}

export interface LootDrop {
    item: string;
    chance: number;
    amount?: [number, number]; // [min, max]
}

export interface LootPool {
    shards: [number, number];
    possibleDrops: LootDrop[];
}

/** 
 * @schema Quest
 * 任務與劇情管理系統
 */
export interface QuestStep {
    description: string;
    isDone: boolean;
    triggerFlag: string;
}

export interface Quest {
    id: string;
    title: string;
    status: 'NOT_STARTED' | 'ACTIVE' | 'COMPLETED';
    steps: QuestStep[];
    rewards: { talentPoints?: number; hpMax?: number; items?: string[] };
    // 預留第四章道德選項
    moralChoice?: 'SACRIFICE_NATURE' | 'PRESERVE_BALANCE'; 
    npcFateImpact?: { npcId: string; state: 'SURVIVED' | 'CORRUPTED' }[];
}

/** 
 * @schema Item
 * 物品與裝備邏輯 
 */
export interface Item {
    id: string;
    type: 'WEAPON' | 'ARMOR' | 'CONSUMABLE' | 'KEY_ITEM';
    effect: (target: EntityStats) => void;
    price: number;
}

export type SuYaoTreasure = 'JADE' | 'MIRROR';
export type ArrayType = 'CLEANSING' | 'INK_LOCK';

export interface ArrayState {
    type: ArrayType;
    turns: number;
}

export type EquipmentType = 'WEAPON' | 'ARMOR' | 'ACCESSORY';
export type EquipmentElement = 'GOLD' | 'WOOD' | 'WATER' | 'FIRE' | 'EARTH' | 'NONE';

export interface Equipment {
    id: string;
    name: string;
    type: EquipmentType;
    level: number;
    baseStats: { atk?: number, hp?: number, def?: number };
    element: EquipmentElement;
    bonusId: 'TREASURE_COLOR' | 'TREASURE_RING' | 'TREASURE_SURVIVE' | 'NONE';
}
