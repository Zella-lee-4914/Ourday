const PLACE_TYPES = ["모두", "실내", "야외"];

export default function Step2Preference({ state, setState, keywords }) {
  const toggleKeyword = (k) => {
    setState((s) => ({
      ...s,
      keywords: s.keywords.includes(k)
        ? s.keywords.filter((x) => x !== k)
        : [...s.keywords, k],
    }));
  };

  const allKeywordsSelected = keywords.length > 0 && state.keywords.length === keywords.length;

  const toggleAllKeywords = () => {
    setState((s) => ({ ...s, keywords: allKeywordsSelected ? [] : [...keywords] }));
  };

  return (
    <div>
      <h1 className="page-title">어떤 활동을 원하시나요?</h1>
      <p className="page-subtitle">팀의 성향에 맞는 키워드를 골라주세요.</p>

      <div className="section">
        <div className="section-label">
          활동 키워드 <span className="required-mark">*1개 이상 필수</span>
        </div>
        <label className="select-all-row">
          <input
            type="checkbox"
            checked={allKeywordsSelected}
            onChange={toggleAllKeywords}
          />
          모두 선택
        </label>
        <div className="pill-group">
          {keywords.map((k) => (
            <button
              key={k}
              type="button"
              className={`pill ${state.keywords.includes(k) ? "selected" : ""}`}
              onClick={() => toggleKeyword(k)}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      <div className="section">
        <div className="section-label">활동 장소</div>
        <div className="segmented">
          {PLACE_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              className={state.placeType === t ? "selected" : ""}
              onClick={() => setState((s) => ({ ...s, placeType: t }))}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
