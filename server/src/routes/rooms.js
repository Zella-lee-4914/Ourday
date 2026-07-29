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

router.post("/rooms", async (req, res) => {
  const { acts, cands } = req.body || {};
  if (!Array.isArray(acts) || !Array.isArray(cands) || cands.length === 0) {
    return res.status(400).json({ ok: false, reason: "invalid_payload" });
  }
  try {
    const room = await createRoom({ acts, cands });
    res.json({ ok: true, room: serialize(room) });
  } catch (err) {
    console.error("방 생성 실패", err);
    res.status(500).json({ ok: false, reason: "server_error" });
  }
});

router.get("/rooms/:code", async (req, res) => {
  try {
    const room = await getRoom(req.params.code);
    if (!room) return res.status(404).json({ ok: false, reason: "not_found" });
    res.json({ ok: true, room: serialize(room) });
  } catch (err) {
    console.error("방 조회 실패", err);
    res.status(500).json({ ok: false, reason: "server_error" });
  }
});

router.post("/rooms/:code/join", async (req, res) => {
  const { name } = req.body || {};
  const trimmed = (name || "").trim();
  if (!trimmed) return res.status(400).json({ ok: false, reason: "name_required" });

  try {
    const existing = await getRoom(req.params.code);
    if (!existing) return res.status(404).json({ ok: false, reason: "not_found" });

    const room = await joinRoom(req.params.code, trimmed);
    res.json({ ok: true, room: serialize(room) });
  } catch (err) {
    console.error("방 참여 실패", err);
    res.status(500).json({ ok: false, reason: "server_error" });
  }
});

router.post("/rooms/:code/vote", async (req, res) => {
  const { name, activityIndex } = req.body || {};
  try {
    const room = await getRoom(req.params.code);
    if (!room) return res.status(404).json({ ok: false, reason: "not_found" });
    if (room.done) return res.status(409).json({ ok: false, reason: "room_closed" });
    if (!room.voters[name]) {
      return res.status(400).json({ ok: false, reason: "not_joined" });
    }

    const updated = await castVote(req.params.code, name, activityIndex);
    res.json({ ok: true, room: serialize(updated) });
  } catch (err) {
    console.error("투표 실패", err);
    res.status(500).json({ ok: false, reason: "server_error" });
  }
});

router.post("/rooms/:code/close", async (req, res) => {
  try {
    const room = await getRoom(req.params.code);
    if (!room) return res.status(404).json({ ok: false, reason: "not_found" });
    const updated = await closeRoom(req.params.code);
    res.json({ ok: true, room: serialize(updated) });
  } catch (err) {
    console.error("방 마감 실패", err);
    res.status(500).json({ ok: false, reason: "server_error" });
  }
});

export default router;
