import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(__dirname, "..", "public", "images", "noise-bg.png");
// 1×1 PNG transparente — evita 404 do template AdminLTE (main.min.css)
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);
fs.mkdirSync(path.dirname(out), { recursive: true });
if (!fs.existsSync(out)) {
  fs.writeFileSync(out, png);
  console.log("created", out);
}
