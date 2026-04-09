export interface SkillData {
    id: string;
    name: string;
    element: 'GOLD' | 'WOOD' | 'WATER' | 'FIRE' | 'EARTH' | 'NONE';
    cost: number;
    power: number;
    vfx: string;
    description: string;
}

class SkillDatabaseService {
    private skills: Map<string, SkillData> = new Map();

    public init(scene: Phaser.Scene) {
        const data = scene.cache.json.get('skills_db');
        if (data && Array.isArray(data)) {
            data.forEach((s: SkillData) => {
                this.skills.set(s.id, s);
            });
        }
    }

    public getSkill(id: string): SkillData | undefined {
        return this.skills.get(id);
    }
}

export const SkillDatabase = new SkillDatabaseService();
