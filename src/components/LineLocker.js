import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/LineLocker.css';

const GOOGLE_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
const API_BASE = 'https://tripbackend.vercel.app/api';

const Toast = ({ message, onClose }) => (
  <div className="toast">
    {message}
    <button onClick={onClose} style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer' }}>✖️</button>
  </div>
);

const LineLocker = () => {
  const navigate = useNavigate();
  const [region, setRegion] = useState('japan');
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
  // Toast 狀態
  const [toast, setToast] = useState('');
  // Google Maps 自動完成
  const [twSuggestions, setTwSuggestions] = useState([]);
  const [jpSuggestions, setJpSuggestions] = useState([]);

  // 時間選項
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = ['00', '15', '30', '45'];

  // 台灣地區地點自動完成
  const handleTwInputChange = async (e) => {
    const value = e.target.value;
    setTwSearch(value);
    if (value.length > 1) {
      const res = await fetch(
        `${API_BASE}/google_autocomplete?input=${encodeURIComponent(value)}&language=zh-TW&components=country:tw`
      );
      const data = await res.json();
      if (data.status === 'OK') {
        setTwSuggestions(data.predictions.map(p => p.description));
      } else {
        setTwSuggestions([]);
      }
    } else {
      setTwSuggestions([]);
    }
  };

  // 日本地區地點自動完成
  const handleJpInputChange = async (e) => {
    const value = e.target.value;
    setSearchParams({ ...searchParams, location: value });
    if (value.length > 1) {
      const res = await fetch(
        `${API_BASE}/google_autocomplete?input=${encodeURIComponent(value)}&language=ja&components=country:jp`
      );
      const data = await res.json();
      if (data.status === 'OK') {
        setJpSuggestions(data.predictions.map(p => p.description));
      } else {
        setJpSuggestions([]);
      }
    } else {
      setJpSuggestions([]);
    }
  };

  // 台灣地區定位
  const handleTwLocate = async () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async pos => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
          try {
            const res = await fetch(nominatimUrl);
            const data = await res.json();
            const address = data.address;
            let result = '';
            if (address) {
              const city = address.city || address.county || address.state || '';
              const town = address.town || address.suburb || address.city_district || address.district || '';
              result = `${city}${town ? ' ' + town : ''}`.trim();
            }
            setTwSearch(result || `${lat},${lon}`);
          } catch {
            setToast('定位失敗，請稍後再試');
          }
        },
        err => {
          setToast('定位失敗，請允許定位權限');
        }
      );
    } else {
      setToast('瀏覽器不支援定位');
    }
  };

  // 日本地區定位
  const handleJpLocate = async () => {
    setSearchParams(prev => ({ ...prev, location: '東京都新宿區' }));
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async pos => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
          try {
            const res = await fetch(nominatimUrl);
            const data = await res.json();
            const address = data.address;
            let result = '';
            if (address) {
              const city = address.city || address.county || address.state || '';
              const town = address.town || address.suburb || address.city_district || address.district || '';
              result = `${city}${town ? ' ' + town : ''}`.trim();
            }
            setSearchParams(prev => ({
              ...prev,
              location: '東京都新宿區'  //測試用
            }));
          } catch {
            setToast('定位失敗，請稍後再試');
          }
        },
        err => {
          setToast('定位失敗，請允許定位權限');
        }
      );
    } else {
      setToast('瀏覽器不支援定位');
    }
  };

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

    // 取得時間（預設 00:00~00:00）
    let timeFrom = "00:00";
    let timeTo = "00:00";
    if (searchParams.startTimeHour && searchParams.startTimeMin) {
      timeFrom = `${searchParams.startTimeHour}:${searchParams.startTimeMin}`;
    }
    if (searchParams.endTimeHour && searchParams.endTimeMin) {
      timeTo = `${searchParams.endTimeHour}:${searchParams.endTimeMin}`;
    }

    const url = `https://www.lalalocker.com/zh-TW/store/?q=${encodeURIComponent(twSearch)}&dateFrom=&timeFrom=${encodeURIComponent(timeFrom)}&dateTo=&timeTo=${encodeURIComponent(timeTo)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="line-locker-container">
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
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
          <div className="form-group" style={{ position: 'relative' }}>
            <label>地點</label>
            <input
              type="text"
              value={twSearch}
              onChange={handleTwInputChange}
              placeholder="例如：台北市信義區"
              style={{ paddingRight: '38px' }}
            />
            <button
              type="button"
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(20%)',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '22px',
                padding: 0,
              }}
              onClick={handleTwLocate}
              title="取得定位"
              aria-label="取得定位"
            >
              📍
            </button>
            {/* 自動完成建議 */}
            {twSuggestions.length > 0 && (
              <ul className="autocomplete-list">
                {twSuggestions.map((s, i) => (
                  <li key={i} onClick={() => { setTwSearch(s); setTwSuggestions([]); }}>{s}</li>
                ))}
              </ul>
            )}
          </div>
          <div className="form-group">
            <label>開始時間</label>
            <div className="time-group">
              <select
                value={searchParams.startTimeHour}
                onChange={e => setSearchParams({ ...searchParams, startTimeHour: e.target.value })}
              >
                <option value="">時</option>
                {hours.map(hour => (
                  <option key={`tw-start-${hour}`} value={hour}>{hour}</option>
                ))}
              </select>
              <span>:</span>
              <select
                value={searchParams.startTimeMin}
                onChange={e => setSearchParams({ ...searchParams, startTimeMin: e.target.value })}
              >
                <option value="">分</option>
                {minutes.map(min => (
                  <option key={`tw-start-${min}`} value={min}>{min}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>結束時間</label>
            <div className="time-group">
              <select
                value={searchParams.endTimeHour}
                onChange={e => setSearchParams({ ...searchParams, endTimeHour: e.target.value })}
              >
                <option value="">時</option>
                {hours.map(hour => (
                  <option key={`tw-end-${hour}`} value={hour}>{hour}</option>
                ))}
              </select>
              <span>:</span>
              <select
                value={searchParams.endTimeMin}
                onChange={e => setSearchParams({ ...searchParams, endTimeMin: e.target.value })}
              >
                <option value="">分</option>
                {minutes.map(min => (
                  <option key={`tw-end-${min}`} value={min}>{min}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="button-group">
            <button onClick={handleTaiwanSearch} className="search-button">
              搜尋
            </button>
          </div>
        </div>
      )}

      {/* 日本地區搜尋 */}
      {region === 'japan' && (
        <div className="search-form">
          <div className="form-group" style={{ position: 'relative' }}>
            <label>地點</label>
            <input
              type="text"
              value={searchParams.location}
              onChange={handleJpInputChange}
              placeholder="例如：東京都新宿區"
              style={{ paddingRight: '38px' }}
            />
            <button
              type="button"
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(20%)',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '22px',
                padding: 0,
              }}
              onClick={handleJpLocate}
              title="取得定位"
              aria-label="取得定位"
            >
              📍
            </button>
            {/* 自動完成建議 */}
            {jpSuggestions.length > 0 && (
              <ul className="autocomplete-list">
                {jpSuggestions.map((s, i) => (
                  <li key={i} onClick={() => {
                    setSearchParams(prev => ({ ...prev, location: s }));
                    setJpSuggestions([]);
                  }}>{s}</li>
                ))}
              </ul>
            )}
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
      )}
    </div>
  );
};

export default LineLocker;