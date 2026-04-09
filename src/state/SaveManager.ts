import { GlobalState } from './GlobalState';

export const SaveManager = {
    saveGame() {
        try {
            const data = JSON.stringify(GlobalState);
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
                const parsed = JSON.parse(data);
                // 複製儲存的狀態到實例中
                Object.assign(GlobalState, parsed);
                console.log("=== [系統] 讀取存檔成功！ ===");
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
