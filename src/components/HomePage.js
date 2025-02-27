import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const HomePage = () => {
  const [username, setUsername] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // 檢查 localStorage 是否有儲存 username
    const storedUsername = localStorage.getItem("username");
    if (storedUsername) {
      setUsername(storedUsername);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    setUsername(null);
    navigate("/login");
  };

  return (
    <div>
      <h1>歡迎來到 TripMate</h1>
      <h2>這是一個讓旅伴配對的系統</h2>
      <p>{username ? `Hi 旅行者, ${username} !` : "請登入或註冊"}</p>

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
