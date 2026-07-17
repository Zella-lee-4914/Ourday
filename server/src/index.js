import "./loadEnv.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import express from "express";
import cors from "cors";
import weatherRoutes from "./routes/weather.js";
import recommendRoutes from "./routes/recommend.js";
import activityDetailRoutes from "./routes/activityDetail.js";
import roomRoutes from "./routes/rooms.js";
import metaRoutes from "./routes/meta.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use("/api", weatherRoutes);
app.use("/api", recommendRoutes);
app.use("/api", activityDetailRoutes);
app.use("/api", roomRoutes);
app.use("/api", metaRoutes);

app.get("/api/health", (req, res) => res.json({ ok: true }));

// 배포 환경: client/dist 빌드 결과물이 있으면 정적 서빙 (프론트+백엔드 단일 서비스)
const clientDist = path.join(__dirname, "..", "..", "client", "dist");
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`OurDay server listening on http://localhost:${PORT}`);
});
