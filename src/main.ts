import Phaser from 'phaser';
import { TitleScene } from './scenes/TitleScene';
import { MainScene } from './scenes/MainScene';
import { BattleScene } from './scenes/BattleScene';
import { PuzzleScene } from './scenes/PuzzleScene';
import { TalentScene } from './scenes/TalentScene';

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    backgroundColor: '#222222',
    scene: [TitleScene, MainScene, BattleScene, PuzzleScene, TalentScene],
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0, x: 0 },
            debug: false
        }
    }
};

new Phaser.Game(config);
