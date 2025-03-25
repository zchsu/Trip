import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/homepage.css";

const HomePage = () => {
  const [username, setUsername] = useState(null);
  const [searchUsername, setSearchUsername] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [userId, setUserId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // 檢查 localStorage 是否有儲存 username
    const storedUsername = localStorage.getItem("username");
    const storedUserId = localStorage.getItem("user_id");
    if (storedUsername) {
      setUsername(storedUsername);
      setUserId(parseInt(storedUserId, 10));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    setUsername(null);
    navigate("/login");
  };

  // 新增搜尋用戶的函數
  const searchUsers = async () => {
    if (!searchUsername.trim()) return;
    
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/users/search?username=${searchUsername}`);
      const data = await response.json();
      setSearchResults(data.filter(user => user.user_id !== userId));
    } catch (error) {
      console.error("搜尋用戶失敗:", error);
    }
  };

  // 新增發送好友請求的函數
  const sendFriendRequest = async (friendId) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/friendship`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          friend_id: friendId
        })
      });

      const data = await response.json();
      if (response.ok) {
        alert("好友請求已送出");
        setSearchResults([]); // 清空搜尋結果
        setSearchUsername(""); // 清空搜尋輸入
      } else {
        alert(data.error || "發送請求失敗");
      }
    } catch (error) {
      console.error("發送好友請求失敗:", error);
    }
  };

  return (
    <>
    <header className="header">
      <div className="header-content">
        <a href="/" className="logo">TripMate</a>
        <div className="header-right">
          {username ? (
            <>
              <span className="welcome-text">Hi 旅行者, {username} !</span>
              <button onClick={handleLogout} className="logout-button">登出</button>
            </>
          ) : (
            <div className="auth-buttons">
              <button onClick={() => navigate("/login")}>登入</button>
              <button onClick={() => navigate("/register")}>註冊</button>
            </div>
          )}
        </div>
      </div>
    </header>

    <div className="home-container">
      <div className="welcome-section">
        <h1>歡迎來到 TripMate</h1>
        <h2>這是一個讓旅伴配對的系統</h2>
      </div>

      {username && (
        <div className="search-section">
          <h3>搜尋旅伴</h3>
          <div className="search-box">
            <input
              type="text"
              value={searchUsername}
              onChange={(e) => setSearchUsername(e.target.value)}
              placeholder="輸入用戶名稱"
            />
            <button onClick={searchUsers}>搜尋</button>
          </div>

          {searchResults.length > 0 && (
            <div className="search-results">
              <h4>搜尋結果</h4>
              <ul>
                {searchResults.map(user => (
                  <li key={user.user_id}>
                    {user.username}
                    <button onClick={() => sendFriendRequest(user.user_id)}>
                      發送好友請求
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

    <div className="action-buttons">
        {username && (
          <>
            <button onClick={() => navigate("/trip")}>管理行程</button>
            <button onClick={() => navigate("/match")} className="match-button">尋找旅伴</button>
          </>
        )}
      </div>
    </div>

    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <h3>關於我們</h3>
          <ul className="footer-links">
            <li><a href="#">關於 TripMate</a></li>
            <li><a href="#">使用條款</a></li>
            <li><a href="#">隱私政策</a></li>
          </ul>
        </div>
        <div className="footer-section">
          <h3>聯絡資訊</h3>
          <ul className="footer-links">
            <li><a href="#">客服中心</a></li>
            <li><a href="#">意見回饋</a></li>
            <li><a href="#">合作提案</a></li>
          </ul>
        </div>
      </div>
    </footer>
  </>
  );
};

export default HomePage;
