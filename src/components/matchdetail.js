import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { GoogleMap, LoadScript, Marker, Polyline } from '@react-google-maps/api';
import "../styles/matchdetail.css";

const TripDetail = () => {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [tripDetails, setTripDetails] = useState([]);
  const [tripInfo, setTripInfo] = useState(null);
  const [matchedTripLocations, setMatchedTripLocations] = useState([]);
  const [mapCenter, setMapCenter] = useState({ lat: 35.6762, lng: 139.6503 });
  const [isLoaded, setIsLoaded] = useState(false);

  const mapContainerStyle = {
    width: '100%',
    height: '100vh',
    minHeight: '400px'
  };

  useEffect(() => {
    fetchTripInfo();
    fetchTripDetails();
  }, [tripId]);

  const fetchTripInfo = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/trip/${tripId}/info`);
      const data = await response.json();
      setTripInfo(data);
    } catch (error) {
      console.error("獲取行程資訊失敗:", error);
    }
  };

  // 新增地圖載入處理函數
  const handleMapLoad = () => {
    setIsLoaded(true);
  };

  const fetchTripDetails = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/trip_detail/${tripId}`);
      const data = await response.json();
      setTripDetails(data);

      // 確保 Google Maps API 已載入
      if (window.google && window.google.maps) {
        const geocoder = new window.google.maps.Geocoder();
        const locations = await Promise.all(
          data.map(async detail => {
            try {
              const result = await new Promise((resolve, reject) => {
                geocoder.geocode({ address: detail.location }, (results, status) => {
                  if (status === 'OK') {
                    resolve({
                      lat: results[0].geometry.location.lat(),
                      lng: results[0].geometry.location.lng(),
                      name: detail.location,
                      date: detail.date,
                      time: `${detail.start_time.slice(0, 5)} - ${detail.end_time.slice(0, 5)}`
                    });
                  } else {
                    reject(status);
                  }
                });
              });
              return result;
            } catch (error) {
              console.error(`地理編碼錯誤: ${error}`);
              return null;
            }
          })
        );

        const validLocations = locations.filter(loc => loc !== null);
        setMatchedTripLocations(validLocations);
        if (validLocations.length > 0) {
          setMapCenter(validLocations[0]);
        }
      }
    } catch (error) {
      console.error("獲取行程細節失敗:", error);
    }
  };

  return (
    <div className="trip-detail-container">
      <div className="header-section">
        <button onClick={() => navigate(-1)} className="back-button">
          返回
        </button>
        <h1>行程詳情</h1>
      </div>
  
      <div className="content-wrapper">
        <div className="left-content">
          {tripInfo && (
            <div className="trip-info-section">
              <h2>{tripInfo.title}</h2>
              <p className="description">{tripInfo.description}</p>
              <div className="info-grid">
                <p>📍 地區：{tripInfo.area}</p>
                <p>📅 日期：{new Date(tripInfo.start_date).toLocaleDateString()} - {new Date(tripInfo.end_date).toLocaleDateString()}</p>
                <p>💰 預算：{tripInfo.budget?.toLocaleString() || '未設定'}</p>
                <p>🏷️ 標籤：{tripInfo.tags}</p>
              </div>
            </div>
          )}
  
          <div className="details-section">
            <h3>行程安排</h3>
            {tripDetails.length === 0 ? (
              <p>此行程暫無細節安排</p>
            ) : (
              <div className="details-timeline">
                {tripDetails.map(detail => (
                  <div key={detail.detail_id} className="timeline-item">
                    <div className="timeline-date">
                      <p>{new Date(detail.date).toLocaleDateString()}</p>
                      <p>{detail.start_time.slice(0, 5)} - {detail.end_time.slice(0, 5)}</p>
                    </div>
                    <div className="timeline-content">
                      <p>📍 {detail.location}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
  
        <div className="right-content">
        <LoadScript 
          googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}
          onLoad={() => {
            setIsLoaded(true);
            fetchTripDetails();
          }}
        >
          {isLoaded ? (
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={mapCenter}
              zoom={12}
              onLoad={handleMapLoad}
            >
              {matchedTripLocations.map((location, index) => (
                <Marker
                  key={index}
                  position={{ lat: location.lat, lng: location.lng }}
                  title={`${location.name}\n${location.date}\n${location.time}`}
                />
              ))}
              {matchedTripLocations.length > 1 && (
                <Polyline
                  path={matchedTripLocations}
                  options={{
                    strokeColor: "#0000FF",
                    strokeOpacity: 0.8,
                    strokeWeight: 2,
                  }}
                />
              )}
            </GoogleMap>
          ) : (
            <div className="map-loading">載入地圖中...</div>
          )}
        </LoadScript>
      </div>
      </div>
    </div>
  );
};

export default TripDetail;