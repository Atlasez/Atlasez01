# 公開チェックリスト（Cloudflare Workers）

記事公開は内容の査読とコード変更のレビューを経て、公開サイト正本
`Atlasez/Atlasez01` の `main` に反映します。本番はCloudflare Worker
`atlasez01`（`https://atlasez.org`）です。GitHub Pagesは確認用ミラーであり、
Cloudflare Pagesも本番の配信経路ではありません。Workerの固定値、ビルドゲート、
デプロイ検証は [`DEPLOYMENT.md`](DEPLOYMENT.md) を正本として参照してください。

## 1. 記事を査読に出す

1. [`ADDING_ARTICLES.md`](ADDING_ARTICLES.md) と
   [`EDITORIAL_WORKFLOW.md`](EDITORIAL_WORKFLOW.md) に従い記事を作成します。
2. ローカルで下書きと公開後の表示を確認し、内容・引用・ライセンス・参照リンクを
   担当者が査読します。
3. 査読と公開承認が終わるまで `status: draft` または `status: in-review` を保ちます。
   これらは本番ビルドから除外されます。
4. 承認後にだけ `status: published` とし、対象記事、URL、概念・前提関係への影響を
   PR本文に記録します。PRはCIと人間のレビューを通してから `main` へ反映します。

## 2. 本番反映を確認する

`main` への反映後、Cloudflare Workers Builds が固定Worker `atlasez01` へ本番
ビルド・デプロイします。PRブランチやローカルからの直接deploy、Dashboard Editorの
手動Upload、GitHub Actionsによる別の本番deploy経路は使いません。

公開完了とする前に、次を確認してPRまたは運用記録へ残します。

- CIが成功し、CloudflareのBuild/Deploymentが対象のmain SHAを処理した。
- CloudflareのDeployment/VersionでWorker名 `atlasez01`、Version、配信率100%を確認した。
- `https://atlasez.org/build-info.json` のcommit SHAが対象main SHAと一致した。
- 認証済みChromeで公開URL、記事、検索、学習地図、数式を確認した。
- 公開記事URL、確認時刻、確認者、対象SHAを記録した。

Build失敗、Worker名・SHA・Version・配信率の不一致、`build-info.json`欠落、画面の
異常があれば公開完了として扱わず、状況を記録して担当者へ引き継ぎます。推測で
rollback、Version promote、cache purge、route変更、直接deployを行いません。

## 3. 訂正と非公開化

訂正は承認済み原稿から差分を作り、変更理由、影響する記事・リンク、旧版との関係を
PRに記録します。査読とCIが完了するまで、本番の公開本文を直接書き換えません。

記事を非公開にする場合は、理由、対象URL、参照元記事・概念グラフ・検索への影響、
復旧方法をレビューします。`status: draft` または `status: in-review` に変更して
PRを作り、CIとレビュー、main反映後のWorker配信、公開URL・一覧・検索からの除外を
確認します。履歴を残し、確認が終わるまで削除や別Workerへの切替を行いません。

## 4. 閲覧者向け確認

- トップ `/` と学習サイト `/atlas/ja/` が開く。
- 公開記事URLが正しく表示され、承認した版と一致する。
- 検索 `/atlas/ja/search/` と学習地図 `/atlas/ja/map/` に公開状態が反映される。
- `/robots.txt` と sitemap が `atlasez.org` を指し、公開ページに意図しない `noindex` がない。
- PC幅と390px幅で横はみ出しがなく、数式やリンクが使用できる。

## 5. ローカル確認

本番へ出す前に、記事のstatusを公開せずローカル表示を確認できます。

```bash
npm ci
npm run dev
```

ビルド設定、CI、main SHA、Cloudflare Versionの照合については、必ず
[`DEPLOYMENT.md`](DEPLOYMENT.md) の手順に従ってください。
