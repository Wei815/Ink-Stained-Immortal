import Phaser from 'phaser';
import { EnemyDatabase } from '../systems/EnemyDatabase';
import { SkillDatabase } from '../systems/SkillDatabase';

export class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        const { width, height } = this.cameras.main;
        this.cameras.main.setBackgroundColor('#050505');

        // 美術字體與 Loading 進度
        const loadingText = this.add.text(width / 2, height / 2 - 50, '水 墨 幻 化 中 ...', {
            fontFamily: 'serif', fontSize: '32px', color: '#aaaaaa', letterSpacing: 5
        }).setOrigin(0.5);

        const progressBg = this.add.graphics();
        progressBg.fillStyle(0x222222, 1);
        progressBg.fillRect(width / 2 - 200, height / 2 + 30, 400, 10);

        const progressBar = this.add.graphics();

        this.load.on('progress', (value: number) => {
            progressBar.clear();
            progressBar.fillStyle(0xdddddd, 1);
            progressBar.fillRect(width / 2 - 200, height / 2 + 30, 400 * value, 10);
            
            // 隨機水墨飛濺碎布效果以點綴
            if (Phaser.Math.FloatBetween(0, 1) < 0.2) {
                this.add.circle(
                     width / 2 - 200 + (400 * value), 
                     height / 2 + 35 + Phaser.Math.Between(-15, 15), 
                     Phaser.Math.Between(2, 6), 
                     0xffffff
                ).setAlpha(0.3);
            }
        });

        this.load.on('complete', () => {
             // 載入完成後初始化資料庫
             EnemyDatabase.init(this);
             SkillDatabase.init(this);
             
             this.tweens.add({
                 targets: [loadingText, progressBg, progressBar],
                 alpha: 0,
                 duration: 600,
                 onComplete: () => {
                      this.scene.start('TitleScene');
                 }
             });
        });

        // 模擬載入一些龐大的素材，觸發 loading 跑條以展示特效
        for (let i = 0; i < 20; i++) {
             this.load.image(`fake_asset_${i}`, 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
        }
        
        // 實際可載入：
        this.load.image('tileset_world', '/assets/tileset_world.png');
        this.load.image('portrait_shen_yun', '/assets/portrait_shen_yun.png');
        this.load.image('portrait_su_yao_worried', '/assets/portrait_su_yao_worried.png');
        this.load.json('ch1_opening', '/assets/scripts/ch1_opening.json');
        
        // JSON 數據資料庫
        this.load.json('monsters_db', '/assets/data/monsters.json');
        this.load.json('skills_db', '/assets/data/skills.json');

        // 生成的新素材
        this.load.image('player_xianjian', '/assets/player_xianjian.png');
        this.load.image('monster_dog', '/assets/monster_dog.png');
        this.load.image('monster_traitor', '/assets/monster_traitor.png');
        this.load.image('monster_slime', '/assets/monster_slime.png');
        
        // 粒子特效與陣法素材
        this.load.image('ink_drop', '/assets/ink_drop.png');
        this.load.image('brush_stroke', '/assets/brush_stroke.png');
        this.load.image('vfx_lotus', '/assets/vfx_lotus.png');
        this.load.image('vfx_taichi', '/assets/vfx_taichi.png');
        this.load.image('item_jade', '/assets/item_jade.png');
        this.load.image('item_mirror', '/assets/item_mirror.png');

        // Cinematic 演出資產
        this.load.image('logo_ink', '/assets/logo_ink.png');
        this.load.image('vfx_brush_mask', '/assets/vfx_brush_mask.png');
        this.load.image('seal_finish', '/assets/seal_finish.png');
        this.load.image('cg_ending_a', '/assets/cg_ending_a.png');
    }
}
