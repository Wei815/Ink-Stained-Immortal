import { GlobalState } from './GlobalState';
import { EquipmentManager } from '../systems/EquipmentManager';

export const SaveManager = {
    _generateChecksum(data: string): string {
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; 
        }
        return hash.toString(16);
    },

    saveGame() {
        try {
            const payload = JSON.stringify(GlobalState);
            const checksum = this._generateChecksum(payload);
            const data = JSON.stringify({ payload, checksum });
            localStorage.setItem('InkImmortalSave_v1', data);
            console.log("=== [系統] 自動存檔成功！ ===");
        } catch (e) {
            console.error("儲存失敗：", e);
        }
    },

    loadGame(): boolean {
        try {
            const data = localStorage.getItem('InkImmortalSave_v1');
            if (data) {
                const parsedContainer = JSON.parse(data);
                
                // 相容舊有沒加 checksum 的存檔，或是做嚴格攔截
                if (parsedContainer.checksum) {
                    const verifyHash = this._generateChecksum(parsedContainer.payload);
                    if (verifyHash !== parsedContainer.checksum) {
                        console.error("[系統警告] 存檔資料遭受竄改，校驗碼不匹配！");
                        return false;
                    }
                    Object.assign(GlobalState, JSON.parse(parsedContainer.payload));
                } else {
                    // 若是舊存檔格式直接 parse
                    Object.assign(GlobalState, parsedContainer);
                }

                console.log("=== [系統] 讀取存檔成功！ ===");
                EquipmentManager.syncPlayerStats();
                return true;
            }
        } catch (e) {
            console.error("讀取失敗：", e);
        }
        return false;
    },

    hasSave(): boolean {
        return !!localStorage.getItem('InkImmortalSave_v1');
    },

    clearSave() {
        localStorage.removeItem('InkImmortalSave_v1');
    }
};
