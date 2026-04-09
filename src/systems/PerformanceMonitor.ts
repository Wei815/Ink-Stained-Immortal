import Phaser from 'phaser';

class PerformanceMonitorService {
    private game!: Phaser.Game;
    private lowFpsFrames: number = 0;
    private isDowngraded: boolean = false;
    private isMonitoring: boolean = false;

    public init(game: Phaser.Game) {
        this.game = game;
        if (!this.isMonitoring) {
            this.game.events.on('step', this.checkPerformance, this);
            this.isMonitoring = true;
        }
    }

    private checkPerformance() {
        if (!this.game || this.isDowngraded) return;

        const fps = this.game.loop.actualFps;
        // 如果實際遊戲還沒跑順或是剛啟動，FPS可能會忽高忽低，過濾掉 0 的情況
        if (fps > 0 && fps < 45) {
            this.lowFpsFrames++;
            // 連續低幀大約 120 次 step (約 2-3 秒)
            if (this.lowFpsFrames > 120) {
                this.triggerFXDowngrade();
            }
        } else if (fps >= 45) {
            this.lowFpsFrames = 0;
        }
    }

    private triggerFXDowngrade() {
        if (this.isDowngraded) return;
        this.isDowngraded = true;
        
        console.warn("[PerformanceMonitor] 偵測到持續低幀率，自動觸發特效降級 (FX Downgrade)。");
        
        // 寫入 Phaser Registry 提供全系統皆可讀取
        this.game.registry.set('fx_downgraded', true);
    }

    public isFXDowngraded() {
        return this.isDowngraded;
    }
}

export const PerformanceMonitor = new PerformanceMonitorService();
