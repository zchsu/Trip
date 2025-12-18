# ToubHub 管理應用程式

一個整合 LINE 的旅行管理應用程式，讓用戶能夠輕鬆管理旅行行程，並搜尋日本和台灣的儲物櫃。

## 功能

### 旅行管理 (Trip Management)
- **建立旅行**：用戶可以建立新的旅行行程，輸入旅行名稱、日期和描述。
- **編輯旅行**：修改現有旅行的詳細資訊。
- **刪除旅行**：移除不需要的旅行。
- **分享旅行**：透過 LINE Flex Message 分享旅行詳細資訊，優化文字格式以提升可讀性。

### 儲物櫃搜尋 (Locker Search)
- **地區選擇**：支援日本和台灣地區的儲物櫃搜尋。
- **日本儲物櫃**：連結到外部網站以查看日本儲物櫃資訊。
- **台灣儲物櫃**：整合 API 以獲取台灣儲物櫃詳細資訊，包括地圖、價格和付款方式。
- **地理定位**：使用用戶位置進行附近儲物櫃搜尋。
- **詳細資訊**：顯示儲物櫃的地址、地圖、價格和可用性。

## 安裝

1. 複製此倉庫：
- git clone https://github.com/zchsu/Trip.git
- cd Trip

2. 安裝前端依賴：
- npm install

3. 安裝後端依賴（如果適用）：
- 確保 Python 環境已設定。
- 安裝必要的 Python 套件。

4. 設定環境變數：
- 設定 LINE LIFF、Google Maps API 和資料庫連線。

5. 啟動應用程式：
- npm start

## 技術棧

- **前端**：React 18
- **後端**：Vercel Serverless Functions (Python)
- **資料庫**：MySQL
- **整合**：LINE LIFF, Google Maps API, OpenStreetMap Nominatim
- **樣式**：CSS

## 使用方法

1. **旅行管理**：
- 在應用程式中導航到旅行頁面。
- 建立、編輯或刪除旅行。
- 使用分享功能透過 LINE 發送旅行詳細資訊。

2. **儲物櫃搜尋**：
- 選擇地區（日本或台灣）。
- 允許地理定位以搜尋附近儲物櫃。
- 查看詳細資訊，包括地圖和價格。

## 貢獻

歡迎貢獻！請遵循以下步驟：
1. Fork 此倉庫。
2. 建立功能分支 (`git checkout -b feature/AmazingFeature`)。
3. 提交變更 (`git commit -m 'Add some AmazingFeature'`)。
4. 推送到分支 (`git push origin feature/AmazingFeature`)。
5. 開啟 Pull Request。

## 授權

此專案採用 MIT 授權。詳見 [LICENSE](LICENSE) 文件。

