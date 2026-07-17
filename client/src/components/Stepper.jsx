const STEPS = ["날짜/팀", "성향", "AI 추천", "투표"];

export default function Stepper({ current }) {
  return (
    <div className="stepper">
      {STEPS.map((label, idx) => {
        const stepNum = idx + 1;
        const state =
          stepNum < current ? "done" : stepNum === current ? "active" : "";
        return (
          <div className="stepper-step-wrap" key={label} style={{ display: "flex", alignItems: "center", flex: idx === STEPS.length - 1 ? "0 0 auto" : 1 }}>
            <div className={`stepper-step ${state}`}>
              <div className="stepper-dot">{stepNum < current ? "✓" : stepNum}</div>
              <div className="stepper-label">{label}</div>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`stepper-line ${stepNum < current ? "done" : ""}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
