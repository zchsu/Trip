import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { GoogleMap, LoadScript, Marker, Polyline, DirectionsService, DirectionsRenderer } from '@react-google-maps/api';
import "../styles/matchdetail.css";

const TripDetail = () => {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [tripDetails, setTripDetails] = useState([]);
  const [tripInfo, setTripInfo] = useState(null);
  const [matchedTripLocations, setMatchedTripLocations] = useState([]);
  const [mapCenter, setMapCenter] = useState({ lat: 35.6762, lng: 139.6503 });
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [zoom, setZoom] = useState(12);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLocation, setSearchLocation] = useState(null);

  const mapContainerStyle = {
    width: '100%',
    height: '100vh',
    minHeight: '400px'
  };

  const fetchTripInfo = useCallback(async () => {
    try {
      // 修改為正確的 API 路徑
      const response = await fetch(`${process.env.REACT_APP_API_URL}/trip/${tripId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setTripInfo(data);
    } catch (error) {
      console.error("獲取行程資訊失敗:", error);
    }
  }, [tripId]);

  // 處理地理編碼，將地址轉換為坐標
  const geocodeLocations = useCallback(async (details) => {
    if (!window.google || !window.google.maps) {
      console.error("Google Maps API 尚未載入");
      return [];
    }

    const geocoder = new window.google.maps.Geocoder();
    const geocodePromises = details.map(detail => {
      return new Promise((resolve) => {
        geocoder.geocode({ address: detail.location }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            resolve({
              lat: results[0].geometry.location.lat(),
              lng: results[0].geometry.location.lng(),
              name: detail.location,
              date: detail.date,
              time: `${detail.start_time.slice(0, 5)} - ${detail.end_time.slice(0, 5)}`,
              detail_id: detail.detail_id
            });
          } else {
            console.warn(`無法解析地址: ${detail.location}, 狀態: ${status}`);
            resolve(null);
          }
        });
      });
    });

    try {
      const locations = await Promise.all(geocodePromises);
      return locations.filter(loc => loc !== null);
    } catch (error) {
      console.error("地理編碼過程中發生錯誤:", error);
      return [];
    }
  }, []);

  // 獲取行程細節並處理地理編碼
  const fetchTripDetails = useCallback(async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/trip_detail/${tripId}`);
      const data = await response.json();
      setTripDetails(data);

      // 只有當 Google Maps API 已經載入時才進行地理編碼
      if (isScriptLoaded && window.google && window.google.maps) {
        const validLocations = await geocodeLocations(data);
        
        // 依照日期排序
        validLocations.sort((a, b) => {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          return dateA - dateB;
        });
        
        setMatchedTripLocations(validLocations);
        
        if (validLocations.length > 0) {
          setMapCenter(validLocations[0]);
        }
      }
    } catch (error) {
      console.error("獲取行程細節失敗:", error);
    }
  }, [tripId, geocodeLocations, isScriptLoaded]);

  // 在組件掛載時獲取行程信息
  useEffect(() => {
    fetchTripInfo();
  }, [fetchTripInfo]);

  // 當 Google Maps 腳本載入完成後獲取行程細節
  useEffect(() => {
    if (isScriptLoaded) {
      fetchTripDetails();
    }
  }, [isScriptLoaded, fetchTripDetails]);

  // 地圖載入完成處理函數
  const handleMapLoad = (map) => {
    setMapLoaded(true);
    console.log("Google Map 已完成載入");
  };

  // 腳本載入完成處理函數
  const handleScriptLoad = () => {
    setIsScriptLoaded(true);
    console.log("Google Maps 腳本已完成載入");
  };

// 新增處理點擊景點的函數
const handleLocationClick = useCallback((location) => {
    setMapCenter({ lat: location.lat, lng: location.lng });
    setZoom(15);
    setSelectedLocation(location);
  }, []);

  // 新增搜尋處理函數
const handleSearch = useCallback(() => {
    if (!window.google || !searchQuery) return;
  
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ 
      address: searchQuery,
      region: 'JP' // 限制在日本範圍內搜尋
    }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        const location = {
          lat: results[0].geometry.location.lat(),
          lng: results[0].geometry.location.lng(),
          name: searchQuery,
          isSearchResult: true
        };
        setSearchLocation(location);
        setMapCenter(location);
        setZoom(15);
      } else {
        console.warn('搜尋位置失敗:', status);
        setSearchLocation(null);
      }
    });
  }, [searchQuery]);

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
        <div className="details-section">
          <h3>行程安排</h3>
          {tripDetails.length === 0 ? (
            <p>此行程暫無細節安排</p>
          ) : (
            <div className="details-timeline">
              {tripDetails.map((detail, index) => {
                const location = matchedTripLocations.find(
                  loc => loc.detail_id === detail.detail_id
                );
                
                return (
                  <div 
                    key={`${detail.detail_id || index}`}
                    className={`timeline-item ${selectedLocation?.detail_id === detail.detail_id ? 'selected' : ''}`}
                    onClick={() => location && handleLocationClick(location)}
                    style={{ cursor: location ? 'pointer' : 'default' }}
                  >
                    <div className="timeline-date">
                      <p>{new Date(detail.date).toLocaleDateString()}</p>
                      <p>{detail.start_time.slice(0, 5)} - {detail.end_time.slice(0, 5)}</p>
                    </div>
                    <div className="timeline-content">
                      <p>📍 {detail.location}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="right-content">
        <div className="search-container">
            <div className="search-box">
            <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜尋景點..."
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button onClick={handleSearch}>搜尋</button>
            </div>
        </div>
        <LoadScript 
          googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}
          onLoad={handleScriptLoad}
        >
          <div className="map-container">
            {!mapLoaded && (
              <div className="map-loading-overlay">
                <div className="map-loading-spinner"></div>
                <p>載入地圖中...</p>
              </div>
            )}
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={mapCenter}
              zoom={zoom}
              onLoad={handleMapLoad}
            >
              {matchedTripLocations.map((location, index) => (
                <Marker
                  key={index}
                  position={{ lat: location.lat, lng: location.lng }}
                  title={`${location.name}\n${location.date}\n${location.time}`}
                  label={{
                    text: (index + 1).toString(),
                    color: "white"
                  }}
                  onClick={() => handleLocationClick(location)}
                />
              ))}
              
              {/* 顯示搜尋結果標記 */}
                {searchLocation && (
                <Marker
                    position={{ lat: searchLocation.lat, lng: searchLocation.lng }}
                    title={searchLocation.name}
                    icon={{
                    path: window.google.maps.SymbolPath.CIRCLE,
                    fillColor: '#FF0000',
                    fillOpacity: 1,
                    strokeWeight: 1,
                    scale: 8
                    }}
                />
                )}

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
          </div>
        </LoadScript>
      </div>
    </div>
  </div>
);
};
export default TripDetail;