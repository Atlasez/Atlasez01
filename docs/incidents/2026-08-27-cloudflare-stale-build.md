# SEV-1 Incident: Cloudflareが過去のビルド成果物を配信した

- Incident date: 2026-08-27 (JST)
- Severity: SEV-1 / 最重要
- Status: Resolved; preventive controls are pending merge of PR #58
- Affected service: `https://atlasez.org` and `https://www.atlasez.org`
- Production Worker: `atlasez01`
- GitHub repository: `Atlasez/Atlasez01`
- GitHub incident record: [Issue #59](https://github.com/Atlasez/Atlasez01/issues/59)

## Executive summary

公開サイトが、GitHub `main` に存在する現在の学習地図実装ではなく、以前のビルドに近い成果物を配信しているように見える状態になった。調査の結果、GitHub `main` の巻き戻し・force push・revertは確認されなかった。

原因はCloudflare Workers Buildsが、`main`をcloneしてビルドする過程で古いbuild output cacheを復元し、その成果物を公開経路へ渡したことだった。根拠はCloudflare Build `46f770ad-83ce-42c5-8a7e-8dfd2dd13574`のログにある次の記録である。

```text
Success: Build output restored from build cache.
```

GitHubのソース正本とCloudflareの配信成果物が分離し、公開サイトの見た目だけでは差分の発生箇所を特定できなかったことが、検知・復旧を難しくした。

## Impact

- `atlasez.org`で、期待していた最新の学習地図UI・斥力レイアウトが確認できない時間帯が発生した。
- 学習コンテンツのGitソース自体が消失したわけではない。
- D1データ、ドメイン、route、旧Workerを削除・変更していない。
- GitHub Pagesは本番ではなく確認用ミラーであるため、Pagesの表示だけでは本番復旧を判定できない。

## Evidence

### GitHub

- `main`の確認対象コミットは [`a42371db6dd27d89a99763bef3a1285845ea38ce`](https://github.com/Atlasez/Atlasez01/commit/a42371db6dd27d89a99763bef3a1285845ea38ce)（`fix: use Atlasez logo for search branding (#57)`）。
- `src/components/LearningMap.astro`には、`spreadNodes`、`repulsionRange`、逆二乗反発、衝突解決、spring force、velocity/damping、反復処理が存在した。
- `main`に対するforce push、revert、過去コミットへの巻き戻しは調査時点で確認されなかった。

### Cloudflare

- Workers Buildsの対象repositoryは `Atlasez/Atlasez01`、Production branchは `main`。
- 問題のBuild IDは `46f770ad-83ce-42c5-8a7e-8dfd2dd13574`。
- 問題のBuildログは、依存関係だけでなくbuild output cacheを復元したことを記録していた。
- 復旧デプロイは `edaf79a8-23d8-42da-a2df-b66285d50ef6`、Versionは `ba0ad262-c90f-4cdb-a845-eecb9d1b7ef1`、100%配信、作成時刻は `2026-08-27T19:51:45Z`。
- `atlasez.org`と`www.atlasez.org`は`atlasez01`へrouteされており、旧Worker `atlasez-web-1`へのroute切替は確認されなかった。

### 公開サイト

- 復旧後のChrome確認で、`https://atlasez.org/atlas/ja/map/`の学習地図、検索欄、自動整列、ズーム、カテゴリ表示が正常に表示された。
- 公開HTMLと公開されたLearningMap JavaScriptのSHA-256が、`main`相当のローカルビルドと一致した。
- HTMLのレスポンスは `200`、`Cache-Control: max-age=0, must-revalidate`。`cf-cache-status: HIT`は確認されたが、現在の内容はローカル成果物と一致し、HTMLを長期固定する設定ではなかった。

## Timeline (JST)

1. `2026-08-27 16:36:57` — GitHub `main`にコミット `a42371d`（PR #57）が存在。
2. 同日 — Cloudflare Workers Buildsで`main`のビルドが実行され、古いbuild output cacheを復元。
3. 同日 — 公開サイトの成果物がGitHubの現在コードと一致しない状態を確認。
4. `2026-08-27 19:51:45Z` — `atlasez01`へ復旧デプロイ。Version `ba0ad262-c90f-4cdb-a845-eecb9d1b7ef1`を100%配信。
5. 同日 — Chromeで本番の学習地図表示を確認。
6. 同日 — Cloudflare Workers BuildsのBuild cacheを無効化し、保存後の再読込で無効状態を確認。
7. 同日 — 非本番再検証Build `a9d7a4fb-7855-4069-83ef-59a261768bd4`が成功。build output cacheの復元ログがないことを確認。Version `fb0acbb1-5bd5-43af-b27d-4b44ada9939d`。

## Root cause

### Primary cause

Cloudflare Workers Buildsのbuild output cacheが、Git commitに対して安全に無効化されない形で再利用され、古い静的成果物がビルド・デプロイ経路に残ったこと。

### Contributing factors

- 公開成果物にGit commit SHAを含める仕組みがなかった。
- Cloudflare Workers BuildsとGitHub Actionsの責任範囲・唯一のデプロイ経路が文書化されていなかった。
- 本番route、Worker名、Production branch、Build cacheを1つの自動検査で照合していなかった。
- HTMLはブラウザやCloudflare edgeでキャッシュされ得るため、見た目だけの確認では原因をGitとCloudflareに切り分けられなかった。

### Rejected hypotheses

- GitHub `main`の意図的な巻き戻し：rejected。履歴と対象コミットを確認したが、該当事実なし。
- 旧Worker `atlasez-web-1`への本番route：rejected。現行routeは`atlasez01`。
- Cloudflare Production branchが`main`以外：rejected。Dashboardで`main`を確認。
- D1やドメイン設定の変更：rejected。今回の証拠とは一致しない。

## Recovery

復旧時は、GitHub `main`の固定SHAから成果物を生成し、`atlasez01`へ配信した。Cloudflare設定の変更は本番routeを変えず、復旧後にCloudflare DashboardでWorker Versionが100%であることと、Chromeで公開サイトの表示を確認した。

## Mandatory deployment policy

この節はAgentがデプロイ前に必ず読む。詳細な実行手順は [`docs/DEPLOYMENT.md`](../DEPLOYMENT.md) に置く。

1. 本番の正本はCloudflare Worker `atlasez01`だけ。GitHub Pagesは確認用ミラーであり、本番判定に使わない。
2. 通常の本番デプロイ経路はCloudflare Workers Buildsだけ。Production branchは`main`に固定する。
3. GitHub Actionsから別のProduction deployを追加しない。二重デプロイ、後着デプロイ、異なるSHAの競合を作らない。
4. Cloudflare Build cacheは無効のまま維持する。Build output cacheを有効に戻す場合は、先に承認を取り、commit SHA単位の無効化と公開SHA検証を実装する。
5. Worker名を`atlasez-web-1`へ戻さない。route、custom domain、account、D1 bindingを推測で変更しない。
6. `main`以外のbranchからProductionへデプロイしない。緊急時も`main`の固定SHAをcheckoutしてから行う。
7. すべてのビルドは`npm run build`を使い、`public/build-info.json`にrepository、commit、ref、builtAtを記録する。
8. デプロイ後は、CloudflareのDeployment/Versionが対象SHAに対応し100%であること、`https://atlasez.org/build-info.json`のcommitが対象SHAと一致すること、Chromeで主要画面が表示されることを確認する。
9. SHAが一致しない場合は、rollback/promote/cache purgeを推測で実行せず、Git履歴、Cloudflare Buildログ、route、公開HTML、公開JSを再調査する。
10. Secret、D1本番データ、個人情報をIssue、ログ、build-info、コミットに書かない。

## Prevention work

PR [#58](https://github.com/Atlasez/Atlasez01/pull/58)に次を追加した。

- `wrangler.jsonc`のaccount、Worker名、route、`workers_dev`、preview URL、D1を検証する`verify:deploy-config`。
- `npm run build`の開始時にGit SHAを記録する [`scripts/write-build-info.mjs`](../../scripts/write-build-info.mjs)。
- CIでビルド後の`dist/build-info.json`とcheckout SHAを照合。
- 競合するGitHub Actions直接デプロイworkflowを削除。
- 本方針を [`docs/DEPLOYMENT.md`](../DEPLOYMENT.md) に明文化。

PR #58はCIとCloudflare非本番Buildが成功済みだが、GitHub branch protectionのレビュー必須により、mergeまでは本番`main`に適用されない。Cloudflare Build cache無効化はDashboardで保存済みである。

## Follow-up checklist

- [x] GitHub履歴と`main`の正本を確認
- [x] Cloudflare Worker、route、Production branchを確認
- [x] 本番を`atlasez01`の正しいVersionへ復旧
- [x] Chromeで公開サイトを確認
- [x] Cloudflare Build cacheを無効化
- [x] Build cache無効化後のCloudflare Buildを再検証
- [ ] PR #58をレビュー・merge
- [ ] merge後に`/build-info.json`の公開SHAをChrome/HTTPで確認
- [ ] GitHub branch protectionでCI成功を必須化していることを確認
