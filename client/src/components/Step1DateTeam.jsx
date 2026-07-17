const MIN_TEAM = 2;
const MAX_TEAM = 50;
const MIN_BUDGET = 10000;
const MAX_BUDGET = 100000;
const BUDGET_STEP = 5000;

function todayStr() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function Step1DateTeam({ state, setState, districts, weatherLoading, weather }) {
  const handleDateChange = (e) => {
    setState((s) => ({ ...s, date: e.target.value }));
  };

  const adjustTeam = (delta) => {
    setState((s) => ({
      ...s,
      teamSize: Math.min(MAX_TEAM, Math.max(MIN_TEAM, s.teamSize + delta)),
    }));
  };

  const handleTeamInput = (e) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    setState((s) => ({ ...s, teamSize: raw === "" ? "" : Number(raw) }));
  };

  const handleTeamBlur = () => {
    setState((s) => ({
      ...s,
      teamSize: Math.min(MAX_TEAM, Math.max(MIN_TEAM, Number(s.teamSize) || MIN_TEAM)),
    }));
  };

  const handleBudgetChange = (e) => {
    setState((s) => ({ ...s, budget: Number(e.target.value) }));
  };

  const toggleDistrict = (d) => {
    setState((s) => ({
      ...s,
      districts: s.districts.includes(d)
        ? s.districts.filter((x) => x !== d)
        : [...s.districts, d],
    }));
  };

  const allDistrictsSelected = districts.length > 0 && state.districts.length === districts.length;

  const toggleAllDistricts = () => {
    setState((s) => ({ ...s, districts: allDistrictsSelected ? [] : [...districts] }));
  };

  return (
    <div>
      <h1 className="page-title">언제, 몇 명이 함께하나요?</h1>
      <p className="page-subtitle">날짜와 팀 조건을 입력하면 AI가 딱 맞는 활동을 찾아드려요.</p>

      <div className="section">
        <div className="section-label">
          날짜 <span className="required-mark">*필수</span>
        </div>
        <div className="date-weather-card">
          <div className="date-row">
            <span className="icon-badge">📅</span>
            <input
              type="date"
              className="date-input-inline"
              min={todayStr()}
              value={state.date}
              onChange={handleDateChange}
            />
          </div>

          <div className="weather-inline-row">
            {weatherLoading && (
              <>
                <div className="pulse-dot" />
                <span className="weather-placeholder">날씨 조회 중...</span>
              </>
            )}
            {!weatherLoading && !state.date && (
              <span className="weather-placeholder">날짜를 먼저 선택하면 날씨를 알려드려요</span>
            )}
            {!weatherLoading && state.date && weather?.ok && (
              <>
                <span className="icon-badge weather-badge">{weather.icon}</span>
                <div>
                  <div className="weather-desc">{weather.description}</div>
                  <div>
                    <span className="weather-temp-low">{weather.tempMin}°</span>
                    {" / "}
                    <span className="weather-temp-high">{weather.tempMax}°</span>
                  </div>
                </div>
              </>
            )}
            {!weatherLoading && state.date && weather && !weather.ok && weather.reason === "out_of_range" && (
              <span className="weather-placeholder">해당 날짜는 예보 범위를 벗어나 날씨를 표시할 수 없어요</span>
            )}
            {!weatherLoading && state.date && weather && !weather.ok && weather.reason !== "out_of_range" && (
              <span className="weather-placeholder">날씨 정보를 불러오지 못했어요</span>
            )}
          </div>
        </div>
      </div>

      <div className="dual-grid section">
        <div>
          <div className="section-label">팀 인원 수</div>
          <div className="counter-row">
            <button
              className="counter-btn"
              onClick={() => adjustTeam(-1)}
              disabled={state.teamSize <= MIN_TEAM}
              type="button"
            >
              −
            </button>
            <input
              className="counter-input"
              value={state.teamSize}
              onChange={handleTeamInput}
              onBlur={handleTeamBlur}
              inputMode="numeric"
            />
            <button
              className="counter-btn"
              onClick={() => adjustTeam(1)}
              disabled={state.teamSize >= MAX_TEAM}
              type="button"
            >
              +
            </button>
            <span className="counter-unit">명 (2~50명)</span>
          </div>
        </div>
        <div>
          <div className="section-label">1인당 예산</div>
          <div className="budget-value">{(state.budget / 10000).toLocaleString()}만원</div>
          <input
            type="range"
            className="budget-slider"
            min={MIN_BUDGET}
            max={MAX_BUDGET}
            step={BUDGET_STEP}
            value={state.budget}
            onChange={handleBudgetChange}
          />
          <div className="budget-range-labels">
            <span>1만원</span>
            <span>10만원</span>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-label">
          선호 지역 (서울) <span className="required-mark">*필수, 복수 선택 가능</span>
        </div>
        <label className="select-all-row">
          <input
            type="checkbox"
            checked={allDistrictsSelected}
            onChange={toggleAllDistricts}
          />
          모두 선택
        </label>
        <div className="pill-group">
          {districts.map((d) => (
            <button
              key={d}
              type="button"
              className={`pill ${state.districts.includes(d) ? "selected" : ""}`}
              onClick={() => toggleDistrict(d)}
            >
              {d}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
