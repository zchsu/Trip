import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import "../styles/login.css";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/login`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      console.log("登入回傳:", data);

      if (response.ok) {
        // 儲存 JWT Token 和使用者名稱
        localStorage.setItem("token", data.token);
        localStorage.setItem("username", username);
        localStorage.setItem("user_id", data.user_id);

        toast.success("登入成功！");
        navigate("/");
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      toast.error("登入失敗，請稍後再試！");
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2 className="login-title">登入</h2>
        <form onSubmit={handleLogin} className="login-form">
          <div className="input-group">
            <label htmlFor="username">使用者名稱</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label htmlFor="password">密碼</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="login-button">
            登入
          </button>
        </form>
        <div className="register-link">
          還沒有帳號？<Link to="/register">立即註冊</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
