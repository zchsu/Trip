import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Locker = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useState({
    location: '',
    startDate: '',
    endDate: '',
    startTimeHour: '',
    startTimeMin: '',
    endTimeHour: '',
    endTimeMin: '',
    bagSize: '0',
    suitcaseSize: '0'
  });

  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 時間選項
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = ['00', '15', '30', '45'];

  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  // 生成預約連結的函數
  const generateBookingLink = (baseLink) => {
    const params = new URLSearchParams();
    params.append('startDate', searchParams.startDate);
    params.append('endDate', searchParams.endDate || searchParams.startDate);
    params.append('startDateTimeHour', searchParams.startTimeHour);
    params.append('startDateTimeMin', searchParams.startTimeMin);
    params.append('endDateTimeHour', searchParams.endTimeHour);
    params.append('endDateTimeMin', searchParams.endTimeMin);
    params.append('bagSize', searchParams.bagSize);
    params.append('suitcaseSize', searchParams.suitcaseSize);
    
    // 取出基本鏈接的路徑部分（去掉任何已有的查詢參數）
    const baseUrl = baseLink.split('?')[0];
    
    return `${baseUrl}?${params.toString()}`;
  };

  const handleSearch = async (page = 1) => {
    setLoading(true);
    setError(null);
    
    try {
      // 驗證輸入
      if (!searchParams.location) {
        throw new Error('請輸入搜尋地點');
      }
      if (!searchParams.startDate) {
        throw new Error('請選擇開始日期');
      }
      if (!searchParams.startTimeHour || !searchParams.startTimeMin) {
        throw new Error('請選擇開始時間');
      }
      if (!searchParams.endTimeHour || !searchParams.endTimeMin) {
        throw new Error('請選擇結束時間');
      }
  
      // 創建純淨的搜尋參數物件 - 只包含需要的數據，避免循環引用
      const searchData = {
        location: searchParams.location,
        startDate: searchParams.startDate,
        endDate: searchParams.endDate || searchParams.startDate,
        startTimeHour: searchParams.startTimeHour,
        startTimeMin: searchParams.startTimeMin,
        endTimeHour: searchParams.endTimeHour,
        endTimeMin: searchParams.endTimeMin,
        bagSize: searchParams.bagSize,
        suitcaseSize: searchParams.suitcaseSize,
        page: page,
        per_page: 5
      };
  
      const response = await fetch('http://localhost:5000/search-lockers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(searchData)
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '搜尋失敗，請稍後再試');
      }
  
      const data = await response.json();
      
      // 修改結果中的連結，使用前端生成的完整參數
      const resultsWithCorrectLinks = data.results.map(item => ({
        ...item,
        originalLink: item.link,  // 保存原始連結以備不時之需
        link: generateBookingLink(item.link)  // 使用我們的函數生成新連結
      }));
      
      setSearchResults(resultsWithCorrectLinks);
      setPagination(data.pagination);
      setCurrentPage(page);
    } catch (error) {
      setError(error.message);
      console.error('搜尋失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSearchParams({
      location: '',
      startDate: '',
      endDate: '',
      startTimeHour: '',
      startTimeMin: '',
      endTimeHour: '',
      endTimeMin: '',
      bagSize: '0',
      suitcaseSize: '0'
    });
    setSearchResults([]);
    setError(null);
  };

  const handleBaggageChange = (type, operation) => {
    const maxCount = 5; // 設定最大行李數量
    const currentValue = parseInt(searchParams[type]);
    
    let newValue;
    if (operation === 'increase') {
      newValue = Math.min(currentValue + 1, maxCount);
    } else {
      newValue = Math.max(currentValue - 1, 0);
    }
    
    setSearchParams({
      ...searchParams,
      [type]: newValue.toString()
    });
  };

  // 使用一個正常的函數進行搜尋，避免事件對象被傳入
  const handleSearchClick = () => {
    handleSearch(1);
  };

  // 處理連結點擊的函數，可以用於調試或添加自定義行為
  const handleLinkClick = (e, link) => {
    // 如果需要在點擊連結時執行一些額外邏輯，可以在這裡添加
    console.log("點擊預約連結:", link);
    
    // 這裡我們可以在控制台輸出所有搜索參數，用於調試
    console.log("搜索參數:", searchParams);
    
    // 不阻止默認行為，讓用戶正常導航到連結
  };

  return (
    <div className="locker-container">
      <h1>寄物處搜尋</h1>
      
      <div className="search-form">
        {/* 表單內容保持不變 */}
        <div className="form-group">
          <label>地點</label>
          <input
            type="text"
            value={searchParams.location}
            onChange={(e) => setSearchParams({...searchParams, location: e.target.value})}
            placeholder="例如：東京都新宿區"
          />
        </div>

        <div className="form-group">
          <label>日期範圍</label>
          <div className="date-inputs">
            <input
              type="date"
              value={searchParams.startDate}
              onChange={(e) => setSearchParams({...searchParams, startDate: e.target.value})}
              min={new Date().toISOString().split('T')[0]}
            />
            <span>至</span>
            <input
              type="date"
              value={searchParams.endDate}
              onChange={(e) => setSearchParams({...searchParams, endDate: e.target.value})}
              min={searchParams.startDate}
            />
          </div>
        </div>

        <div className="form-group">
          <label>使用時間</label>
          <div className="time-inputs">
            <select
              value={searchParams.startTimeHour}
              onChange={(e) => setSearchParams({...searchParams, startTimeHour: e.target.value})}
            >
              <option value="">時</option>
              {hours.map(hour => (
                <option key={`start-${hour}`} value={hour}>{hour}</option>
              ))}
            </select>
            <span>:</span>
            <select
              value={searchParams.startTimeMin}
              onChange={(e) => setSearchParams({...searchParams, startTimeMin: e.target.value})}
            >
              <option value="">分</option>
              {minutes.map(min => (
                <option key={`start-${min}`} value={min}>{min}</option>
              ))}
            </select>
            <span>至</span>
            <select
              value={searchParams.endTimeHour}
              onChange={(e) => setSearchParams({...searchParams, endTimeHour: e.target.value})}
            >
              <option value="">時</option>
              {hours.map(hour => (
                <option key={`end-${hour}`} value={hour}>{hour}</option>
              ))}
            </select>
            <span>:</span>
            <select
              value={searchParams.endTimeMin}
              onChange={(e) => setSearchParams({...searchParams, endTimeMin: e.target.value})}
            >
              <option value="">分</option>
              {minutes.map(min => (
                <option key={`end-${min}`} value={min}>{min}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>行李數量</label>
          <div className="baggage-inputs">
            <div className="baggage-counter">
              <span>小型行李</span>
              <div className="counter-controls">
                <button 
                  type="button"
                  onClick={() => handleBaggageChange('bagSize', 'decrease')}
                  className="counter-button"
                  disabled={searchParams.bagSize === '0'}
                >
                  -
                </button>
                <span className="count-display">{searchParams.bagSize}</span>
                <button 
                  type="button"
                  onClick={() => handleBaggageChange('bagSize', 'increase')}
                  className="counter-button"
                  disabled={searchParams.bagSize === '5'}
                >
                  +
                </button>
              </div>
            </div>
            <div className="baggage-counter">
              <span>大型行李</span>
              <div className="counter-controls">
                <button 
                  type="button"
                  onClick={() => handleBaggageChange('suitcaseSize', 'decrease')}
                  className="counter-button"
                  disabled={searchParams.suitcaseSize === '0'}
                >
                  -
                </button>
                <span className="count-display">{searchParams.suitcaseSize}</span>
                <button 
                  type="button"
                  onClick={() => handleBaggageChange('suitcaseSize', 'increase')}
                  className="counter-button"
                  disabled={searchParams.suitcaseSize === '5'}
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="button-group">
          <button 
            onClick={handleSearchClick} 
            disabled={loading} 
            className="search-button"
          >
            {loading ? (
              <>
                <span className="spinner"></span> 搜尋中...
              </>
            ) : '搜尋'}
          </button>
          <button onClick={handleReset} className="reset-button">
            重設
          </button>
          <button onClick={() => navigate(-1)} className="back-button">
            返回
          </button>
        </div>
      </div>

      <div className="results-container">
        {searchResults.map((item, index) => (
          <div key={index} className="locker-card">
            <div className="locker-image">
              <img src={item.image_url} alt={item.name} />
            </div>
            <div className="locker-info">
              <h3>{item.name}</h3>
              <p className="category">{item.category}</p>
              <p className="rating">⭐ {item.rating}</p>
              <div className="price-info">
                <p>💼 大型行李：{item.suitcase_price}</p>
                <p>👜 小型行李：{item.bag_price}</p>
              </div>
              <a 
                href={item.link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="details-link"
                onClick={(e) => handleLinkClick(e, item.link)}
              >
                前往預約 →
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* 分頁控制 */}
      {pagination && pagination.total_pages > 1 && (
        <div className="pagination">
          <button 
            onClick={() => {
              //alert('正在搜尋上一頁，請稍候...');
              handleSearch(currentPage - 1);
            }}
            disabled={currentPage === 1 || loading}
            className="page-button"
          >
            {loading && currentPage > 1 ? '搜尋中...' : '上一頁'}
          </button>
          <span className="page-info">
            第 {currentPage} 頁，共 {pagination.total_pages} 頁
          </span>
          <button 
            onClick={() => {
              //alert('正在搜尋下一頁，請稍候...');
              handleSearch(currentPage + 1);
            }}
            disabled={currentPage === pagination.total_pages || loading}
            className="page-button"
          >
            {loading && currentPage < pagination.total_pages ? '搜尋中...' : '下一頁'}
          </button>
        </div>
      )}
    </div>
  );
};

export default Locker;