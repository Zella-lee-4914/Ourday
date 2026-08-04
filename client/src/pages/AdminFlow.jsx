import { useEffect, useState } from "react";
import Stepper from "../components/Stepper.jsx";
import Step1DateTeam from "../components/Step1DateTeam.jsx";
import Step2Preference from "../components/Step2Preference.jsx";
import Step3Recommend from "../components/Step3Recommend.jsx";
import Step4Vote from "../components/Step4Vote.jsx";
import { fetchMeta, fetchWeather, createRoom } from "../api/client.js";

const initialState = {
  date: "",
  weather: null,
  teamSize: 10,
  budget: 60000,
  districts: [],
  keywords: [],
  placeType: "모두",
  activities: [],
  candidates: [],
  recLoading: false,
};

function buildShareUrl(code) {
  const url = new URL(window.location.href);
  url.searchParams.set("room", code);
  return url.toString();
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export default function AdminFlow({ onRequestJoin }) {
  const [step, setStep] = useState(1);
  const [state, setState] = useState(initialState);
  const [meta, setMeta] = useState({ districts: [], keywords: [] });
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [room, setRoom] = useState(null);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [roomError, setRoomError] = useState(null);
  const [copyStatus, setCopyStatus] = useState("");

  useEffect(() => {
    fetchMeta().then((res) => {
      if (res.ok) setMeta({ districts: res.districts, keywords: res.keywords });
    });
  }, []);

  useEffect(() => {
    if (!state.date) {
      setState((s) => ({ ...s, weather: null }));
      return;
    }
    let cancelled = false;
    setWeatherLoading(true);
    fetchWeather(state.date)
      .then((res) => {
        if (!cancelled) setState((s) => ({ ...s, weather: res }));
      })
      .catch(() => {
        if (!cancelled) setState((s) => ({ ...s, weather: { ok: false, reason: "api_error" } }));
      })
      .finally(() => {
        if (!cancelled) setWeatherLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [state.date]);

  const canProceedStep1 = !!state.date && state.districts.length > 0;
  const canProceedStep2 = state.keywords.length > 0;
  const canProceedStep3 = state.candidates.length > 0;

  const goBack = () => setStep((s) => Math.max(1, s - 1));

  const handleCreateRoomAndAdvance = async () => {
    setCreatingRoom(true);
    setRoomError(null);
    try {
      const res = await createRoom({ acts: state.activities, cands: state.candidates });
      if (res.ok) {
        setRoom(res.room);
        const shareUrl = buildShareUrl(res.room.code);
        const copied = await copyToClipboard(shareUrl);
        setCopyStatus(copied ? "링크가 클립보드에 복사되었어요" : "");
        setStep(4);
      } else {
        setRoomError("투표방을 생성하지 못했어요. 다시 시도해주세요.");
      }
    } catch {
      setRoomError("투표방을 생성하지 못했어요. 다시 시도해주세요.");
    } finally {
      setCreatingRoom(false);
    }
  };

  const handleNext = () => {
    if (step === 3) {
      handleCreateRoomAndAdvance();
      return;
    }
    setStep((s) => Math.min(4, s + 1));
  };

  return (
    <div className="app-shell">
      <Stepper current={step} />
      <div className="page">
        {step > 1 && step < 4 && (
          <button type="button" className="back-link" onClick={goBack}>
            ← 이전
          </button>
        )}
        {step === 1 && (
          <button
            type="button"
            className="back-link"
            style={{ float: "right" }}
            onClick={onRequestJoin}
          >
            투표 코드가 있으신가요? 참여하기 →
          </button>
        )}

        {step === 1 && (
          <Step1DateTeam
            state={state}
            setState={setState}
            districts={meta.districts}
            weatherLoading={weatherLoading}
            weather={state.weather}
          />
        )}
        {step === 2 && (
          <Step2Preference state={state} setState={setState} keywords={meta.keywords} />
        )}
        {step === 3 && (
          <>
            <Step3Recommend state={state} setState={setState} />
            {roomError && <div className="error-banner">{roomError}</div>}
          </>
        )}
        {step === 4 && <Step4Vote room={room} copyStatus={copyStatus} setCopyStatus={setCopyStatus} setRoom={setRoom} />}
      </div>

      {step < 4 && (
        <div className="cta-bar">
          <button
            type="button"
            className="cta-btn"
            disabled={
              (step === 1 && !canProceedStep1) ||
              (step === 2 && !canProceedStep2) ||
              (step === 3 && (!canProceedStep3 || creatingRoom))
            }
            onClick={handleNext}
          >
            {step === 3 ? (creatingRoom ? "만드는 중..." : "투표 만들기") : "다음"}
          </button>
        </div>
      )}
    </div>
  );
}
