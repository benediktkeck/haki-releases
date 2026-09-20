/** Run after signing in the protected distribution workflow. No private-key access. */
import { createHash, createPublicKey, verify } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
const repository = process.env.GH_REPO;
if (!repository || !/^[\w.-]+\/[\w.-]+$/.test(repository))
  throw Error("Invalid distribution repository.");
const publicKey = createPublicKey(await readFile("publisher-public.pem"));
const keyId = createHash("sha256")
  .update(publicKey.export({ type: "spki", format: "der" }))
  .digest("hex");
function verified(bytes) {
  const envelope = JSON.parse(bytes);
  if (
    envelope.keyId !== keyId ||
    !verify(
      null,
      Buffer.from(envelope.payload, "base64"),
      publicKey,
      Buffer.from(envelope.signature, "base64"),
    )
  )
    throw Error("Feed publisher signature is invalid.");
  const manifest = JSON.parse(Buffer.from(envelope.payload, "base64"));
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(manifest.version))
    throw Error("Invalid feed version.");
  return manifest;
}
const bytes = await readFile("preview.json", "utf8"),
  next = verified(bytes);
if (Date.parse(next.expiresAt) <= Date.now())
  throw Error("New feed is expired.");
const endpoint = `https://api.github.com/repos/${repository}/contents/channels/preview.json`;
const response = await fetch(endpoint, {
  headers: {
    Authorization: `Bearer ${process.env.GH_TOKEN}`,
    Accept: "application/vnd.github+json",
  },
});
let previous;
if (response.ok) previous = await response.json();
else if (response.status !== 404)
  throw Error(`Could not check existing feed (${response.status}).`);
if (previous) {
  const old = verified(Buffer.from(previous.content, "base64"));
  const a = next.version.split(".").map(BigInt),
    b = old.version.split(".").map(BigInt);
  for (let i = 0; i < 3; i++) {
    if (a[i] < b[i]) throw Error("Refusing to publish an older update feed.");
    if (a[i] > b[i]) break;
  }
  if (
    next.version === old.version &&
    JSON.stringify(next.assets) !== JSON.stringify(old.assets)
  )
    throw Error("A released version cannot change its archive assets.");
}
await writeFile(
  "feed-request.json",
  JSON.stringify({
    message: `Publish signed Haki ${next.version} preview feed`,
    content: Buffer.from(bytes).toString("base64"),
    ...(previous ? { sha: previous.sha } : {}),
    branch: "main",
  }),
);
execFileSync(
  "gh",
  [
    "api",
    "--method",
    "PUT",
    `repos/${repository}/contents/channels/preview.json`,
    "--input",
    "feed-request.json",
    "--silent",
  ],
  { stdio: "inherit" },
);
console.log(`Published signed preview feed for Haki ${next.version}.`);
