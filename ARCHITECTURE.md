# 🎮 墨染仙塵 (Ink-Stained Immortal) - 專案架構文件

本文件為《墨染仙塵》的專案架構與開發流程指南。所有的開發、重構與排錯之前，請務必參考此文件。

## 目錄結構設計 (Directory Structure)

專案採用模組化與高可擴充性的架構設計，初步規劃如下：

```text
c:\github\Game\
├── src/
│   ├── types/          # 核心數據模型與 TypeScript 介面定義（EntityStats, QuestNode, Item 等）
│   ├── core/           # 遊戲核心引擎層（戰鬥結算、五行相剋邏輯、回合制 Timeline）
│   ├── systems/        # 遊戲子系統（任務系統、背包系統、天賦探索等）
│   ├── data/           # 遊戲靜態資料（裝備表、任務表、角色初始屬性）
│   └── ui/             # 視圖與介面顯示層
└── ARCHITECTURE.md     # 專案架構與規範說明
```

## 系統架構概念 (System Architecture Concepts)

1. **核心迴圈與 Timeline 戰鬥系統：** 戰鬥採用回合制與速度 (SPD) 序列，搭配「金木水火土」五行相剋邏輯計算傷害（克制時造成 150% 傷害，20% 失衡率）。
2. **數據分離：** 將角色的能力值 (`EntityStats`) 與裝備、物品效果解耦。物品效果透過傳遞 `EntityStats` 物件進行操作。
3. **任務與旗標推演：** 故事情節（三幕架構）透過 `QuestSystem` 結合全域劇情 Flag 來控制。

## 同步更新規範
若在後續開發中涉及新增目錄或更換主要架構（如引入資料庫或遊戲引擎框架），AI 需主動提醒並同步更新本文件的內容。
