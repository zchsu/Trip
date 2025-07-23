import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/LineLocker.css';

const API_BASE = 'https://tripbackend.vercel.app/api';

const Toast = ({ message, onClose }) => (
  <div className="toast">
    {message}
    <button onClick={onClose} style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer' }}>✖️</button>
  </div>
);

const TAIWAN_REGIONS = ['北部地區', '中部地區', '南部地區', '離島地區'];

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
  const [error, setError] = useState(null);

  // 台灣地區搜尋用
  const [twSearch, setTwSearch] = useState('');
  const [twSelectedRegion, setTwSelectedRegion] = useState('北部地區');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [twLockerData, setTwLockerData] = useState([]);
  const [expandedSite, setExpandedSite] = useState(null); // 新增：收合狀態

  // 時間選項
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = ['00', '15', '30', '45'];

  // 取得台灣 locker 資料
  useEffect(() => {
    fetch('https://tripapi-henna.vercel.app/api/owlocker_info')
      .then(res => res.json())
      .then(data => {
        // 修正：合併所有 sites
        const allSites = Array.isArray(data)
          ? data.flatMap(item => item.sites || [])
          : [];
        setTwLockerData(allSites);
      })
      .catch(() => setToast('台灣寄物點資料取得失敗'));
  }, []);

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

  // 使用者選擇地區後才 fetch 資料
  const handleRegionSelect = async (regionKey) => {
    setTwSelectedRegion(regionKey);
    setLoading(true);
    setTwLockerData([]);
    setToast('');
    try {
      const res = await fetch('https://tripapi-henna.vercel.app/api/owlocker_info');
      const data = await res.json();
      setTwLockerData(data.sites || []);
    } catch {
      setToast('台灣寄物點資料取得失敗');
    } finally {
      setLoading(false);
    }
  };

  // 依地區篩選
  const filteredTwLockers = twLockerData.filter(
    site => site.area_i18n?.['zh-TW'] === twSelectedRegion
  );

  // 點擊地名收合/展開
  const handleSiteClick = (site_no) => {
    setExpandedSite(expandedSite === site_no ? null : site_no);
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
          <div className="form-group">
            <label>地區篩選</label>
            <div className="region-select-group">
              {TAIWAN_REGIONS.map(r => (
                <button
                  key={r}
                  type="button"
                  className={`region-select${twSelectedRegion === r ? ' active' : ''}`}
                  onClick={() => setTwSelectedRegion(r)}
                >
                  {r.replace('地區', '')}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label>地名列表</label>
            {loading ? (
              <div>載入中...</div>
            ) : (
              <ul className="tw-locker-list" style={{paddingLeft: 0, marginLeft: 0}}>
                {twSelectedRegion === ''
                  ? <li>請先選擇地區</li>
                  : filteredTwLockers.length === 0
                    ? <li>此地區暫無寄物點</li>
                    : filteredTwLockers.map(site => {
                        // 只顯示地名，不顯示前面三碼編號
                        const fullName = site.site_i18n?.['zh-TW'] || site.site_no;
                        // 用正則移除前面三碼及空格（如 "101 ~ 102 台北101 ( 1F )" => "台北101 ( 1F )"）
                        const displayName = fullName.replace(/^\d+\s*~\s*\d+\s*/,'').replace(/^\d+\s*/, '');
                        return (
                          <li key={site.site_no} style={{overflow: 'visible', padding: '0'}}>
                            <button
                              type="button"
                              className="locker-site-btn"
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                textAlign: 'left',
                                width: '100%',
                                fontSize: 'inherit',
                                padding: '8px 0',
                                color: '#222',
                                whiteSpace: 'normal',
                                wordBreak: 'break-all',
                                justifyContent: 'flex-start',
                                display: 'block'
                              }}
                              onClick={() => handleSiteClick(site.site_no)}
                            >
                              {displayName}
                              {expandedSite === site.site_no ? ' ▲' : ' ▼'}
                            </button>
                            {expandedSite === site.site_no && (
                              <div className="locker-detail" style={{ margin: '8px 0 12px 12px', fontSize: '0.95em', background: '#f8f8f8', borderRadius: '6px', padding: '8px' }}>
                                <div>更新時間：{site.updated_at}</div>
                                <table style={{ width: '100%', marginTop: '6px', borderCollapse: 'collapse' }}>
                                  <thead>
                                    <tr>
                                      <th style={{ textAlign: 'left', padding: '2px 6px' }}>尺寸</th>
                                      <th style={{ textAlign: 'right', padding: '2px 6px' }}>總數</th>
                                      <th style={{ textAlign: 'right', padding: '2px 6px' }}>空櫃</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {site.lockers_type.map(locker => (
                                      <tr key={locker.size}>
                                        <td style={{ padding: '2px 6px' }}>{locker.size}</td>
                                        <td style={{ textAlign: 'right', padding: '2px 6px' }}>{locker.total}</td>
                                        <td style={{ textAlign: 'right', padding: '2px 6px' }}>{locker.empty}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </li>
                        );
                      })
                }
              </ul>
            )}
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
              onChange={e => setSearchParams({ ...searchParams, location: e.target.value })}
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