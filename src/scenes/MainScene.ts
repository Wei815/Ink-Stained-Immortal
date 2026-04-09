import Phaser from 'phaser';
import { GlobalState, updateStateAndLog } from '../state/GlobalState';
import { SaveManager } from '../state/SaveManager';

export class MainScene extends Phaser.Scene {
    private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    private npc!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    private wall!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    private puzzleNode!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    private spacebar!: Phaser.Input.Keyboard.Key;
    private stepsCount: number = 0;
    private colorMatrixFX!: Phaser.FX.ColorMatrix;

    private inDialogue: boolean = false;
    private dialogueBox!: Phaser.GameObjects.Graphics;
    private dialogueText!: Phaser.GameObjects.Text;
    
    private dialogueStep: number = 0;
    private messages: string[] = [
        "NPC：這是一把祖傳的木劍，你拿著防身吧。",
        "【系統訊息】獲得「木劍」！攻擊力提升 5 點！",
        "NPC：旁邊那顆藍色的靈泉枯萎了，去調查看看吧。"
    ];

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
        
        const bg = this.add.image(0, 0, 'bg_ink_dojo').setOrigin(0, 0);
        bg.setDisplaySize(this.cameras.main.width, this.cameras.main.height);
        bg.setDepth(-10);

        this.player = this.physics.add.sprite(200, 300, 'player_xianjian');
        this.player.setDisplaySize(64, 64);
        this.player.body.setSize(64, 64);
        this.player.setCollideWorldBounds(true);

        const wallGeom = this.add.rectangle(0, 0, 40, 300, 0x000000, 0.4);
        this.wall = this.physics.add.existing(wallGeom, true) as unknown as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody; 
        this.wall.setPosition(400, 300);
        this.wall.body.updateFromGameObject();

        this.npc = this.physics.add.sprite(600, 300, 'npc_elder');
        this.npc.setDisplaySize(64, 64);
        this.npc.setImmovable(true);

        // 設置水之謎觸發節點 (藍色)
        this.puzzleNode = this.physics.add.sprite(400, 100, 'spirit_spring');
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
        }

        this.createDialogueUI();
    }

    showDebugText(msg: string) {
        const txt = this.add.text(this.player.x, this.player.y - 40, msg, { 
            fontSize: '20px', color: '#ff00ff', stroke: '#000', strokeThickness: 3 
        }).setOrigin(0.5);
        this.tweens.add({ targets: txt, y: txt.y - 50, alpha: 0, duration: 1000, onComplete: () => txt.destroy() });
    }

    createDialogueUI() {
        const { width, height } = this.cameras.main;
        
        this.dialogueBox = this.add.graphics();
        this.dialogueBox.fillStyle(0x000000, 0.8);
        this.dialogueBox.fillRoundedRect(50, height - 120, width - 100, 100, 10);
        this.dialogueBox.setVisible(false);
        this.dialogueBox.setDepth(100);

        this.dialogueText = this.add.text(70, height - 100, "", {
            fontFamily: 'sans-serif',
            fontSize: '20px',
            color: '#ffffff',
            wordWrap: { width: width - 140, useAdvancedWrap: true }
        });
        this.dialogueText.setVisible(false);
        this.dialogueText.setDepth(101);
    }

    handleInteract() {
        if (this.inDialogue) {
            if (this.isTypewriterDone) this.advanceDialogue();
            else this.finishTypewriterEarly();
            return;
        }

        // 解謎節點互動優先
        if (Phaser.Math.Distance.Between(this.player.x, this.player.y, this.puzzleNode.x, this.puzzleNode.y) < 70) {
            this.cameras.main.fadeOut(500, 0, 0, 0, (cam: any, prog: number) => {
                if (prog === 1) this.scene.start('PuzzleScene');
            });
            return;
        }

        // NPC 互動
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npc.x, this.npc.y);
        if (dist < 60) {
            this.startDialogue();
        }
    }

    startDialogue() {
        this.inDialogue = true;
        this.dialogueBox.setVisible(true);
        this.dialogueText.setVisible(true);
        this.dialogueStep = 0;
        this.showTypewriterText(this.messages[this.dialogueStep]);
    }

    advanceDialogue() {
        this.dialogueStep++;
        if (this.dialogueStep < this.messages.length) {
            this.showTypewriterText(this.messages[this.dialogueStep]);
            
            if (this.dialogueStep === 1) {
                updateStateAndLog((state) => {
                    state.player.atk += 5;
                    state.inventory.push({ id: 'item_woodensword', type: 'WEAPON', effect: () => {}, price: 10 });
                });
            }
        } else {
            this.inDialogue = false;
            this.dialogueBox.setVisible(false);
            this.dialogueText.setVisible(false);
        }
    }

    private typewriterTimer?: Phaser.Time.TimerEvent;
    private isTypewriterDone: boolean = true;
    private currentFullText: string = "";

    showTypewriterText(text: string) {
        if (this.typewriterTimer) this.typewriterTimer.remove();
        this.currentFullText = text;
        this.dialogueText.setText("");
        this.isTypewriterDone = false;
        let index = 0;
        this.typewriterTimer = this.time.addEvent({
            delay: 40,
            callback: () => {
                this.dialogueText.text += text[index];
                index++;
                if (index === text.length) {
                    this.isTypewriterDone = true;
                    if (this.typewriterTimer) this.typewriterTimer.remove();
                }
            },
            callbackScope: this,
            repeat: text.length - 1
        });
    }

    finishTypewriterEarly() {
        if (this.typewriterTimer) this.typewriterTimer.remove();
        this.dialogueText.setText(this.currentFullText);
        this.isTypewriterDone = true;
    }

    update() {
        // [套用色彩濾鏡] 滿色 100 不濾，降為 0 則為全黑白
        this.colorMatrixFX.grayscale(1 - (GlobalState.worldColorValue / 100));

        if (this.inDialogue) {
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
            this.stepsCount++;
            if (this.stepsCount > Phaser.Math.Between(200, 300)) {
                this.triggerBattle();
            }
        }
    }

    triggerBattle() {
        this.stepsCount = 0;
        this.player.setVelocity(0, 0);
        
        const maskGraphics = this.add.graphics();
        maskGraphics.fillStyle(0xffffff);
        maskGraphics.fillCircle(this.player.x, this.player.y, 1000);
        
        const mask = maskGraphics.createGeometryMask();
        this.cameras.main.setMask(mask);
        
        this.tweens.add({
            targets: maskGraphics, scaleX: 0, scaleY: 0, duration: 800, ease: 'Power2',
            onComplete: () => {
                this.cameras.main.clearMask();
                this.scene.start('BattleScene');
            }
        });
    }
}
