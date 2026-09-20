/** Offline-compatible Ed25519 signing. Requires only Node 24; never prints private material. */
import {
  createHash,
  createPrivateKey,
  createPublicKey,
  sign,
} from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    bundle: { type: "string" },
    output: { type: "string" },
    "key-file": { type: "string" },
    "public-key": { type: "string" },
    "base-url": { type: "string" },
  },
});
if (
  !values.bundle ||
  !values.output ||
  !values["public-key"] ||
  !values["base-url"]
)
  throw Error(
    "Use --bundle DIR --output NEW_FILE --public-key FILE --base-url HTTPS_RELEASE_ASSET_DIRECTORY; provide --key-file FILE or HAKI_RELEASE_SIGNING_KEY.",
  );
const pem = values["key-file"]
  ? await readFile(values["key-file"], "utf8")
  : process.env.HAKI_RELEASE_SIGNING_KEY;
if (!pem) throw Error("Release-signing key is not configured.");
const key = createPrivateKey(pem);
const publicKey = createPublicKey(await readFile(values["public-key"]));
const der = publicKey.export({ type: "spki", format: "der" });
if (
  key.asymmetricKeyType !== "ed25519" ||
  !createPublicKey(key).export({ type: "spki", format: "der" }).equals(der)
)
  throw Error("Signing key does not match the reviewed public key.");
const metadata = JSON.parse(
  await readFile(join(values.bundle, "release.json"), "utf8"),
);
if (
  metadata.format !== 1 ||
  metadata.product !== "haki-server" ||
  metadata.channel !== "preview" ||
  metadata.updateProtocol !== 1 ||
  !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(metadata.version) ||
  !/^[a-f0-9]{40}$/.test(metadata.commit) ||
  !Array.isArray(metadata.assets) ||
  metadata.assets.length !== 2 ||
  new Set(metadata.assets.map((a) => a.platform)).size !== 2
)
  throw Error("Unsupported release metadata.");
const base = new URL(values["base-url"].replace(/\/?$/, "/"));
if (
  base.protocol !== "https:" ||
  base.username ||
  base.password ||
  base.search ||
  base.hash
)
  throw Error(
    "Use an HTTPS asset directory without credentials, query, or fragment.",
  );
const assets = [];
for (const asset of metadata.assets) {
  const extension =
    asset.platform === "linux"
      ? "tgz"
      : asset.platform === "win32"
        ? "zip"
        : undefined;
  if (
    !extension ||
    asset.arch !== "x64" ||
    asset.name !==
      `haki-server-${metadata.version}-${asset.platform}-x64.${extension}` ||
    !/^[a-f0-9]{64}$/.test(asset.sha256) ||
    !Number.isSafeInteger(asset.size) ||
    asset.size <= 0 ||
    asset.size > 1024 ** 3
  )
    throw Error("Invalid release asset.");
  const hash = createHash("sha256");
  let size = 0;
  for await (const chunk of createReadStream(join(values.bundle, asset.name))) {
    size += chunk.length;
    hash.update(chunk);
  }
  if (size !== asset.size || hash.digest("hex") !== asset.sha256)
    throw Error("Release asset does not match its metadata.");
  assets.push({
    platform: asset.platform,
    arch: asset.arch,
    url: new URL(asset.name, base).href,
    size,
    sha256: asset.sha256,
  });
}
const now = Date.now();
const manifest = {
  format: 1,
  product: "haki-server",
  channel: "preview",
  version: metadata.version,
  commit: metadata.commit,
  updateProtocol: 1,
  publishedAt: new Date(now).toISOString(),
  expiresAt: new Date(now + 30 * 86400_000).toISOString(),
  assets,
};
const payload = Buffer.from(JSON.stringify(manifest));
await writeFile(
  values.output,
  JSON.stringify(
    {
      keyId: createHash("sha256").update(der).digest("hex"),
      payload: payload.toString("base64"),
      signature: sign(null, payload, key).toString("base64"),
    },
    null,
    2,
  ) + "\n",
  { flag: "wx", mode: 0o600 },
);
console.log(
  `Signed Haki ${metadata.version} preview metadata. Expires ${manifest.expiresAt}.`,
);
