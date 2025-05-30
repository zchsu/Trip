import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import liff from '@line/liff';
import "../styles/LineTripDetail.css";

const TripDetail = () => {
  const { tripId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [tripDetails, setTripDetails] = useState([]);
  const [selectedDay, setSelectedDay] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingDetail, setEditingDetail] = useState(null);
  const [detailData, setDetailData] = useState({
    location: "",
    date: "",
    start_time: "",
    end_time: ""
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [slideStates, setSlideStates] = useState(new Map());
  const [hasEditPermission, setHasEditPermission] = useState(false);
  const swipeThreshold = 50;

  const { tripTitle, startDate, endDate } = location.state || {};
  // 計算總天數
  const totalDays = Math.floor((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1;

  // 獲取指定日期的行程細節
  const getDayDetails = (day) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + day - 1);
    const targetDate = date.toISOString().split('T')[0];
    return tripDetails.filter(detail => detail.date === targetDate);
  };

  useEffect(() => {
    const initializeLiff = async () => {
      try {
        await liff.init({
          liffId: process.env.REACT_APP_LIFF_ID
        });
        if (!liff.isLoggedIn()) {
          liff.login();
        }
      } catch (error) {
        console.error('LIFF 初始化失敗:', error);
        setError('LIFF 初始化失敗');
      }
    };
  
    const fetchTripDetails = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/line/trip_detail/${tripId}`);
        if (!response.ok) throw new Error('獲取行程細節失敗');
        const data = await response.json();
        setTripDetails(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
  
    initializeLiff();
    fetchTripDetails();
  }, [tripId]);

  if (isLoading) return <div className="loading">載入中...</div>;
  if (error) return <div className="error">{error}</div>;

  // 修改滑動相關處理函數
  const handleTouchStart = (e, detailId) => {
    e.stopPropagation();
    const touchX = e.touches[0].clientX;
    setSlideStates(prev => new Map(prev).set(detailId, {
      isDragging: true,
      startX: touchX,
      currentX: prev.get(detailId)?.currentX || 0,
      touchStartX: touchX
    }));
  };

  const handleTouchMove = (e, detailId) => {
    e.stopPropagation();
    const state = slideStates.get(detailId);
    if (!state?.isDragging) return;

    const touchX = e.touches[0].clientX;
    const deltaX = state.touchStartX - touchX;
    let newX = Math.max(0, Math.min(120, deltaX));

    setSlideStates(prev => new Map(prev).set(detailId, {
      ...state,
      currentX: newX
    }));
  };

  const handleTouchEnd = (detailId) => {
    const state = slideStates.get(detailId);
    if (!state) return;

    const finalX = state.currentX > swipeThreshold ? 120 : 0;
    setSlideStates(prev => new Map(prev).set(detailId, {
      ...state,
      isDragging: false,
      currentX: finalX
    }));
  };

  // 處理點擊背景關閉所有滑動選單
  const handleBackgroundClick = () => {
    setSlideStates(new Map());
  };

  // 處理更新行程細節
  const handleUpdateDetail = async (e, detailId) => {
    e.preventDefault();
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/line/trip_detail/${detailId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(detailData)
      });

      if (!response.ok) throw new Error('更新行程細節失敗');
      
      setEditingDetail(null);
      alert('更新成功！'); // 添加成功提示
      
      // 重新載入行程細節
      const refreshResponse = await fetch(`${process.env.REACT_APP_API_URL}/line/trip_detail/${tripId}`);
      if (!refreshResponse.ok) throw new Error('重新載入行程細節失敗');
      const refreshData = await refreshResponse.json();
      setTripDetails(refreshData);
      
    } catch (err) {
      setError(err.message);
      alert(`更新失敗：${err.message}`); // 添加錯誤提示
    }
  };

  // 處理刪除行程細節
  const handleDeleteDetail = async (detailId) => {
    if (window.confirm('確定要刪除此行程細節嗎？')) {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/line/trip_detail/${detailId}`, {
          method: 'DELETE'
        });

        if (!response.ok) throw new Error('刪除行程細節失敗');
        
        alert('刪除成功！'); // 添加成功提示
        setSlideStates(new Map()); // 重置滑動狀態
        
        // 重新載入行程細節
        const refreshResponse = await fetch(`${process.env.REACT_APP_API_URL}/line/trip_detail/${tripId}`);
        if (!refreshResponse.ok) throw new Error('重新載入行程細節失敗');
        const refreshData = await refreshResponse.json();
        setTripDetails(refreshData);
        
      } catch (err) {
        setError(err.message);
        alert(`刪除失敗：${err.message}`); // 添加錯誤提示
      }
    }
  };

  // 修改新增行程細節按鈕的點擊處理
  const handleAddClick = () => {
    // 計算選擇天數對應的日期
    const selectedDate = new Date(startDate);
    selectedDate.setDate(selectedDate.getDate() + selectedDay - 1);
    const formattedDate = selectedDate.toISOString().split('T')[0];

    // 預設帶入所選天的日期
    setDetailData({
      ...detailData,
      date: formattedDate,
      trip_id: tripId  // 確保有 trip_id
    });
    setShowAddForm(true);
  };

  // 修改新增行程細節的處理函數
  const handleAddDetail = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/line/trip_detail`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(detailData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 400) {
          alert(errorData.error || '新增失敗：請檢查輸入資料是否正確');
          return;
        }
        throw new Error('新增行程細節失敗');
      }
      
      setShowAddForm(false);
      setDetailData({ location: "", date: "", start_time: "", end_time: "" });
      alert('新增成功！');
      
      // 重新載入行程細節
      const refreshResponse = await fetch(`${process.env.REACT_APP_API_URL}/line/trip_detail/${tripId}`);
      if (!refreshResponse.ok) throw new Error('重新載入行程細節失敗');
      const refreshData = await refreshResponse.json();
      setTripDetails(refreshData);
      
    } catch (err) {
      setError(err.message);
      alert(`新增失敗：${err.message}`);
    }
  };

  // 渲染行程細節項目
  const renderDetailItem = (detail) => {
    const slideState = slideStates.get(detail.detail_id) || {
      currentX: 0,
      isDragging: false
    };

    return (
      <div 
        key={detail.detail_id}
        className="detail-item"
        onTouchStart={(e) => handleTouchStart(e, detail.detail_id)}
        onTouchMove={(e) => handleTouchMove(e, detail.detail_id)}
        onTouchEnd={() => handleTouchEnd(detail.detail_id)}
      >
        <div 
          className="detail-content"
          style={{
            transform: `translateX(-${slideState.currentX}px)`,
            transition: slideState.isDragging ? 'none' : 'transform 0.3s ease'
          }}
        >
          {editingDetail === detail.detail_id ? (
            <form onSubmit={(e) => handleUpdateDetail(e, detail.detail_id)} className="detail-edit-form">
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
                <button type="submit">確認</button>
                <button type="button" onClick={() => setEditingDetail(null)}>取消</button>
              </div>
            </form>
          ) : (
            <>
              <div className="time-range">
                {detail.start_time} - {detail.end_time}
              </div>
              <div className="location">
                {detail.location}
              </div>
            </>
          )}
        </div>
        <div 
          className="action-buttons"
          style={{
            transform: `translateX(${120 - slideState.currentX}px)`,
            transition: slideState.isDragging ? 'none' : 'transform 0.3s ease'
          }}
        >
          {editingDetail !== detail.detail_id && (
            <>
              <button 
                className="edit-action"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingDetail(detail.detail_id);
                  setDetailData({
                    location: detail.location,
                    date: detail.date,
                    start_time: detail.start_time,
                    end_time: detail.end_time
                  });
                }}
              >
                編輯
              </button>
              <button 
                className="delete-action"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteDetail(detail.detail_id);
                }}
              >
                刪除
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="trip-detail-container">
      <header className="trip-detail-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          返回行程列表
        </button>
        <h1>{tripTitle}</h1>
      </header>

      <div className="day-selector">
        {Array.from({ length: totalDays }, (_, i) => i + 1).map(day => (
          <button
            key={day}
            className={`day-button ${selectedDay === day ? 'active' : ''}`}
            onClick={() => setSelectedDay(day)}
          >
            第 {day} 天
          </button>
        ))}
      </div>

      
      
        <div className="add-detail-section">
          <button 
            className="add-detail-button"
            onClick={handleAddClick}
          >
            新增行程細節
          </button>
        </div>
      

      {/* 新增行程細節表單 */}
      {showAddForm && (
        <form onSubmit={handleAddDetail} className="detail-form">
          <h3>新增行程細節</h3>
          <div className="form-group">
            <label>地點 *</label>
            <input
              type="text"
              value={detailData.location}
              onChange={(e) => setDetailData({...detailData, location: e.target.value})}
              placeholder="例如：東京晴空塔"
              required
            />
          </div>
          <div className="form-group">
            <label>日期 *</label>
            <input
              type="date"
              value={detailData.date}
              onChange={(e) => setDetailData({...detailData, date: e.target.value})}
              min={startDate}
              max={endDate}
              required
            />
            <small>選擇的日期必須在行程期間內</small>
          </div>
          <div className="form-group">
            <label>開始時間 *</label>
            <input
              type="time"
              value={detailData.start_time}
              onChange={(e) => setDetailData({...detailData, start_time: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label>結束時間 *</label>
            <input
              type="time"
              value={detailData.end_time}
              onChange={(e) => setDetailData({...detailData, end_time: e.target.value})}
              required
            />
          </div>
          <div className="button-group">
            <button type="submit">確認新增</button>
            <button type="button" onClick={() => setShowAddForm(false)}>取消</button>
          </div>
        </form>
      )}

      {/* 已有的行程細節列表 */}
      <div className="day-details">
        <h2>第 {selectedDay} 天行程</h2>
        <div className="details-list">
          {getDayDetails(selectedDay).length > 0 ? (
            getDayDetails(selectedDay).map(detail => renderDetailItem(detail))
          ) : (
            <p className="no-details">尚未安排行程</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TripDetail;