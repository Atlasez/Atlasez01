/** 分野トップで使う大分類・中分類。各分野は必ず一度だけ配置する。 */
export interface SubjectGroup {
  id: string;
  name: { ja: string; en: string };
  sections: {
    id: string;
    name: { ja: string; en: string };
    subjects: string[];
  }[];
}

export const SUBJECT_GROUPS: SubjectGroup[] = [
  {
    id: "humanities",
    name: { ja: "人文科学", en: "Humanities" },
    sections: [
      {
        id: "language-learning",
        name: { ja: "言語学習", en: "Language learning" },
        subjects: ["kanji", "kobun", "kanbun", "chinese", "taiwanese-mandarin"],
      },
      {
        id: "language-studies",
        name: { ja: "言語・文学", en: "Language and literature" },
        subjects: ["linguistics"],
      },
      {
        id: "history-thought",
        name: { ja: "歴史・思想・文化", en: "History, thought and culture" },
        subjects: [
          "japanese-history",
          "world-history",
          "philosophy",
          "archaeology",
        ],
      },
    ],
  },
  {
    id: "social-sciences",
    name: { ja: "社会科学", en: "Social sciences" },
    sections: [
      {
        id: "human-society",
        name: { ja: "地域・社会", en: "Regions and society" },
        subjects: ["geography"],
      },
    ],
  },
  {
    id: "natural-sciences",
    name: { ja: "自然科学", en: "Natural sciences" },
    sections: [
      {
        id: "mathematical-information",
        name: { ja: "数理・情報", en: "Mathematics and information" },
        subjects: ["mathematics", "informatics"],
      },
      {
        id: "physical-earth",
        name: { ja: "物質・宇宙・地球", en: "Matter, space and Earth" },
        subjects: [
          "physics",
          "chemistry",
          "astronomy",
          "geology",
          "meteorology",
          "oceanography",
        ],
      },
      {
        id: "life-applied",
        name: { ja: "生命・応用科学", en: "Life and applied sciences" },
        subjects: ["biology", "fisheries-science", "pharmacy", "architecture"],
      },
    ],
  },
];
