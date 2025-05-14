import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
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
  const [swipedDetailId, setSwipedDetailId] = useState(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
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

    fetchTripDetails();
  }, [tripId]);

  if (isLoading) return <div className="loading">載入中...</div>;
  if (error) return <div className="error">{error}</div>;

  // 添加觸控處理函數
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e, detailId) => {
    if (!touchStartX.current || !touchStartY.current) return;

    const touchEndX = e.touches[0].clientX;
    const touchEndY = e.touches[0].clientY;
    const deltaX = touchStartX.current - touchEndX;
    const deltaY = touchStartY.current - touchEndY;

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > swipeThreshold) {
      e.preventDefault();
      setSwipedDetailId(detailId);
    }
  };

  const handleTouchEnd = () => {
    touchStartX.current = 0;
    touchStartY.current = 0;
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
      const updatedDetails = await response.json();
      setTripDetails(tripDetails.map(detail => 
        detail.detail_id === detailId ? updatedDetails : detail
      ));
    } catch (err) {
      setError(err.message);
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
        
        setTripDetails(tripDetails.filter(detail => detail.detail_id !== detailId));
      } catch (err) {
        setError(err.message);
      }
    }
  };

  // 修改渲染行程細節的部分
  const renderDetailItem = (detail) => (
    <div 
      key={detail.detail_id}
      className={`detail-item ${swipedDetailId === detail.detail_id ? 'swiped' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchMove={(e) => handleTouchMove(e, detail.detail_id)}
      onTouchEnd={handleTouchEnd}
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
          <div className="detail-content">
            <div className="time-range">
              {detail.start_time} - {detail.end_time}
            </div>
            <div className="location">
              {detail.location}
            </div>
          </div>
          <div className="action-buttons">
            <button 
              className="edit-action"
              onClick={() => {
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
              onClick={() => handleDeleteDetail(detail.detail_id)}
            >
              刪除
            </button>
          </div>
        </>
      )}
    </div>
  );

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