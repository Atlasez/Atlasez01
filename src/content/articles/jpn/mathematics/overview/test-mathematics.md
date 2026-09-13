---
articleId: "ja-mathematics-overview-test-mathematics"
locale: "ja"
title: "【テスト記事】公開確認と枠表示確認"
slug: "test-mathematics"
subject: "mathematics"
category: "overview"
concepts:
  - id: "math.overview.what-is-mathematics"
authors: [editorial-workspace]
reviewers: ["ukyoukay0@gmail.com"]
status: published
createdAt: 2026-08-30
updatedAt: 2026-09-13
summary: "数学分野の枠を含むテスト記事"
difficulty: basic
estimatedMinutes: 10
tags: []
aliases: []
exerciseIds: { pre: [], post: [] }
references: []
---

# 枠のテスト
## 定義, 命題枠

:::defi タイトル$ab$ {#defi-id-test}

定義の本文
$$
\sum_{i=1}^ni=\frac{n(n+1)}{2}
$$
:::

:::prop タイトル$ab$ {#prop-id-test}

命題の本文
$$
\sum_{i=1}^ni=\frac{n(n+1)}{2}
$$
:::

::: proof

証明の内容

[[ref:defi-id-test]]を用いる

:::

:::lemma タイトル$ab$ {#lemma-id-test}

本文
$$
\sum_{i=1}^ni=\frac{n(n+1)}{2}
$$
:::

:::cor タイトル$ab$ {#cor-id-test}

本文
$$
\sum_{i=1}^ni=\frac{n(n+1)}{2}
$$
:::

:::defi foldingテスト {#defi-id-test2}

本文の中にfoldingが入る

::: folding タイトル

折り畳みの内容

:::

::: folding タイトル

折り畳みの内容

:::

::: folding タイトル

折り畳みの内容

:::

:::

::: remark
補足の内容
折りたためるようにする？
改行ができない
:::

# 図のテスト
## svg画像
**【要修正】画像のアップロードができません**![HE3KO02XwAEw8Wp.jpg](/images/editorial/2577d423-0979-4b3d-9a74-6f08bd2a00ce/HE3KO02XwAEw8Wp.jpg)

## 公開レンダリング回帰テスト

表示数式を挟んでも連番が継続するか確認します。

1. 数式前の項目
2. 数式前の項目

$$
x = y
$$

1. 数式後の項目

:::folding 通常のfoldingタイトル

指定のないタイトルは太字にしません。

:::

:::folding **明示的に太字のfoldingタイトル**

明示したタイトルだけ太字にします。

:::