import Phaser from 'phaser';

export type CutsceneCommand = 
    | { type: 'WAIT', duration: number }
    | { type: 'CHAR_MOVE', id: string, target: {x: number, y: number}, speed: number }
    | { type: 'CHAR_SAY', id: string, text: string }
    | { type: 'CAMERA_PAN', target: {x: number, y: number}, duration: number, zoom: number }
    | { type: 'SCREEN_FX', fxType: 'INK_SPLASH' | 'WHITE_OUT', duration: number };

class CutsceneManagerService {
    private scene!: Phaser.Scene;
    private topBar!: Phaser.GameObjects.Graphics;
    private bottomBar!: Phaser.GameObjects.Graphics;
    private dialogueBox!: Phaser.GameObjects.Container;
    private dialogueText!: Phaser.GameObjects.Text;
    private isPlaying: boolean = false;
    private skipTextPrompt!: Phaser.GameObjects.Text;

    /**
     * 啟動劇情引擎
     */
    public async play(scene: Phaser.Scene, script: CutsceneCommand[], charMap: Record<string, Phaser.GameObjects.Sprite | Phaser.Physics.Arcade.Sprite>): Promise<void> {
        if (this.isPlaying) return;
        this.isPlaying = true;
        this.scene = scene;

        this.showLetterbox();
        this.createDialogueUI();

        for (const cmd of script) {
            await this.executeCommand(cmd, charMap);
        }

        this.hideLetterbox();
        if (this.dialogueBox) this.dialogueBox.destroy();
        this.isPlaying = false;
    }

    private showLetterbox() {
        const { width, height } = this.scene.cameras.main;
        const barHeight = height * 0.12;

        this.topBar = this.scene.add.graphics();
        this.topBar.fillStyle(0x000000, 1);
        this.topBar.fillRect(0, -barHeight, width, barHeight);
        this.topBar.setDepth(1000).setScrollFactor(0);

        this.bottomBar = this.scene.add.graphics();
        this.bottomBar.fillStyle(0x000000, 1);
        this.bottomBar.fillRect(0, height, width, barHeight);
        this.bottomBar.setDepth(1000).setScrollFactor(0);

        this.scene.tweens.add({
            targets: this.topBar, y: barHeight, duration: 800, ease: 'Power2'
        });
        this.scene.tweens.add({
            targets: this.bottomBar, y: -barHeight, duration: 800, ease: 'Power2'
        });
    }

    private hideLetterbox() {
        this.scene.tweens.add({
            targets: this.topBar, y: 0, duration: 800, ease: 'Power2',
            onComplete: () => this.topBar.destroy()
        });
        this.scene.tweens.add({
            targets: this.bottomBar, y: 0, duration: 800, ease: 'Power2',
            onComplete: () => this.bottomBar.destroy()
        });
    }

    private createDialogueUI() {
        const { width, height } = this.scene.cameras.main;
        this.dialogueBox = this.scene.add.container(0, 0);
        this.dialogueBox.setDepth(1001).setScrollFactor(0).setAlpha(0);

        const bg = this.scene.add.graphics();
        bg.fillStyle(0x000000, 0.7);
        bg.fillRect(0, height * 0.75, width, height * 0.25);
        this.dialogueBox.add(bg);

        this.dialogueText = this.scene.add.text(width * 0.1, height * 0.8, '', {
            fontSize: '26px', color: '#ffffff', fontFamily: 'serif',
            wordWrap: { width: width * 0.8 }
        });
        this.dialogueBox.add(this.dialogueText);
        
        this.skipTextPrompt = this.scene.add.text(width * 0.9, height * 0.95, '▼', {
            fontSize: '20px', color: '#aaaaaa'
        }).setOrigin(1);
        this.skipTextPrompt.setVisible(false);
        this.dialogueBox.add(this.skipTextPrompt);
    }

    private async executeCommand(cmd: CutsceneCommand, charMap: Record<string, Phaser.GameObjects.Sprite | Phaser.Physics.Arcade.Sprite>): Promise<void> {
        return new Promise(resolve => {
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
                        this.scene.tweens.add({ targets: this.dialogueBox, alpha: 1, duration: 300 });
                        this.dialogueText.setText('');
                        this.skipTextPrompt.setVisible(false);
                        
                        let idx = 0;
                        const fullText = `[${cmd.id}]: ${cmd.text}`;
                        const timer = this.scene.time.addEvent({
                            delay: 50,
                            repeat: fullText.length - 1,
                            callback: () => {
                                this.dialogueText.text += fullText[idx];
                                idx++;
                                if (idx === fullText.length) {
                                    this.skipTextPrompt.setVisible(true);
                                    this.scene.tweens.add({ targets: this.skipTextPrompt, alpha: 0.2, yoyo: true, repeat: -1, duration: 500 });
                                    
                                    // 等待玩家按下 Space
                                    const keyObj = this.scene.input.keyboard?.addKey('SPACE');
                                    if(keyObj) {
                                        keyObj.once('down', () => {
                                            this.scene.tweens.add({ targets: this.dialogueBox, alpha: 0, duration: 300, onComplete: () => resolve() });
                                        });
                                    } else {
                                        this.scene.time.delayedCall(2000, () => resolve());
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
                        this.scene.cameras.main.flash(cmd.duration, 255, 255, 255);
                        this.scene.time.delayedCall(cmd.duration, resolve);
                    } else if (cmd.fxType === 'INK_SPLASH') {
                        // 動態生成大量墨點遮蓋全螢幕，取代 Shader Mask
                        const g = this.scene.add.graphics();
                        g.setScrollFactor(0).setDepth(2000);
                        g.fillStyle(0x000000, 1);
                        
                        let count = 0;
                        const maxDots = 50;
                        const splashTimer = this.scene.time.addEvent({
                            delay: cmd.duration / maxDots,
                            repeat: maxDots - 1,
                            callback: () => {
                                const px = Phaser.Math.Between(0, this.scene.cameras.main.width);
                                const py = Phaser.Math.Between(0, this.scene.cameras.main.height);
                                const r = Phaser.Math.Between(50, 150);
                                g.fillCircle(px, py, r);
                                count++;
                                if (count >= maxDots) {
                                    this.scene.time.delayedCall(200, () => {
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
