import { readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
const root = new URL("../public/mediapipe/", import.meta.url);
const provenance = JSON.parse(
  await readFile(new URL("PROVENANCE.json", root), "utf8"),
);
const pkg = JSON.parse(
  await readFile(
    new URL(
      "../node_modules/@mediapipe/tasks-vision/package.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
if (provenance.version !== pkg.version)
  throw new Error(
    "MediaPipe assets e pacote divergem. Execute npm run assets.",
  );
const model = await readFile(new URL("hand_landmarker.task", root));
if (createHash("sha256").update(model).digest("hex") !== provenance.sha256)
  throw new Error("Checksum do modelo inválido.");
for (const file of [
  "vision_wasm_internal.js",
  "vision_wasm_internal.wasm",
  "vision_wasm_nosimd_internal.js",
  "vision_wasm_nosimd_internal.wasm",
]) {
  const local = await readFile(new URL("wasm/" + file, root));
  const source = await readFile(
    new URL(
      "../node_modules/@mediapipe/tasks-vision/wasm/" + file,
      import.meta.url,
    ),
  );
  if (!local.equals(source))
    throw new Error("Asset WASM incompatível: " + file);
}
await stat(new URL("LICENSE.apache-2.0.txt", root));
console.log(`Assets locais verificados: MediaPipe ${pkg.version}.`);
