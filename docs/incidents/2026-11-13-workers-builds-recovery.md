# 公開サイト Workers Builds 復旧計画（2026-11-13）

## 対象

- Cloudflare Account: `812021e62fa20465950b61be55dfe064`
- Worker: `atlasez01`
- GitHub repository: `Atlasez/Atlasez01`
- Production branch: `main`
- 公開URL: `https://atlasez.org/`

## 確認した状態

2026-11-13の確認では、WorkerのBuild設定にGit連携切断の警告があり、API tokenは利用不可と表示されていた。GitHub組織のCloudflare Workers and Pages Appはインストール済みだが、アクセス対象は`Admin-Atlesez`だけで、`Atlasez/Atlasez01`は含まれていない。

現在公開されている`/build-info.json`のcommitは`2592d72ed31a47cf13780eb22c577e66e350fbe3`で、公開`main`の`7f123d29e9d6176a8a7a0a298aeced3b00944e8d`とは一致しない。`/seminars/`は404を返している。

CloudflareのBuild設定から新しいBuild用tokenを作成しようとしたが、`Account Settings Read`の権限チェックで失敗した。tokenは発行されず、設定は保存されていない。

## レビュー対象の変更案

1. GitHub Appのアクセス方式は「選択したrepositoryのみ」のままにして、`Atlasez/Atlasez01`だけを追加する。全repositoryへのアクセスは許可しない。
2. Cloudflare Workers Buildsを`Atlasez/Atlasez01`の`main`に接続する。Production branch、build/deploy command、環境変数は既存の設定値を維持する。
3. Build用tokenは、Cloudflare側で必要権限を持つアカウントメンバーが発行し、Worker `atlasez01`のBuild設定にだけ接続する。tokenの値はGitHub、リポジトリ、チャットに保存しない。
4. 本番ビルド対象はレビュー・CI成功後に`main`へ入ったcommitに限る。別Worker、別Account、手動Wrangler deploy、D1 migrationは使わない。

既存のWorker Build設定値は次のとおり。値が異なっていた場合は、この計画の範囲で推測修正せず停止する。

| 項目                  | 値                          |
| --------------------- | --------------------------- |
| Build command         | `npm run build`             |
| Deploy command        | `npm run deploy:production` |
| Root directory        | `/`                         |
| Include paths         | `*`                         |
| Build cache           | 無効                        |
| `ATLASEZ_DEPLOY_GATE` | `main-only-v1`              |
| `ATLASEZ_REPOSITORY`  | `Atlasez/Atlasez01`         |
| `SITE_URL`            | `https://atlasez.org`       |

`deploy:production`はCloudflare Workers Buildsの`WORKERS_CI=1`、`main`、repository、build-info SHAを検証してからWranglerを実行する。通常のBuild/DeployではD1 migrationを適用しない。

Cloudflareの標準Build token作成は、Worker編集と関連リソースへの権限をBuildに渡す。今回は作成画面が`Account Settings Read`で拒否されたため、必要権限を持つアカウントメンバーで再実施する。標準tokenを使えない場合は、権限を推測で削って試さず、必要scopeをCloudflare公式手順で確認してから別途レビューする。

## 影響

GitHub Appに`Atlasez/Atlasez01`を追加すると、Cloudflareの同Appがこのrepositoryのmetadata、code、deployments、checks、pull requestsを読み書きできる。今後の`main`更新でWorkers Buildsが公開Workerへ自動配信する。既存の`Admin-Atlesez`アクセスは変更しない。

## 検証

設定変更後、次をすべて照合する。

1. Cloudflare Build runのrepository、production branch、checkout SHAが`Atlasez/Atlasez01`、`main`、レビュー済みmain commitと一致する。
2. Buildが成功し、DeploymentのWorker名が`atlasez01`、配信率が100%である。
3. `https://atlasez.org/build-info.json`のcommitが同じSHAである。
4. `https://atlasez.org/seminars/`が200を返し、`https://atlasez.org/projects/`も表示できる。

いずれかが不一致、Build失敗、古い画面、想定外のVersionがあれば停止し、promotion、route変更、cache purge、rollbackを推測で行わない。

## 復旧・戻し方

- Build前に問題が見つかった場合は、Buildを再有効化せず、GitHub Appから`Atlasez/Atlasez01`の許可を外して、Workerが現在配信しているVersionを維持する。
- token接続後に問題が見つかった場合は、Workers Buildsの停止状態を維持し、tokenとAppのアクセスをレビュー済みの設定に戻す。token自体の失効は所有者が利用先を確認してから行う。
- 新Version配信後に公開確認が失敗した場合は、追加の配信を止める。変更前の候補Versionは`2acac521`だが、実行時にWorker名・Version・現在の配信率を再照合し、同一の検証済みVersionだと確認できた場合だけ、別途承認されたCloudflare rollback手順を実行する。不一致なら停止して調査する。

この計画のレビューと設定変更は別の操作である。レビュー完了前に外部のGitHub/Cloudflare設定を変更しない。

## 参考

- [Cloudflare Workers Builds configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
- [Cloudflare Workers Builds troubleshooting](https://developers.cloudflare.com/workers/ci-cd/builds/troubleshoot/)
