from flask import Flask, request, jsonify
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_mysqldb import MySQL
from flask_cors import CORS  # <-- 新增這行
import os  # Import os module for environment variables
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
import json
import threading
import time

# 載入 LINE Message API 相關函式庫
from linebot import LineBotApi, WebhookHandler
from linebot.exceptions import InvalidSignatureError
from linebot.models import MessageEvent, TextMessage, TextSendMessage

app = Flask(__name__)
# 修改 CORS 設定
CORS(app, resources={
    r"/*": {
        "origins": "*",
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": [
            "Content-Type", 
            "Authorization", 
            "Access-Control-Allow-Origin",
            "ngrok-skip-browser-warning"
        ],
        "expose_headers": ["Content-Range", "X-Content-Range"]
    }
})

# 添加全局回應標頭處理
@app.after_request
def after_request(response):
    # 確保安全標頭正確設定
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization,ngrok-skip-browser-warning'
    
    # 針對 JavaScript 文件的處理
    if '.js' in request.path:
        response.headers['Content-Type'] = 'application/javascript; charset=utf-8'
    
    # 移除可能導致問題的標頭
    response.headers.pop('X-Content-Type-Options', None)
    
    return response

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

@app.route("/", methods=['GET'])
def index():
    return "Line Bot Server is running!"

@app.route("/", methods=['POST'])
def linebot():
    body = request.get_data(as_text=True)                    # 取得收到的訊息內容
    try:
        json_data = json.loads(body)                         # json 格式化訊息內容
        access_token = os.getenv('LINE_BOT_ACCESS_TOKEN')
        secret = os.getenv('LINE_BOT_SECRET')
        line_bot_api = LineBotApi(access_token)              # 確認 token 是否正確
        handler = WebhookHandler(secret)                     # 確認 secret 是否正確
        signature = request.headers['X-Line-Signature']      # 加入回傳的 headers
        handler.handle(body, signature)                      # 綁定訊息回傳的相關資訊
        tk = json_data['events'][0]['replyToken']            # 取得回傳訊息的 Token
        type = json_data['events'][0]['message']['type']     # 取得 LINe 收到的訊息類型
        if type=='text':
            msg = json_data['events'][0]['message']['text']  # 取得 LINE 收到的文字訊息
            print(msg)                                       # 印出內容
            reply = msg
        else:
            reply = '你傳的不是文字呦～'
        print(reply)
        line_bot_api.reply_message(tk,TextSendMessage(reply))# 回傳訊息
    except:
        print(body)                                          # 如果發生錯誤，印出收到的內容
    return 'OK'                                              # 驗證 Webhook 使用，不能省略

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
    

# 緩存存儲
cache = {}
CACHE_EXPIRY = 3600  # 緩存過期時間（秒）
# 全局的 WebDriver 實例
driver_pool = []
driver_pool_lock = threading.Lock()
MAX_DRIVERS = 2  # 最大 WebDriver 池大小

def get_cache_key(search_params, page):
    """生成緩存鍵"""
    key_parts = [
        search_params['location'],
        search_params['startDate'],
        search_params.get('endDate', search_params['startDate']),
        f"{search_params['startTimeHour']}:{search_params['startTimeMin']}",
        f"{search_params['endTimeHour']}:{search_params['endTimeMin']}",
        search_params['bagSize'],
        search_params['suitcaseSize'],
        str(page)
    ]
    return "_".join(key_parts)

def init_driver_pool():
    """初始化 WebDriver 池"""
    global driver_pool
    
    print("初始化 WebDriver 池...")
    
    for _ in range(MAX_DRIVERS):
        try:
            # 設定 Chrome 選項 - 更激進的優化設置
            chrome_options = Options()
            chrome_options.add_argument("--headless")
            chrome_options.add_argument("--disable-gpu")
            chrome_options.add_argument("--no-sandbox")
            chrome_options.add_argument("--disable-dev-shm-usage")
            chrome_options.add_argument("--disable-extensions")
            chrome_options.add_argument("--disable-images")  # 禁用圖片載入
            chrome_options.add_argument("--blink-settings=imagesEnabled=false")  # 另一種禁用圖片方式
            chrome_options.add_argument("--window-size=1280,720")  # 較小的窗口大小
            
            # 禁用 JavaScript (可能會破壞某些頁面功能，視情況使用)
            # chrome_options.add_argument("--disable-javascript")
            
            # 使用 webdriver_manager 自動安裝和管理 ChromeDriver
            service = Service(ChromeDriverManager().install())
            driver = webdriver.Chrome(service=service, options=chrome_options)
            
            # 設定頁面載入超時時間
            driver.set_page_load_timeout(15)  # 減少超時時間
            
            # 預熱：訪問目標網站首頁
            driver.get("https://cloak.ecbo.io/zh-TW")
            
            with driver_pool_lock:
                driver_pool.append(driver)
                
            print(f"WebDriver #{len(driver_pool)} 已初始化")
            
        except Exception as e:
            print(f"初始化 WebDriver 失敗: {e}")

def get_driver():
    """從池中獲取 WebDriver，如果池空則等待"""
    max_wait = 30  # 最大等待時間（秒）
    start_time = time.time()
    
    while time.time() - start_time < max_wait:
        with driver_pool_lock:
            if driver_pool:
                return driver_pool.pop()
        
        # 如果沒有可用的 driver，等待一段時間再嘗試
        time.sleep(0.5)
    
    # 如果等待超時，創建一個新的 driver（應急措施）
    print("警告：WebDriver 池已空，創建新實例")
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-extensions")
    chrome_options.add_argument("--window-size=1280,720")
    
    service = Service(ChromeDriverManager().install())
    return webdriver.Chrome(service=service, options=chrome_options)

def return_driver(driver):
    """將 WebDriver 返回池中，並徹底清除狀態"""
    try:
        # 清除所有 cookie
        driver.delete_all_cookies()
        
        # 清除 localStorage 和 sessionStorage
        driver.execute_script("window.localStorage.clear();")
        driver.execute_script("window.sessionStorage.clear();")
        
        # 重置到空白頁面以終止所有進行中的請求和腳本
        driver.get("about:blank")
        
        with driver_pool_lock:
            driver_pool.append(driver)
            
    except Exception as e:
        print(f"返回 WebDriver 到池時出錯: {e}")
        try:
            driver.quit()
        except:
            pass

def scrape_lockers(search_params, page=1, per_page=5):
    """爬取寄物櫃資訊 - 優化版本"""
    driver = None
    
    try:
        # 從驅動池獲取 driver
        driver = get_driver()
        
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
            'lon': location_data.longitude,
            'page': page
        }
        
        query_string = urllib.parse.urlencode(params)
        url = f"{base_url}?{query_string}"
        print(f"訪問 URL: {url}")
        
        # 訪問網頁
        start_time = time.time()
        driver.get(url)
        
        # 等待特定元素載入，比等待整個頁面載入更高效
        try:
            # 首先嘗試快速找到結果
            # 使用 presence_of_element_located 而不是 visibility_of_element_located
            # presence 只檢查 DOM 中是否存在，不檢查可見性，更快
            element = WebDriverWait(driver, 5).until(
                EC.presence_of_element_located((By.CLASS_NAME, "SpaceCard_space__YnURE"))
            )
            print(f"找到結果，耗時: {time.time() - start_time:.2f}秒")
        except:
            # 如果沒有找到結果，可能是沒有結果或頁面結構不同
            print("沒有找到預期的結果元素，繼續解析...")
            # 給頁面多一些時間載入
            time.sleep(2)
        
        # 解析結果
        soup = BeautifulSoup(driver.page_source, 'html.parser')
        cards = soup.find_all('li', class_='SpaceCard_space__YnURE')
        
        # 如果沒找到卡片，可能是加載未完成或網頁結構變化
        if not cards:
            # 嘗試查找頁面上的其他提示
            no_results = soup.find('div', class_='NoResult_noResult__33c4l')
            if no_results:
                return {
                    'results': [],
                    'pagination': {
                        'current_page': page,
                        'total_pages': 0,
                        'total_items': 0,
                        'per_page': per_page
                    }
                }
        
        # 取得總項目數
        total_items = len(cards)
        total_pages = (total_items + per_page - 1) // per_page if total_items > 0 else 1
        
        # 只處理指定頁數的項目
        start_idx = (page - 1) * per_page
        end_idx = start_idx + per_page
        current_page_cards = cards[start_idx:min(end_idx, len(cards))]
        
        results = []
        for card in current_page_cards:
            try:
                name_element = card.find('strong', class_='SpaceCard_nameText__308Dp')
                category_element = card.find('div', class_='SpaceCard_category__2rx7q')
                rating_element = card.find('span', class_='SpaceCard_ratingPoint__2CaOa')
                suitcase_price_element = card.find('span', class_='SpaceCard_priceCarry__3Owgr')
                bag_price_element = card.find('span', class_='SpaceCard_priceBag__Bv_Oz')
                image_element = card.find('img')
                link_element = card.find('a', class_='SpaceCard_spaceLink__2MeRc')
                
                # 構建預約鏈接，確保用戶輸入參數正確傳遞
                link_element = card.find('a', class_='SpaceCard_spaceLink__2MeRc')
                base_link = f"https://cloak.ecbo.io{link_element['href']}" if link_element and 'href' in link_element.attrs else '#'
                
                # 檢查鏈接是否已包含參數
                if '?' in base_link:
                    link_url = f"{base_link}&startDate={search_params['startDate']}&endDate={search_params.get('endDate', search_params['startDate'])}"
                else:
                    link_url = f"{base_link}?startDate={search_params['startDate']}&endDate={search_params.get('endDate', search_params['startDate'])}"
                
                # 添加時間參數
                link_url += f"&startDateTimeHour={search_params['startTimeHour']}&startDateTimeMin={search_params['startTimeMin']}"
                link_url += f"&endDateTimeHour={search_params['endTimeHour']}&endDateTimeMin={search_params['endTimeMin']}"
                link_url += f"&bagSize={search_params['bagSize']}&suitcaseSize={search_params['suitcaseSize']}"
                
                result = {
                    'name': name_element.text.strip() if name_element else '未知名稱',
                    'category': category_element.text.strip() if category_element else '未分類',
                    'rating': rating_element.text.strip() if rating_element else 'N/A',
                    'suitcase_price': suitcase_price_element.text.strip() if suitcase_price_element else '價格未知',
                    'bag_price': bag_price_element.text.strip() if bag_price_element else '價格未知',
                    'image_url': image_element['src'] if image_element and 'src' in image_element.attrs else '',
                    'link': link_url
                }
                results.append(result)
            except Exception as parse_error:
                print(f"解析卡片資料時發生錯誤: {parse_error}")
                continue
        
        return {
            'results': results,
            'pagination': {
                'current_page': page,
                'total_pages': total_pages,
                'total_items': total_items,
                'per_page': per_page
            }
        }
            
    except Exception as e:
        print(f"爬蟲錯誤: {e}")
        return {'error': str(e)}
    finally:
        if driver:
            try:
                return_driver(driver)
            except:
                try:
                    driver.quit()
                except:
                    pass

@app.route('/search-lockers', methods=['POST'])
def search_lockers():
    try:
        data = request.get_json()
        page = int(data.get('page', 1))
        per_page = int(data.get('per_page', 5))
        
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
        
        # 檢查緩存
        cache_key = get_cache_key(data, page)
        current_time = datetime.now().timestamp()
        
        if cache_key in cache and (current_time - cache[cache_key]['timestamp']) < CACHE_EXPIRY:
            print(f"使用緩存結果: {cache_key}")
            return jsonify(cache[cache_key]['data']), 200
        
        # 從網站爬取數據
        results = scrape_lockers(data, page, per_page)
        
        if isinstance(results, dict) and 'error' in results:
            return jsonify(results), 400
        
        # 保存到緩存
        cache[cache_key] = {
            'data': results,
            'timestamp': current_time
        }
        
        # 緩存清理（簡單版本）
        if len(cache) > 100:  # 如果緩存條目過多
            # 刪除最舊的緩存
            oldest_key = min(cache.keys(), key=lambda k: cache[k]['timestamp'])
            del cache[oldest_key]
            
        return jsonify(results), 200
        
    except Exception as e:
        print(f"API error: {e}")
        return jsonify({'error': str(e)}), 500
    

# LINE 用戶相關路由
@app.route('/line/user', methods=['POST'])
def create_line_user():
    data = request.get_json()
    line_user_id = data.get('userId')
    display_name = data.get('displayName')
    picture_url = data.get('pictureUrl')
    email = data.get('email')

    try:
        cur = mysql.connection.cursor()
        # 檢查用戶是否已存在
        cur.execute("SELECT line_user_id FROM line_users WHERE line_user_id = %s", (line_user_id,))
        existing_user = cur.fetchone()
        
        if not existing_user:
            # 新增用戶
            cur.execute("""
                INSERT INTO line_users (line_user_id, display_name, picture_url, email)
                VALUES (%s, %s, %s, %s)
            """, (line_user_id, display_name, picture_url, email))
            
        mysql.connection.commit()
        cur.close()
        return jsonify({'message': 'User created/updated successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# LINE 行程相關路由
@app.route('/line/trip', methods=['POST'])
def add_line_trip():
    data = request.get_json()
    line_user_id = data.get('line_user_id')
    
    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            INSERT INTO line_trips 
            (line_user_id, title, description, start_date, end_date, area, tags, budget, preferred_gender)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            line_user_id,
            data.get('title'),
            data.get('description'),
            data.get('start_date'),
            data.get('end_date'),
            data.get('area'),
            data.get('tags'),
            data.get('budget'),
            data.get('preferred_gender', 'any')
        ))
        
        trip_id = cur.lastrowid
        mysql.connection.commit()
        cur.close()
        return jsonify({'message': '行程新增成功', 'trip_id': trip_id}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# 獲取 LINE 用戶的行程
@app.route('/line/trip/<line_user_id>', methods=['GET'])
def get_line_trips(line_user_id):
    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            SELECT * FROM line_trips 
            WHERE line_user_id = %s 
            ORDER BY start_date ASC
        """, (line_user_id,))
        
        trips = cur.fetchall()
        columns = [desc[0] for desc in cur.description]
        result = [dict(zip(columns, trip)) for trip in trips]
        
        cur.close()
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
    # LINE 行程細節相關路由
@app.route('/line/trip_detail', methods=['POST'])
def add_line_trip_detail():
    data = request.get_json()
    trip_id = data.get('trip_id')
    location = data.get('location')
    date = data.get('date')
    start_time = data.get('start_time')
    end_time = data.get('end_time')

    if not all([trip_id, location, date, start_time, end_time]):
        return jsonify({'error': '缺少必要欄位'}), 400

    try:
        cur = mysql.connection.cursor()
        
        # 檢查行程是否存在
        cur.execute("SELECT start_date, end_date FROM line_trips WHERE trip_id = %s", (trip_id,))
        trip = cur.fetchone()
        if not trip:
            return jsonify({'error': '找不到對應的行程'}), 404
            
        # 檢查日期是否在行程範圍內
        detail_date = datetime.strptime(date, '%Y-%m-%d').date()
        trip_start = trip[0]
        trip_end = trip[1]
        
        if detail_date < trip_start or detail_date > trip_end:
            return jsonify({
                'error': '行程細節的日期必須在行程的日期範圍內',
                'valid_range': {
                    'start_date': trip_start.strftime('%Y-%m-%d'),
                    'end_date': trip_end.strftime('%Y-%m-%d')
                }
            }), 400

        # 新增行程細節
        cur.execute("""
            INSERT INTO line_trip_details 
            (trip_id, location, date, start_time, end_time)
            VALUES (%s, %s, %s, %s, %s)
        """, (trip_id, location, date, start_time, end_time))
        
        detail_id = cur.lastrowid
        mysql.connection.commit()
        cur.close()
        
        return jsonify({
            'message': '行程細節新增成功',
            'detail_id': detail_id
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/line/trip_detail/<int:trip_id>', methods=['GET'])
def get_line_trip_details(trip_id):
    try:
        cur = mysql.connection.cursor()
        
        # 先檢查行程是否存在
        cur.execute("SELECT trip_id FROM line_trips WHERE trip_id = %s", (trip_id,))
        if not cur.fetchone():
            return jsonify({'error': '找不到該行程'}), 404
            
        # 獲取行程細節
        cur.execute("""
            SELECT detail_id, trip_id, location, 
                   DATE_FORMAT(date, '%%Y-%%m-%%d') as date,
                   TIME_FORMAT(start_time, '%%H:%%i') as start_time,
                   TIME_FORMAT(end_time, '%%H:%%i') as end_time
            FROM line_trip_details 
            WHERE trip_id = %s 
            ORDER BY date ASC, start_time ASC
        """, (trip_id,))
        
        details = cur.fetchall()
        
        if not details:
            return jsonify([]), 200  # 返回空陣列而不是 None
            
        columns = [desc[0] for desc in cur.description]
        result = [dict(zip(columns, detail)) for detail in details]
        
        cur.close()
        return jsonify(result), 200
        
    except Exception as e:
        print(f"獲取行程細節時發生錯誤: {str(e)}")  # 添加日誌
        return jsonify({'error': '獲取行程細節時發生錯誤'}), 500
    finally:
        try:
            if cur:
                cur.close()
        except:
            pass

@app.route('/line/trip_detail/<int:detail_id>', methods=['DELETE'])
def delete_line_trip_detail(detail_id):
    try:
        cur = mysql.connection.cursor()
        cur.execute("DELETE FROM line_trip_details WHERE detail_id = %s", (detail_id,))
        mysql.connection.commit()
        cur.close()
        return jsonify({'message': '行程細節刪除成功'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/<path:path>', methods=['GET'])
def catch_all(path):
    return app.send_static_file('index.html')

# 在更新版本的 Flask 中使用 with_app_context
if __name__ == "__main__":
    # 直接初始化 WebDriver 池
    init_driver_pool()
    app.run(debug=True, host='0.0.0.0', port=5000)
else:
    # 生產環境中（如 WSGI）初始化 WebDriver 池
    init_thread = threading.Thread(target=init_driver_pool)
    init_thread.daemon = True  # 設為守護線程，這樣主進程結束時它會自動終止
    init_thread.start()