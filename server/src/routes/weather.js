import { Router } from "express";
import { getWeatherForDate } from "../services/weather.js";

const router = Router();

router.get("/weather", async (req, res) => {
  const { date } = req.query;
  if (!date) {
    return res.status(400).json({ ok: false, reason: "missing_date" });
  }
  try {
    const result = await getWeatherForDate(date);
    res.json(result);
  } catch (err) {
    console.error("weather error", err);
    res.status(500).json({ ok: false, reason: "server_error" });
  }
});

export default router;
