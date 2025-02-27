from flask import Flask, request, jsonify
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_mysqldb import MySQL
from flask_cors import CORS  # <-- 新增這行
from datetime import datetime

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

    if not user_id or not title or not start_date or not end_date or not area:
        return jsonify({'error': '缺少必要欄位'}), 400

    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            INSERT INTO trip (user_id, title, description, start_date, end_date, area, tags, budget)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (user_id, title, description, start_date, end_date, area, tags, budget))
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

    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            UPDATE trip SET title=%s, description=%s, start_date=%s, end_date=%s, area=%s, tags=%s, budget=%s, updated_at=%s
            WHERE trip_id=%s
        """, (title, description, start_date, end_date, area, tags, budget, datetime.now(), trip_id))
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
    
# -------------------------------
# 行程細節 (trip_detail) API
# -------------------------------

# 新增行程細節
@app.route('/trip_detail', methods=['POST'])
def add_trip_detail():
    data = request.get_json()
    trip_id = data.get('trip_id')
    location = data.get('location')
    start_time = data.get('start_time')
    end_time = data.get('end_time')

    if not trip_id or not location or not start_time or not end_time:
        return jsonify({'error': '缺少必要欄位'}), 400

    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            INSERT INTO trip_detail (trip_id, location, start_time, end_time)
            VALUES (%s, %s, %s, %s)
        """, (trip_id, location, start_time, end_time))
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
        cur.execute("SELECT * FROM trip_detail WHERE trip_id = %s", (trip_id,))
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
    start_time = data.get('start_time')
    end_time = data.get('end_time')

    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            UPDATE trip_detail SET location=%s, start_time=%s, end_time=%s
            WHERE detail_id=%s
        """, (location, start_time, end_time, detail_id))
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


if __name__ == '__main__':
    app.run(debug=True)
