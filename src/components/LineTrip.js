import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import liff from '@line/liff';
import "../styles/trip.css";

const LineTrip = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [mode, setMode] = useState("list");
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
    preferred_gender: "any"
  });

  const [tripDetails, setTripDetails] = useState([]);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [detailMode, setDetailMode] = useState("view");
  const [currentDetail, setCurrentDetail] = useState(null);
  const [detailData, setDetailData] = useState({
    location: "",
    date: "",
    start_time: "",
    end_time: "",
  });

  useEffect(() => {
    console.log("Component mounted");
    initializeLiff();
  }, []);

  const initializeLiff = async () => {
    try {
      console.log("正在初始化 LIFF...");
      await liff.init({ 
        liffId: process.env.REACT_APP_LIFF_ID,
        withLoginOnExternalBrowser: true
      });
      console.log("LIFF 初始化成功");

      if (liff.isLoggedIn()) {
        console.log("用戶已登入");
        const profile = await liff.getProfile();
        console.log("用戶資料:", profile);
        setUserProfile(profile);
        await saveUserProfile(profile);
        await fetchTrips(profile.userId);
      } else {
        console.log("用戶未登入，開始登入流程");
        liff.login();
      }
    } catch (e) {
      console.error("LIFF 初始化失敗:", e);
      setError(`LIFF 初始化失敗: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const saveUserProfile = async (profile) => {
    try {
      console.log("儲存用戶資料...");
      const response = await fetch(`${process.env.REACT_APP_API_URL}/line/user`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profile)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log("用戶資料已儲存:", data);
    } catch (e) {
      console.error("儲存用戶資料失敗:", e);
      setError(`儲存資料失敗: ${e.message}`);
    }
  };

  const fetchTrips = async (userId) => {
    try {
      console.log("獲取行程資料...");
      const response = await fetch(`${process.env.REACT_APP_API_URL}/line/trip/${userId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log("行程資料:", data);
      setTrips(data);
    } catch (e) {
      console.error("獲取行程失敗:", e);
      setError(`獲取行程失敗: ${e.message}`);
    }
  };

  const handleAddTrip = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/line/trip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...tripData,
          line_user_id: userProfile.userId
        })
      });

      if (response.ok) {
        alert('行程新增成功');
        setMode('list');
        fetchTrips(userProfile.userId);
        setTripData({
          title: "",
          description: "",
          start_date: "",
          end_date: "",
          area: "",
          tags: "",
          budget: "",
          preferred_gender: "any"
        });
      }
    } catch (e) {
      console.error('新增行程失敗:', e);
      alert('新增行程失敗，請稍後再試');
    }
  };

  const handleDeleteTrip = async (tripId) => {
    if (window.confirm('確定要刪除此行程嗎？')) {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/line/trip/${tripId}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          alert('行程刪除成功');
          fetchTrips(userProfile.userId);
        }
      } catch (e) {
        console.error('刪除行程失敗:', e);
        alert('刪除行程失敗，請稍後再試');
      }
    }
  };

  const fetchTripDetails = async (tripId) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/line/trip_detail/${tripId}`);
      const data = await response.json();
      setTripDetails(data);
    } catch (e) {
      console.error('獲取行程細節失敗:', e);
      alert('獲取行程細節失敗，請稍後再試');
    }
  };

  const handleAddDetail = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/line/trip_detail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...detailData,
          trip_id: selectedTripId
        })
      });

      if (response.ok) {
        alert('行程細節新增成功');
        setDetailMode('view');
        fetchTripDetails(selectedTripId);
        setDetailData({
          location: "",
          date: "",
          start_time: "",
          end_time: "",
        });
      }
    } catch (e) {
      console.error('新增行程細節失敗:', e);
      alert('新增行程細節失敗，請稍後再試');
    }
  };

  // 渲染載入中狀態
  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>載入中...</p>
      </div>
    );
  }

  // 渲染錯誤狀態
  if (error) {
    return (
      <div className="error-container">
        <h3>發生錯誤</h3>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>重新整理</button>
      </div>
    );
  }

  // 渲染行程列表
  const renderTripList = () => (
    <div className="trips-list">
      <button onClick={() => setMode('add')} className="add-button">
        新增行程
      </button>
      {trips.map((trip) => (
        <div key={trip.trip_id} className="trip-card">
          <h3>{trip.title}</h3>
          <p>{trip.description}</p>
          <div className="trip-info">
            <span>{trip.start_date} - {trip.end_date}</span>
            <span>{trip.area}</span>
          </div>
          <div className="trip-actions">
            <button onClick={() => handleDeleteTrip(trip.trip_id)}>刪除</button>
            <button onClick={() => {
              setSelectedTripId(trip.trip_id);
              setShowDetails(true);
              fetchTripDetails(trip.trip_id);
            }}>查看細節</button>
          </div>
        </div>
      ))}
    </div>
  );

  // 渲染新增行程表單
  const renderTripForm = () => (
    <form onSubmit={handleAddTrip} className="trip-form">
      <h2>新增行程</h2>
      <div className="form-group">
        <label>標題</label>
        <input
          type="text"
          value={tripData.title}
          onChange={(e) => setTripData({...tripData, title: e.target.value})}
          required
        />
      </div>
      <div className="form-group">
        <label>描述</label>
        <textarea
          value={tripData.description}
          onChange={(e) => setTripData({...tripData, description: e.target.value})}
        />
      </div>
      <div className="form-group">
        <label>開始日期</label>
        <input
          type="date"
          value={tripData.start_date}
          onChange={(e) => setTripData({...tripData, start_date: e.target.value})}
          required
        />
      </div>
      <div className="form-group">
        <label>結束日期</label>
        <input
          type="date"
          value={tripData.end_date}
          onChange={(e) => setTripData({...tripData, end_date: e.target.value})}
          required
        />
      </div>
      <div className="form-group">
        <label>地區</label>
        <input
          type="text"
          value={tripData.area}
          onChange={(e) => setTripData({...tripData, area: e.target.value})}
          required
        />
      </div>
      <div className="button-group">
        <button type="submit">新增</button>
        <button type="button" onClick={() => setMode('list')}>取消</button>
      </div>
    </form>
  );

  // 主要渲染
  return (
    <div className="trip-container">
      {userProfile && (
        <div className="user-profile">
          <img 
            src={userProfile.pictureUrl} 
            alt={userProfile.displayName} 
            className="profile-image" 
          />
          <h2>歡迎, {userProfile.displayName}</h2>
        </div>
      )}

      {mode === 'list' && renderTripList()}
      {mode === 'add' && renderTripForm()}

      {showDetails && (
        <div className="trip-details overlay">
          <div className="detail-content">
            <h3>行程細節</h3>
            <button onClick={() => setDetailMode('add')} className="add-detail-button">
              新增細節
            </button>
            <button onClick={() => setShowDetails(false)} className="close-button">
              關閉
            </button>
            {detailMode === 'add' && (
              <form onSubmit={handleAddDetail} className="detail-form">
                <div className="form-group">
                  <label>地點</label>
                  <input
                    type="text"
                    value={detailData.location}
                    onChange={(e) => setDetailData({...detailData, location: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>日期</label>
                  <input
                    type="date"
                    value={detailData.date}
                    onChange={(e) => setDetailData({...detailData, date: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>開始時間</label>
                  <input
                    type="time"
                    value={detailData.start_time}
                    onChange={(e) => setDetailData({...detailData, start_time: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>結束時間</label>
                  <input
                    type="time"
                    value={detailData.end_time}
                    onChange={(e) => setDetailData({...detailData, end_time: e.target.value})}
                    required
                  />
                </div>
                <div className="button-group">
                  <button type="submit">新增細節</button>
                  <button type="button" onClick={() => setDetailMode('view')}>取消</button>
                </div>
              </form>
            )}
            <div className="details-list">
              {tripDetails.map((detail) => (
                <div key={detail.detail_id} className="detail-card">
                  <p>地點：{detail.location}</p>
                  <p>日期：{detail.date}</p>
                  <p>時間：{detail.start_time} - {detail.end_time}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LineTrip;