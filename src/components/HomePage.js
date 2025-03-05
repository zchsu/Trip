import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

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
      setUserId(storedUserId);
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
      const response = await fetch(`http://localhost:5000/users/search?username=${searchUsername}`);
      const data = await response.json();
      setSearchResults(data.filter(user => user.user_id !== userId));
    } catch (error) {
      console.error("搜尋用戶失敗:", error);
    }
  };

  // 新增發送好友請求的函數
  const sendFriendRequest = async (friendId) => {
    try {
      const response = await fetch("http://localhost:5000/friendship", {
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
    <div>
      <h1>歡迎來到 TripMate</h1>
      <h2>這是一個讓旅伴配對的系統</h2>
      <p>{username ? `Hi 旅行者, ${username} !` : "請登入或註冊"}</p>

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

      {username ? (
        <>
          <button onClick={handleLogout}>登出</button>
          <button onClick={() => navigate("/trip")}>管理行程</button>
        </>
      ) : (
        <div>
          <button onClick={() => navigate("/login")}>登入</button>
          <button onClick={() => navigate("/register")}>註冊</button>
        </div>
      )}
    </div>
  );
};

export default HomePage;
