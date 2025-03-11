import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/trip.css";

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

  const [friends, setFriends] = useState([]);
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [pendingFriends, setPendingFriends] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [editParticipants, setEditParticipants] = useState([]);
  const [pendingInvitations, setPendingInvitations] = useState([]);

  useEffect(() => {
    if (!userId) {
      navigate("/login");
      return;
    }
    fetchTrips();
    fetchFriends();
    fetchPendingFriends();
    fetchPendingInvitations();
  }, []);
  
  const fetchTrips = async () => {
    try {
      // 獲取用戶創建的行程
      const createdResponse = await fetch(`http://localhost:5000/trip/${userId}`);
      let createdTrips = await createdResponse.json();
      
      if (Array.isArray(createdTrips) && Array.isArray(createdTrips[0])) {
        createdTrips = createdTrips[0];
      }
  
      // 獲取用戶接受邀請的行程
      const acceptedResponse = await fetch(`http://localhost:5000/trip/accepted/${userId}`);
      const acceptedTrips = await acceptedResponse.json();
  
      // 合併兩種行程並設置標記
      const allTrips = [
        ...createdTrips.map(trip => ({ ...trip, isCreator: true })),
        ...acceptedTrips.map(trip => ({ ...trip, isCreator: false }))
      ];
  
      setTrips(allTrips);
      console.log("所有行程:", allTrips);
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

  const startEditTrip = async (trip) => {
    setTripData({
      ...trip,
      start_date: new Date(trip.start_date).toISOString().split("T")[0],
      end_date: new Date(trip.end_date).toISOString().split("T")[0],
    });
    setCurrentTrip(trip.trip_id);
    
    // 獲取當前參與者
    try {
      const response = await fetch(`http://localhost:5000/trip/participants/${trip.trip_id}`);
      const data = await response.json();
      setEditParticipants(data.map(p => p.user_id));
    } catch (error) {
      console.error("無法取得參與者列表:", error);
    }
    
    setMode("edit");
  };

  const handleEditTrip = async (e) => {
    e.preventDefault();
    console.log("正在更新行程:", tripData);
  
    try {
      // 更新行程基本資訊
      const response = await fetch(`http://localhost:5000/trip/${currentTrip}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tripData),
      });
  
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "更新失敗");
      }
  
      // 更新參與者，排除已經拒絕的參與者
      const currentParticipants = participants.filter(p => p.status !== 'rejected');
      const participantsToUpdate = editParticipants.filter(id => 
        currentParticipants.some(p => p.user_id === id) || 
        !currentParticipants.some(p => p.user_id === id)
      );
  
      const participantsResponse = await fetch(`http://localhost:5000/trip/participants/${currentTrip}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participant_ids: participantsToUpdate }),
      });
  
      if (!participantsResponse.ok) {
        throw new Error("更新參與者失敗");
      }
  
      alert("行程更新成功");
      setMode("list");
      fetchTrips();
    } catch (error) {
      console.error("行程更新錯誤:", error);
      alert("更新失敗：" + error.message);
    }
  };
  
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      day: '2-digit',
      month: 'short'
    });
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
      fetchParticipants(tripId);
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

  // 新增取得好友列表的函數
  const fetchFriends = async () => {
    try {
      const response = await fetch(`http://localhost:5000/friends/${userId}`);
      const data = await response.json();
      setFriends(data);
    } catch (error) {
      console.error("無法取得好友列表:", error);
    }
  };

  // 新增邀請好友的函數
  const inviteFriend = async (friendId) => {
    try {
      const response = await fetch("http://localhost:5000/trip/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trip_id: currentTrip,
          friend_id: friendId
        }),
      });

      if (response.ok) {
        alert("已邀請好友參加行程");
      } else {
        const data = await response.json();
        alert("邀請失敗：" + data.error);
      }
    } catch (error) {
      console.error("邀請好友失敗:", error);
    }
  };

  // 新增獲取待處理好友請求的函數
const fetchPendingFriends = async () => {
  try {
    const response = await fetch(`http://localhost:5000/friendship/pending/${userId}`);
    const data = await response.json();
    setPendingFriends(data);
  } catch (error) {
    console.error("無法取得待處理的好友請求:", error);
  }
};

// 新增處理好友請求的函數
const handleFriendRequest = async (friendshipId, status) => {
  try {
    const response = await fetch(`http://localhost:5000/friendship/${friendshipId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });

    if (response.ok) {
      alert(status === 'accepted' ? '已接受好友請求' : '已拒絕好友請求');
      fetchPendingFriends();
      fetchFriends();
    }
  } catch (error) {
    console.error("處理好友請求失敗:", error);
  }
};

// 新增獲取行程參與者的函數
const fetchParticipants = async (tripId) => {
  try {
    const response = await fetch(`http://localhost:5000/trip/participants/${tripId}`);
    const data = await response.json();
    setParticipants(data);
  } catch (error) {
    console.error("無法取得行程參與者:", error);
  }
};

// 新增獲取待處理行程邀請的函數
const fetchPendingInvitations = async () => {
  try {
    const response = await fetch(`http://localhost:5000/trip/invitations/${userId}`);
    const data = await response.json();
    setPendingInvitations(data);
  } catch (error) {
    console.error("無法取得待處理的行程邀請:", error);
  }
};

// 新增處理行程邀請的函數
const handleInvitation = async (tripId, status) => {
  try {
    const response = await fetch(`http://localhost:5000/trip/invitation/${tripId}/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });

    if (response.ok) {
      alert(status === 'accepted' ? '已接受行程邀請' : '已拒絕行程邀請');
      fetchPendingInvitations();
    }
  } catch (error) {
    console.error("處理行程邀請失敗:", error);
  }
};
  
  return (
    <div className="trip-container">
      {mode === "list" && (
          <>
            <h1>行程管理</h1>
            {/* 行程邀請區塊 */}
              {pendingInvitations.length > 0 && (
                <div className="trip-invitations">
                  <h3>待處理的行程邀請</h3>
                  <ul>
                    {pendingInvitations.map(invitation => (
                      <li key={invitation.trip_id} className="invitation-item">
                        <div className="invitation-info">
                          <h4>{invitation.title}</h4>
                          <p>📍 {invitation.area}</p>
                          <p>📅 {invitation.start_date} - {invitation.end_date}</p>
                          <p>邀請人: {invitation.inviter_name}</p>
                        </div>
                        <div className="invitation-actions">
                          <button 
                            onClick={() => handleInvitation(invitation.trip_id, 'accepted')}
                            className="accept-btn"
                          >
                            接受邀請
                          </button>
                          <button 
                            onClick={() => handleInvitation(invitation.trip_id, 'rejected')}
                            className="reject-btn"
                          >
                            拒絕邀請
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            {/* 好友請求區塊 */}
            {pendingFriends.length > 0 && (
              <div className="friend-requests">
                <h3>待處理的好友請求</h3>
                <ul>
                  {pendingFriends.map(request => (
                    <li key={request.friendship_id}>
                      <span>{request.username}</span>
                      <button onClick={() => handleFriendRequest(request.friendship_id, 'accepted')}>
                        接受
                      </button>
                      <button onClick={() => handleFriendRequest(request.friendship_id, 'rejected')}>
                        拒絕
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <button onClick={() => setMode("add")}>新增行程</button>
            <button onClick={() => navigate("/")}>返回首頁</button>
            {trips.length === 0 ? (
              <p>目前沒有行程</p>
            ) : (
              <ul className="trip-list">
                {trips.map((trip) => (
                  <li key={trip.trip_id}>
                    <h3>{trip.title}</h3>
                    <p>{trip.description}</p>
                    <p>📍 {trip.area}</p>
                    <p>📅 {formatDate(trip.start_date)} - {formatDate(trip.end_date)}</p>
                    {!trip.isCreator && <p>👤 創建者: {trip.creator_name}</p>}
                    

                    {/* 只有創建者可以編輯和刪除 */}
                    {trip.isCreator ? (
                      <>
                        <button onClick={() => startEditTrip(trip)}>編輯</button>
                        <button onClick={() => handleDelete(trip.trip_id)}>刪除</button>
                      </>
                    ) : null}
                    <button onClick={() => fetchTripDetails(trip.trip_id)}>查看行程細節</button>
                    
                    {showDetails && selectedTripId === trip.trip_id && (
                      <div className="trip-details">
                        <h4>行程細節</h4>

                        {/* 參與者列表 */}
                        <div className="participants">
                          <h5>參與者</h5>
                          <ul>
                            {participants.map(participant => (
                              <li key={participant.user_id}>
                                {participant.username}
                                <span className={`participant-status status-${participant.status}`}>
                                  {participant.status === 'accepted' ? '已接受' :
                                  participant.status === 'invited' ? '待確認' : '已拒絕'}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* 只有創建者可以新增和編輯行程細節 */}
                          {trip.isCreator && (
                            <button onClick={() => setDetailMode("add")}>新增細節</button>
                          )}
                        
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
            <div>
        <h3>選擇同行好友</h3>
        {friends.map(friend => (
          <div key={friend.user_id}>
            <input
              type="checkbox"
              id={`friend-${friend.user_id}`}
              value={friend.user_id}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedFriends([...selectedFriends, friend.user_id]);
                } else {
                  setSelectedFriends(selectedFriends.filter(id => id !== friend.user_id));
                }
              }}
            />
            <label htmlFor={`friend-${friend.user_id}`}>{friend.username}</label>
          </div>
        ))}
      </div>
            <button type="submit">提交</button>
          </form>
          <button onClick={() => setMode("list")}>返回</button>
        </>
      )}

{mode === "edit" && (
  <>
    <h1>編輯行程</h1>
    <form onSubmit={handleEditTrip}>
      <input 
        name="title" 
        placeholder="行程標題" 
        value={tripData.title}
        onChange={handleChange} 
        required 
      />
      <textarea 
        name="description" 
        placeholder="行程描述" 
        value={tripData.description}
        onChange={handleChange} 
      />
      <input 
        type="date" 
        name="start_date" 
        value={tripData.start_date}
        onChange={handleChange} 
        required 
      />
      <input 
        type="date" 
        name="end_date" 
        value={tripData.end_date}
        onChange={handleChange} 
        required 
      />
      <input 
        name="area" 
        placeholder="地點" 
        value={tripData.area}
        onChange={handleChange} 
        required 
      />
      <input 
        name="tags" 
        placeholder="標籤 (逗號分隔)" 
        value={tripData.tags}
        onChange={handleChange} 
      />
      <input 
        name="budget" 
        placeholder="預算" 
        type="number" 
        value={tripData.budget}
        onChange={handleChange} 
      />
      
      <div className="participant-section">
        <h3>修改同行好友</h3>
        {friends.map(friend => (
          <div key={friend.user_id} className="friend-checkbox">
            <input
              type="checkbox"
              id={`edit-friend-${friend.user_id}`}
              checked={editParticipants.includes(friend.user_id)}
              onChange={(e) => {
                if (e.target.checked) {
                  setEditParticipants([...editParticipants, friend.user_id]);
                } else {
                  setEditParticipants(editParticipants.filter(id => id !== friend.user_id));
                }
              }}
            />
            <label htmlFor={`edit-friend-${friend.user_id}`}>{friend.username}</label>
          </div>
        ))}
      </div>
      
      <div className="button-group">
        <button type="submit">更新</button>
        <button type="button" onClick={() => setMode("list")}>返回</button>
      </div>
    </form>
  </>
)}
    </div>
  );
};

export default Trip;
