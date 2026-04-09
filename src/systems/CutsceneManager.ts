import Phaser from 'phaser';

export type CutsceneCommand = 
    | { type: 'WAIT', duration: number }
    | { type: 'CHAR_MOVE', id: string, target: {x: number, y: number}, speed: number }
    | { type: 'CHAR_SAY', id: string, text: string }
    | { type: 'CAMERA_PAN', target: {x: number, y: number}, duration: number, zoom: number }
    | { type: 'SCREEN_FX', fxType: 'INK_SPLASH' | 'WHITE_OUT', duration: number };

class CutsceneManagerService {
    private scene!: Phaser.Scene;
    private uiScene!: Phaser.Scene;
    private topBar!: Phaser.GameObjects.Graphics;
    private bottomBar!: Phaser.GameObjects.Graphics;
    private dialogueBox!: Phaser.GameObjects.Container;
    private dialogueText!: Phaser.GameObjects.Text;
    private isPlaying: boolean = false;
    private skipTextPrompt!: Phaser.GameObjects.Text;

    private portraitImg!: Phaser.GameObjects.Image;

    /**
     * 啟動劇情引擎
     */
    public async play(scene: Phaser.Scene, script: any[], charMap: Record<string, Phaser.GameObjects.Sprite | Phaser.Physics.Arcade.Sprite>): Promise<void> {
        if (this.isPlaying) return;
        this.isPlaying = true;
        this.scene = scene;

        if (!scene.scene.get('CutsceneUI')) {
            scene.scene.add('CutsceneUI', class extends Phaser.Scene { constructor() { super('CutsceneUI'); } }, false);
        }
        scene.scene.launch('CutsceneUI');
        scene.scene.bringToTop('CutsceneUI');
        this.uiScene = scene.scene.get('CutsceneUI');

        this.showLetterbox();
        this.createDialogueUI();

        for (const data of script) {
            // 自動轉換 JSON 欄位映射 
            const cmd: CutsceneCommand = {
                type: data.cmd || data.type,
                ...data
            };
            await this.executeCommand(cmd, charMap, data.portrait);
        }

        this.hideLetterbox();
        if (this.dialogueBox) this.dialogueBox.destroy();
        this.scene.time.delayedCall(850, () => {
            this.scene.scene.stop('CutsceneUI');
            this.isPlaying = false;
        });
    }
    
    private showLetterbox() {
        if (!this.uiScene) return;
        const { width, height } = this.uiScene.cameras.main;
        const barHeight = height * 0.12;

        this.topBar = this.uiScene.add.graphics();
        this.topBar.fillStyle(0x000000, 1);
        this.topBar.fillRect(0, -barHeight, width, barHeight);
        this.topBar.setDepth(1000).setScrollFactor(0);

        this.bottomBar = this.uiScene.add.graphics();
        this.bottomBar.fillStyle(0x000000, 1);
        this.bottomBar.fillRect(0, height, width, barHeight);
        this.bottomBar.setDepth(1000).setScrollFactor(0);

        this.uiScene.tweens.add({
            targets: this.topBar, y: barHeight, duration: 800, ease: 'Power2'
        });
        this.uiScene.tweens.add({
            targets: this.bottomBar, y: -barHeight, duration: 800, ease: 'Power2'
        });
    }

    private hideLetterbox() {
        if (!this.uiScene) return;
        this.uiScene.tweens.add({
            targets: this.topBar, y: 0, duration: 800, ease: 'Power2',
            onComplete: () => this.topBar.destroy()
        });
        this.uiScene.tweens.add({
            targets: this.bottomBar, y: 0, duration: 800, ease: 'Power2',
            onComplete: () => this.bottomBar.destroy()
        });
    }

    private createDialogueUI() {
        if (!this.uiScene) return;
        const { width, height } = this.uiScene.cameras.main;
        this.dialogueBox = this.uiScene.add.container(0, 0);
        this.dialogueBox.setDepth(1001).setScrollFactor(0).setAlpha(0);

        const bg = this.uiScene.add.graphics();
        bg.fillStyle(0x000000, 0.7);
        bg.fillRect(0, height * 0.75, width, height * 0.25);
        this.dialogueBox.add(bg);

        // 頭像框，使用 MULTIPLY 混合模式過濾白色背景，達到水墨融合效果
        this.portraitImg = this.uiScene.add.image(width * 0.10, height * 1.0, '').setOrigin(0.5, 1).setBlendMode(Phaser.BlendModes.MULTIPLY);
        this.dialogueBox.add(this.portraitImg);

        this.dialogueText = this.uiScene.add.text(width * 0.38, height * 0.8, '', {
            fontSize: '26px', color: '#ffffff', fontFamily: 'serif',
            wordWrap: { width: width * 0.55 }
        });
        this.dialogueBox.add(this.dialogueText);
        
        this.skipTextPrompt = this.uiScene.add.text(width * 0.9, height * 0.95, '▼', {
            fontSize: '20px', color: '#aaaaaa'
        }).setOrigin(1);
        this.skipTextPrompt.setVisible(false);
        this.dialogueBox.add(this.skipTextPrompt);
    }

    private async executeCommand(cmd: CutsceneCommand, charMap: Record<string, Phaser.GameObjects.Sprite | Phaser.Physics.Arcade.Sprite>, portraitKey?: string): Promise<void> {
        return new Promise(resolve => {
            // 處理頭像顯示
            if (portraitKey && this.portraitImg) {
                this.portraitImg.setTexture(portraitKey).setVisible(true);
                
                // 動態縮放頭像，使其佔據螢幕高度約 45%
                const targetHeight = this.scene.cameras.main.height * 0.45;
                const frame = this.uiScene.textures.getFrame(portraitKey);
                const texHeight = frame ? frame.height : this.portraitImg.height;
                if (texHeight > 0) {
                    this.portraitImg.setScale(targetHeight / texHeight);
                }
            } else if (this.portraitImg) {
                this.portraitImg.setVisible(false);
            }

            switch (cmd.type) {
                case 'WAIT':
                    this.scene.time.delayedCall(cmd.duration, resolve);
                    break;
                case 'CHAR_MOVE':
                    {
                        const char = charMap[cmd.id];
                        if (!char) return resolve();
                        const dist = Phaser.Math.Distance.Between(char.x, char.y, cmd.target.x, cmd.target.y);
                        const dur = (dist / cmd.speed) * 1000;
                        this.scene.tweens.add({
                            targets: char, x: cmd.target.x, y: cmd.target.y, duration: dur,
                            onComplete: () => resolve()
                        });
                    }
                    break;
                case 'CHAR_SAY':
                    {
                        // 淡入對話框並使用打字機
                        this.uiScene.tweens.add({ targets: this.dialogueBox, alpha: 1, duration: 300 });
                        this.dialogueText.setText('');
                        this.skipTextPrompt.setVisible(false);
                        
                        let idx = 0;
                        const fullText = `[${cmd.id}]: ${cmd.text}`;
                        const timer = this.uiScene.time.addEvent({
                            delay: 50,
                            repeat: fullText.length - 1,
                            callback: () => {
                                this.dialogueText.text += fullText[idx];
                                idx++;
                                if (idx === fullText.length) {
                                    this.skipTextPrompt.setVisible(true);
                                    this.uiScene.tweens.add({ targets: this.skipTextPrompt, alpha: 0.2, yoyo: true, repeat: -1, duration: 500 });
                                    
                                    // 等待玩家按下 Space
                                    const keyObj = this.uiScene.input.keyboard?.addKey('SPACE');
                                    if(keyObj) {
                                        keyObj.once('down', () => {
                                            this.uiScene.tweens.add({ targets: this.dialogueBox, alpha: 0, duration: 300, onComplete: () => resolve() });
                                        });
                                    } else {
                                        this.uiScene.time.delayedCall(2000, () => resolve());
                                    }
                                }
                            }
                        });
                    }
                    break;
                case 'CAMERA_PAN':
                    this.scene.cameras.main.pan(cmd.target.x, cmd.target.y, cmd.duration, 'Power2');
                    this.scene.cameras.main.zoomTo(cmd.zoom, cmd.duration, 'Power2');
                    this.scene.time.delayedCall(cmd.duration, resolve);
                    break;
                case 'SCREEN_FX':
                    if (cmd.fxType === 'WHITE_OUT') {
                        this.uiScene.cameras.main.flash(cmd.duration, 255, 255, 255);
                        this.uiScene.time.delayedCall(cmd.duration, resolve);
                    } else if (cmd.fxType === 'INK_SPLASH') {
                        // 動態生成大量墨點遮蓋全螢幕，取代 Shader Mask
                        const g = this.uiScene.add.graphics();
                        g.setScrollFactor(0).setDepth(2000);
                        g.fillStyle(0x000000, 1);
                        
                        let count = 0;
                        const maxDots = 50;
                        const splashTimer = this.uiScene.time.addEvent({
                            delay: cmd.duration / maxDots,
                            repeat: maxDots - 1,
                            callback: () => {
                                const px = Phaser.Math.Between(0, this.uiScene.cameras.main.width);
                                const py = Phaser.Math.Between(0, this.uiScene.cameras.main.height);
                                const r = Phaser.Math.Between(50, 150);
                                g.fillCircle(px, py, r);
                                count++;
                                if (count >= maxDots) {
                                    this.uiScene.time.delayedCall(200, () => {
                                        g.destroy();
                                        resolve();
                                    });
                                }
                            }
                        });
                    }
                    break;
            }
        });
    }
}

export const CutsceneManager = new CutsceneManagerService();
