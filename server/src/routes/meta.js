import { Router } from "express";
import { SEOUL_DISTRICTS, KEYWORDS } from "../data/activities.js";

const router = Router();

router.get("/meta", (req, res) => {
  res.json({ ok: true, districts: SEOUL_DISTRICTS, keywords: KEYWORDS });
});

export default router;
