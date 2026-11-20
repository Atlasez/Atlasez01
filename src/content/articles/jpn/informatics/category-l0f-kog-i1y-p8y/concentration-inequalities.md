---
articleId: "ja-informatics-category-l0f-kog-i1y-p8y-concentration-inequalities"
locale: "ja"
title: "集中不等式"
slug: "concentration-inequalities"
subject: "informatics"
category: "category-l0f-kog-i1y-p8y"
concepts:
  - id: "informatics.category-l0f-kog-i1y-p8y.concentration-inequalities"
authors: [editorial-workspace]
reviewers: ["ukyoukay0@gmail.com"]
status: published
createdAt: 2026-09-12
updatedAt: 2026-09-13
summary: "確率論と機械学習で用いる集中不等式の基礎"
difficulty: basic
estimatedMinutes: 10
tags: []
aliases: []
exerciseIds: { pre: [], post: [] }
references: []
---

# 集中不等式

確率変数の和が平均から大きく外れないことを評価する不等式を扱います。

## 概要

独立確率変数に対して、次の評価を考えます。

$$\Pr\left(|S_n-\mathbb{E}[S_n]|\ge t\right)\le 2\exp\left(-\frac{t^2}{2n}\right).$$