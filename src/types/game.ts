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
    talentPoints?: number;
    activeTalents?: string[];
    pos?: { x: number, y: number, facing: string };
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
