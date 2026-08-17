# 数学記事メディア移行記録

2026-08-17に、旧数学アトラスの全項目を新学習サイトの数学記事と照合し、図・画像の移行状況を確認した。

## 監査結果

- 旧サイトのリンク付き記事は35件。すべて新学習サイトに対応する日本語記事がある。
- 旧サイトのリンクなし項目は8件。いずれも新学習サイトでは`planned-articles.json`の`not-started`として管理されており、旧ページから移行できる本文・メディアはなかった。
- 旧サイトの本文にある記事図は、画像タグではなく埋め込みSVGとして2件確認した。
- 外部フォームやGoogle Sitesの共通UI用iframeは記事本文のメディアではないため、学習記事へは移行していない。

## 移行した図

| 新記事                                                                                     | リポジトリ内のメディア                                            | 内容                               |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- | ---------------------------------- |
| [群の例](../src/content/articles/jpn/mathematics/group-theory/group-examples.md)           | `public/images/math/group-examples/dihedral-symmetry-axes.svg`    | 正多角形の対称軸（二面体群の説明） |
| [準同型定理](../src/content/articles/jpn/mathematics/group-theory/homomorphism-theorem.md) | `public/images/math/homomorphism-theorem/commutative-diagram.svg` | 準同型定理の可換図式               |

図は記事本文の`figure.math-figure`から参照し、`alt`とキャプションを付けている。CSSは固有の図の縦横比を保ち、記事幅・スマホ幅を超えないようにしている。

## 今後の追加ルール

新しい図・画像を追加するときは、[ADDING_ARTICLES.md](ADDING_ARTICLES.md)の「図・画像」に従う。

```bash
npm run validate:media
npm run audit:math
```

外部画像、Google Sitesのiframe、`script`、`object`、`embed`は記事本文へ直接持ち込まない。再利用条件が不明な画像は公開前に権利者・出典を確認する。

監査対象の旧サイトは[数学のアトラス](https://sites.google.com/view/atlas-mathematics/)である。
