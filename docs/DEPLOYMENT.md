# デプロイ（DEPLOYMENT）

## 本番の正本

本番はCloudflare Worker `atlasez01` が配信する。`atlasez.org` と
`www.atlasez.org` は同じWorkerへrouteされる。

GitHub Pagesは確認用ミラーであり、本番ではない。Cloudflare PagesのGit連携を
本番の前提にしてはいけない。

本番デプロイの正本は、Cloudflare Dashboardで設定されたWorkers Buildsである。
リポジトリ `Atlasez/Atlasez01` のProduction branchは `main` に固定し、
`main` へのpushで次の処理をCloudflare側が自動実行する。

1. `npm ci`
2. `SITE_URL=https://atlasez.org BASE_PATH=/ npm run build`
3. `npx wrangler deploy`
4. `atlasez01` へのデプロイ
5. 公開中の `/build-info.json` とGit commit SHAの照合

GitHub Actionsから別経路で本番デプロイしない。これにより、GitHub Actionsと
Cloudflare Workers Buildsの競合や、異なるSHAの後着デプロイを防ぐ。

Cloudflare DashboardのBuild cacheは無効化する。キャッシュを再有効化する場合は、
`dist`をキャッシュ対象にせず、mainのSHAを含む`build-info.json`を毎回検証すること。

## Cloudflare本番設定

`wrangler.jsonc`を本番Worker設定の正本とする。CIは次の値を検証する。

| 項目         | 正しい値                                                   |
| ------------ | ---------------------------------------------------------- |
| Account      | `812021e62fa20465950b61be55dfe064`                         |
| Worker       | `atlasez01`                                                |
| Routes       | `atlasez.org/*`, `www.atlasez.org/*`                       |
| workers.dev  | 無効                                                       |
| Preview URLs | 無効                                                       |
| D1           | `atlasez-reports` / `d5112a62-7ed6-49c8-b6a2-18ee2dbab678` |

旧Worker `atlasez-web-1`へデプロイしてはいけない。Worker名・account・routeを変更する
場合は、先にCloudflare APIで現行custom domainとrouteを確認し、別のレビューを通す。

## ビルド環境

| 変数        | 本番値                |
| ----------- | --------------------- |
| `SITE_URL`  | `https://atlasez.org` |
| `BASE_PATH` | `/`                   |
| Node.js     | `.nvmrc`に従う        |

`public/_headers`ではハッシュ付き`/_astro/*`を長期immutableとし、デプロイ照合用の
`/build-info.json`は`no-store`にする。

## 手動デプロイ

通常はCloudflare Workers Buildsだけを使う。緊急時に手動デプロイする場合も、必ず
`main`の固定SHAから作業用ディレクトリを作り、対象の`wrangler.jsonc`を使う。

```sh
git archive <mainのSHA> | tar -x -C <作業用ディレクトリ>
cd <作業用ディレクトリ>
npm ci
npm run verify:deploy-config
SITE_URL=https://atlasez.org BASE_PATH=/ npm run build
npx wrangler deploy --config wrangler.jsonc --keep-vars --strict \
  --message "GitHub main <SHA>"
```

デプロイ後は`https://atlasez.org/build-info.json`が同じSHAを返すことを確認する。

## Rollback

Rollbackは緊急時だけ行い、実施したVersion ID・理由・時刻を記録する。Rollback後は、
原因を修正した`main`から再ビルドしてGitHub Actionsで再配信する。

## GitHub Pagesミラー

`.github/workflows/deploy-pages.yml`は`main`の確認用ミラーを配信する。本番とは別物であり、
`NOINDEX=1`を維持する。ミラーの確認結果だけで本番反映を判断してはいけない。

## ローカル確認

```sh
npm ci
SITE_URL=https://example.com BASE_PATH=/ npm run build
npm run preview
```
