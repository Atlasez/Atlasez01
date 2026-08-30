---
articleId: ja-mathematics-math-typesetting-css-coverage-test-20260830
locale: ja
title: 数学の数式・図表・CSS総合表示テスト（公開後削除予定）
slug: math-typesetting-css-coverage-test-20260830
subject: mathematics
category: overview
concepts:
  - id: math.linear-algebra.vector-space
authors: [editorial-workspace]
reviewers: [ukyoukay0@gmail.com]
status: published
createdAt: 2026-08-30
updatedAt: 2026-08-30
summary: 数学の代表的な数式・長い式・行列・図表をまとめ、学習サイト公開後のCSSと組版を検証するテスト記事です。
difficulty: basic
estimatedMinutes: 10
tags: []
aliases: []
exerciseIds: { pre: [], post: [] }
references: []
---

# 数学の数式・図表・CSS総合表示テスト

この検証記事は、学習サイトで数学コンテンツを公開したときの数式組版、画像表示、長い式の横幅、行間、スマートフォン幅での折り返し、コードブロックのCSSをまとめて確認するためのものです。インライン式 $e^{i\pi}+1=0$ と、本文中の記号 $\alpha,\beta,\gamma,\Delta,\infty,\partial,\nabla$ を含みます。

## 1. 基本演算・分数・根号

$$
\frac{1}{1+x^2},\qquad
\sqrt{a^2+b^2},\qquad
\sqrt[n]{x^n}=|x|,\qquad
\binom{n}{k}=\frac{n!}{k!(n-k)!}
$$

指数・添字・アクセント：$x_{i,j}^{(n)}$, $\overline{z}$, $\hat{\theta}$, $\vec{v}$, $\mathbf{A}$, $\mathbb{R}$, $\mathbb{C}$, $\mathcal{F}$。

## 2. 関数・極限・微積分

$$
\lim_{x\to 0}\frac{\sin x}{x}=1,\qquad
\frac{d}{dx}\left(x^n\right)=nx^{n-1},\qquad
\frac{\partial f}{\partial x}+\frac{\partial f}{\partial y}=0
$$

$$
\int_0^1 x^n\,dx=\frac{1}{n+1}\quad(n>-1),\qquad
\iint_D (x^2+y^2)\,dA,\qquad
\oint_{\partial\Omega}\mathbf{F}\cdot d\mathbf{r}
$$

$$
\begin{aligned}
f(x) &= x^3-3x^2+2x\\
     &= x(x-1)(x-2),\\
f'(x) &= 3x^2-6x+2.
\end{aligned}
$$

## 3. 場合分け・連立方程式・行列

$$
f(x)=
\begin{cases}
x^2 & (x\ge 0),\\
-x^2 & (x<0)
\end{cases}
\qquad
\begin{cases}
2x+y=5,\\
x-3y=-4
\end{cases}
$$

$$
\begin{pmatrix}
1&2&3\\
0&1&4\\
5&6&0
\end{pmatrix}
\begin{pmatrix}x\\y\\z\end{pmatrix}
=
\begin{pmatrix}14\\9\\23\end{pmatrix},
\qquad
\det\begin{pmatrix}a&b\\c&d\end{pmatrix}=ad-bc
$$

## 4. 集合・論理・写像

$$
A\cup B,\quad A\cap B,\quad A\setminus B,\quad
A\subseteq B,\quad
\left|A\right|,\quad
\forall x\in X\;\exists y\in Y:\ f(x)=y
$$

$$
\begin{aligned}
f &: X\longrightarrow Y,\\
x &\longmapsto f(x),\\
\ker f &= \{x\in X\mid f(x)=0\}.
\end{aligned}
$$

## 5. 線形代数・群論・環論

$$
\mathbf{A}\mathbf{x}=\mathbf{b},\qquad
\lambda\mathbf{v}=\mathbf{A}\mathbf{v},\qquad
\operatorname{rank}(\mathbf{A})=r,\qquad
\mathbf{A}^{-1}=\frac{1}{\det\mathbf{A}}\operatorname{adj}(\mathbf{A})
$$

$$
G=\langle r,s\mid r^n=e,\ s^2=e,\ srs^{-1}=r^{-1}\rangle,
\qquad
\varphi:G\to H,\quad
\varphi(ab)=\varphi(a)\varphi(b)
$$

$$
R/I,\qquad
\mathbb{Z}/n\mathbb{Z},\qquad
\operatorname{Spec}(R),\qquad
0\longrightarrow A\longrightarrow B\longrightarrow C\longrightarrow 0
$$

## 6. 確率・統計・組合せ

$$
\Pr(A\mid B)=\frac{\Pr(A\cap B)}{\Pr(B)},\qquad
\mathbb{E}[X]=\sum_i x_i p_i,\qquad
\operatorname{Var}(X)=\mathbb{E}[X^2]-\mathbb{E}[X]^2
$$

$$
\binom{n}{k}p^k(1-p)^{n-k},\qquad
\bar{x}=\frac1n\sum_{i=1}^n x_i,\qquad
s^2=\frac{1}{n-1}\sum_{i=1}^n(x_i-\bar{x})^2
$$

## 7. 複素数・フーリエ解析・微分方程式

$$
z=re^{i\theta}=r(\cos\theta+i\sin\theta),\qquad
|z|^2=z\overline{z}
$$

$$
\mathcal{F}\{f\}(\omega)=\int_{-\infty}^{\infty}f(t)e^{-i\omega t}\,dt,\qquad
u_t=\kappa u_{xx}
$$

$$
\frac{d^2y}{dx^2}+\omega^2y=0,\qquad
y(x)=C_1\cos(\omega x)+C_2\sin(\omega x)
$$

## 8. 物理・幾何で使う式

$$
E=mc^2,\qquad
\mathbf{F}=m\mathbf{a},\qquad
\nabla\cdot\mathbf{E}=\frac{\rho}{\varepsilon_0},\qquad
a^2+b^2=c^2
$$

角度、単位、ベクトル：$\theta=45^\circ$, $\omega=2\pi f$, $\mu_0$, $\varepsilon_0$, $\mathrm{kg\,m\,s^{-2}}$。

## 9. 長い式とコード表示

$$
\sum_{n=1}^{\infty}\frac{1}{n^2}=\frac{\pi^2}{6},\qquad
\left(\int_a^b f(x)\,dx\right)^2\le (b-a)\int_a^b f(x)^2\,dx
$$

$$
\begin{aligned}
\mathcal{L}(x,\lambda)
  &= f(x)+\lambda g(x),\\
\nabla_x\mathcal{L}(x,\lambda)
  &= \nabla f(x)+\lambda\nabla g(x)=0.
\end{aligned}
$$

```css
.math-article__equation { overflow-x: auto; }
```

> **確認ポイント**：数式が文字化けしないこと、分数・添字がつぶれないこと、行列が横にはみ出しすぎないこと、画像の余白と角丸が自然であること、長文とコードブロックのコントラストが保たれること。

## 10. まとめ

この1ページで、集合論・代数・線形代数・解析・確率統計・複素解析・微分方程式・物理数学までの代表的な表記を横断的に確認します。
