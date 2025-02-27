from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup
from geopy.geocoders import Nominatim
import urllib.parse
import time

# 設定 Chrome Driver 路徑
CHROME_DRIVER_PATH = "C:/Users/ander/chromedriver/chromedriver-win64/chromedriver.exe"

# 設定 Chrome 選項
chrome_options = Options()
chrome_options.add_argument("--headless")  # 無頭模式
chrome_options.add_argument("--disable-gpu")
chrome_options.add_argument("--window-size=1920,1080")

# 啟動 WebDriver
service = Service(CHROME_DRIVER_PATH)
driver = webdriver.Chrome(service=service, options=chrome_options)

# 🔹 啟動 geopy 來解析地點名稱
geolocator = Nominatim(user_agent="my_geocoder")

# 🔹 讓使用者輸入查詢條件
name = input("請輸入地點名稱（例如：東京都新宿區）：")

# 解析經緯度
location = geolocator.geocode(name)

# 如果解析失敗
if not location:
    print("❌ 無法解析該地點名稱，請確認輸入是否正確")
    driver.quit()
    exit()

lat = location.latitude
lon = location.longitude

print(f"📍 {name} 的經緯度為：({lat}, {lon})")

startDate = input("請輸入開始日期（格式 YYYY-MM-DD):")
endDate = input("請輸入結束日期（格式 YYYY-MM-DD, 可留空）：")
startDateTimeHour = input("請輸入開始時間（小時, 24 小時制）：")
startDateTimeMin = input("請輸入開始時間（分鐘）：")
endDateTimeHour = input("請輸入結束時間（小時, 24 小時制）：")
endDateTimeMin = input("請輸入結束時間（分鐘）：")
bagSize = input("請輸入小行李數量(0 或 1):")
suitcaseSize = input("請輸入大行李數量(0 或 1):")

# 🔹 進行 URL 編碼
encoded_name = urllib.parse.quote(name)

# 🔹 組合 URL
base_url = "https://cloak.ecbo.io/zh-TW/locations"
query_params = f"?name={encoded_name}&startDate={startDate}&endDate={endDate}&startDateTimeHour={startDateTimeHour}&startDateTimeMin={startDateTimeMin}&endDateTimeHour={endDateTimeHour}&endDateTimeMin={endDateTimeMin}&bagSize={bagSize}&suitcaseSize={suitcaseSize}&lat={lat}&lon={lon}&isLocation=false"
full_url = base_url + query_params

print("\n🔗 生成的 URL：", full_url)

try:
    # 進行爬蟲
    driver.get(full_url)

    # 等待頁面加載完成
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.CLASS_NAME, "SpaceCard_space__YnURE"))
    )

    # 模擬滾動以確保動態內容加載
    driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
    time.sleep(2)  # 等待加載

    # 獲取頁面 HTML
    page_source = driver.page_source
    soup = BeautifulSoup(page_source, 'html.parser')

    # 提取店家資料
    data = []
    cards = soup.find_all('li', class_='SpaceCard_space__YnURE')
    for card in cards:
        try:
            # 提取名稱
            name = card.find('strong', class_='SpaceCard_nameText__308Dp').get_text(strip=True)
            # 提取類別
            category = card.find('div', class_='SpaceCard_category__2rx7q').get_text(strip=True)
            # 提取評分
            rating = card.find('span', class_='SpaceCard_ratingPoint__2CaOa').get_text(strip=True)
            # 提取行李價格
            suitcase_price = card.find('span', class_='SpaceCard_priceCarry__3Owgr').get_text(strip=True)
            bag_price = card.find('span', class_='SpaceCard_priceBag__Bv_Oz').get_text(strip=True)
            # 提取圖片
            image_url = card.find('img')['src']
            # 提取鏈接
            link = card.find('a', class_='SpaceCard_spaceLink__2MeRc')['href']

            # 儲存為字典
            data.append({
                'name': name,
                'category': category,
                'rating': rating,
                'suitcase_price': suitcase_price,
                'bag_price': bag_price,
                'image_url': image_url,
                'link': f"https://cloak.ecbo.io{link}",
            })
        except Exception as e:
            print("Error extracting card data:", e)

    # 輸出提取的資料
    print("\n📌 爬取結果：")
    for item in data:
        print(item)

except Exception as e:
    print("Error:", e)

finally:
    # 關閉瀏覽器
    driver.quit()
