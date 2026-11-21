# 公開サイトの記事公開

公開サイトの正本は `Atlasez/Atlasez01` の `main`、本番Workerは `atlasez01` です。
編集画面で保存された記事版を対象にGitHub PRを作成し、CI・レビュー・mainへの取り込みを経て公開します。
編集者向けの公開操作は従来どおりで、候補登録やCloudflare Version切替はWorkers Builds内で進めます。

## 公開の順序

Cloudflare Workers Buildsだけを本番配信経路に保ち、Deploy commandの
`npm run deploy:production` が次の順で処理します。

1. `main`の固定SHAからサイトをビルドし、記事ごとの `articleId`・D1版ID・公開状態を含む候補マニフェストを作る。
2. `wrangler versions upload` でWorker Versionをアップロードする。ここでは読者向け配信を切り替えない。
3. ADMIN Workerへ署名付きマニフェストを送り、候補Versionと実際に含む記事・版IDをD1へ保存する。
4. D1の候補保存が成功した場合だけ、`wrangler versions deploy <version-id>@100%` で本番へ切り替える。
5. ADMIN WorkerがCloudflareの最新Deploymentを読み、対象Versionの100%配信を確認してD1公開履歴を追記する。

候補のD1保存に失敗した場合は4へ進まず、現在の公開Versionを維持します。切替後に公開履歴の追記だけが失敗した場合は、分ごとのADMIN Worker照合処理がCloudflareの有効Deploymentと候補記録を照合し、D1履歴と記事ごとの公開版ポインターを補修します。PRの作り直しや本文コピーは行いません。

## 必須設定

新しい処理を使う前に、ADMIN側の候補・履歴migrationをレビュー後の明示手順で適用し、ADMIN Workerを更新してください。Workers BuildsとADMIN Workerに同じSecretを登録します。

| 設定                               | 保存先                                      | 用途                                       |
| ---------------------------------- | ------------------------------------------- | ------------------------------------------ |
| `EDITORIAL_RELEASE_ENDPOINT`       | Workers Builds variable                     | ADMIN Workerの候補登録API URL              |
| `EDITORIAL_RELEASE_WEBHOOK_SECRET` | Workers Builds secret / ADMIN Worker secret | Buildからの候補・切替通知を署名            |
| `CLOUDFLARE_WORKERS_READ_TOKEN`    | ADMIN Worker secret                         | `atlasez01` のDeployment/Versionだけを照合 |

Cloudflare API tokenは`Workers Scripts Read`の読み取り専用にし、対象Workerへ範囲を限定します。
Secretや公開用URLはbuild-info、記事、GitHub Actionsへ書きません。設定変更は値・権限・復旧方法をPRでレビューしてから行います。

## 確認

- GitHub PRのCI・レビュー・main mergeが成功している。
- Workers Buildsが対象main SHAをビルドし、候補Versionをアップロードした。
- D1に候補Version、記事一覧、各記事の版IDが保存された。
- Cloudflare Worker `atlasez01` の最新Deploymentが対象Versionを100%配信している。
- D1公開履歴のCloudflare Version ID・Deployment IDがCloudflareの状態と一致している。
- `https://atlasez.org/build-info.json` のcommit SHA、公開記事、検索、学習地図、数式を確認した。

候補登録・Version・Deployment・build-infoのSHAが合わない場合は後続処理を止め、原因を記録します。推測で別Versionの昇格、rollback、cache purge、Route変更を行いません。
