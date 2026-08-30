---
articleId: ja-mathematics-test-mathematics
locale: ja
title: 【テスト記事】公開確認と枠表示確認
slug: test-mathematics
subject: mathematics
category: overview
concepts:
  - id: example.category.concept
authors: [editorial-workspace]
reviewers: [yuta.k20030828@gmail.com]
status: published
createdAt: 2026-08-30
updatedAt: 2026-08-30
summary: 数学分野の枠を含むテスト記事
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
**【要修正】画像のアップロードができません**

## tikz
以下の図のレベルで複雑だと変換に時間がかかる？
```tikz
\begin{tikzpicture}[ultra thick]
        \def\d{1.6}%縦の幅
    \def\l{2*\d}%横の幅
    \node (grp) at (0,0){群};
    \node (magma) at (0,3*\d){マグマ}; 
    \node (loop) at (-\l,\d){ループ};
    \node (assoquasigrp) at (0,\d){結合的準群};
    \node (monoid) at (\l,\d){モノイド};
    \node (quasigrp) at (-\l,2*\d){準群};
    \node (unimagma) at (0,2*\d){単位的マグマ};
    \node (semigrp) at (\l,2*\d){半群};
    \begin{scope}[-stealth]
    \begin{scope}[green!80!blue]%結合律
        \draw(loop)--(grp)node[below,midway]{(i)};
        \draw(quasigrp)--(assoquasigrp)node[below,pos=0.7]{(i)};
        \draw(unimagma)--(monoid)node[below,pos=0.7]{(i)};
        \draw(magma)--(semigrp)node[above,midway]{(i)};
    \end{scope}
    \begin{scope}[blue]%単位元
        \draw(quasigrp)--(loop)node[right,midway]{(ii)}; 
        \draw(semigrp)--(monoid)node[right,midway]{(ii)};  
        \draw(magma)--(unimagma)node[right,midway]{(ii)};
    \end{scope}
    \begin{scope}[red]%逆元と可除性
        \draw(monoid)--(grp)node[below,midway]{(iii)};
        \draw(unimagma)--(loop)node[above,pos=0.4]{(iii)};
        \draw(semigrp)--(assoquasigrp)node[above,pos=0.4]{(iii')};
        \draw(magma)--(quasigrp)node[above,midway]{(iii')};
    \end{scope}
    \end{scope}
    \draw[double distance=1.3pt,blue](grp)--(assoquasigrp)node[right,midway]{(ii)};
\end{tikzpicture}

```# 枠のテスト
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
**【要修正】画像のアップロードができません**

## tikz
以下の図のレベルで複雑だと変換に時間がかかる？
```tikz
\begin{tikzpicture}[ultra thick]
        \def\d{1.6}%縦の幅
    \def\l{2*\d}%横の幅
    \node (grp) at (0,0){群};
    \node (magma) at (0,3*\d){マグマ}; 
    \node (loop) at (-\l,\d){ループ};
    \node (assoquasigrp) at (0,\d){結合的準群};
    \node (monoid) at (\l,\d){モノイド};
    \node (quasigrp) at (-\l,2*\d){準群};
    \node (unimagma) at (0,2*\d){単位的マグマ};
    \node (semigrp) at (\l,2*\d){半群};
    \begin{scope}[-stealth]
    \begin{scope}[green!80!blue]%結合律
        \draw(loop)--(grp)node[below,midway]{(i)};
        \draw(quasigrp)--(assoquasigrp)node[below,pos=0.7]{(i)};
        \draw(unimagma)--(monoid)node[below,pos=0.7]{(i)};
        \draw(magma)--(semigrp)node[above,midway]{(i)};
    \end{scope}
    \begin{scope}[blue]%単位元
        \draw(quasigrp)--(loop)node[right,midway]{(ii)}; 
        \draw(semigrp)--(monoid)node[right,midway]{(ii)};  
        \draw(magma)--(unimagma)node[right,midway]{(ii)};
    \end{scope}
    \begin{scope}[red]%逆元と可除性
        \draw(monoid)--(grp)node[below,midway]{(iii)};
        \draw(unimagma)--(loop)node[above,pos=0.4]{(iii)};
        \draw(semigrp)--(assoquasigrp)node[above,pos=0.4]{(iii')};
        \draw(magma)--(quasigrp)node[above,midway]{(iii')};
    \end{scope}
    \end{scope}
    \draw[double distance=1.3pt,blue](grp)--(assoquasigrp)node[right,midway]{(ii)};
\end{tikzpicture}

```