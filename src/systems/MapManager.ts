import Phaser from 'phaser';
import { GlobalState } from '../state/GlobalState';
import { GameSignals, Events } from '../events/GameSignals';
import { InteractionManager } from './InteractionManager';

export const CHUNK_SIZE = 50;
export const TILE_SIZE = 32;
export const CHUNK_PIXEL_SIZE = CHUNK_SIZE * TILE_SIZE;

class MapManagerService {
    private scene: Phaser.Scene | null = null;
    private loadedChunks: Map<string, Phaser.GameObjects.Container> = new Map();
    private activeChunkCoords: { x: number, y: number } = { x: 0, y: 0 };
    private objectLayer!: Phaser.GameObjects.Group;
    private hiddenObjects: Phaser.GameObjects.GameObject[] = [];

    public init(scene: Phaser.Scene) {
        this.scene = scene;
        this.objectLayer = scene.add.group();
        
        // 避免重複綁定 listener
        GameSignals.off(Events.COLOR_VALUE_CHANGED, this.handleColorChange, this);
        GameSignals.on(Events.COLOR_VALUE_CHANGED, this.handleColorChange, this);
        GameSignals.off(Events.VISION_STATE_CHANGED, this.handleVisionChange, this);
        GameSignals.on(Events.VISION_STATE_CHANGED, this.handleVisionChange, this);
        
        // 初始載入第一塊
        this.activeChunkCoords = { x: 9999, y: 9999 }; // 迫使強制更新
        this.hiddenObjects = [];
        this.updateChunks(GlobalState.player.pos?.x || 200, GlobalState.player.pos?.y || 300);
    }

    public updateChunks(playerX: number, playerY: number) {
        if (!this.scene) return;

        const chunkX = Math.floor(playerX / CHUNK_PIXEL_SIZE);
        const chunkY = Math.floor(playerY / CHUNK_PIXEL_SIZE);

        if (this.activeChunkCoords.x === chunkX && this.activeChunkCoords.y === chunkY && this.loadedChunks.size > 0) {
            return; // 依然在同一個區塊內
        }

        this.activeChunkCoords = { x: chunkX, y: chunkY };
        console.log(`[MapManager] 跨越邊界，當前核心區塊: ${chunkX}, ${chunkY}`);

        this.loadAdjacentChunks(chunkX, chunkY);
    }

    private loadAdjacentChunks(cx: number, cy: number) {
        const requiredKeys = new Set<string>();

        // 建立 3x3 矩陣
        for (let ox = -1; ox <= 1; ox++) {
            for (let oy = -1; oy <= 1; oy++) {
                const nx = cx + ox;
                const ny = cy + oy;
                const key = `${nx},${ny}`;
                requiredKeys.add(key);

                if (!this.loadedChunks.has(key)) {
                    this.loadChunk(nx, ny, key);
                }
            }
        }

        // 卸載超出範圍的 3x3 外區塊
        for (const [key, container] of this.loadedChunks.entries()) {
            if (!requiredKeys.has(key)) {
                container.destroy();
                this.loadedChunks.delete(key);
                console.log(`[MapManager] 區塊已卸載: ${key}`);
            }
        }
    }

    private loadChunk(x: number, y: number, key: string) {
        if (!this.scene) return;
        
        const container = this.scene.add.container(x * CHUNK_PIXEL_SIZE, y * CHUNK_PIXEL_SIZE);
        container.setDepth(-100);

        // 如果未來有加載真實的 JSON Tilemap -> this.scene.cache.tilemap.exists(...) 可用於判斷
        // 目標：自動切換至「程序化生成引擎 (Procedural Generation)」
        this.generateProceduralChunk(container, x, y);

        this.loadedChunks.set(key, container);
    }

    private generateProceduralChunk(container: Phaser.GameObjects.Container, cx: number, cy: number) {
        if (!this.scene) return;

        // 簡易 hash RNG 模擬 seedrandom
        let seed = (cx + 1000) * 31337 + (cy + 1000) * 3133;
        const random = () => {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        };

        const isCorrupted = GlobalState.worldColorValue < 30;

        const textureKey = 'tileset_world';
        const bg = this.scene.add.tileSprite(0, 0, CHUNK_PIXEL_SIZE, CHUNK_PIXEL_SIZE, textureKey);
        bg.setOrigin(0, 0);
        
        if (isCorrupted) {
            bg.setTint(0x555555);
        } else {
            bg.setTint(0xffffff);
        }
        container.add(bg);

        // Procedural POI 隨機障礙 - "墨池" (有害地形)
        if (GlobalState.worldColorValue < 40 && random() > 0.8) {
             const px = (cx * CHUNK_PIXEL_SIZE) + Math.floor(random() * CHUNK_SIZE) * TILE_SIZE;
             const py = (cy * CHUNK_PIXEL_SIZE) + Math.floor(random() * CHUNK_SIZE) * TILE_SIZE;
             
             // 世界座標的物體需要放在 scene 一般層級或是加入 container 時要給相對座標，
             // 但 InteractionManager 吃的是世界座標。
             const obstacle = this.scene.add.circle(px - (cx * CHUNK_PIXEL_SIZE), py - (cy * CHUNK_PIXEL_SIZE), 60, 0x000000);
             
             this.scene.tweens.add({
                 targets: obstacle, scale: 1.1, alpha: 0.8, yoyo: true, repeat: -1, duration: 1500
             });
             container.add(obstacle);

             InteractionManager.registerEntity({
                 id: `well_${cx}_${cy}_${px}`,
                 type: 'DriedWell',
                 x: px,
                 y: py,
                 radius: 60,
                 sprite: obstacle
             });
        }

        // 蘇瑤之眼專屬隱藏碎塊 (解謎物件)
        if (random() > 0.85) {
             const px = (cx * CHUNK_PIXEL_SIZE) + Math.floor(random() * CHUNK_SIZE) * TILE_SIZE;
             const py = (cy * CHUNK_PIXEL_SIZE) + Math.floor(random() * CHUNK_SIZE) * TILE_SIZE;
             
             const hiddenLore = this.scene.add.rectangle(px - (cx * CHUNK_PIXEL_SIZE), py - (cy * CHUNK_PIXEL_SIZE), 30, 30, 0xffffff);
             hiddenLore.setAlpha(GlobalState.visionState ? 1 : 0);
             container.add(hiddenLore);
             this.hiddenObjects.push(hiddenLore);

             InteractionManager.registerEntity({
                 id: `lore_${cx}_${cy}_${px}`,
                 type: 'LoreFragment',
                 x: px,
                 y: py,
                 radius: 50,
                 sprite: hiddenLore
             });
        }

        // 交互式草叢：增加地表活動感，隨機掉落墨晶
        if (random() > 0.7) {
            const bx = (cx * CHUNK_PIXEL_SIZE) + Math.floor(random() * CHUNK_SIZE) * TILE_SIZE;
            const by = (cy * CHUNK_PIXEL_SIZE) + Math.floor(random() * CHUNK_SIZE) * TILE_SIZE;
            
            // 繪製一個草叢方塊
            const bush = this.scene.add.rectangle(bx - (cx * CHUNK_PIXEL_SIZE), by - (cy * CHUNK_PIXEL_SIZE), 32, 32, 0x224422);
            bush.setAlpha(0.6).setAngle(Phaser.Math.Between(0, 360));
            container.add(bush);

            InteractionManager.registerEntity({
                id: `bush_${cx}_${cy}_${bx}`,
                type: 'Bush',
                x: bx,
                y: by,
                radius: 40,
                sprite: bush,
                data: { shards: Math.floor(random() * 5) + 1 }
            });
        }
    }

    private handleVisionChange(isVisionActive: boolean) {
        // Toggle 隱形圖層的能見度
        this.hiddenObjects.forEach(obj => {
            if (obj && obj.active) {
                (obj as any).setAlpha(isVisionActive ? 1 : 0);
            }
        });
    }

    private handleColorChange(newVal: number, oldVal: number) {
        // 色彩閾值跨越 30 時，全面強制重新渲染目前所有 Chunk 的地形材質
        if ((oldVal >= 30 && newVal < 30) || (oldVal < 30 && newVal >= 30)) {
            console.log("[MapManager] 大地圖材質強制更新為 " + (newVal < 30 ? "枯槁" : "鮮明"));
            
            if (this.scene) {
                const tempCoords = { ...this.activeChunkCoords };
                this.loadedChunks.forEach(container => container.destroy());
                this.loadedChunks.clear();
                
                // 強制重載
                this.activeChunkCoords = { x: 9999, y: 9999 }; 
                this.updateChunks(tempCoords.x * CHUNK_PIXEL_SIZE, tempCoords.y * CHUNK_PIXEL_SIZE);
            }
        }
    }

    public sceneTransition(targetScene: string, playerSceneInstance: Phaser.Scene) {
        // 記憶退出前的世界座標
        const playerSprite = (playerSceneInstance as any).player as Phaser.Physics.Arcade.Sprite;
        if (playerSprite) {
             GlobalState.player.pos = {
                 x: playerSprite.x,
                 y: playerSprite.y,
                 facing: 'down'
             };
        }

        // 啟動 Ink Dissolve 演繹
        const { width, height } = playerSceneInstance.cameras.main;
        const maskGraphics = playerSceneInstance.add.graphics();
        maskGraphics.fillStyle(0x000000);
        maskGraphics.fillRect(0, 0, width, height);
        maskGraphics.setDepth(999999).setAlpha(0);
        maskGraphics.setScrollFactor(0); // Sticky

        playerSceneInstance.tweens.add({
            targets: maskGraphics,
            alpha: 1,
            duration: 800,
            ease: 'Power2',
            onComplete: () => {
                playerSceneInstance.scene.start(targetScene);
            }
        });
    }
}

export const MapManager = new MapManagerService();
