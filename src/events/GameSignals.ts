import Phaser from 'phaser';

/**
 * 全域事件中樞
 * 用於解耦系統與狀態間的循環依賴。
 */
export const GameSignals = new Phaser.Events.EventEmitter();

// 定義通用事件字串
export const Events = {
    COLOR_VALUE_CHANGED: 'COLOR_VALUE_CHANGED',
    VISION_STATE_CHANGED: 'VISION_STATE_CHANGED'
};
