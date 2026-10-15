# 撲克速記

在實體錦標賽現場快速記下一手牌，之後一鍵把文字傳到 LINE 給朋友討論。手機版為主，資料只存在手機裡。

- 位置、手牌、公牌點一點就好，每一格都可以跳過
- 籌碼、結果用 bb 記
- 每次輸入就自動存檔
- 「複製」或「傳到 LINE」產生這樣的文字：

```
Hero BTN A♠K♦(25bb)
公牌 K♣7♦2♠ 9♥ 2♦
結果 +27.5bb

CO 開 2.2bb,我直接推,CO 想很久跟了 QQ
```

> iPhone 請用 Safari 打開後「分享 → 加入主畫面」，之後都從主畫面打開，資料才不會被 Safari 清掉。

## 開發

```bash
pnpm install
pnpm dev      # http://localhost:5173，手機連同一個 Wi-Fi 用電腦的 IP 也能開
pnpm test
pnpm build
```

規格在 [`docs/SPEC.md`](docs/SPEC.md)，開發規則在 [`CLAUDE.md`](CLAUDE.md)。

## 部署（Vercel）

1. 到 [vercel.com/new](https://vercel.com/new) 匯入這個 GitHub repo
2. Framework 選 **Vite**（會自動偵測），其他都用預設
3. Deploy

之後每次 push 到 `main` 就會自動更新；其他 branch 會有自己的預覽網址。
