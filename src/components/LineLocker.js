import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/LineLocker.css';

const LineLocker = () => {
  const navigate = useNavigate();
  const [region, setRegion] = useState('japan');

  // 日本地區搜尋用
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

  // 台灣地區搜尋用
  const [twSearch, setTwSearch] = useState('');

  // 時間選項
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = ['00', '15', '30', '45'];

  // 日本地區搜尋
  const handleSearch = async () => {
    try {
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

      setLoading(true);

      // 使用 OpenStreetMap Nominatim API
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchParams.location)}&limit=1`
      );

      if (!response.ok) {
        throw new Error('地點搜尋失敗');
      }

      const data = await response.json();

      if (!data || data.length === 0) {
        throw new Error('無法解析該地點名稱');
      }

      const location = data[0];

      // 組合 URL
      const params = new URLSearchParams({
        name: searchParams.location,
        startDate: searchParams.startDate,
        endDate: searchParams.endDate || searchParams.startDate,
        startDateTimeHour: searchParams.startTimeHour,
        startDateTimeMin: searchParams.startTimeMin,
        endDateTimeHour: searchParams.endTimeHour,
        endDateTimeMin: searchParams.endTimeMin,
        bagSize: searchParams.bagSize,
        suitcaseSize: searchParams.suitcaseSize,
        lat: location.lat,
        lon: location.lon,
        isLocation: 'false'
      });

      const url = `https://cloak.ecbo.io/zh-TW/locations?${params.toString()}`;

      // 判斷是否在行動裝置
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      if (isMobile) {
        window.location.href = url;
      } else {
        window.open(url, '_blank');
      }

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
    const maxCount = 5;
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

  // 台灣地區搜尋
  const handleTaiwanSearch = () => {
    if (!twSearch) return;
    const url = `https://www.lalalocker.com/zh-TW/store/?q=${encodeURIComponent(twSearch)}&dateFrom=&timeFrom=00%3A00&dateTo=&timeTo=00%3A00`;
    window.open(url, '_blank');
  };

  return (
    <div className="line-locker-container">
      <header className="locker-header">
        <div className="header-content">
          <h1>寄物點查找</h1>
          <p>尋找最方便的行李寄存點</p>
          <div className="header-wave"></div>
        </div>
      </header>

      {/* 地區選擇 Segmented Control */}
      <div className="region-segmented-group">
        <button
          className={`region-segment${region === 'japan' ? ' active' : ''}`}
          onClick={() => setRegion('japan')}
          type="button"
          aria-pressed={region === 'japan'}
        >
          日本
        </button>
        <button
          className={`region-segment${region === 'taiwan' ? ' active' : ''}`}
          onClick={() => setRegion('taiwan')}
          type="button"
          aria-pressed={region === 'taiwan'}
        >
          台灣
        </button>
      </div>

      {/* 台灣地區搜尋 */}
      {region === 'taiwan' && (
        <div className="search-form">
          <div className="form-group">
            <label>地點</label>
            <input
              type="text"
              value={twSearch}
              onChange={e => setTwSearch(e.target.value)}
              placeholder="例如：台北101"
            />
          </div>
          <div className="button-group">
            <button onClick={handleTaiwanSearch} className="search-button">
              搜尋
            </button>
          </div>
        </div>
      )}

      {/* 日本地區：顯示原本搜尋表單與結果 */}
      {region === 'japan' && (
        <>
          <div className="search-form">
            <div className="form-group">
              <label>地點</label>
              <input
                type="text"
                value={searchParams.location}
                onChange={(e) => setSearchParams({ ...searchParams, location: e.target.value })}
                placeholder="例如：東京都新宿區"
              />
            </div>

            <div className="form-group">
              <label>日期</label>
              <input
                type="date"
                value={searchParams.startDate}
                onChange={(e) => setSearchParams({ ...searchParams, startDate: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="form-group">
              <label>使用時間</label>
              <div className="time-inputs">
                <div className="time-group">
                  <span>開始時間</span>
                  <select
                    value={searchParams.startTimeHour}
                    onChange={(e) => setSearchParams({ ...searchParams, startTimeHour: e.target.value })}
                  >
                    <option value="">時</option>
                    {hours.map(hour => (
                      <option key={`start-${hour}`} value={hour}>{hour}</option>
                    ))}
                  </select>
                  <span>:</span>
                  <select
                    value={searchParams.startTimeMin}
                    onChange={(e) => setSearchParams({ ...searchParams, startTimeMin: e.target.value })}
                  >
                    <option value="">分</option>
                    {minutes.map(min => (
                      <option key={`start-${min}`} value={min}>{min}</option>
                    ))}
                  </select>
                </div>

                <div className="time-group">
                  <span>結束時間</span>
                  <select
                    value={searchParams.endTimeHour}
                    onChange={(e) => setSearchParams({ ...searchParams, endTimeHour: e.target.value })}
                  >
                    <option value="">時</option>
                    {hours.map(hour => (
                      <option key={`end-${hour}`} value={hour}>{hour}</option>
                    ))}
                  </select>
                  <span>:</span>
                  <select
                    value={searchParams.endTimeMin}
                    onChange={(e) => setSearchParams({ ...searchParams, endTimeMin: e.target.value })}
                  >
                    <option value="">分</option>
                    {minutes.map(min => (
                      <option key={`end-${min}`} value={min}>{min}</option>
                    ))}
                  </select>
                </div>
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
                      disabled={searchParams.bagSize === '0'}
                    >
                      -
                    </button>
                    <span>{searchParams.bagSize}</span>
                    <button
                      type="button"
                      onClick={() => handleBaggageChange('bagSize', 'increase')}
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
                      disabled={searchParams.suitcaseSize === '0'}
                    >
                      -
                    </button>
                    <span>{searchParams.suitcaseSize}</span>
                    <button
                      type="button"
                      onClick={() => handleBaggageChange('suitcaseSize', 'increase')}
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
              <button onClick={handleSearch} disabled={loading} className="search-button">
                {loading ? '搜尋中...' : '搜尋'}
              </button>
              <button onClick={handleReset} className="reset-button">
                重設
              </button>
            </div>
          </div>

          {/* 日本搜尋結果區塊 */}
          <div className="results-container">
            {searchResults.map((item, index) => (
              <div key={index} className="locker-card">
                <div className="locker-image">
                  <img src={item.image_url} alt={item.name} />
                </div>
                <div className="locker-info">
                  <h3>{item.name}</h3>
                  <p className="rating">⭐ {item.rating}</p>
                  <div className="price-info">
                    <p>💼 大型行李：{item.suitcase_price}</p>
                    <p>👜 小型行李：{item.bag_price}</p>
                  </div>
                  <a href={item.link} target="_blank" rel="noopener noreferrer">
                    查看詳情
                  </a>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default LineLocker;