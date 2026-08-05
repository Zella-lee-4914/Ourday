import "./loadEnv.js";
import express from "express";
import cors from "cors";
import weatherRoutes from "./routes/weather.js";
import recommendRoutes from "./routes/recommend.js";
import activityDetailRoutes from "./routes/activityDetail.js";
import roomRoutes from "./routes/rooms.js";
import metaRoutes from "./routes/meta.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", weatherRoutes);
app.use("/api", recommendRoutes);
app.use("/api", activityDetailRoutes);
app.use("/api", roomRoutes);
app.use("/api", metaRoutes);

app.get("/api/health", (req, res) => res.json({ ok: true }));

export default app;
