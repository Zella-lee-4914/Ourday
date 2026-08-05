import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";

// Vite 빌드 결과물(client/dist)을 Vercel이 CDN으로 서빙하는 루트 public/ 로 복사한다.
// (Vercel Express Functions에서는 express.static()이 무시되므로 정적 파일은 public/ 에 있어야 한다.)
if (existsSync("public")) rmSync("public", { recursive: true, force: true });
mkdirSync("public");
cpSync("client/dist", "public", { recursive: true });
