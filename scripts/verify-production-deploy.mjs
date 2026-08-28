import { readFile } from "node:fs/promises";

const failures = [];
const branch =
  process.env.WORKERS_CI_BRANCH ?? process.env.GITHUB_REF_NAME ?? "";
const repository =
  process.env.ATLASEZ_REPOSITORY ?? process.env.GITHUB_REPOSITORY ?? "";
const commit =
  process.env.WORKERS_CI_COMMIT_SHA ?? process.env.GITHUB_SHA ?? "";

if (process.env.WORKERS_CI !== "1") {
  failures.push(
    "WORKERS_CI=1 が設定されていません（Cloudflare Workers Builds以外からのDeployを拒否します）。",
  );
}

if (process.env.ATLASEZ_DEPLOY_GATE !== "main-only-v1") {
  failures.push(
    "ATLASEZ_DEPLOY_GATE=main-only-v1 が設定されていません（手動Deployを拒否します）。",
  );
}

if (branch !== "main") {
  failures.push(`本番Deployはmain限定です（検出値: ${branch || "未設定"}）。`);
}

if (repository !== "Atlasez/Atlasez01") {
  failures.push(`対象リポジトリが違います（検出値: ${repository}）。`);
}

if (!/^[0-9a-f]{40}$/i.test(commit)) {
  failures.push(
    "WORKERS_CI_COMMIT_SHAまたはGITHUB_SHAが40桁のコミットSHAではありません。",
  );
}

try {
  const buildInfo = JSON.parse(await readFile("dist/build-info.json", "utf8"));
  if (buildInfo.repository !== "Atlasez/Atlasez01") {
    failures.push(
      `dist/build-info.jsonのrepositoryが違います（検出値: ${buildInfo.repository}）。`,
    );
  }
  if (buildInfo.ref !== "main") {
    failures.push(
      `dist/build-info.jsonのrefがmainではありません（検出値: ${buildInfo.ref}）。`,
    );
  }
  if (buildInfo.commit !== commit) {
    failures.push(
      "dist/build-info.jsonのcommitとビルド環境のSHAが一致しません。",
    );
  }
} catch {
  failures.push(
    "dist/build-info.jsonがありません。build完了後にDeployしてください。",
  );
}

if (failures.length > 0) {
  console.error(
    "本番Deployゲートにより停止しました。Cloudflare本番へ変更を出しません。",
  );
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(
  `本番Deployゲートを通過しました: ${repository} / ${branch} / ${commit}`,
);
