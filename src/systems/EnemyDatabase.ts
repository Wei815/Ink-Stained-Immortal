export interface MonsterData {
    id: string;
    name: string;
    aiType: 'DEFENSIVE' | 'AGILE' | 'CORROSIVE' | 'BOSS';
    hp: number;
    atk: number;
    spd: number;
    element: 'GOLD' | 'WOOD' | 'WATER' | 'FIRE' | 'EARTH' | 'NONE';
    texture: string;
    description: string;
}

class EnemyDatabaseService {
    private monsters: Map<string, MonsterData> = new Map();

    public init(scene: Phaser.Scene) {
        const data = scene.cache.json.get('monsters_db');
        if (data && Array.isArray(data)) {
            data.forEach((m: MonsterData) => {
                this.monsters.set(m.id, m);
            });
        }
    }

    public getMonster(id: string): MonsterData | undefined {
        return this.monsters.get(id);
    }

    public getAllMonsterIds(): string[] {
        return Array.from(this.monsters.keys());
    }
}

export const EnemyDatabase = new EnemyDatabaseService();
