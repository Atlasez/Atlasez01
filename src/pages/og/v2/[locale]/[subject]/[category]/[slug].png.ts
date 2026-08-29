import {
  GET as getImage,
  getStaticPaths as getBaseStaticPaths,
} from "../../../../[locale]/[subject]/[category]/[slug].png";

export async function getStaticPaths() {
  return getBaseStaticPaths();
}

export const GET = getImage;
