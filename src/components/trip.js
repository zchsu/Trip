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

  const [tripDetails, setTripDetails] = useState([]);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [detailMode, setDetailMode] = useState("view"); // "view", "add", "edit"
  const [currentDetail, setCurrentDetail] = useState(null);
  const [detailData, setDetailData] = useState({
    location: "",
    date: "",
    start_time: "",
    end_time: "",
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
    const { name, value } = e.target;
    setTripData((prevData) => ({
      ...prevData,
      [name]: name === "start_date" || name === "end_date" ? new Date(value).toISOString().split("T")[0] : value,
    }));
  };

  // 新增處理行程細節表單變更的函數
  const handleDetailChange = (e) => {
    const { name, value } = e.target;
    setDetailData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 新增行程細節
  const handleAddDetail = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("http://localhost:5000/trip_detail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...detailData,
          trip_id: selectedTripId
        }),
      });

      if (response.ok) {
        alert("行程細節新增成功");
        fetchTripDetails(selectedTripId);
        setDetailMode("view");
      } else {
        const data = await response.json();
        alert("新增失敗：" + data.error);
      }
    } catch (error) {
      console.error("行程細節新增錯誤:", error);
    }
  };

  // 刪除行程細節
  const handleDeleteDetail = async (detailId) => {
    if (!window.confirm("確定要刪除這個行程細節嗎？")) return;
    try {
      const response = await fetch(`http://localhost:5000/trip_detail/${detailId}`, {
        method: "DELETE"
      });
      if (response.ok) {
        fetchTripDetails(selectedTripId);
      }
    } catch (error) {
      console.error("刪除行程細節失敗:", error);
    }
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

  const startEditTrip = (trip) => {
    setTripData({
      ...trip,
      start_date: new Date(trip.start_date).toISOString().split("T")[0],
      end_date: new Date(trip.end_date).toISOString().split("T")[0],
    });
    setCurrentTrip(trip.trip_id);
    setMode("edit");
  };

  const handleEditTrip = async (e) => {
    e.preventDefault();
    console.log("正在更新行程:", tripData); // Debug
  
    try {
      const response = await fetch(`http://localhost:5000/trip/${currentTrip}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tripData),
      });
  
      const data = await response.json();
      console.log("更新行程 API 回應:", data); // Debug
  
      if (response.ok) {
        alert("行程更新成功");
        setMode("list"); // 回到列表
        fetchTrips();    // 重新取得行程
      } else {
        alert("更新失敗：" + (data.error || "未知錯誤"));
      }
    } catch (error) {
      console.error("行程更新錯誤:", error);
    }
  };
  
  const formatTime = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    return `${hours}:${minutes}`;
  };

  const fetchTripDetails = async (tripId) => {
    try {
      const response = await fetch(`http://localhost:5000/trip_detail/${tripId}`);
      const data = await response.json();
      setTripDetails(data);
      setSelectedTripId(tripId);
      setShowDetails(true);
    } catch (error) {
      console.error("無法取得行程細節:", error);
      setTripDetails([]);
    }
  };

  // 開始編輯行程細節
  const startEditDetail = (detail) => {
    setDetailData({
      location: detail.location,
      date: new Date(detail.date).toISOString().split('T')[0],
      start_time: detail.start_time,
      end_time: detail.end_time
    });
    setCurrentDetail(detail.detail_id);
    setDetailMode("edit");
  };

  // 更新行程細節
  const handleEditDetail = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`http://localhost:5000/trip_detail/${currentDetail}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(detailData),
      });

      if (response.ok) {
        alert("行程細節更新成功");
        fetchTripDetails(selectedTripId);
        setDetailMode("view");
      } else {
        const data = await response.json();
        alert("更新失敗：" + data.error);
      }
    } catch (error) {
      console.error("行程細節更新錯誤:", error);
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
                    <p>📅 {trip.start_date.slice(0, 12)} - {trip.end_date.slice(0, 12)}</p>
                    <button onClick={() => startEditTrip(trip)}>編輯</button>
                    <button onClick={() => handleDelete(trip.trip_id)}>刪除</button>
                    <button onClick={() => fetchTripDetails(trip.trip_id)}>查看行程細節</button>
                    
                    {showDetails && selectedTripId === trip.trip_id && (
                      <div className="trip-details">
                        <h4>行程細節</h4>
                        <button onClick={() => setDetailMode("add")}>新增細節</button>
                        
                        {detailMode === "add" && (
                          <form onSubmit={handleAddDetail}>
                            <input
                              name="location"
                              placeholder="地點"
                              value={detailData.location}
                              onChange={handleDetailChange}
                              required
                            />
                            <input
                              type="date"
                              name="date"
                              value={detailData.date}
                              onChange={handleDetailChange}
                              required
                            />
                            <input
                              type="time"
                              name="start_time"
                              value={detailData.start_time}
                              onChange={handleDetailChange}
                              required
                            />
                            <input
                              type="time"
                              name="end_time"
                              value={detailData.end_time}
                              onChange={handleDetailChange}
                              required
                            />
                            <button type="submit">新增</button>
                            <button type="button" onClick={() => setDetailMode("view")}>取消</button>
                          </form>
                        )}

                        {detailMode === "edit" && (
                          <form onSubmit={handleEditDetail}>
                            <input
                              name="location"
                              value={detailData.location}
                              onChange={handleDetailChange}
                              required
                            />
                            <input
                              type="date"
                              name="date"
                              value={detailData.date}
                              onChange={handleDetailChange}
                              required
                            />
                            <input
                              type="time"
                              name="start_time"
                              value={detailData.start_time}
                              onChange={handleDetailChange}
                              required
                            />
                            <input
                              type="time"
                              name="end_time"
                              value={detailData.end_time}
                              onChange={handleDetailChange}
                              required
                            />
                            <button type="submit">更新</button>
                            <button type="button" onClick={() => setDetailMode("view")}>取消</button>
                          </form>
                        )}

                        {detailMode === "view" && (
                          <>
                            {tripDetails.length === 0 ? (
                              <p>尚無行程細節</p>
                            ) : (
                              <ul>
                                {tripDetails.map((detail) => (
                                  <li key={detail.detail_id}>
                                    <p>地點: {detail.location}</p>
                                    <p>日期: {new Date(detail.date).toLocaleDateString('zh-TW')}</p>
                                    <p>開始時間: {formatTime(detail.start_time)}</p>
                                    <p>結束時間: {formatTime(detail.end_time)}</p>
                                    <button onClick={() => startEditDetail(detail)}>編輯</button>
                                    <button onClick={() => handleDeleteDetail(detail.detail_id)}>刪除</button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </>
                        )}

                        <button onClick={() => {
                          setShowDetails(false);
                          setDetailMode("view");
                        }}>關閉細節</button>
                      </div>
                    )}
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
