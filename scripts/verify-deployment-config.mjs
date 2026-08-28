import { readFile } from "node:fs/promises";

const file = "wrangler.jsonc";
const requiredValues = [
  '"account_id": "812021e62fa20465950b61be55dfe064"',
  '"name": "atlasez01"',
  '"workers_dev": false',
  '"preview_urls": false',
  '"pattern": "atlasez.org/*"',
  '"pattern": "www.atlasez.org/*"',
  '"database_id": "d5112a62-7ed6-49c8-b6a2-18ee2dbab678"',
];

const source = await readFile(file, "utf8");
const failures = requiredValues.filter((value) => !source.includes(value));

if (failures.length > 0) {
  console.error(
    "Cloudflare本番ターゲットの検証に失敗しました。誤ったWorkerへデプロイしません。",
  );
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(
  "Cloudflare本番ターゲットを検証しました: atlasez01 / atlasez.org / www.atlasez.org",
);
