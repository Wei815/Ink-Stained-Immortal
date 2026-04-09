import Phaser from 'phaser';
import { GlobalState } from '../state/GlobalState';

class UIManagerService {
    /**
     * 繪製一個具備「宣紙底色」與「動態墨筆描邊」的視窗
     */
    public createInkWindow(scene: Phaser.Scene, x: number, y: number, w: number, h: number): Phaser.GameObjects.Container {
        const container = scene.add.container(x, y);

        // 1. 假宣紙底色 (利用圖案重疊與微微噪點模擬)
        const bg = scene.add.graphics();
        bg.fillStyle(0xf0ece1, 0.95);
        bg.fillRoundedRect(0, 0, w, h, 8);
        container.add(bg);

        // 利用細微的雜點 Graphics 當作紋理 (效能稍換取質感)
        const noise = scene.add.graphics();
        noise.fillStyle(0xddccbb, 0.4);
        for(let i=0; i<30; i++) {
            noise.fillCircle(Phaser.Math.Between(0, w), Phaser.Math.Between(0, h), Phaser.Math.Between(1, 3));
        }
        container.add(noise);

        // 2. 動態畫線邊框 (InkStroke)
        const strokeGraphics = scene.add.graphics();
        container.add(strokeGraphics);

        let progress = 0;
        scene.tweens.addCounter({
            from: 0,
            to: 100,
            duration: 800,
            ease: 'Power2',
            onUpdate: (tween) => {
                progress = tween.getValue() / 100;
                strokeGraphics.clear();
                strokeGraphics.lineStyle(4, 0x111111, 0.8);
                strokeGraphics.beginPath();
                strokeGraphics.moveTo(0, 0);
                
                // 動態連線，依據進度比例決定畫到哪
                const totalPerimeter = (w + h) * 2;
                const currentLength = totalPerimeter * progress;
                
                if (currentLength <= w) {
                    strokeGraphics.lineTo(currentLength, 0);
                } else if (currentLength <= w + h) {
                    strokeGraphics.lineTo(w, 0);
                    strokeGraphics.lineTo(w, currentLength - w);
                } else if (currentLength <= w * 2 + h) {
                    strokeGraphics.lineTo(w, 0);
                    strokeGraphics.lineTo(w, h);
                    strokeGraphics.lineTo(w - (currentLength - w - h), h);
                } else {
                    strokeGraphics.lineTo(w, 0);
                    strokeGraphics.lineTo(w, h);
                    strokeGraphics.lineTo(0, h);
                    strokeGraphics.lineTo(0, h - (currentLength - w*2 - h));
                }
                
                strokeGraphics.strokePath();
            }
        });

        return container;
    }

    /**
     * 建立具有懸停水墨波紋的互動按鈕
     */
    public createInkButton(scene: Phaser.Scene, x: number, y: number, text: string, onClick: () => void): Phaser.GameObjects.Container {
        const container = scene.add.container(x, y);

        // 色彩數值決定字體顏色 (深青色泛起光，或遭到侵蝕抖動)
        let textColor = '#222222';
        if (GlobalState.worldColorValue > 80) textColor = '#004a55';
        else if (GlobalState.worldColorValue < 30) textColor = '#111111';

        const txt = scene.add.text(0, 0, text, {
            fontSize: '24px', fontFamily: 'serif', color: textColor, fontStyle: 'bold'
        }).setOrigin(0.5);

        // 如果處於崩潰狀態，文字加入震抖
        if (GlobalState.worldColorValue < 30) {
            scene.tweens.add({
                targets: txt,
                x: Phaser.Math.Between(-2, 2),
                y: Phaser.Math.Between(-2, 2),
                yoyo: true, repeat: -1, duration: 50
            });
            
            // 隨機墨點干擾
            const spot = scene.add.circle(Phaser.Math.Between(-20, 20), Phaser.Math.Between(-10, 10), Phaser.Math.Between(2, 6), 0x000000, 0.7);
            container.add(spot);
        } else if (GlobalState.worldColorValue > 80) {
            txt.setStroke('#ffffff', 3);
        }

        // 隱藏的互動區域 (hitbox)
        const hitArea = scene.add.rectangle(0, 0, txt.width + 40, txt.height + 20, 0x000000, 0).setInteractive({ useHandCursor: true });
        
        let rippleTween: Phaser.Tweens.Tween | null = null;
        let rippleGraphics: Phaser.GameObjects.Graphics | null = null;

        hitArea.on('pointerover', () => {
            if (rippleGraphics) rippleGraphics.destroy();
            rippleGraphics = scene.add.graphics();
            rippleGraphics.fillStyle(0x000000, 0.2);
            rippleGraphics.fillCircle(0, 0, txt.width/2 + 20);
            container.addAt(rippleGraphics, 0);

            rippleTween = scene.tweens.add({
                targets: rippleGraphics,
                scaleX: 1.2, scaleY: 1.2, alpha: 0, 
                duration: 600, repeat: -1
            });
            
            txt.setScale(1.1);
        });

        hitArea.on('pointerout', () => {
            if (rippleTween) rippleTween.stop();
            if (rippleGraphics) rippleGraphics.destroy();
            txt.setScale(1.0);
        });

        hitArea.on('pointerdown', () => {
            onClick();
        });

        container.add([hitArea, txt]);
        return container;
    }
}

export const UIManager = new UIManagerService();
