# 撲克手牌速記

在實體錦標賽現場快速記下一手牌，之後一鍵把文字傳到 LINE 給朋友討論。
原則只有三個：**簡單、快速、好用**。手機版為主。

完整規格在 [`docs/SPEC.md`](docs/SPEC.md)。**SPEC 是唯一依據**：規格要改，先改 SPEC，再改程式。

## 鐵律

1. **手機優先**。只為手機設計；電腦上就是置中的手機寬度欄（最寬 480px），不做桌面版。
2. **單手操作**。主要按鈕放畫面下半部，觸控目標至少 48px。
3. **每個欄位都能跳過**。沒有必填、沒有驗證擋住使用者。
4. **選牌與數字絕不叫出系統鍵盤**。一律用底部面板（`CardPicker`、`NumPad`）。只有備註用系統鍵盤，字級至少 16px。
5. **每次輸入就寫進 IndexedDB**（備註也是每打一個字就寫），沒有「儲存」按鈕，也不要加 debounce：頁面被關掉時，卸載當下才開始的寫入會被瀏覽器取消。
6. **只存本機**。沒有後端、帳號、雲端、分析、追蹤；不載入第三方腳本或外部字型。
7. **資料只透過 `src/db/` 存取**。Dexie 已發佈的 `version(n)` 不准改，要改就加新版本並寫 `upgrade()`。
8. **牌的內部表示固定為 `As`、`Td`、`2c`**。畫面上的花色用 SVG 四色（♠ 黑、♥ 紅、♦ 藍、♣ 綠）畫在淺色牌面上；只有分享到 LINE 的純文字才用 ♠♥♦♣。
9. **介面文字繁體中文（台灣用語）**。撲克術語保留英文縮寫：BTN、CO、3bet、bb。
10. **不做 SPEC「不做」清單裡的東西**（賽事、升盲、統計、雲端、帳號…）。想加功能先提出來討論。

## 技術

Vite + React + TypeScript（strict）、Tailwind CSS v4、React Router、Dexie.js（`useLiveQuery`）、vite-plugin-pwa、Vitest、pnpm，部署到 Vercel（純靜態）。

## 指令

```bash
pnpm dev          # 開發（--host，可以用手機連區網測試）
pnpm build        # 型別檢查 + 打包
pnpm test         # Vitest
pnpm icons        # 由 public/icon.svg 重新產生 PNG icon
```

## 目錄

```
src/
  pages/        HandList（列表）、HandPage（一手牌）
  components/   CardPicker、NumPad、PositionPicker、PlayingCard、Sheet…
  db/           Dexie schema 與存取函式
  lib/          純函式：cards、format、shareText、id、clipboard
docs/SPEC.md    完整規格
```

## 開發習慣

- `src/lib/` 的純函式都要有 Vitest 測試。
- UI 改動要在 375×667（iPhone SE）和 390×844 看過。
- `crypto.randomUUID()`、Clipboard API 在非 HTTPS（手機連區網 IP）不能用，已有替代做法（`lib/id.ts`、`lib/clipboard.ts`），不要直接呼叫。
- 真機測試：iPhone Safari（加到主畫面後）+ Android Chrome。
