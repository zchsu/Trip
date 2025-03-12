import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/match.css";

const Match = () => {
    const [userTrips, setUserTrips] = useState([]);
    const [selectedTrip, setSelectedTrip] = useState(null);
    const [matchedTrips, setMatchedTrips] = useState([]);
    const navigate = useNavigate();
    const userId = localStorage.getItem("user_id");
    const [showTripDetails, setShowTripDetails] = useState(null);
    const [tripDetails, setTripDetails] = useState([]);
    const [allTrips, setAllTrips] = useState([]); 

    // 新增獲取所有行程的函數
    const fetchAllTrips = async () => {
        try {
          const response = await fetch('http://localhost:5000/trip/all');
          const data = await response.json();
          setAllTrips(data);
          setMatchedTrips(data); // 初始顯示所有行程
        } catch (error) {
          console.error("獲取所有行程失敗:", error);
        }
      };

    // 新增篩選條件的 state
    const [filters, setFilters] = useState({
        area: '',
        dateStart: '',
        dateEnd: '',
        tags: '',
        gender: 'any',
        keyword: '',
        budgetMin: 0,
        budgetMax: 100000
    });
  
    useEffect(() => {
      if (!userId) {
        navigate("/login");
        return;
      }
      fetchUserTrips();
      fetchAllTrips();
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
          
          // 取得選擇的行程資訊
          const selectedTripInfo = userTrips.find(trip => trip.trip_id === parseInt(tripId));
          const selectedStart = new Date(selectedTripInfo.start_date);
          const selectedEnd = new Date(selectedTripInfo.end_date);
    
          // 計算每個匹配行程的重疊天數
          const tripsWithOverlap = data.map(trip => {
            const tripStart = new Date(trip.start_date);
            const tripEnd = new Date(trip.end_date);
            
            // 計算重疊的開始和結束日期
            const overlapStart = new Date(Math.max(selectedStart, tripStart));
            const overlapEnd = new Date(Math.min(selectedEnd, tripEnd));
            
            // 計算重疊天數
            const overlappingDays = overlapStart <= overlapEnd ? 
              Math.floor((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)) + 1 : 0;
    
            return {
              ...trip,
              overlapping_days: overlappingDays
            };
          }).filter(trip => trip.overlapping_days > 0); // 只保留有重疊天數的行程
    
          // 應用其他篩選條件
          const filteredData = tripsWithOverlap.filter(trip => {
            let matchesFilters = true;
    
            if (filters.keyword) {
              matchesFilters = matchesFilters && (
                trip.title.toLowerCase().includes(filters.keyword.toLowerCase()) ||
                trip.description.toLowerCase().includes(filters.keyword.toLowerCase())
              );
            }
    
            if (filters.area) {
              matchesFilters = matchesFilters && trip.area === filters.area;
            }
    
            if (filters.tags) {
              matchesFilters = matchesFilters && filters.tags.toLowerCase().split(',').some(tag => 
                trip.tags.toLowerCase().includes(tag.trim())
              );
            }
    
            if (filters.gender !== 'any') {
              matchesFilters = matchesFilters && trip.preferred_gender === filters.gender;
            }
    
            if (filters.budgetMin > 0 || filters.budgetMax < 100000) {
              matchesFilters = matchesFilters && 
                trip.budget >= filters.budgetMin && 
                trip.budget <= filters.budgetMax;
            }
    
            return matchesFilters;
          });
    
          setMatchedTrips(filteredData);
          setSelectedTrip(selectedTripInfo);
          if (!selectedTrip) {
            setSelectedTrip(selectedTripInfo);
          }
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

  // 新增獲取行程細節的函數
  const fetchTripDetails = async (tripId) => {
    try {
      const response = await fetch(`http://localhost:5000/trip_detail/${tripId}`);
      const data = await response.json();
      setTripDetails(data);
    } catch (error) {
      console.error("獲取行程細節失敗:", error);
    }
  };

  // 處理篩選條件變更
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // 新增篩選所有行程的函數
    const filterAllTrips = () => {
    const filteredData = allTrips.filter(trip => {
      // 基本篩選邏輯保持不變
      const matchesKeyword = !filters.keyword || 
        trip.title.toLowerCase().includes(filters.keyword.toLowerCase()) ||
        trip.description.toLowerCase().includes(filters.keyword.toLowerCase());
  
      const matchesArea = !filters.area || trip.area === filters.area;
  
      const matchesTags = !filters.tags || 
        filters.tags.toLowerCase().split(',').some(tag => 
          trip.tags.toLowerCase().includes(tag.trim())
        );
  
      const matchesGender = filters.gender === 'any' || 
        trip.preferred_gender === filters.gender;
  
      const matchesBudget = trip.budget >= filters.budgetMin && 
        trip.budget <= filters.budgetMax;
  
      // 新增日期重疊判斷
      let matchesDates = true;
      if (filters.dateStart && filters.dateEnd) {
        const filterStart = new Date(filters.dateStart);
        const filterEnd = new Date(filters.dateEnd);
        const tripStart = new Date(trip.start_date);
        const tripEnd = new Date(trip.end_date);
  
        // 計算重疊天數
        const overlapStart = new Date(Math.max(filterStart, tripStart));
        const overlapEnd = new Date(Math.min(filterEnd, tripEnd));
        matchesDates = overlapStart <= overlapEnd;
  
        // 如果有重疊，計算重疊天數
        if (matchesDates) {
          const overlappingDays = Math.floor((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)) + 1;
          trip.overlapping_days = overlappingDays;
        }
      }
  
      return matchesKeyword && matchesArea && matchesGender && 
             matchesBudget && matchesTags && matchesDates;
    });
  
    setMatchedTrips(filteredData);
  };

  // 修改搜尋函數
  const handleSearch = () => {
    if (selectedTrip) {
      // 如果選擇了自己的行程，使用匹配邏輯
      findMatches(selectedTrip.trip_id);
    } else {
      // 如果沒有選擇行程，直接篩選所有行程
      filterAllTrips();
    }
  };

  // 重設篩選條件
  const resetFilters = () => {
    setFilters({
      area: '',
      dateStart: '',
      dateEnd: '',
      tags: '',
      gender: 'any',
      keyword: '',
      budgetMin: 0,
      budgetMax: 100000
    });
    
    if (selectedTrip) {
      findMatches(selectedTrip.trip_id);
    } else {
      setMatchedTrips(allTrips); // 重設時顯示所有行程
    }
  };

  // 修改匹配行程列表的顯示部分
  const renderMatchedTrips = () => (
    <ul className="matches-list">
      {matchedTrips.map(trip => (
        <li key={trip.trip_id} className="match-card">
          <div className="trip-basic-info">
            <h3>{trip.title}</h3>
            <p className="trip-description">{trip.description}</p>
            <p>📍 {trip.area}</p>
            <p>📅 {new Date(trip.start_date).toLocaleDateString()} - {new Date(trip.end_date).toLocaleDateString()}</p>
            <p>🏷️ {trip.tags}</p>
            <p className="budget">
            💰 預算: {
                trip.budget === null || trip.budget === undefined ? 
                '未設定' : 
                trip.budget.toLocaleString()
            }
            </p>
            <p>👤 創建者: {trip.creator_name}</p>
            <p className="preferred-gender">
                理想旅伴: {
                trip.preferred_gender === 'any' ? '不限' :
                trip.preferred_gender === 'male' ? '男性' :
                trip.preferred_gender === 'female' ? '女性' : '未指定'
                }
            </p>
            <div className="overlapping-dates">
              <p>重疊日期：{trip.overlapping_days} 天</p>
            </div>
          </div>

          <button 
            className="details-button"
            onClick={() => {
              if (showTripDetails === trip.trip_id) {
                setShowTripDetails(null);
              } else {
                setShowTripDetails(trip.trip_id);
                fetchTripDetails(trip.trip_id);
              }
            }}
          >
            {showTripDetails === trip.trip_id ? '隱藏細節' : '查看細節'}
          </button>

          {showTripDetails === trip.trip_id && (
            <div className="trip-details-section">
              <h4>行程細節</h4>
              {tripDetails.length === 0 ? (
                <p>此行程暫無細節安排</p>
              ) : (
                <div className="details-list">
                  {tripDetails
                    .filter(detail => {
                      const detailDate = new Date(detail.date);
                      const tripStartDate = new Date(selectedTrip.start_date);
                      const tripEndDate = new Date(selectedTrip.end_date);
                      return detailDate >= tripStartDate && detailDate <= tripEndDate;
                    })
                    .map(detail => (
                      <div key={detail.detail_id} className="detail-item">
                        <p>📅 {new Date(detail.date).toLocaleDateString()}</p>
                        <p>📍 {detail.location}</p>
                        <p>⏰ {detail.start_time.slice(0, 5)} - {detail.end_time.slice(0, 5)}</p>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
          )}
        </li>
      ))}
    </ul>
  );

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
                onChange={(e) => {
                    const selectedValue = e.target.value;
                    setSelectedTrip(userTrips.find(trip => trip.trip_id === parseInt(selectedValue)));
                    findMatches(selectedValue);
                }}
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
            <div className="filter-section">
            <div className="filter-row">
                <div className="filter-item">
                <select 
                    name="area" 
                    value={filters.area}
                    onChange={handleFilterChange}
                >
                    <option value="">全部地區</option>
                    <option value="東京">東京</option>
                    <option value="大阪">大阪</option>
                    <option value="京都">京都</option>
                    <option value="札幌">札幌</option>
                    <option value="福岡">福岡</option>
                </select>
                </div>

                <div className="filter-item">
                    <input
                    type="text"
                    name="keyword"
                    value={filters.keyword}
                    onChange={handleFilterChange}
                    placeholder="搜尋關鍵字"
                    />
                </div>

                <div className="filter-item">
                    <input
                    type="text"
                    name="tags"
                    value={filters.tags}
                    onChange={handleFilterChange}
                    placeholder="搜尋標籤"
                    />
                </div>

                <div className="filter-item">
                <select
                    name="gender"
                    value={filters.gender}
                    onChange={handleFilterChange}
                >
                    <option value="any">性別不限</option>
                    <option value="male">男性</option>
                    <option value="female">女性</option>
                </select>
                </div>

                <div className="filter-item budget-filter">
                    <input
                    type="number"
                    name="budgetMin"
                    value={filters.budgetMin}
                    onChange={handleFilterChange}
                    step="5000"
                    min="0"
                    max="100000"
                    placeholder="最低預算"
                    />
                    <span>-</span>
                    <input
                    type="number"
                    name="budgetMax"
                    value={filters.budgetMax}
                    onChange={handleFilterChange}
                    step="5000"
                    min="0"
                    max="100000"
                    placeholder="最高預算"
                    />
                </div>
                <div className="filter-item date-filter">
                    <input
                    type="date"
                    name="dateStart"
                    value={filters.dateStart}
                    onChange={handleFilterChange}
                    placeholder="開始日期"
                    />
                    <span>-</span>
                    <input
                    type="date"
                    name="dateEnd"
                    value={filters.dateEnd}
                    onChange={handleFilterChange}
                    placeholder="結束日期"
                    />
                </div>

                <div className="filter-buttons">
                    <button onClick={handleSearch} className="search-button">
                        搜尋
                    </button>
                    <button onClick={resetFilters} className="reset-button">
                        重設
                    </button>
                </div>
            </div>
            </div>
          </div>
        )}
      </div>
  
      <div className="matched-trips">
          <h2>{selectedTrip ? '匹配結果' : '所有行程'}</h2>
          {matchedTrips.length === 0 ? (
            <p>沒有找到符合的行程</p>
          ) : (
            renderMatchedTrips()
          )}
        </div>
  
      <div className="navigation-buttons">
        <button onClick={() => navigate("/")}>返回首頁</button>
      </div>
    </div>
  );
};

export default Match;