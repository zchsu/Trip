import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

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
    <div>
      <h2>註冊</h2>
      <form onSubmit={handleRegister}>
        <input type="text" placeholder="使用者名稱" value={username} onChange={(e) => setUsername(e.target.value)} required />
        <input type="password" placeholder="密碼" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button type="submit">註冊</button>
      </form>
    </div>
  );
};

export default Register;
