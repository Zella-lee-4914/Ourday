import { Router } from "express";
import { getActivityDetail } from "../services/detail.js";

const router = Router();

router.post("/activity-detail", (req, res) => {
  const { activity } = req.body || {};
  if (!activity || !activity.title) {
    return res.status(400).json({ ok: false, reason: "activity_required" });
  }

  const respond = () => {
    try {
      const detail = getActivityDetail(activity);
      res.json({ ok: true, detail });
    } catch (err) {
      console.error("activity-detail error", err);
      res.status(500).json({ ok: false, reason: "server_error" });
    }
  };

  // 최초 조회는 약간의 지연으로 "생성 중" 느낌을 재현, 캐시 히트는 즉시 응답
  const alreadyKnown = req.body.__skipDelay;
  if (alreadyKnown) return respond();
  setTimeout(respond, 400 + Math.random() * 500);
});

export default router;
