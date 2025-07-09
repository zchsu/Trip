import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/LineLocker.css';

const areaOptions = [
  '北部地區', '中部地區', '南部地區', '離島地區'
];

const LineLocker = () => {
  const navigate = useNavigate();
  const [region, setRegion] = useState('japan');
  const [twArea, setTwArea] = useState('北部地區');
  const [twSites, setTwSites] = useState([]); // 全部地點
  const [twAreaSites, setTwAreaSites] = useState([]); // 當前區域地點
  const [selectedSite, setSelectedSite] = useState(null); // 選中的地點物件
  const [lockerDetail, setLockerDetail] = useState(null); // locker 詳細
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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

  // 時間選項
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = ['00', '15', '30', '45'];

  // 取得所有台灣地點
  useEffect(() => {
    if (region === 'taiwan') {
      setLoading(true);
      fetch('https://owlocker.com/api/info')
        .then(res => res.json())
        .then(data => {
          // 支援多個地點
          let allSites = [];
          if (Array.isArray(data.sites)) {
            allSites = data.sites;
          } else if (data.sites) {
            allSites = [data.sites];
          }
          setTwSites(allSites);
        })
        .catch(() => setTwSites([]))
        .finally(() => setLoading(false));
    }
  }, [region]);

  // 根據地區分類
  useEffect(() => {
    if (region === 'taiwan') {
      setSelectedSite(null);
      setLockerDetail(null);
      setTwAreaSites(
        twSites.filter(site => site.area_i18n && site.area_i18n['zh-TW'] === twArea)
      );
    }
  }, [twArea, twSites, region]);

  // 點擊地點取得詳細
  const handleSiteClick = async (site) => {
    setSelectedSite(site);
    setLockerDetail(null);
    setLoading(true);
    try {
      const res = await fetch(`https://owlocker.com/api/locker/${site.site_no}`);
      const data = await res.json();
      setLockerDetail(data);
    } catch (e) {
      setLockerDetail(null);
    } finally {
      setLoading(false);
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

      {/* 台灣地區 */}
      {region === 'taiwan' && (
        <>
          <div className="tw-area-select-group">
            <label htmlFor="tw-area-select">選擇區域：</label>
            <select
              id="tw-area-select"
              value={twArea}
              onChange={e => {
                setTwArea(e.target.value);
                setSelectedSite(null);
                setLockerDetail(null);
              }}
            >
              {areaOptions.map(area => (
                <option key={area} value={area}>{area}</option>
              ))}
            </select>
          </div>
          <div className="results-container">
            {loading && <div>載入中...</div>}
            {!selectedSite && !loading && (
              <ul className="tw-site-list">
                {twAreaSites.map(site => (
                  <li
                    key={site.site_no}
                    className="tw-site-item"
                    onClick={() => handleSiteClick(site)}
                  >
                    {site.site_i18n && site.site_i18n['zh-TW']}
                  </li>
                ))}
                {twAreaSites.length === 0 && <li>此區域暫無資料</li>}
              </ul>
            )}
            {/* Locker 詳細 */}
            {selectedSite && lockerDetail && (
              <div className="tw-locker-detail">
                <h3>{selectedSite.site_i18n['zh-TW']}</h3>
                <div className="tw-locker-table-wrap">
                  <table className="tw-locker-table">
                    <thead>
                      <tr>
                        <th>規格</th>
                        <th>剩餘空櫃</th>
                        <th>總數</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSite.lockers_type.map((locker, idx) => (
                        <tr key={locker.size}>
                          <td>{locker.size}</td>
                          <td>{locker.empty}</td>
                          <td>{locker.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="tw-locker-update">
                    更新時間：{selectedSite.updated_at}
                  </div>
                </div>
                {/* 嵌入地圖 */}
                {lockerDetail.iframe_map && (
                  <div className="tw-locker-map">
                    <iframe
                      src={lockerDetail.iframe_map}
                      title="地圖"
                      width="100%"
                      height="300"
                      style={{ border: 0, borderRadius: 8 }}
                      allowFullScreen=""
                      loading="lazy"
                    ></iframe>
                  </div>
                )}
                {/* 價格表 */}
                <div className="tw-locker-price-table-wrap">
                  <h4>價格表</h4>
                  <table className="tw-locker-price-table">
                    <thead>
                      <tr>
                        <th>時數區間</th>
                        <th>尺寸</th>
                        <th>單位費用</th>
                        <th>單位時數</th>
                        <th>規格(cm)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lockerDetail.price.map((period, idx) =>
                        period.fee.map((fee, fidx) => (
                          <tr key={idx + '-' + fidx}>
                            <td>
                              {period.min_hour}~{period.max_hour}小時
                            </td>
                            <td>{fee.size}</td>
                            <td>{fee.unit_fee}元</td>
                            <td>{fee.unit_hour}小時</td>
                            <td>{fee.spec}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                  <div className="tw-locker-note">
                    最長可寄存 {lockerDetail.lonest_day} 天，逾期 {lockerDetail.over_day} 天將處理。
                  </div>
                </div>
                {/* 支付方式 */}
                <div className="tw-locker-payment">
                  <h4>支付方式</h4>
                  <ul>
                    {Object.entries(lockerDetail.payment).filter(([k, v]) => v).map(([k]) => (
                      <li key={k}>{k}</li>
                    ))}
                  </ul>
                </div>
                <button className="tw-locker-back-btn" onClick={() => setSelectedSite(null)}>
                  返回地點列表
                </button>
              </div>
            )}
          </div>
        </>
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