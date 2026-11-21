# デプロイ（DEPLOYMENT）

## 本番の正本

本番はCloudflare Worker `atlasez01` が配信する。`atlasez.org` と
`www.atlasez.org` は同じWorkerへrouteされる。

GitHub Pagesは確認用ミラーであり、本番ではない。Cloudflare PagesのGit連携を
本番の前提にしてはいけない。

本番デプロイの正本は、Cloudflare Dashboardで設定されたWorkers Buildsである。
リポジトリ `Atlasez/Atlasez01` のProduction branchは `main` に固定し、
`main` へのpushでCloudflare側がBuildを開始する。Deploy commandは
`npm run deploy:production` とし、次の順で進める。

1. `npm ci`
2. `SITE_URL=https://atlasez.org BASE_PATH=/ npm run build`
3. 記事版マニフェストの生成と `dist/build-info.json` のSHA検証
4. `wrangler versions upload` で未配信の候補Versionを登録
5. 署名済み候補情報をADMIN Workerへ送り、D1保存に成功したことを確認
6. `wrangler versions deploy <version-id>@100%` で `atlasez01` の配信を切り替え
7. ADMIN WorkerがCloudflare DeploymentとD1公開履歴を照合

GitHub Actionsから別経路で本番デプロイしない。これにより、GitHub Actionsと
Cloudflare Workers Buildsの競合や、異なるSHAの後着デプロイを防ぐ。

Workers BuildsのDeploy commandは裸の`npx wrangler deploy`ではなく、必ず
`npm run deploy:production`を指定する。このコマンドは次の値がすべて一致しない
限り停止し、候補登録・配信切替を行わない。

- `ATLASEZ_DEPLOY_GATE=main-only-v1`
- `WORKERS_CI=1`
- `WORKERS_CI_BRANCH=main`
- `ATLASEZ_REPOSITORY=Atlasez/Atlasez01`
- `WORKERS_CI_COMMIT_SHA`が40桁のコミットSHA
- `dist/build-info.json`のrepository/ref/commitが上記と一致
- `EDITORIAL_RELEASE_ENDPOINT`と`EDITORIAL_RELEASE_WEBHOOK_SECRET`が設定済み
- 記事版マニフェストがビルドSHAと一致し、変更記事に保存済み版IDがある

Workers Buildsには上記のDeploy gateとADMIN APIの接続情報が必要です。設定を変える場合は先にPRで値・権限・復旧方法を確認し、候補APIが利用できない状態では本番へ切り替えません。

候補VersionのD1保存が失敗した場合、`versions deploy`を呼び出さない。切替後の公開履歴記録が
失敗した場合は、ADMIN Workerが読み取り専用Cloudflare APIで有効Versionを照合し、D1を補修する。
新しいD1テーブルとAPIはADMIN repository側のmigration/Worker更新で先に用意する。

このゲートにより、PRブランチやローカルからの手動Deployはfail-closedで停止する。
ゲートを迂回する直接のWrangler実行は禁止する。

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

## Workers Builds停止時

Workers Buildsが未接続・停止・エラーの場合は本番配信を止め、理由をIssueまたはPRに記録します。この手順では手動の`wrangler deploy`や`wrangler versions deploy`を代替経路として許可しません。候補登録と実配信の照合を含むWorkers Builds経路を復旧してから、mainの対象SHAを配信します。

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
