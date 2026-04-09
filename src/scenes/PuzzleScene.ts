import Phaser from 'phaser';
import { GlobalState } from '../state/GlobalState';
import { SaveManager } from '../state/SaveManager';

export class PuzzleScene extends Phaser.Scene {
    private graphics!: Phaser.GameObjects.Graphics;
    private startNode!: Phaser.GameObjects.Arc;
    private endNode!: Phaser.GameObjects.Arc;
    
    private isDrawing = false;
    private currentPath: Phaser.Math.Vector2[] = [];

    constructor() {
        super({ key: 'PuzzleScene' });
    }

    create() {
        this.cameras.main.setBackgroundColor('#111122');
        this.cameras.main.fadeIn(500);

        const { width, height } = this.cameras.main;
        
        this.add.text(width / 2, 50, "【五行解謎：水之繪線】\n拖曳左鍵，將左方的藍色靈泉連接至右方的乾枯神木。", { 
            fontSize: '24px', color: '#fff', align: 'center', fontFamily: 'sans-serif' 
        }).setOrigin(0.5);
        this.add.text(width / 2, height - 50, "按 ESC 隨時退出", { fontSize: '18px', color: '#aaa', align: 'center' }).setOrigin(0.5);
        
        if (this.input.keyboard) {
            this.input.keyboard.addKey('ESC').on('down', () => this.exitPuzzle());
        }

        const sx = width * 0.2;
        const sy = height / 2;
        const ex = width * 0.8;
        const ey = height / 2;
        
        this.startNode = this.add.circle(sx, sy, 30, 0x0088ff).setInteractive();
        this.endNode = this.add.circle(ex, ey, 30, 0x442200).setInteractive(); // 枯木色

        this.graphics = this.add.graphics();
        
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (Phaser.Math.Distance.Between(pointer.x, pointer.y, sx, sy) < 45) {
                this.isDrawing = true;
                this.currentPath = [new Phaser.Math.Vector2(pointer.x, pointer.y)];
            }
        });

        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (!this.isDrawing) return;
            this.currentPath.push(new Phaser.Math.Vector2(pointer.x, pointer.y));
            this.drawPath();
            
            if (Phaser.Math.Distance.Between(pointer.x, pointer.y, ex, ey) < 45) {
                this.isDrawing = false;
                this.winPuzzle();
            }
        });

        this.input.on('pointerup', () => {
            if(this.isDrawing) {
                this.isDrawing = false;
                this.currentPath = [];
                this.drawPath(); 
            }
        });
    }

    drawPath() {
        this.graphics.clear();
        this.graphics.lineStyle(8, 0x00aaff, 0.8);
        
        if (this.currentPath.length > 0) {
            this.graphics.beginPath();
            this.graphics.moveTo(this.currentPath[0].x, this.currentPath[0].y);
            for (let i = 1; i < this.currentPath.length; i++) {
                this.graphics.lineTo(this.currentPath[i].x, this.currentPath[i].y);
            }
            this.graphics.strokePath();
        }
    }

    winPuzzle() {
        this.endNode.setFillStyle(0x00ff00); // 恢復生機變綠色
        const winText = this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2 + 100, 
            "淨化成功！世界色彩度 +20", { fontSize: '32px', color: '#ffea00', stroke: '#000', strokeThickness: 5 }
        ).setOrigin(0.5);
        
        this.tweens.add({ targets: winText, y: winText.y - 20, yoyo: true, repeat: -1, duration: 400 });

        this.time.delayedCall(2000, () => {
            GlobalState.worldColorValue = Math.min(100, GlobalState.worldColorValue + 20);
            SaveManager.saveGame(); 
            this.cameras.main.fadeOut(500, 0, 0, 0, (cam: any, prog: number) => {
                if (prog === 1) this.exitPuzzle();
            });
        });
    }

    exitPuzzle() {
        this.scene.start('MainScene');
    }
}
