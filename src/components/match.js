import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/match.css";

const Match = () => {
    const [userTrips, setUserTrips] = useState([]);
    const [selectedTrip, setSelectedTrip] = useState(null);
    const [matchedTrips, setMatchedTrips] = useState([]);
    const navigate = useNavigate();
    const userId = localStorage.getItem("user_id");
  
    useEffect(() => {
      if (!userId) {
        navigate("/login");
        return;
      }
      fetchUserTrips();
    }, []);
  
    // 獲取用戶的所有行程
    const fetchUserTrips = async () => {
        try {
          const response = await fetch(`http://localhost:5000/trip/${userId}`);
          const data = await response.json();
          // 按照開始日期排序
          const sortedTrips = data.sort((a, b) => 
            new Date(a.start_date) - new Date(b.start_date)
          );
          setUserTrips(sortedTrips);
        } catch (error) {
          console.error("獲取行程失敗:", error);
        }
      };
  
    // 根據選擇的行程搜尋匹配的行程
    const findMatches = async (tripId) => {
        if (!tripId) {
          setSelectedTrip(null);
          setMatchedTrips([]);
          return;
        }
        
        try {
          const response = await fetch(`http://localhost:5000/trip/match/${tripId}`);
          const data = await response.json();
          setMatchedTrips(data);
          // 將字串 ID 轉換為數字，以確保比較正確
          const numericTripId = parseInt(tripId, 10);
          setSelectedTrip(userTrips.find(trip => trip.trip_id === numericTripId));
        } catch (error) {
          console.error("搜尋匹配行程失敗:", error);
        }
      };

  const handleJoinRequest = async (tripId) => {
    try {
      const response = await fetch(`http://localhost:5000/trip/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trip_id: tripId,
          user_id: userId
        })
      });

      if (response.ok) {
        alert("已發送加入請求！");
        findMatches();
      } else {
        const data = await response.json();
        alert(data.error);
      }
    } catch (error) {
      console.error("發送加入請求失敗:", error);
    }
  };

  return (
    <div className="match-container">
    <h1>尋找旅伴</h1>

    <div className="user-trips-section">
      <h2>選擇您要匹配的行程</h2>
      {userTrips.length === 0 ? (
        <div className="no-trips">
          <p>您還沒有建立任何行程</p>
          <button onClick={() => navigate("/trip")}>建立新行程</button>
        </div>
      ) : (
        <div className="trip-selection">
          <select 
            onChange={(e) => findMatches(e.target.value)}
            value={selectedTrip?.trip_id || ""}
            className="trip-select"
            >
            <option value="">請選擇行程</option>
            {userTrips.map(trip => (
                <option key={trip.trip_id} value={trip.trip_id}>
                {trip.title} ({new Date(trip.start_date).toLocaleDateString()} - {new Date(trip.end_date).toLocaleDateString()})
                </option>
            ))}
            </select>
        </div>
      )}
    </div>

      {selectedTrip && (
        <div className="matched-trips">
          <h2>匹配結果</h2>
          {matchedTrips.length === 0 ? (
            <p>沒有找到符合的行程</p>
          ) : (
            <ul className="matches-list">
              {matchedTrips.map(trip => (
                <li key={trip.trip_id} className="match-card">
                  <h3>{trip.title}</h3>
                  <p className="trip-description">{trip.description}</p>
                  <p>📍 {trip.area}</p>
                  <p>📅 {new Date(trip.start_date).toLocaleDateString()} - {new Date(trip.end_date).toLocaleDateString()}</p>
                  <p>🏷️ {trip.tags}</p>
                  <p>👤 創建者: {trip.creator_name}</p>
                  <div className="overlapping-dates">
                    <p>重疊日期：{trip.overlapping_days} 天</p>
                  </div>
                  <button 
                    onClick={() => handleJoinRequest(trip.trip_id)}
                    className="join-button"
                  >
                    申請加入
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default Match;