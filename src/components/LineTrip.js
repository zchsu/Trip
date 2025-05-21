import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import liff from '@line/liff';
import "../styles/LineTrip.css";

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
  const [isLoadingDetails, setIsLoadingDetails] = useState(false); // 新增狀態
  const [detailData, setDetailData] = useState({
    location: "",
    date: "",
    start_time: "",
    end_time: "",
  });

  // 在 state 中添加編輯模式
  const [editMode, setEditMode] = useState(null); // 'trip' 或 'detail' 或 null
  const [editingTrip, setEditingTrip] = useState(null);
  const [editingDetail, setEditingDetail] = useState(null);
  const [swipedDetailId, setSwipedDetailId] = useState(null);

  // 在 state 宣告後添加觸控相關的參考值
  const touchStartX = React.useRef(0);
  const touchStartY = React.useRef(0);
  const swipeThreshold = 50; // 設定滑動閾值

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

    // 確保是水平滑動（避免與垂直滾動衝突）
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      e.preventDefault(); // 防止頁面滾動
      
      if (deltaX > swipeThreshold) {
        // 向左滑動
        setSwipedDetailId(detailId);
      } else if (deltaX < -swipeThreshold) {
        // 向右滑動（收起刪除按鈕）
        setSwipedDetailId(null);
      }
    }
  };

  const handleTouchEnd = () => {
    touchStartX.current = 0;
    touchStartY.current = 0;
  };

  useEffect(() => {
    console.log("Component mounted");
    initializeLiff();
  }, []);

  const initializeLiff = async () => {
    try {
      console.log("正在初始化 LIFF...");
      await liff.init({ 
        liffId: process.env.REACT_APP_LIFF_ID,
        withLoginOnExternalBrowser: true  // 確保已設置為 true
      });
      console.log("LIFF 初始化成功");

      // 增加更詳細的登入狀態檢查
      if (!liff.isLoggedIn()) {
        console.log("用戶未登入，開始登入流程");
        // 增加錯誤處理
        try {
          await liff.login();
        } catch (loginError) {
          console.error("登入失敗:", loginError);
          setError(`登入失敗: ${loginError.message}`);
          return;
        }
      }

      console.log("開始獲取用戶資料");
      const profile = await liff.getProfile();
      console.log("用戶資料:", profile);
      setUserProfile(profile);
      await saveUserProfile(profile);
      await fetchTrips(profile.userId);

    } catch (e) {
      console.error("LIFF 初始化失敗:", e);
      // 增加更詳細的錯誤訊息
      const errorMessage = e.message || '未知錯誤';
      const errorCode = e.code || 'NO_CODE';
      setError(`LIFF 初始化失敗 (${errorCode}): ${errorMessage}`);
      
      // 如果是在手機上，可以嘗試重新導向到 LINE 內開啟
      if (liff.isInClient()) {
        console.log("在 LINE 內瀏覽器中");
      } else {
        console.log("在外部瀏覽器中");
        // 可以考慮添加重試機制
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const customFetch = async (url, options = {}) => {
    const defaultHeaders = {
      'ngrok-skip-browser-warning': 'true',
      'Content-Type': 'application/json',
    };
  
    const mergedOptions = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...(options.headers || {}),
      },
    };
  
    return fetch(url, mergedOptions);
  };

  const saveUserProfile = async (profile) => {
    try {
      console.log("儲存用戶資料...");
      const response = await customFetch(`${process.env.REACT_APP_API_URL}/line/user`, {
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
      const response = await customFetch(`${process.env.REACT_APP_API_URL}/line/trip/${userId}`);
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
      const response = await customFetch(`${process.env.REACT_APP_API_URL}/line/trip`, {
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
        const response = await customFetch(`${process.env.REACT_APP_API_URL}/line/trip/${tripId}`, {
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
    setIsLoadingDetails(true); // 開始載入
    try {
      console.log("正在獲取行程細節...");
      const response = await customFetch(`${process.env.REACT_APP_API_URL}/line/trip_detail/${tripId}`, {
        headers: {
          'ngrok-skip-browser-warning': 'true',
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("行程細節資料:", data);
      
      setTripDetails(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('獲取行程細節失敗:', e);
      setTripDetails([]); 
      setError(`獲取行程細節失敗: ${e.message}`);
    } finally {
      setIsLoadingDetails(false); // 結束載入
    }
  };

  // 修改 handleAddDetail 函數
  const handleAddDetail = async (e) => {
    e.preventDefault();
    try {
      // 檢查必要欄位
      if (!detailData.location || !detailData.date || !detailData.start_time || !detailData.end_time) {
        alert('請填寫所有必要欄位');
        return;
      }

      // 驗證時間格式
      if (detailData.start_time >= detailData.end_time) {
        alert('結束時間必須晚於開始時間');
        return;
      }

      console.log("正在新增行程細節...", {
        ...detailData,
        trip_id: selectedTripId
      });

      const response = await customFetch(`${process.env.REACT_APP_API_URL}/line/trip_detail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...detailData,
          trip_id: selectedTripId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("行程細節新增成功:", result);

      // 重置表單
      setDetailData({
        location: "",
        date: "",
        start_time: "",
        end_time: "",
      });
      
      // 切換回檢視模式
      setDetailMode('view');
      
      // 重新獲取行程細節
      await fetchTripDetails(selectedTripId);
      
      alert('行程細節新增成功！');

    } catch (e) {
      console.error('新增行程細節失敗:', e);
      alert(`新增行程細節失敗: ${e.message}`);
    }
  };

  // 新增刪除函數
  const handleDeleteDetail = async (detailId) => {
    if (window.confirm('確定要刪除此行程細節嗎？')) {
      try {
        const response = await customFetch(`${process.env.REACT_APP_API_URL}/line/trip_detail/${detailId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // 更新頁面上的行程細節列表
        setTripDetails(prevDetails => 
          prevDetails.filter(detail => detail.detail_id !== detailId)
        );
      } catch (e) {
        console.error('刪除行程細節失敗:', e);
        setError(`刪除行程細節失敗: ${e.message}`);
      }
    }
  };

  // 添加處理更新行程的函數
  const handleUpdateTrip = async (e, tripId) => {
    e.preventDefault();
    try {
      const response = await customFetch(`${process.env.REACT_APP_API_URL}/line/trip/${tripId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tripData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      alert('行程更新成功');
      setEditMode(null);
      setEditingTrip(null);
      fetchTrips(userProfile.userId);
    } catch (e) {
      console.error('更新行程失敗:', e);
      alert(`更新行程失敗: ${e.message}`);
    }
  };

  // 添加處理更新行程細節的函數
  const handleUpdateDetail = async (e, detailId) => {
    e.preventDefault();
    try {
      const response = await customFetch(`${process.env.REACT_APP_API_URL}/line/trip_detail/${detailId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(detailData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      alert('行程細節更新成功');
      setEditMode(null);
      setEditingDetail(null);
      fetchTripDetails(selectedTripId);
    } catch (e) {
      console.error('更新行程細節失敗:', e);
      alert(`更新行程細節失敗: ${e.message}`);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const handleShareTrip = async (tripId, trip) => {
    try {
      if (!window.liff) {
        throw new Error('LIFF 未初始化');
      }
  
      const user = await liff.getDecodedIDToken();
      const sharedUserId = user.sub;
  
      // 先建立分享權限
      const shareResponse = await fetch(`${process.env.REACT_APP_API_URL}/line/trip/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trip_id: tripId,
          shared_user_id: sharedUserId,
          permission_type: 'edit'
        })
      });
  
      if (!shareResponse.ok) {
        throw new Error('設定分享權限失敗');
      }
  
      // 分享訊息
      const result = await liff.shareTargetPicker([
        {
          type: "flex",
          altText: `分享行程：${trip.title}`,
          contents: {
            type: "bubble",
            body: {
              type: "box",
              layout: "vertical",
              contents: [
                {
                  type: "text",
                  text: trip.title,
                  weight: "bold",
                  size: "xl"
                },
                {
                  type: "text",
                  text: `${formatDate(trip.start_date)} - ${formatDate(trip.end_date)}`,
                  size: "sm",
                  color: "#999999"
                }
              ]
            },
            footer: {
              type: "box",
              layout: "vertical",
              contents: [
                {
                  type: "button",
                  action: {
                    type: "uri",
                    label: "查看並編輯行程",
                    uri: `${window.location.origin}/linetripdetail/${tripId}`
                  },
                  style: "primary"
                }
              ]
            }
          }
        }
      ]);
  
      if (result) {
        alert('分享成功！對方可以查看並編輯行程。');
      }
    } catch (error) {
      console.error('分享失敗:', error);
      alert(`分享失敗：${error.message}`);
    }
  };

  const renderTripDetails = (details) => {
    if (isLoadingDetails) {
      return <p className="loading-details">載入中...</p>;
    }

    if (!details || details.length === 0) {
      return <p className="no-details">尚未新增行程細節</p>;
    }

    return (
      <div className="details-list">
        {details.map((detail) => (
          <div 
            key={detail.detail_id}
            className={`detail-card ${swipedDetailId === detail.detail_id ? 'swiped' : ''}`}
            onTouchStart={handleTouchStart}
            onTouchMove={(e) => handleTouchMove(e, detail.detail_id)}
            onTouchEnd={() => handleTouchEnd(detail.detail_id)}
          >
            {editMode === 'detail' && editingDetail === detail.detail_id ? (
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
                  <button type="button" onClick={() => {
                    setEditMode(null);
                    setEditingDetail(null);
                  }}>取消</button>
                </div>
              </form>
            ) : (
              <>
                <div className="detail-content">
                  <p><strong>地點：</strong>{detail.location}</p>
                  <p><strong>日期：</strong>{detail.date}</p>
                  <p><strong>時間：</strong>{detail.start_time} - {detail.end_time}</p>
                </div>
                <div className="action-buttons">
                  <button 
                    className="edit-action"
                    onClick={() => {
                      setEditMode('detail');
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
        ))}
      </div>
    );
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

  // 修改 renderTripList 函數
  const renderTripList = () => (
    <div className="trips-list">
      <button onClick={() => setMode('add')} className="add-button">
        新增行程
      </button>
      {trips.map((trip) => (
        <div 
          key={trip.trip_id}
          className="trip-card"
        >
          {editMode === 'trip' && editingTrip === trip.trip_id ? (
            <form onSubmit={(e) => handleUpdateTrip(e, trip.trip_id)} className="trip-edit-form">
              <h3>編輯行程</h3>
              <div className="form-group">
                <label>行程標題 *</label>
                <input
                  type="text"
                  value={tripData.title}
                  onChange={(e) => setTripData({...tripData, title: e.target.value})}
                  placeholder="例如：東京五日遊"
                  required
                />
              </div>
              <div className="form-group">
                <label>行程描述</label>
                <textarea
                  value={tripData.description}
                  onChange={(e) => setTripData({...tripData, description: e.target.value})}
                  placeholder="描述一下這趟旅程..."
                />
              </div>
              <div className="form-group">
                <label>開始日期 *</label>
                <input
                  type="date"
                  value={tripData.start_date}
                  onChange={(e) => setTripData({...tripData, start_date: e.target.value})}
                  required
                />
                <small>行程的第一天</small>
              </div>
              <div className="form-group">
                <label>結束日期 *</label>
                <input
                  type="date"
                  value={tripData.end_date}
                  onChange={(e) => setTripData({...tripData, end_date: e.target.value})}
                  required
                />
                <small>行程的最後一天</small>
              </div>
              <div className="form-group">
                <label>地區 *</label>
                <input
                  type="text"
                  value={tripData.area}
                  onChange={(e) => setTripData({...tripData, area: e.target.value})}
                  placeholder="例如：東京、大阪"
                  required
                />
              </div>
              <div className="form-note">
                <small>* 為必填欄位</small>
              </div>
              <div className="button-group">
                <button type="submit">確認修改</button>
                <button type="button" onClick={() => {
                  setEditMode(null);
                  setEditingTrip(null);
                }}>取消</button>
              </div>
            </form>
          ) : (
            <>
              <div 
                className="trip-content"
                onClick={() => {
                  navigate(`/linetripdetail/${trip.trip_id}`, {
                    state: {
                      tripTitle: trip.title,
                      startDate: trip.start_date,
                      endDate: trip.end_date
                    }
                  });
                }}
              >
                <h3>{trip.title}</h3>
                <p>{trip.description}</p>
                <div className="trip-info">
                  <span>
                    {formatDate(trip.start_date)} - {formatDate(trip.end_date)}
                  </span>
                  <span>{trip.area}</span>
                </div>
              </div>
              <div className="trip-actions">
                <button onClick={(e) => {
                  e.stopPropagation();
                  setEditMode('trip');
                  setEditingTrip(trip.trip_id);
                  // 確保日期格式正確（YYYY-MM-DD）
                  const formatDateForInput = (dateString) => {
                    const date = new Date(dateString);
                    return date.toISOString().split('T')[0];
                  };
                  
                  setTripData({
                    title: trip.title,
                    description: trip.description || '',
                    start_date: formatDateForInput(trip.start_date),  // 格式化日期
                    end_date: formatDateForInput(trip.end_date),      // 格式化日期
                    area: trip.area || ''
                  });
                }}>編輯</button>
                <button onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteTrip(trip.trip_id);
                }}>刪除</button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleShareTrip(trip.trip_id, trip);
                  }}
                  className="share-button"
                >
                  分享
              </button>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );

  // 修改表單部分的程式碼
  const renderDetailForm = () => (
    <div className="details-content">
      <form onSubmit={handleAddDetail} className="detail-form">
        <div className="form-group">
          <label htmlFor="location">地點 *</label>
          <input
            id="location"
            type="text"
            value={detailData.location}
            onChange={(e) => setDetailData({...detailData, location: e.target.value})}
            required
            placeholder="請輸入地點"
          />
        </div>
        <div className="form-group">
          <label htmlFor="date">日期 *</label>
          <input
            id="date"
            type="date"
            value={detailData.date}
            onChange={(e) => setDetailData({...detailData, date: e.target.value})}
            required
            min={tripData.start_date}
            max={tripData.end_date}
          />
        </div>
        <div className="form-group">
          <label htmlFor="start_time">開始時間 *</label>
          <input
            id="start_time"
            type="time"
            value={detailData.start_time}
            onChange={(e) => setDetailData({...detailData, start_time: e.target.value})}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="end_time">結束時間 *</label>
          <input
            id="end_time"
            type="time"
            value={detailData.end_time}
            onChange={(e) => setDetailData({...detailData, end_time: e.target.value})}
            required
          />
        </div>
        <div className="button-group">
          <button type="submit">確認新增</button>
          <button 
            type="button" 
            onClick={() => {
              setDetailMode('view');
              setDetailData({
                location: "",
                date: "",
                start_time: "",
                end_time: "",
              });
            }}
          >
            取消
          </button>
        </div>
      </form>
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
    </div>
  );
};

export default LineTrip;