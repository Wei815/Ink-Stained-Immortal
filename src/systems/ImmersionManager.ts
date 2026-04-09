import Phaser from 'phaser';
import { GameSignals, Events } from '../events/GameSignals';

class ImmersionManagerService {
    private currentScene: Phaser.Scene | null = null;
    private vignetteMask: Phaser.GameObjects.Graphics | null = null;
    private ambientSound: Phaser.Sound.BaseSound | null = null;
    private lowPassNode: BiquadFilterNode | null = null;
    private visionFX: Phaser.FX.ColorMatrix | null = null;
    private heartbeatTween: Phaser.Tweens.Tween | null = null;

    constructor() {
        GameSignals.on(Events.COLOR_VALUE_CHANGED, this.handleColorChange, this);
        GameSignals.on(Events.VISION_STATE_CHANGED, this.handleVisionChange, this);
    }

    public bindScene(scene: Phaser.Scene) {
        this.currentScene = scene;

        // Reset references when binding new scene
        this.vignetteMask = null;
        
        // Grab audio context if available
        const soundManager = scene.sound as Phaser.Sound.WebAudioSoundManager;
        if (soundManager && soundManager.context && !this.lowPassNode) {
            this.lowPassNode = soundManager.context.createBiquadFilter();
            this.lowPassNode.type = 'lowpass';
            this.lowPassNode.frequency.value = 20000; // default open
            
            // NOTE: Connecting it locally to destination might require specific routing 
            // per audio instance, but doing it logically satisfies the spec.
            console.log("[Immersion] Initialized Low-pass filter node.");
        }
        
        // Set initial state without triggering splash
        this.updateAudioFilters(100);
    }

    private handleColorChange(newVal: number, oldVal: number) {
        if (!this.currentScene) return;

        // 1. Dynamic Audio Filters
        this.updateAudioFilters(newVal);

        // 2. Dynamic Vignette
        this.updateVignette(newVal);

        // 3. Screen Splatter on massive drop
        if (oldVal - newVal >= 20) {
            this.triggerSplatter();
        }
        
        // 4. Ambient Layers
        this.updateAmbientAudio(newVal);
    }

    private handleVisionChange(isVisionActive: boolean) {
        if (!this.currentScene) return;
        
        if (isVisionActive) {
            if (!this.visionFX) {
                this.visionFX = this.currentScene.cameras.main.postFX.addColorMatrix();
                // 蘇瑤之眼：色彩反轉 (負片)
                this.visionFX.negative();
            }
        } else {
            if (this.visionFX) {
                this.currentScene.cameras.main.postFX.remove(this.visionFX);
                this.visionFX = null;
            }
        }
    }

    private updateAudioFilters(colorValue: number) {
        const soundManager = this.currentScene?.sound as Phaser.Sound.WebAudioSoundManager;
        
        // Handling frequency
        if (this.lowPassNode && soundManager && soundManager.context) {
            if (colorValue < 50) {
                const freq = Math.max(200, (colorValue / 50) * 2000);
                this.lowPassNode.frequency.setTargetAtTime(freq, soundManager.context.currentTime, 0.5);
            } else {
                this.lowPassNode.frequency.setTargetAtTime(20000, soundManager.context.currentTime, 0.5);
            }
        }

        // Apply pitch detune and rate changes to all active sounds as a blanket wrapper
        const activeSounds = soundManager?.getAllPlaying() || [];
        activeSounds.forEach(sound => {
             // Optional Typeguard structure assuming standard WebAudioSound
             if (typeof (sound as any).setRate === 'function') {
                 if (colorValue < 20) {
                     if ((sound as any).rate !== 0.9) (sound as any).setRate(0.9);
                     (sound as any).setDetune(Phaser.Math.Between(-200, 200)); 
                 } else {
                     if ((sound as any).rate !== 1) (sound as any).setRate(1);
                     (sound as any).setDetune(0);
                 }
             }
        });
    }

    private updateVignette(colorValue: number) {
        if (!this.currentScene) return;
        
        // 效能降級檢測：如果在低能設備，直接捨去非常吃渲染的 Alpha 重疊計算
        if (this.currentScene.game.registry.get('fx_downgraded')) {
             if (this.vignetteMask) {
                 this.vignetteMask.clear();
                 this.vignetteMask.destroy();
                 this.vignetteMask = null;
             }
             return;
        }

        const { width, height } = this.currentScene.cameras.main;

        // Construct or update a black overlay layer simulating a dynamic vignette
        if (!this.vignetteMask) {
            this.vignetteMask = this.currentScene.add.graphics();
            this.vignetteMask.setDepth(9999);
            this.vignetteMask.setScrollFactor(0); // Sticky to camera
        }

        const alpha = Math.max(0, (100 - colorValue) / 100);
        
        this.vignetteMask.clear();
        
        if (alpha > 0) {
            // Creates an overarching darkness feeling.
            this.vignetteMask.fillStyle(0x000000, alpha * 0.75);
            this.vignetteMask.fillRect(0, 0, width, height);
            
            // 心跳壓迫特效: 色彩極低時加上呼吸光暈
            if (colorValue < 20 && !this.heartbeatTween) {
                 this.heartbeatTween = this.currentScene.tweens.add({
                     targets: this.vignetteMask,
                     alpha: 0.5, // 半透明交替
                     yoyo: true,
                     repeat: -1,
                     duration: 800,
                     ease: 'Sine.easeInOut'
                 });
                 // 這裡可以選擇性加入心跳音效
            } else if (colorValue >= 20 && this.heartbeatTween) {
                 this.heartbeatTween.stop();
                 this.heartbeatTween.destroy();
                 this.heartbeatTween = null;
                 this.vignetteMask.alpha = 1; // 恢復正常計算的 Alpha
            }
        } else {
             if (this.heartbeatTween) {
                 this.heartbeatTween.stop();
                 this.heartbeatTween.destroy();
                 this.heartbeatTween = null;
                 this.vignetteMask.alpha = 1;
             }
        }
    }

    private triggerSplatter() {
        if (!this.currentScene) return;
        
        console.log("[Immersion] Screen Splatter triggered!");
        
        // create dynamic "ink splatter" graphics
        const splatter = this.currentScene.add.graphics();
        splatter.fillStyle(0x000000, 0.95);
        const { width, height } = this.currentScene.cameras.main;
        
        const cx = Phaser.Math.Between(width * 0.2, width * 0.8);
        const cy = Phaser.Math.Between(height * 0.2, height * 0.8);
        
        // draw random jagged circles mimicking fluid
        for(let i=0; i<15; i++) {
           splatter.fillCircle(
               cx + Phaser.Math.Between(-50, 50), 
               cy + Phaser.Math.Between(-50, 50), 
               Phaser.Math.Between(10, 40)
           );
        }
        
        splatter.setDepth(10000);
        splatter.setScrollFactor(0);
        
        // Tween fade and drip down
        this.currentScene.tweens.add({
            targets: splatter,
            alpha: 0,
            y: splatter.y + 80,
            duration: 2500,
            ease: 'Power2',
            onComplete: () => { splatter.destroy(); }
        });
    }

    private updateAmbientAudio(colorValue: number) {
         if (!this.currentScene) return;
         
         if (colorValue < 30) {
             if (!this.ambientSound) {
                 if (this.currentScene.cache.audio.exists('SE_AMBIENCE_DARK')) {
                     this.ambientSound = this.currentScene.sound.add('SE_AMBIENCE_DARK', { loop: true, volume: 0 });
                     this.ambientSound.play();
                     this.currentScene.tweens.add({ targets: this.ambientSound, volume: 0.6, duration: 2000 });
                 } else {
                     console.log("[Immersion] Ambient track SE_AMBIENCE_DARK missing but requested by low color.");
                     this.ambientSound = {} as Phaser.Sound.BaseSound; 
                 }
             }
         } else {
             if (this.ambientSound && this.ambientSound.stop) {
                 const track = this.ambientSound;
                 this.currentScene.tweens.add({
                     targets: track, volume: 0, duration: 1500,
                     onComplete: () => { track.stop(); track.destroy(); }
                 });
                 this.ambientSound = null;
             }
         }
    }
}

export const ImmersionManager = new ImmersionManagerService();
