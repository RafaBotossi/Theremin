import { mkdir, cp, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const root = new URL("../public/mediapipe/", import.meta.url);
await mkdir(root, { recursive: true });
await cp(
  new URL("../node_modules/@mediapipe/tasks-vision/wasm/", import.meta.url),
  new URL("wasm/", root),
  { recursive: true },
);
await cp(
  new URL("../node_modules/@mediapipe/tasks-vision/README.md", import.meta.url),
  new URL("PACKAGE-README.md", root),
);
const files = [
  [
    "hand_landmarker.task",
    "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
  ],
  [
    "LICENSE.apache-2.0.txt",
    "https://raw.githubusercontent.com/google-ai-edge/mediapipe/master/LICENSE",
  ],
];
for (const [name, url] of files) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  await writeFile(
    new URL(name, root),
    Buffer.from(await response.arrayBuffer()),
  );
}
const pkg = JSON.parse(
  await readFile(
    new URL(
      "../node_modules/@mediapipe/tasks-vision/package.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
const hash = createHash("sha256")
  .update(await readFile(new URL("hand_landmarker.task", root)))
  .digest("hex");
await writeFile(
  new URL("PROVENANCE.json", root),
  JSON.stringify(
    {
      package: "@mediapipe/tasks-vision",
      version: pkg.version,
      license: pkg.license,
      model: files[0][1],
      modelVersion: "float16/1",
      sha256: hash,
      source: "https://github.com/google-ai-edge/mediapipe",
      notes:
        "MediaPipe code and model: Apache-2.0. Preserve this notice and the bundled license. Assets served locally; no runtime CDN.",
    },
    null,
    2,
  ),
);
console.log(`MediaPipe ${pkg.version}, modelo sha256 ${hash}`);
