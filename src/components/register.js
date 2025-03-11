import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import "../styles/register.css";

const Register = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("http://localhost:5000/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();

      if (response.ok) {
        toast.success("註冊成功！請登入");
        navigate("/login");
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      toast.error("註冊失敗，請稍後再試！");
    }
  };

  return (
    <div className="register-container">
      <div className="register-box">
        <h2 className="register-title">註冊帳號</h2>
        <form onSubmit={handleRegister} className="register-form">
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
          <button type="submit" className="register-button">
            註冊
          </button>
        </form>
        <div className="login-link">
          已經有帳號了？<Link to="/login">立即登入</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
