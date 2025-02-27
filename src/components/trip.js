import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const Trip = () => {
  const navigate = useNavigate();
  const userId = localStorage.getItem("user_id");
  console.log("userId:", userId);
  const [mode, setMode] = useState("list"); // "list", "add", "edit"
  const [trips, setTrips] = useState([]);
  const [currentTrip, setCurrentTrip] = useState(null);
  const [tripData, setTripData] = useState({
    title: "",
    description: "",
    start_date: "",
    end_date: "",
    area: "",
    tags: "",
    budget: "",
  });

  useEffect(() => {
    if (!userId) {
      navigate("/login");
      return;
    }
    fetchTrips();
  }, []);
  
  

  const fetchTrips = async () => {
    try {
      const response = await fetch(`http://localhost:5000/trip/${userId}`);
      let data = await response.json();
      
      console.log("取得行程:", data);
  
      if (Array.isArray(data) && Array.isArray(data[0])) {
        data = data[0]; // 解包內層陣列
      }
  
      setTrips(data);
      console.log("trips:", data);
    } catch (error) {
      console.error("無法取得行程:", error);
      setTrips([]);
    }
  };
  
  
  

  const handleDelete = async (tripId) => {
    if (!window.confirm("確定要刪除這個行程嗎？")) return;
    try {
      await fetch(`http://localhost:5000/trip/${tripId}`, { method: "DELETE" });
      fetchTrips();
    } catch (error) {
      console.error("刪除行程失敗:", error);
    }
  };

  const handleChange = (e) => {
    setTripData({ ...tripData, [e.target.name]: e.target.value });
  };

  const handleAddTrip = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("http://localhost:5000/trip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...tripData, user_id: userId }),
      });

      const data = await response.json();
      if (response.ok) {
        alert("行程新增成功");
        setMode("list");
        fetchTrips();
      } else {
        alert("新增失敗：" + data.error);
      }
    } catch (error) {
      console.error("行程新增錯誤:", error);
    }
  };

  const handleEditTrip = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`http://localhost:5000/trip/${currentTrip}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tripData),
      });

      if (response.ok) {
        alert("行程更新成功");
        setMode("list");
        fetchTrips();
      } else {
        alert("更新失敗");
      }
    } catch (error) {
      console.error("行程更新錯誤:", error);
    }
  };

  const loadTripDetails = async (tripId) => {
    try {
      const response = await fetch(`http://localhost:5000/trip_detail/${tripId}`);
      const data = await response.json();
      if (data.length > 0) {
        setTripData(data[0]);
        setCurrentTrip(tripId);
        setMode("edit");
      }
    } catch (error) {
      console.error("取得行程詳情失敗:", error);
    }
  };
  
  return (
    <div>
      {mode === "list" && (
        <>
          <h1>行程管理</h1>
          <button onClick={() => setMode("add")}>新增行程</button>
          <button onClick={() => navigate("/")}>返回首頁</button>
          {trips.length === 0 ? (
            <p>目前沒有行程</p>
          ) : (
            <ul>
              {trips.map((trip) => (
                <li key={trip.trip_id}>
                  <h3>{trip.title}</h3>
                  <p>{trip.description}</p>
                  <p>📍 {trip.area}</p>
                  <p>📅 {trip.start_date} - {trip.end_date}</p>
                  <button onClick={() => loadTripDetails(trip.trip_id)}>編輯</button>
                  <button onClick={() => handleDelete(trip.trip_id)}>刪除</button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {mode === "add" && (
        <>
          <h1>新增行程</h1>
          <form onSubmit={handleAddTrip}>
            <input name="title" placeholder="行程標題" onChange={handleChange} required />
            <textarea name="description" placeholder="行程描述" onChange={handleChange} />
            <input type="date" name="start_date" onChange={handleChange} required />
            <input type="date" name="end_date" onChange={handleChange} required />
            <input name="area" placeholder="地點" onChange={handleChange} required />
            <input name="tags" placeholder="標籤 (逗號分隔)" onChange={handleChange} />
            <input name="budget" placeholder="預算" type="number" onChange={handleChange} />
            <button type="submit">提交</button>
          </form>
          <button onClick={() => setMode("list")}>返回</button>
        </>
      )}

      {mode === "edit" && (
        <>
          <h1>編輯行程</h1>
          <form onSubmit={handleEditTrip}>
            <input name="title" value={tripData.title} onChange={handleChange} required />
            <textarea name="description" value={tripData.description} onChange={handleChange} />
            <input type="date" name="start_date" value={tripData.start_date} onChange={handleChange} required />
            <input type="date" name="end_date" value={tripData.end_date} onChange={handleChange} required />
            <input name="area" value={tripData.area} onChange={handleChange} required />
            <input name="tags" value={tripData.tags} onChange={handleChange} />
            <input name="budget" value={tripData.budget} type="number" onChange={handleChange} />
            <button type="submit">更新</button>
          </form>
          <button onClick={() => setMode("list")}>返回</button>
        </>
      )}
    </div>
  );
};

export default Trip;
