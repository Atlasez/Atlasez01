---
articleId: ja-mathematics-statistical-machine-learning-css-test-20260830
locale: ja
title: 統計的機械学習の基礎：確率モデルと正則化（表示テスト・公開後削除予定）
slug: statistical-machine-learning-css-test-20260830
subject: mathematics
category: overview
concepts:
  - id: math.linear-algebra.vector-space
authors: [editorial-workspace]
reviewers: [ukyoukay0@gmail.com]
status: draft
createdAt: 2026-08-31
updatedAt: 2026-08-31
summary: 確率モデル、最尤推定、ベイズ推論、回帰、正則化、評価指標を、例・命題・証明と数式で横断的に確認する表示テスト記事です。
difficulty: basic
estimatedMinutes: 10
tags: []
aliases: []
exerciseIds: { pre: [], post: [] }
references: []
---

# 統計的機械学習の基礎：確率モデルと正則化

この検証記事では、群論の記事と同じく「定義・例・命題・証明」の流れを採用し、統計的機械学習で頻出する確率・統計・線形代数の表記を確認します。インライン式 $y\sim\mathcal{N}(\mu,\sigma^2)$、損失 $L(\theta)$、ベクトル $\mathbf{x}$ を含みます。

## 1. 確率モデルとデータ

観測データを $D=\{(\mathbf{x}_i,y_i)\}_{i=1}^n$ とし、入力を $\mathbf{x}_i\in\mathbb{R}^d$、ラベルを $y_i\in\mathcal{Y}$ とします。

### 定義：確率モデル

確率変数 $X,Y$ の同時分布を $p_\theta(x,y)$ とし、条件付き分布を次で定義します。

$$
p_\theta(y\mid x)=\frac{p_\theta(x,y)}{p_\theta(x)},\qquad
p_\theta(x)=\sum_y p_\theta(x,y)
$$

連続変数の場合は和を積分に置き換えます。ベイズの定理は観測後の不確実性を表します。

$$
p(\theta\mid D)=\frac{p(D\mid\theta)p(\theta)}{p(D)},\qquad
p(D)=\int p(D\mid\theta)p(\theta)\,d\theta
$$

### 例：コイン投げ

表が出た回数を $k$、試行回数を $n$、表の確率を $\theta$ とすると、

$$
p(k\mid n,\theta)=\binom{n}{k}\theta^k(1-\theta)^{n-k}
$$

です。$n=10,k=7$ なら $\binom{10}{7}\theta^7(1-\theta)^3$ となります。

## 2. 最尤推定と勾配降下法

尤度と対数尤度を

$$
\mathcal{L}(\theta;D)=\prod_{i=1}^{n}p_\theta(y_i\mid\mathbf{x}_i),\qquad
\ell(\theta;D)=\sum_{i=1}^{n}\log p_\theta(y_i\mid\mathbf{x}_i)
$$

と定め、最尤推定量を

$$
\hat{\theta}_{\mathrm{MLE}}=\arg\max_\theta\ell(\theta;D)
$$

とします。

### 命題：勾配降下法の更新

損失 $J(\theta)$ が微分可能なら、勾配降下法の更新式

$$
\theta_{t+1}=\theta_t-\eta\nabla_\theta J(\theta_t),\qquad \eta>0
$$

を反復して局所的な最小値を探索できます。

### 証明

一次近似

$$
J(\theta+\Delta\theta)=J(\theta)+\nabla J(\theta)^\mathsf{T}\Delta\theta+o(\|\Delta\theta\|)
$$

に $\Delta\theta=-\eta\nabla J(\theta)$ を代入すると、一次の変化量は $-\eta\|\nabla J(\theta)\|_2^2\le0$ となります。

## 3. 線形回帰と行列

線形回帰では $\hat{\mathbf{y}}=X\mathbf{w}$ と書きます。二乗誤差と勾配は

$$
J(\mathbf{w})=\frac12\|X\mathbf{w}-\mathbf{y}\|_2^2,
\qquad \nabla_{\mathbf{w}}J=X^\mathsf{T}(X\mathbf{w}-\mathbf{y})
$$

です。

### 命題：正規方程式

$X^\mathsf{T}X$ が可逆なら、二乗誤差を最小化する解は

$$
\hat{\mathbf{w}}=(X^\mathsf{T}X)^{-1}X^\mathsf{T}\mathbf{y}
$$

で与えられます。実際、勾配を $\mathbf{0}$ と置くと

$$
X^\mathsf{T}X\mathbf{w}=X^\mathsf{T}\mathbf{y}
$$

を得ます。

データ行列と係数ベクトルの次元も確認します。

$$
X=\begin{pmatrix}
1 & x_{11} & \cdots & x_{1d}\\
1 & x_{21} & \cdots & x_{2d}\\
\vdots & \vdots & \ddots & \vdots\\
1 & x_{n1} & \cdots & x_{nd}
\end{pmatrix},\qquad
\mathbf{w}=\begin{pmatrix}w_0\\w_1\\\vdots\\w_d\end{pmatrix}
$$

## 4. 正則化と過学習

損失にペナルティを加えると、モデルの複雑さを抑えられます。

$$
J_{\mathrm{ridge}}(\mathbf{w})=\frac12\|X\mathbf{w}-\mathbf{y}\|_2^2+\frac{\lambda}{2}\|\mathbf{w}\|_2^2,\qquad \lambda\ge0
$$

$$
J_{\mathrm{lasso}}(\mathbf{w})=\frac12\|X\mathbf{w}-\mathbf{y}\|_2^2+\lambda\|\mathbf{w}\|_1,\qquad \|\mathbf{w}\|_1=\sum_{j=1}^{d}|w_j|
$$

### 命題：リッジ回帰の解

$\lambda>0$ かつ $X^\mathsf{T}X+\lambda I$ が可逆なら、

$$
\hat{\mathbf{w}}_{\mathrm{ridge}}=(X^\mathsf{T}X+\lambda I)^{-1}X^\mathsf{T}\mathbf{y}
$$

です。これは正則化によって係数の大きさを抑える例です。

## 5. 分類と評価指標

シグモイド関数と交差エントロピーは

$$
\sigma(z)=\frac{1}{1+e^{-z}},\qquad
J_{\mathrm{CE}}=-\frac1n\sum_{i=1}^n[y_i\log\hat p_i+(1-y_i)\log(1-\hat p_i)]
$$

です。

|            | 実際：陽性 | 実際：陰性 |
| ---------- | ---------- | ---------- |
| 予測：陽性 | TP         | FP         |
| 予測：陰性 | FN         | TN         |

$$
\operatorname{precision}=\frac{TP}{TP+FP},\qquad
\operatorname{recall}=\frac{TP}{TP+FN},\qquad
F_1=2\frac{\operatorname{precision}\operatorname{recall}}{\operatorname{precision}+\operatorname{recall}}
$$

### 定義：期待損失と経験損失

データ分布を $P$、損失を $\ell(f(\mathbf{x}),y)$ とすると、

$$
R(f)=\mathbb{E}_{(\mathbf{x},y)\sim P}[\ell(f(\mathbf{x}),y)],\qquad
\hat R_n(f)=\frac1n\sum_{i=1}^n\ell(f(\mathbf{x}_i),y_i)
$$

で定義されます。

## 6. 分布・場合分け・長い式・コード

正規分布の密度は次の通りです。

$$
\mathcal{N}(x\mid\mu,\sigma^2)=\frac{1}{\sqrt{2\pi\sigma^2}}\exp\left(-\frac{(x-\mu)^2}{2\sigma^2}\right)
$$

分類規則の簡単な場合分けです。

$$
\hat y=\begin{cases}
1 & (\sigma(\mathbf{w}^\mathsf{T}\mathbf{x}+b)\ge\tfrac12),\\
0 & (\sigma(\mathbf{w}^\mathsf{T}\mathbf{x}+b)<\tfrac12).
\end{cases}
$$

長い式の横幅と折り返しを確認します。

$$
\mathcal{Z}(\lambda)=\int_{\mathbb{R}^{d}}\exp\left(-\frac12\|X\mathbf{w}-\mathbf{y}\|_2^2-\frac{\lambda}{2}\|\mathbf{w}\|_2^2\right)\,d\mathbf{w}
$$

```python
from dataclasses import dataclass
import numpy as np

@dataclass
class LinearModel:
    weights: np.ndarray

    def predict(self, X: np.ndarray) -> np.ndarray:
        return X @ self.weights

    def mse(self, y_true: np.ndarray, y_pred: np.ndarray) -> float:
        return float(np.mean((y_true - y_pred) ** 2))
```

> 確認ポイント：定義・命題・証明の見出し、インライン数式の行間、分数と行列の可読性、長い式の横スクロール、表とコードブロックの配色を確認します。

## 7. まとめ

統計的機械学習では、確率モデル $p_\theta(y\mid\mathbf{x})$、推定 $\hat\theta$、正則化 $\lambda$、評価指標を一つの枠組みで扱います。数学的な定義と具体例を往復しながら、データの不確実性とモデルの汎化性能を理解することが重要です。