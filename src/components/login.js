import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("http://localhost:5000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    <div>
      <h2>登入</h2>
      <form onSubmit={handleLogin}>
        <input
          type="text"
          placeholder="使用者名稱"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="密碼"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">登入</button>
      </form>
    </div>
  );
};

export default Login;
