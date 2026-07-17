import { Router } from "express";
import {
  createRoom,
  getRoom,
  joinRoom,
  castVote,
  closeRoom,
} from "../store/rooms.js";

const router = Router();

function serialize(room) {
  return {
    code: room.code,
    acts: room.acts,
    cands: room.cands,
    voters: room.voters,
    done: room.done,
  };
}

router.post("/rooms", (req, res) => {
  const { acts, cands } = req.body || {};
  if (!Array.isArray(acts) || !Array.isArray(cands) || cands.length === 0) {
    return res.status(400).json({ ok: false, reason: "invalid_payload" });
  }
  const room = createRoom({ acts, cands });
  res.json({ ok: true, room: serialize(room) });
});

router.get("/rooms/:code", (req, res) => {
  const room = getRoom(req.params.code);
  if (!room) return res.status(404).json({ ok: false, reason: "not_found" });
  res.json({ ok: true, room: serialize(room) });
});

router.post("/rooms/:code/join", (req, res) => {
  const { name } = req.body || {};
  const trimmed = (name || "").trim();
  if (!trimmed) return res.status(400).json({ ok: false, reason: "name_required" });

  const existing = getRoom(req.params.code);
  if (!existing) return res.status(404).json({ ok: false, reason: "not_found" });

  const room = joinRoom(req.params.code, trimmed);
  res.json({ ok: true, room: serialize(room) });
});

router.post("/rooms/:code/vote", (req, res) => {
  const { name, activityIndex } = req.body || {};
  const room = getRoom(req.params.code);
  if (!room) return res.status(404).json({ ok: false, reason: "not_found" });
  if (room.done) return res.status(409).json({ ok: false, reason: "room_closed" });
  if (!room.voters[name]) {
    return res.status(400).json({ ok: false, reason: "not_joined" });
  }

  const updated = castVote(req.params.code, name, activityIndex);
  res.json({ ok: true, room: serialize(updated) });
});

router.post("/rooms/:code/close", (req, res) => {
  const room = getRoom(req.params.code);
  if (!room) return res.status(404).json({ ok: false, reason: "not_found" });
  const updated = closeRoom(req.params.code);
  res.json({ ok: true, room: serialize(updated) });
});

export default router;
