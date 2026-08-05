import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import express from "express";
import app from "./app.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 4000;

// Render/로컬 배포 환경: client/dist 빌드 결과물이 있으면 정적 서빙 (프론트+백엔드 단일 서비스).
// Vercel에서는 이 파일이 아니라 app.js가 직접 함수로 실행되고, 정적 파일은 루트 public/ 로 별도 서빙된다.
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
