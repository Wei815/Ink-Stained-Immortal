import Phaser from 'phaser';
import { GlobalState, updateStateAndLog } from '../state/GlobalState';
import { SaveManager } from '../state/SaveManager';
import { QuestManager } from '../systems/QuestManager';
import { ImmersionManager } from '../systems/ImmersionManager';
import { MapManager } from '../systems/MapManager';
import { InteractionManager } from '../systems/InteractionManager';
import { CutsceneManager, CutsceneCommand } from '../systems/CutsceneManager';

export class MainScene extends Phaser.Scene {
    private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    private npc!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    private wall!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    private puzzleNode!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    private spacebar!: Phaser.Input.Keyboard.Key;
    private stepsCount: number = 0;
    private colorMatrixFX!: Phaser.FX.ColorMatrix;

    private inCutscene: boolean = false;

    constructor() {
        super({ key: 'MainScene' });
    }

    preload() {
        this.load.image('player_xianjian', '/assets/player_xianjian.png');
        this.load.image('npc_elder', '/assets/npc_elder.png');
        this.load.image('spirit_spring', '/assets/spirit_spring.png');
        this.load.image('bg_ink_dojo', '/assets/bg_ink_dojo.png');
    }

    create() {
        SaveManager.saveGame(); // 自動存檔點
        this.cameras.main.fadeIn(500);
        this.colorMatrixFX = this.cameras.main.postFX.addColorMatrix();
        ImmersionManager.bindScene(this);
        MapManager.init(this);
        InteractionManager.init(this, this.player);

        this.player = this.physics.add.sprite(GlobalState.player.pos?.x || 200, GlobalState.player.pos?.y || 300, 'player_xianjian');
        this.player.setDisplaySize(64, 64);
        this.player.body.setSize(64, 64);

        const wallGeom = this.add.rectangle(0, 0, 40, 300, 0x000000, 0.4);
        this.wall = this.physics.add.existing(wallGeom, true) as unknown as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody; 
        this.wall.setPosition(400 + (GlobalState.player.pos?.x || 200) - 200, 300 + (GlobalState.player.pos?.y || 300) - 300);
        this.wall.body.updateFromGameObject();

        this.npc = this.physics.add.sprite(600 + (GlobalState.player.pos?.x || 200) - 200, 300 + (GlobalState.player.pos?.y || 300) - 300, 'npc_elder');
        this.npc.setDisplaySize(64, 64);
        this.npc.setImmovable(true);

        // 設置水之謎觸發節點 (藍色)
        this.puzzleNode = this.physics.add.sprite(400 + (GlobalState.player.pos?.x || 200) - 200, 100 + (GlobalState.player.pos?.y || 300) - 300, 'spirit_spring');
        this.puzzleNode.setDisplaySize(64, 64);
        this.puzzleNode.setImmovable(true);

        this.physics.add.collider(this.player, this.wall);
        this.physics.add.collider(this.player, this.npc);
        this.physics.add.collider(this.player, this.puzzleNode);

        if (this.input.keyboard) {
            this.spacebar = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
            this.spacebar.on('down', this.handleInteract, this);

            this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
            this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
            this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
            this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);

            // [色彩除錯工具]
            this.input.keyboard.addKey('MINUS').on('down', () => { 
                GlobalState.worldColorValue = Math.max(0, GlobalState.worldColorValue - 10); 
                this.showDebugText(`色彩流失: ${GlobalState.worldColorValue}%`);
            });
            this.input.keyboard.addKey('PLUS').on('down', () => { 
                GlobalState.worldColorValue = Math.min(100, GlobalState.worldColorValue + 10); 
                this.showDebugText(`色彩復甦: ${GlobalState.worldColorValue}%`);
            });

            // 開啟天賦頁面
            this.input.keyboard.addKey('TAB').on('down', () => {
                this.scene.pause();
                this.scene.launch('TalentScene');
            });

            // 蘇瑤之眼切換
            this.input.keyboard.addKey('V').on('down', () => {
                GlobalState.visionState = !GlobalState.visionState;
                this.showDebugText(GlobalState.visionState ? '蘇瑤之眼：開啟' : '蘇瑤之眼：關閉');
            });
        }

    handleInteract() {
        if (this.inCutscene) return;

        // 解謎節點互動優先 (原生)
        if (Phaser.Math.Distance.Between(this.player.x, this.player.y, this.puzzleNode.x, this.puzzleNode.y) < 70) {
            this.cameras.main.fadeOut(500, 0, 0, 0, (cam: any, prog: number) => {
                if (prog === 1) this.scene.start('PuzzleScene');
            });
            return;
        }

        // 環境實體交互優先
        InteractionManager.handleInteraction();

        // NPC 互動
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npc.x, this.npc.y);
        if (dist < 60) {
            this.startNPCCutscene();
        }
    }

    private async startNPCCutscene() {
        this.inCutscene = true;
        this.player.setVelocity(0, 0);

        const scripts: CutsceneCommand[] = [
            { type: 'CAMERA_PAN', target: { x: this.npc.x, y: this.npc.y }, duration: 1000, zoom: 1.2 },
            { type: 'CHAR_SAY', id: '蘇瑤', text: '沈大哥，旁邊那顆藍色的靈泉被墨氣侵蝕枯萎了，去調查看看吧。' },
            { type: 'SCREEN_FX', fxType: 'INK_SPLASH', duration: 800 },
            { type: 'CHAR_SAY', id: '蘇瑤', text: '這把木劍你拿著防身，路上小心。' },
            { type: 'WAIT', duration: 500 },
            { type: 'CAMERA_PAN', target: { x: this.player.x, y: this.player.y }, duration: 800, zoom: 1 }
        ];

        const charMap = { '沈雲': this.player, '蘇瑤': this.npc };
        await CutsceneManager.play(this, scripts, charMap);

        updateStateAndLog((state) => {
            state.player.atk += 5;
            state.inventory.push({ id: 'item_woodensword', type: 'WEAPON', effect: () => {}, price: 10 });
        });
        QuestManager.setFlag('talked_to_suyao', true);
        
        this.inCutscene = false;
    }

    update() {
        // [套用色彩濾鏡] 滿色 100 不濾，降為 0 則為全黑白
        this.colorMatrixFX.grayscale(1 - (GlobalState.worldColorValue / 100));

        InteractionManager.update();

        if (this.inCutscene) {
            this.player.setVelocity(0, 0);
            return;
        }

        const speed = 250;
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        body.setVelocity(0, 0);

        if (!this.input.keyboard) return;

        const cursors = this.input.keyboard.createCursorKeys();
        const keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        const keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        const keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        const keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);

        let moved = false;

        if (cursors.left.isDown || keyA.isDown) { body.setVelocityX(-speed); moved = true; }
        else if (cursors.right.isDown || keyD.isDown) { body.setVelocityX(speed); moved = true; }

        if (cursors.up.isDown || keyW.isDown) { body.setVelocityY(-speed); moved = true; }
        else if (cursors.down.isDown || keyS.isDown) { body.setVelocityY(speed); moved = true; }
        
        if (body.velocity.x !== 0 && body.velocity.y !== 0) {
            body.velocity.normalize().scale(speed);
        }

        if (moved) {
            MapManager.updateChunks(this.player.x, this.player.y);
            this.cameras.main.centerOn(this.player.x, this.player.y);

            this.stepsCount++;
            if (this.stepsCount > Phaser.Math.Between(200, 300)) {
                this.triggerBattle();
            }
        }
    }

    triggerBattle() {
        this.stepsCount = 0;
        this.player.setVelocity(0, 0);
        MapManager.sceneTransition('BattleScene', this);
    }
}
