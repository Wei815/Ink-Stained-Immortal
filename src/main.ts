import Phaser from 'phaser';
import { TitleScene } from './scenes/TitleScene';
import { MainScene } from './scenes/MainScene';
import { BattleScene } from './scenes/BattleScene';
import { PuzzleScene } from './scenes/PuzzleScene';
import { TalentScene } from './scenes/TalentScene';
import { SummaryScene } from './scenes/SummaryScene';
import { BootScene } from './scenes/BootScene';
import { CinematicScene } from './scenes/CinematicScene';
import { PerformanceMonitor } from './systems/PerformanceMonitor';

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    backgroundColor: '#222222',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [BootScene, TitleScene, CinematicScene, MainScene, BattleScene, PuzzleScene, TalentScene, SummaryScene],
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0, x: 0 },
            debug: false
        }
    }
};

const game = new Phaser.Game(config);
PerformanceMonitor.init(game);
