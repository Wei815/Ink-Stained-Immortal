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
}

/** 
 * @schema QuestNode
 * 任務與劇情旗標管理
 * (結合第四章：NPC 命運與道德選擇)
 */
export interface QuestNode {
    id: string;
    title: string;
    status: 'NOT_STARTED' | 'ACTIVE' | 'COMPLETED';
    requirements: { flagRequired: string; value: boolean }[];
    rewards: { exp: number; items: string[] };
    // 新增：劇情選擇分支紀錄，影響 NPC 命運與大結局
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
