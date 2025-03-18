from flask import Flask, request, jsonify
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_mysqldb import MySQL
from flask_cors import CORS  # <-- 新增這行
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup
from geopy.geocoders import Nominatim
import urllib.parse
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

app = Flask(__name__)
CORS(app)  # <-- 允許前端請求後端

bcrypt = Bcrypt(app)

# 配置 MySQL
app.config['MYSQL_HOST'] = 'localhost'
app.config['MYSQL_USER'] = 'root'
app.config['MYSQL_PASSWORD'] = ''
app.config['MYSQL_DB'] = 'tripmate'
mysql = MySQL(app)

# 配置 JWT
app.config['JWT_SECRET_KEY'] = 'your_jwt_secret_key'
jwt = JWTManager(app)

# 註冊
@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'error': 'Username and password are required'}), 400

    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')

    try:
        cur = mysql.connection.cursor()
        cur.execute("INSERT INTO users (username, password) VALUES (%s, %s)", (username, hashed_password))
        mysql.connection.commit()
        cur.close()
        return jsonify({'message': 'User registered successfully'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

# 登入
@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'error': 'Username and password are required'}), 400

    cur = mysql.connection.cursor()
    cur.execute("SELECT user_id, username, password FROM users WHERE username = %s", (username,))
    user = cur.fetchone()
    cur.close()

    if not user or not bcrypt.check_password_hash(user[2], password):
        return jsonify({'error': 'Invalid username or password'}), 401

    token = create_access_token(identity=str(username))
    return jsonify({'message': 'Login successful', 'token': token, 'user_id': user[0]}), 200


# 測試保護 (返回使用者密碼)
@app.route('/protected', methods=['GET'])
@jwt_required()
def protected():
    current_user = get_jwt_identity()  # 從 token 獲取使用者身份
    try:
        cur = mysql.connection.cursor()
        cur.execute("SELECT password FROM users WHERE username = %s", (current_user,))
        user_password = cur.fetchone()
        cur.close()

        if user_password:
            return jsonify({'username': current_user, 'password': user_password[0]}), 200
        else:
            return jsonify({'error': 'User not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# 新增行程
@app.route('/trip', methods=['POST'])
def add_trip():
    data = request.get_json()
    user_id = data.get('user_id')
    title = data.get('title')
    description = data.get('description')
    start_date = data.get('start_date')
    end_date = data.get('end_date')
    area = data.get('area')
    tags = data.get('tags')
    budget = data.get('budget')
    preferred_gender = data.get('preferred_gender', 'any')  # 新增這行

    if not user_id or not title or not start_date or not end_date or not area:
        return jsonify({'error': '缺少必要欄位'}), 400

    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            INSERT INTO trip (user_id, title, description, start_date, end_date, 
                            area, tags, budget, preferred_gender)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (user_id, title, description, start_date, end_date, 
              area, tags, budget, preferred_gender))
        mysql.connection.commit()
        trip_id = cur.lastrowid
        cur.close()
        return jsonify({'message': '行程新增成功', 'trip_id': trip_id}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# 取得使用者的所有行程
@app.route('/trip/<int:user_id>', methods=['GET'])
def get_trips(user_id):
    cur = mysql.connection.cursor()
    cur.execute("SELECT trip_id, user_id, title, description, start_date, end_date, area, tags, budget FROM trip WHERE user_id = %s", (user_id,))
    trips = cur.fetchall()
    cur.close()

    # 轉換為 JSON 格式的物件
    trips_list = [
        {
            "trip_id": row[0],
            "user_id": row[1],
            "title": row[2],
            "description": row[3],
            "start_date": row[4],
            "end_date": row[5],
            "area": row[6],
            "tags": row[7],
            "budget": row[8]
        }
        for row in trips
    ]
    
    return jsonify(trips_list)

# 更新行程
@app.route('/trip/<int:trip_id>', methods=['PUT'])
def update_trip(trip_id):
    data = request.get_json()
    title = data.get('title')
    description = data.get('description')
    start_date = data.get('start_date')
    end_date = data.get('end_date')
    area = data.get('area')
    tags = data.get('tags')
    budget = data.get('budget')
    preferred_gender = data.get('preferred_gender', 'any')  # 新增這行

    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            UPDATE trip 
            SET title=%s, description=%s, start_date=%s, end_date=%s, 
                area=%s, tags=%s, budget=%s, preferred_gender=%s, updated_at=%s
            WHERE trip_id=%s
        """, (title, description, start_date, end_date, area, tags, 
              budget, preferred_gender, datetime.now(), trip_id))
        mysql.connection.commit()
        cur.close()
        return jsonify({'message': '行程更新成功'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# 刪除行程
@app.route('/trip/<int:trip_id>', methods=['DELETE'])
def delete_trip(trip_id):
    try:
        cur = mysql.connection.cursor()
        cur.execute("DELETE FROM trip WHERE trip_id = %s", (trip_id,))
        mysql.connection.commit()
        cur.close()
        return jsonify({'message': '行程刪除成功'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@app.route('/trip/accepted/<int:user_id>', methods=['GET'])
def get_accepted_trips(user_id):
    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            SELECT t.*, u.username as creator_name 
            FROM trip t
            JOIN trip_participants tp ON t.trip_id = tp.trip_id
            JOIN users u ON t.user_id = u.user_id
            WHERE tp.user_id = %s AND tp.status = 'accepted'
            AND t.user_id != %s
        """, (user_id, user_id))
        
        columns = [desc[0] for desc in cur.description]
        trips = cur.fetchall()
        
        result = []
        for trip in trips:
            trip_dict = dict(zip(columns, trip))
            # 修改日期格式化方式
            start_date = trip_dict['start_date']
            end_date = trip_dict['end_date']
            
            # 轉換為與原本行程列表相同的格式
            trip_dict['start_date'] = start_date.strftime('%a, %d %b')
            trip_dict['end_date'] = end_date.strftime('%a, %d %b')
            
            result.append(trip_dict)
            
        cur.close()
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
# -------------------------------
# 行程細節 (trip_detail) API
# -------------------------------

# 新增行程細節
@app.route('/trip_detail', methods=['POST'])
def add_trip_detail():
    data = request.get_json()
    trip_id = data.get('trip_id')
    location = data.get('location')
    date = data.get('date')
    start_time = data.get('start_time')
    end_time = data.get('end_time')

    if not trip_id or not location or not date or not start_time or not end_time:
        return jsonify({'error': '缺少必要欄位'}), 400

    try:
        cur = mysql.connection.cursor()
        
        # 先獲取行程的日期範圍
        cur.execute("""
            SELECT start_date, end_date 
            FROM trip 
            WHERE trip_id = %s
        """, (trip_id,))
        trip_dates = cur.fetchone()
        
        if not trip_dates:
            return jsonify({'error': '找不到對應的行程'}), 404
            
        trip_start_date = trip_dates[0]
        trip_end_date = trip_dates[1]
        detail_date = datetime.strptime(date, '%Y-%m-%d').date()
        
        # 檢查日期是否在範圍內
        if detail_date < trip_start_date or detail_date > trip_end_date:
            return jsonify({
                'error': '行程細節的日期必須在行程的日期範圍內',
                'valid_range': {
                    'start_date': trip_start_date.strftime('%Y-%m-%d'),
                    'end_date': trip_end_date.strftime('%Y-%m-%d')
                }
            }), 400

        # 如果日期檢查通過，執行插入操作
        cur.execute("""
            INSERT INTO trip_detail (trip_id, location, date, start_time, end_time)
            VALUES (%s, %s, %s, %s, %s)
        """, (trip_id, location, date, start_time, end_time))
        mysql.connection.commit()
        detail_id = cur.lastrowid
        cur.close()
        return jsonify({'message': '行程細節新增成功', 'detail_id': detail_id}), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# 取得某行程的所有細節
@app.route('/trip_detail/<int:trip_id>', methods=['GET'])
def get_trip_details(trip_id):
    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            SELECT * FROM trip_detail 
            WHERE trip_id = %s 
            ORDER BY date ASC, start_time ASC
        """, (trip_id,))
        details = cur.fetchall()

        # ✅ 檢查 details 是否為 None
        if details is None:
            return jsonify({'error': '無法取得行程細節或行程不存在'}), 404

        # ✅ 取得欄位名稱
        column_names = [desc[0] for desc in cur.description]

        # ✅ 轉換 tuple 為 dict
        result = []
        for row in details:
            row_dict = dict(zip(column_names, row))
            row_dict['start_time'] = str(row_dict['start_time'])  # 轉字串
            row_dict['end_time'] = str(row_dict['end_time'])
            result.append(row_dict)

        cur.close()
        return jsonify(result), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500



# 更新行程細節
@app.route('/trip_detail/<int:detail_id>', methods=['PUT'])
def update_trip_detail(detail_id):
    data = request.get_json()
    location = data.get('location')
    date = data.get('date')  # 新增日期欄位
    start_time = data.get('start_time')
    end_time = data.get('end_time')

    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            UPDATE trip_detail SET location=%s, date=%s, start_time=%s, end_time=%s
            WHERE detail_id=%s
        """, (location, date, start_time, end_time, detail_id))
        mysql.connection.commit()
        cur.close()
        return jsonify({'message': '行程細節更新成功'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# 刪除行程細節
@app.route('/trip_detail/<int:detail_id>', methods=['DELETE'])
def delete_trip_detail(detail_id):
    try:
        cur = mysql.connection.cursor()
        cur.execute("DELETE FROM trip_detail WHERE detail_id = %s", (detail_id,))
        mysql.connection.commit()
        cur.close()
        return jsonify({'message': '行程細節刪除成功'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# 新增好友請求
@app.route('/friendship', methods=['POST'])
def add_friend():
    data = request.get_json()
    user_id = data.get('user_id')
    friend_id = data.get('friend_id')

    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            INSERT INTO friendships (user_id, friend_id)
            VALUES (%s, %s)
        """, (user_id, friend_id))
        mysql.connection.commit()
        cur.close()
        return jsonify({'message': '好友請求已送出'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# 取得好友列表
@app.route('/friends/<int:user_id>', methods=['GET'])
def get_friends(user_id):
    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            SELECT u.user_id, u.username
            FROM users u
            INNER JOIN friendships f ON (u.user_id = f.friend_id OR u.user_id = f.user_id)
            WHERE (f.user_id = %s OR f.friend_id = %s)
            AND f.status = 'accepted'
            AND u.user_id != %s
        """, (user_id, user_id, user_id))
        friends = cur.fetchall()
        cur.close()

        friends_list = [{'user_id': f[0], 'username': f[1]} for f in friends]
        return jsonify(friends_list), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# 邀請好友參加行程
@app.route('/trip/invite', methods=['POST'])
def invite_to_trip():
    data = request.get_json()
    trip_id = data.get('trip_id')
    friend_id = data.get('friend_id')

    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            INSERT INTO trip_participants (trip_id, user_id)
            VALUES (%s, %s)
        """, (trip_id, friend_id))
        mysql.connection.commit()
        cur.close()
        return jsonify({'message': '已邀請好友參加行程'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
# 更新好友請求狀態
@app.route('/friendship/<int:friendship_id>', methods=['PUT'])
def update_friendship_status(friendship_id):
    data = request.get_json()
    status = data.get('status')  # 'accepted' 或 'rejected'

    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            UPDATE friendships SET status = %s
            WHERE friendship_id = %s
        """, (status, friendship_id))
        mysql.connection.commit()
        cur.close()
        return jsonify({'message': f'好友請求已{status}'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# 取得待處理的好友請求
@app.route('/friendship/pending/<int:user_id>', methods=['GET'])
def get_pending_friendships(user_id):
    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            SELECT f.friendship_id, u.user_id, u.username, f.status
            FROM friendships f
            JOIN users u ON f.user_id = u.user_id
            WHERE f.friend_id = %s AND f.status = 'pending'
        """, (user_id,))
        requests = cur.fetchall()
        cur.close()

        requests_list = [{
            'friendship_id': r[0],
            'user_id': r[1],
            'username': r[2],
            'status': r[3]
        } for r in requests]
        return jsonify(requests_list), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


    
# 搜尋用戶
@app.route('/users/search', methods=['GET'])
def search_users():
    username = request.args.get('username')
    if not username:
        return jsonify({'error': '請提供用戶名稱'}), 400

    try:
        cur = mysql.connection.cursor()
        # 使用 LIKE 進行模糊搜尋
        cur.execute("""
            SELECT user_id, username 
            FROM users 
            WHERE username LIKE %s
        """, (f'%{username}%',))
        users = cur.fetchall()
        cur.close()

        users_list = [{'user_id': user[0], 'username': user[1]} for user in users]
        return jsonify(users_list), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
# 取得行程的參與者列表
@app.route('/trip/participants/<int:trip_id>', methods=['GET'])
def get_trip_participants(trip_id):
    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            SELECT u.user_id, u.username, tp.status
            FROM trip_participants tp
            JOIN users u ON tp.user_id = u.user_id
            WHERE tp.trip_id = %s
        """, (trip_id,))
        participants = cur.fetchall()
        cur.close()

        participants_list = [{
            'user_id': p[0],
            'username': p[1],
            'status': p[2]
        } for p in participants]
        return jsonify(participants_list), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# 更新行程參與者
@app.route('/trip/participants/<int:trip_id>', methods=['PUT'])
def update_trip_participants(trip_id):
    data = request.get_json()
    participant_ids = data.get('participant_ids', [])

    try:
        cur = mysql.connection.cursor()
        
        # 獲取現有參與者的狀態
        cur.execute("""
            SELECT user_id, status
            FROM trip_participants
            WHERE trip_id = %s
        """, (trip_id,))
        existing_participants = {row[0]: row[1] for row in cur.fetchall()}
        
        # 刪除原有的參與者
        cur.execute("DELETE FROM trip_participants WHERE trip_id = %s", (trip_id,))
        
        # 新增參與者，保留原有狀態
        for participant_id in participant_ids:
            status = existing_participants.get(participant_id, 'invited')
            cur.execute("""
                INSERT INTO trip_participants (trip_id, user_id, status)
                VALUES (%s, %s, %s)
            """, (trip_id, participant_id, status))
            
        mysql.connection.commit()
        cur.close()
        return jsonify({'message': '參與者更新成功'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
# 取得使用者待處理的行程邀請
@app.route('/trip/invitations/<int:user_id>', methods=['GET'])
def get_pending_invitations(user_id):
    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            SELECT tp.trip_id, t.title, t.area, t.start_date, t.end_date, 
                   u.username as inviter_name, tp.status
            FROM trip_participants tp
            JOIN trip t ON tp.trip_id = t.trip_id
            JOIN users u ON t.user_id = u.user_id
            WHERE tp.user_id = %s AND tp.status = 'invited'
        """, (user_id,))
        invitations = cur.fetchall()
        cur.close()

        invitations_list = [{
            'trip_id': inv[0],
            'title': inv[1],
            'area': inv[2],
            'start_date': inv[3].strftime('%Y-%m-%d'),
            'end_date': inv[4].strftime('%Y-%m-%d'),
            'inviter_name': inv[5],
            'status': inv[6]
        } for inv in invitations]
        return jsonify(invitations_list), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# 處理行程邀請
@app.route('/trip/invitation/<int:trip_id>/<int:user_id>', methods=['PUT'])
def handle_invitation(trip_id, user_id):
    data = request.get_json()
    status = data.get('status')  # 'accepted' 或 'rejected'

    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            UPDATE trip_participants 
            SET status = %s
            WHERE trip_id = %s AND user_id = %s
        """, (status, trip_id, user_id))
        mysql.connection.commit()
        cur.close()
        return jsonify({'message': f'行程邀請已{status}'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@app.route('/trip/match/<int:trip_id>', methods=['GET'])
def match_trips(trip_id):
    try:
        cur = mysql.connection.cursor()
        
        # 先獲取選擇的行程資訊
        cur.execute("""
            SELECT t.*, u.username as creator_name
            FROM trip t
            JOIN users u ON t.user_id = u.user_id
            WHERE t.trip_id != %s
            AND t.area = (SELECT area FROM trip WHERE trip_id = %s)
        """, (trip_id, trip_id))
        
        columns = [desc[0] for desc in cur.description]
        trips = cur.fetchall()
        
        result = []
        for trip in trips:
            trip_dict = dict(zip(columns, trip))
            # 確保預算是數字類型
            trip_dict['budget'] = float(trip_dict['budget']) if trip_dict['budget'] is not None else None
            trip_dict['start_date'] = trip_dict['start_date'].strftime('%Y-%m-%d')
            trip_dict['end_date'] = trip_dict['end_date'].strftime('%Y-%m-%d')
            result.append(trip_dict)
            
        cur.close()
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@app.route('/trip/all', methods=['GET'])
def get_all_trips():
    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            SELECT t.*, u.username as creator_name
            FROM trip t
            JOIN users u ON t.user_id = u.user_id
            ORDER BY t.start_date ASC
        """)
        
        columns = [desc[0] for desc in cur.description]
        trips = cur.fetchall()
        
        result = []
        for trip in trips:
            trip_dict = dict(zip(columns, trip))
            trip_dict['budget'] = float(trip_dict['budget']) if trip_dict['budget'] is not None else 0
            trip_dict['start_date'] = trip_dict['start_date'].strftime('%Y-%m-%d')
            trip_dict['end_date'] = trip_dict['end_date'].strftime('%Y-%m-%d')
            result.append(trip_dict)
            
        cur.close()
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
# 寄物櫃搜尋函數
def scrape_lockers(search_params):
    # 使用 webdriver_manager 自動管理 ChromeDriver
    from webdriver_manager.chrome import ChromeDriverManager
    from selenium.webdriver.chrome.service import Service
    
    # 設定 Chrome 選項
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--no-sandbox")  # 新增
    chrome_options.add_argument("--disable-dev-shm-usage")  # 新增
    chrome_options.add_argument("--remote-debugging-port=9222")  # 新增
    chrome_options.add_argument("--window-size=1920,1080")
    
    try:
        # 使用 webdriver_manager 自動安裝和管理 ChromeDriver
        service = Service(ChromeDriverManager().install())
        driver = None
        
        try:
            driver = webdriver.Chrome(service=service, options=chrome_options)
            
            # 設定頁面載入超時時間
            driver.set_page_load_timeout(30)
            
            # 使用 geopy 解析地址
            geolocator = Nominatim(user_agent="my_geocoder")
            location_data = geolocator.geocode(search_params['location'])
            
            if not location_data:
                return {'error': '無法找到該地點'}
            
            # 構建搜尋 URL
            base_url = "https://cloak.ecbo.io/zh-TW/locations"
            params = {
                'name': search_params['location'],
                'startDate': search_params['startDate'],
                'endDate': search_params.get('endDate', search_params['startDate']),
                'startDateTimeHour': search_params['startTimeHour'],
                'startDateTimeMin': search_params['startTimeMin'],
                'endDateTimeHour': search_params['endTimeHour'],
                'endDateTimeMin': search_params['endTimeMin'],
                'bagSize': search_params['bagSize'],
                'suitcaseSize': search_params['suitcaseSize'],
                'lat': location_data.latitude,
                'lon': location_data.longitude
            }
            
            query_string = urllib.parse.urlencode(params)
            url = f"{base_url}?{query_string}"
            print("DEBUG - 完整搜尋 URL:", url)
            print("DEBUG - 搜尋參數:", params)
            
            # 訪問網頁
            driver.get(url)
            
            # 等待頁面載入
            try:
                WebDriverWait(driver, 20).until(
                    EC.presence_of_element_located((By.CLASS_NAME, "SpaceCard_space__YnURE"))
                )
            except Exception as wait_error:
                return {'error': '頁面載入超時'}
            
            # 解析結果
            soup = BeautifulSoup(driver.page_source, 'html.parser')
            cards = soup.find_all('li', class_='SpaceCard_space__YnURE')
            
            results = []
            for card in cards:
                try:
                    result = {
                        'name': card.find('strong', class_='SpaceCard_nameText__308Dp').text.strip(),
                        'category': card.find('div', class_='SpaceCard_category__2rx7q').text.strip(),
                        'rating': card.find('span', class_='SpaceCard_ratingPoint__2CaOa').text.strip(),
                        'suitcase_price': card.find('span', class_='SpaceCard_priceCarry__3Owgr').text.strip(),
                        'bag_price': card.find('span', class_='SpaceCard_priceBag__Bv_Oz').text.strip(),
                        'image_url': card.find('img')['src'],
                        'link': f"https://cloak.ecbo.io{card.find('a', class_='SpaceCard_spaceLink__2MeRc')['href']}"
                    }
                    results.append(result)
                except Exception as parse_error:
                    print(f"解析卡片資料時發生錯誤: {parse_error}")
                    continue
            
            return results
            
        finally:
            if driver:
                driver.quit()
                
    except Exception as e:
        print(f"爬蟲錯誤: {e}")
        return {'error': str(e)}

# 寄物櫃搜尋 API 端點
@app.route('/search-lockers', methods=['POST'])
def search_lockers():
    try:
        data = request.get_json()
        print("Received data:", data)  # 偵錯用
        
        # 驗證必要欄位
        required_fields = ['location', 'startDate', 'startTimeHour', 
                         'startTimeMin', 'endTimeHour', 'endTimeMin']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'error': f'缺少必要欄位: {field}',
                    'received_data': data
                }), 400
        
        # 設置默認值
        data.setdefault('bagSize', '0')
        data.setdefault('suitcaseSize', '0')
        data.setdefault('endDate', data['startDate'])
            
        results = scrape_lockers(data)
        
        if isinstance(results, dict) and 'error' in results:
            return jsonify(results), 400
            
        return jsonify(results), 200
        
    except Exception as e:
        print(f"API error: {e}")  # 偵錯用
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
