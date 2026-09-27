# Atlasez 開発エージェント向け指示

このファイルは、LLMや自動化エージェントがこのリポジトリを変更するときの最小ルールです。詳細は [`docs/DEVELOPMENT_GUIDE.md`](docs/DEVELOPMENT_GUIDE.md) を必ず確認してください。

## 最重要インシデントと本番デプロイ

最初に [`docs/incidents/2026-08-27-cloudflare-stale-build.md`](docs/incidents/2026-08-27-cloudflare-stale-build.md) と [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) を読む。このリポジトリでは、過去にCloudflare Workers Buildsが古いbuild output cacheを復元し、GitHub `main`と異なる成果物を本番配信したSEV-1インシデントが発生した。

- 本番の正本はCloudflare Worker `atlasez01`。GitHub Pagesは確認用ミラー。
- Production branchは`main`。通常の本番デプロイ経路はCloudflare Workers Buildsだけ。
- GitHub Actionsから別の本番deployを追加しない。二重デプロイを作らない。
- Cloudflare DashboardのBuild cacheは無効のまま維持する。
- 本番変更前に`npm run verify:deploy-config`、`npm run build`、`dist/build-info.json`のSHA照合を行う。
- デプロイ後はCloudflareのVersion/Deploymentが100%で対象SHAに対応すること、公開`/build-info.json`、主要画面をChromeで確認する。
- Worker名`atlasez-web-1`、旧route、推測したaccount/domainを使わない。
- SHA不一致時にrollback、promote、cache purge、route変更を推測で実行せず、まずIssue記録と再調査を行う。

## 作業前

- `git status` で既存の未コミット変更を確認し、他人の変更を破棄しない。
- 対象が公式サイト、学習サイト、メンバー用サイト、学習サイト運営用サイト、Worker/D1のどれかを明示する。
- Secret、個人情報、本番D1データを読み出してログ・コード・コミットに残さない。

## 実装ルール

- UIは共通部品と既存のデザイントークンを優先して使う。
- 権限はUIの非表示だけでなくWorker APIでも検証する。
- 記事・概念・分野slugを変更するときはリンクと学習地図への影響を調べる。
- D1は新しい連番migrationを追加し、既存migrationを書き換えない。
- 記事の言語保存単位はISO 639-3（`jpn`, `eng`など）。
- ビルド成果物`dist/`を手編集しない。

## 確認

変更後は少なくとも次を実行する。

```bash
npm run check
npm run lint
npm test -- --run
npm run build
git diff --check
```

UIや学習地図を変更した場合は `npm run test:e2e` とPC/スマホ幅の目視確認も行う。

完了報告には、少なくとも以下を記載する。

- 変更ファイル
- 実装内容
- テスト結果
- 未解決の制約
- デプロイ要否

---

# レビューと検証

- Claude Code CLIを独立レビュー、second opinion、実装、監査に使用しない。Claude sessionの起動・再開・状態確認・ログ取得も行わない。
- 実質的な変更では、Codexが要件、既存仕様、関連コード、データフロー、差分、テスト結果を照合して自らレビューする。
- 変更が大きい場合は、要件チェックリストを作り、認証・認可、境界条件、失敗時挙動、レスポンシブ表示、アクセシビリティ、回帰リスクを項目別に確認する。
- Codexのサブエージェントは、作業を分割して効率や調査範囲を改善できる場合に任意で利用する。独立レビューのためだけにClaudeを起動せず、別エージェントのレビューを開発タスクの必須工程にしない。委任した調査・実装案・テスト結果は、Codexがコード・仕様・テストで検証し、最終レビューと採否判断を担う。エージェントの完了待ちだけで主作業を止めない。
- 根拠のない「問題なし」判定を避け、確認できたコード箇所、実行したテスト、未確認の範囲を最終報告に明記する。

実質的な開発タスクでは、原則として以下の流れを使用する。

1. `git status` と対象サイトを確認する。
2. `AGENTS.md` と必要な `docs/DEVELOPMENT_GUIDE.md` の規約を確認する。
3. 関連コード、既存テスト、データフローを調査し、要件と非対象を明確にする。
4. root causeまたは実装方針を根拠付きで決める。
5. Codexが実装する。
6. この `AGENTS.md` に指定されたcheck / lint / test / buildを実行する。
7. 差分を要件・既存仕様・失敗経路と突き合わせてレビューする。
8. 妥当な不備を修正し、必要なテストを再実行する。
9. 最終報告に変更ファイル、実装、検証結果、制約、デプロイ要否を記載する。
