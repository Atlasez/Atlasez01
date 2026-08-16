# Atlasez 開発エージェント向け指示

このファイルは、LLMや自動化エージェントがこのリポジトリを変更するときの最小ルールです。詳細は [`docs/DEVELOPMENT_GUIDE.md`](docs/DEVELOPMENT_GUIDE.md) を必ず確認してください。

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

# Claude Code 連携 — 常設副担当

Claude Code CLI (`/opt/homebrew/bin/claude`) を、Codexの独立した副担当・second opinion agentとして積極的に利用する。

Codexが主担当・最終責任者であり、Claudeは独立分析、設計相談、監査、レビューを担当する。

## 役割分担

Codexは主に以下を担当する。

- リポジトリ調査
- root causeの最終判断
- 設計判断
- 実装
- デバッグ
- テスト
- git diffの管理
- Claudeの指摘の検証
- 最終判断

Claudeは主に以下を担当する。

- 要件解釈の独立確認
- 設計案のsecond opinion
- root causeの別仮説
- edge caseの発見
- alternative implementationの提案
- regression riskの指摘
- state / routing / persistence / lifecycleの監査
- 実装後のgit diffレビュー

Claudeの回答をそのまま採用しない。Codexが必ず実コード、既存仕様、テスト結果と照合して採否を判断する。

Claudeには原則としてファイルを変更させない。

リポジトリ全体に関わる相談・監査では、Claudeにも必要に応じてこの `AGENTS.md` と [`docs/DEVELOPMENT_GUIDE.md`](docs/DEVELOPMENT_GUIDE.md) の関連規約を考慮させる。

## Claudeを呼ぶ頻度

小さな変更を除き、実質的な開発タスクではClaudeを原則1回以上、独立したsecond opinionとして利用する。

特に以下では積極的に利用する。

- 新機能追加
- 複数ファイルにまたがる変更
- UIとstate/APIが連動する変更
- 原因調査が必要なbug fix
- schema / database / Worker API変更
- authentication / authorization
- routing変更
- state management
- panel / popup / window lifecycle
- persistence / migration
- 大きめのrefactor
- regression riskの高い変更

以下では原則Claudeを呼ばなくてよい。

- typo
- 文言変更
- CSSの軽微な調整
- 明らかな1行修正
- formatting
- routineなファイル探索
- lint / test / buildの単純実行

Claudeの利用制限が逼迫している場合、Claudeが利用不能な場合、またはClaude待ちがタスク進行を不当に妨げる場合は、Codex単独で作業を継続してよい。

Claudeの失敗だけを理由に、Codex自身が完了可能な作業を停止しない。

## Claudeモデル

Claudeを利用する場合は、原則としてClaude Opus 5を使用する。

短い質問や局所的なsecond opinionでは以下を使用する。

```bash
claude --model claude-opus-5 --effort medium -p "<prompt>"
```

より深い推論が必要とCodexが明確に判断した場合のみ `--effort high` を使用してよい。

```bash
claude --model claude-opus-5 --effort high -p "<prompt>"
```

Fableやその他のモデルへ自動的に切り替えない。

usage creditsが必要になるモデルは、ユーザーから明示的な指示がない限り使用しない。

Claudeの利用量を抑えるため、質問対象は必要な問題、関連ファイル、diff、設計判断に可能な限り絞る。

## Claudeへの依頼方法

Claudeを単なるCodexの確認係にしない。

可能な限り、Codex自身の結論へ誘導せず、独立した分析を依頼する。

悪い例：

```text
私はこの実装が正しいと思っています。問題ないか確認してください。
```

良い例：

```text
この要件と関連コードを独立に分析してください。

特に以下を確認してください。
- root cause
- requirement漏れ
- 実装上のリスク
- edge case
- regressionの可能性
- state / routing / persistence / lifecycle上の問題
- より単純な代替案

ファイルは変更しないでください。
```

Codex自身の案とClaudeの案が異なる場合は、コード、テスト、既存仕様を根拠として判断する。

---

# Claudeの実行方式

Claudeの実行方法は、タスクの長さと調査範囲によって使い分ける。

## 短い質問・局所的なレビュー

短い質問、限定されたコードの確認、局所的なsecond opinionにはforegroundの非対話モードを使用してよい。

```bash
claude --model claude-opus-5 --effort medium -p "<prompt>"
```

ただし、標準出力が一定時間ないことだけを理由にClaudeを失敗と判断しない。

広範囲のコード探索や長時間の推論が必要になりそうな場合は、foregroundで長時間待たずbackground方式へ切り替える。

## 長時間の監査・設計調査

以下のような処理では、foregroundの `claude -p` を原則使用しない。

- リポジトリ全体または広範囲の監査
- git diff全体のレビュー
- 複数ファイル・複数subsystemにまたがる調査
- root cause調査
- regression監査
- 複雑なstate management監査
- routing / persistence / lifecycle監査
- popout / window / async処理などの長時間調査
- 10分以上かかる可能性があるagenticなコード探索

これらではClaudeをbackground sessionとして起動する。

```bash
claude --bg \
  --model claude-opus-5 \
  --effort medium \
  --permission-mode plan \
  --name "<task-name>" \
  "<prompt>"
```

`--bg` と `-p` は併用しない。

Claudeの監査・設計相談では原則 `--permission-mode plan` を使用し、ファイル変更をさせない。

background sessionを起動したら、そのjob ID / session IDを記録する。

---

# Background Claudeの扱い

## 起動前

新しいClaude background sessionを起動する前に、可能な限り既存sessionを確認する。

```bash
claude agents --json
```

同一目的のsessionがすでに `working` または `done` で存在する場合、新しいsessionを重複して起動しない。

特に、timeout・無応答・ログ取得失敗だけを理由として同一監査を最初からやり直さない。

## 起動後

Claudeをbackgroundで起動した後、Codexは同期的に完了を待ち続けない。

Claudeが動いている間に、Codex自身の以下の作業を並行して進める。

- コード調査
- 実装
- デバッグ
- test
- lint
- build
- git diff確認
- 自身によるreview

Claudeの状態確認には以下を使用する。

```bash
claude agents --json
```

## `working` の場合

Claudeが `working` 状態の場合、

- 中断しない
- 同じ監査を再実行しない
- 標準出力がないことを失敗扱いしない
- Codex自身の作業を継続する

単に時間が経過したことだけを理由にClaudeを停止しない。

## `done` の場合

Claudeが `done` になったらログを取得する。

`claude agents --json` に表示されるClaudeのjob IDを確認する。

ログ取得では、CLIが認識する短縮job IDを優先して使用する。

```bash
claude logs <job-id>
```

例：

```bash
claude logs c6b88f81
```

background起動時に完全なsession UUIDが返されていても、

```text
c6b88f81-7c00-4218-8ade-e730d5d5e33d
```

のような完全UUIDを `claude logs` に渡すとCLIがjobを認識しない場合がある。

その場合、新しいClaude sessionを起動してはならない。

`claude agents --json` に表示される短縮job IDを使用して既存sessionのログを取得する。

完全UUIDでログ取得に失敗したこと自体は、Claude監査の失敗を意味しない。

## `failed` の場合

Claudeが明確に `failed` になった場合のみ、失敗理由を確認する。

再実行する前に以下を確認する。

1. CLI自体の問題か
2. Claude認証の問題か
3. model指定の問題か
4. permissionの問題か
5. promptまたは対象範囲が過大ではないか
6. 既存sessionから結果を回収できないか

原因を確認せず、同じClaude監査を機械的に再実行しない。

---

# Claude監査結果の扱い

Claudeの結果を取得したら、Codexは以下を行う。

1. Claudeの指摘を項目ごとに整理する。
2. 各指摘について該当コードをCodex自身で確認する。
3. テスト・既存仕様・データフローと照合する。
4. 妥当な指摘だけ採用する。
5. 誤認・過剰な指摘は採用しない。
6. 修正後は必要なテストを再実行する。

Claudeの指摘を採用した場合でも、最終的な変更責任はCodexにある。

---

# 標準ワークフロー

実質的な開発タスクでは、原則として以下の流れを使用する。

1. `git status` と対象サイトを確認する。
2. `AGENTS.md` と必要な `docs/DEVELOPMENT_GUIDE.md` の規約を確認する。
3. Codexが関連コードとデータフローを調査する。
4. Codex自身でroot causeまたは実装方針の仮説を作る。
5. Claudeの既存background sessionがないか確認する。
6. 必要に応じてClaudeへ独立分析を依頼する。
7. 長時間のClaude調査はbackgroundで起動する。
8. Claudeが `working` の間もCodex自身の作業を続ける。
9. Codexが実装する。
10. この `AGENTS.md` に指定されたcheck / lint / test / buildを実行する。
11. Claudeが `done` なら既存jobのログを取得する。
12. 変更が大きい、またはregression riskが高い場合はClaudeにgit diffを独立監査させる。
13. Claudeの指摘をCodexが1件ずつ検証する。
14. 妥当な指摘だけ修正する。
15. 必要なテストを再実行する。
16. 最終報告を行う。

Claudeを利用すること自体を目的にしない。

Codexで十分に処理できる作業はCodexが行い、Claudeは独立した第二視点として、品質向上に実質的な価値がある場面で利用する。

## 完了報告でのClaude利用記録

Claudeを利用した場合、完了報告には簡潔に以下を記載する。

- Claude呼び出し回数
- 使用model / effort
- foreground / backgroundのどちらを使用したか
- Claudeを使用した目的
- Claude監査が完了したか
- 採用した主要な指摘
- 採用しなかった主要な指摘
- Claude側でエラーがあった場合はその内容

Claudeが `working` のままCodex側の作業が完了した場合、Claudeを中断したり同一監査を再起動したりせず、そのsession ID / job IDと状態を完了報告に記載する。
