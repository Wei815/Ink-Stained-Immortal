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

        // 為了效能，採用渲染到 RenderTexture 或單純使用 Graphics batch
        // 由於是要實際擺放在世界坐標，使用單一 Graphics 繪製整個 Chunk 是最省效能的方式
        const chunkGraphics = this.scene.add.graphics();
        container.add(chunkGraphics);

        for (let i = 0; i < CHUNK_SIZE; i++) {
            for (let j = 0; j < CHUNK_SIZE; j++) {
                const nx = i * TILE_SIZE;
                const ny = j * TILE_SIZE;
                
                // 動態材質判斷: 若墨蝕狀態，地板切換為暗色系
                let color = 0x55aa55; // 草地
                if (isCorrupted) color = 0x222222; // 枯槁大地
                
                if (random() > 0.8) color = isCorrupted ? 0x111111 : 0x777777; // 道路或枯骨
                
                chunkGraphics.fillStyle(color, 1);
                chunkGraphics.fillRect(nx, ny, TILE_SIZE, TILE_SIZE);
                chunkGraphics.lineStyle(1, isCorrupted ? 0x000000 : 0x449944, 0.3);
                chunkGraphics.strokeRect(nx, ny, TILE_SIZE, TILE_SIZE);
            }
        }

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
