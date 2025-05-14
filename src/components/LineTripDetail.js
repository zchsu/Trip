import React, { useState, useEffect } from 'react';
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
            getDayDetails(selectedDay).map(detail => (
              <div key={detail.detail_id} className="detail-item">
                <div className="time-range">
                  {detail.start_time} - {detail.end_time}
                </div>
                <div className="location">
                  {detail.location}
                </div>
              </div>
            ))
          ) : (
            <p className="no-details">尚未安排行程</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TripDetail;