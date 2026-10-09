"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

export type Lang = "en" | "fr";

const en = {
  banner: {
    line: "An open-source civic project. Not affiliated with the Government of Canada or the City of Toronto.",
    badge: "Open source",
  },
  nav: { ranking: "Ranking", methodology: "Methodology", data: "Data", back: "All projects" },
  hero: {
    kicker: "Open Nshipyard · Toronto data",
    title: "Which chains fail food-safety inspections most often.",
    sub: "Toronto Public Health inspects every food premise in the city and posts the result on the door: green for pass, yellow for conditional pass, red for closed. This project groups 32,421 inspections from October 2025 to October 2026 into 84 chains, normalizes for inspection frequency, and ranks each chain by its conditional-pass rate.",
    cta1: "See the ranking",
    cta2: "Read the methodology",
  },
  stats: [
    { value: "84", label: "restaurant and food chains ranked, each with 10 or more Toronto locations inspected in the past year" },
    { value: "32,421", label: "Toronto Public Health inspections, October 2025 to October 2026, grouped from 120,879 infraction rows" },
    { value: "6.7%", label: "of all city inspections ended in a conditional pass; the worst chain hit 19.4%" },
    { value: "19.4%", label: "conditional-pass rate at the worst chain (bb.q Chicken), nearly triple the citywide average" },
  ],
  ranking: {
    kicker: "Ranking",
    title: "84 chains, ranked by conditional-pass rate.",
    body: "The conditional-pass rate divides inspections that ended in a conditional pass by total inspections. Chains inspected more often (high-risk premises get up to 3 inspections a year) are not punished for it: the rate neutralizes inspection frequency. Click any row to see that chain's locations and their latest results.",
    search: "Search chains…",
    showing: "Showing",
    of: "of",
    noResult: "No chains match.",
    colChain: "Chain",
    colLocations: "Locations",
    colInspections: "Inspections",
    colConditional: "Conditional pass",
    colCrucial: "Crucial infractions",
    colClosed: "Closed",
    sortBy: "Sort by",
    perInspection: "per inspection",
    detail: {
      back: "Back to ranking",
      locations: "locations",
      lastInspection: "Latest inspection",
      variants: "name variants merged",
      variantsSub: "Every raw establishment name the source data used for this chain, with the number of infraction rows each contributed. Franchisees can audit the merge.",
      ofLocations: "of locations had at least one conditional pass in the year",
      ofLocationsCrucial: "of locations had at least one crucial infraction in the year",
      address: "Address",
    },
  },
  status: { Pass: "Pass", "Conditional Pass": "Conditional pass", Closed: "Closed" },
  caveats: {
    kicker: "Honest limits",
    title: "What this does not show.",
    items: [
      "A conditional pass means a significant-risk infraction was found and corrected on re-inspection within 48 hours. It is not an ongoing hazard.",
      "Rates are per inspection, not per location, because high-risk premises are inspected up to 3 times a year while low-risk ones get 1. Raw counts would punish the chains that are inspected most.",
      "The source data does not distinguish franchised locations from corporate-owned ones.",
      "DineSafe refreshes daily. This snapshot covers 2025-10-07 to 2026-10-07 and was pulled on 2026-10-09.",
    ],
  },
  methodology: {
    kicker: "Methodology",
    title: "How the chain file was built, and where it is weak.",
    items: [
      "Source: the City of Toronto Open Data DineSafe file, retrieved 2026-10-09: 120,879 rows, one row per inspection/infraction line, under the Open Government Licence - Toronto. Dataset page: https://open.toronto.ca/dataset/dinesafe/.",
      "Inspections were built by grouping rows on (establishment id, inspection date): 81,002 inspections in total, 32,421 inside the 12-month window 2025-10-07 to 2026-10-07. An inspection's status is the worst status among its rows; its severity flags are the union of its rows.",
      "Chain identity resolution is deterministic and documented: names are uppercased, punctuation stripped, legal suffixes (Inc, Ltd, Corp) and store/location numbers removed, then matched against a reviewed anchor list. 84 canonical chains, each with 10 or more locations in the window, survived the cutoff. Dual-brand premises (KFC/Taco Bell combos) are kept as their own chain, not assigned to either brand.",
      "The ranking metric is conditional passes divided by inspections in the 12-month window. Inspection-frequency bias is normalized by using rates: a chain inspected 3 times a year per location can only beat or lose on its pass share, not on its inspection count.",
      "The full match table (every raw name merged into each chain, with row counts) is published as CSV so franchisees and journalists can audit every merge. Re-running scripts/build_data.py against a fresh DineSafe download reproduces the tables.",
      "Weaknesses: corporate-owned vs franchised is not distinguished in the source; status wording is the source's own; a few co-branded campus and gas-station premises are attributed to the premise operator rather than the food brand; addresses are published as-is with no geocoding corrections.",
    ],
    matchTable: "Download the match table (CSV)",
  },
  developers: {
    kicker: "Data and API",
    title: "Take the data with you.",
    body: "The ranked chain table, the name-match table, and the per-chain locations are published as CSV and JSON. A REST API and an MCP server expose the same data for agents.",
    downloads: [
      { name: "chains.csv", desc: "The ranked chain table: locations, inspections, conditional-pass, crucial, closed rates." },
      { name: "chains.json", desc: "Same table as JSON." },
      { name: "match_table.csv", desc: "Every raw establishment name merged into each chain, with row counts." },
      { name: "summary.json", desc: "Snapshot metadata: window, vintage, citywide baselines." },
    ],
    apiTitle: "REST API",
    apiBody: "JSON endpoints, no key required.",
    endpoints: [
      { path: "/api/v1/summary", desc: "Snapshot metadata and citywide baselines." },
      { path: "/api/v1/chains", desc: "The full ranked chain table." },
      { path: "/api/v1/chain?id=TIM%20HORTONS", desc: "One chain: stats, name variants, and locations with latest statuses." },
      { path: "/api/openapi.json", desc: "OpenAPI 3.1 document for the API." },
    ],
    mcpTitle: "MCP server",
    mcpBody: "POST JSON-RPC 2.0 to /mcp. Tools: chain_search, chain_lookup, ranking_summary.",
  },
  footer: {
    line: "An independent open-data project. Not affiliated with the Government of Canada or the City of Toronto.",
    sources: "Data: City of Toronto Open Data, DineSafe (Toronto Public Health), Open Government Licence - Toronto. Snapshot 2025-10-07 to 2026-10-07, pulled 2026-10-09.",
    builtBy: "Built by",
  },
};

const fr: typeof en = {
  banner: {
    line: "Un projet civique open source. Non affilié au gouvernement du Canada ni à la Ville de Toronto.",
    badge: "Open source",
  },
  nav: { ranking: "Classement", methodology: "Méthodologie", data: "Données", back: "Tous les projets" },
  hero: {
    kicker: "Open Nshipyard · Données de Toronto",
    title: "Quelles chaînes ratent le plus souvent les inspections sanitaires.",
    sub: "Toronto Public Health inspecte chaque établissement alimentaire de la ville et affiche le résultat sur la porte : vert pour la réussite, jaune pour la réussite conditionnelle, rouge pour la fermeture. Ce projet regroupe 32 421 inspections d'octobre 2025 à octobre 2026 en 84 chaînes, normalise selon la fréquence d'inspection et classe chaque chaîne selon son taux de réussite conditionnelle.",
    cta1: "Voir le classement",
    cta2: "Lire la méthodologie",
  },
  stats: [
    { value: "84", label: "chaînes de restaurants et d'alimentation classées, chacune avec au moins 10 établissements inspectés à Toronto dans la dernière année" },
    { value: "32 421", label: "inspections de Toronto Public Health, d'octobre 2025 à octobre 2026, regroupées à partir de 120 879 lignes d'infraction" },
    { value: "6,7 %", label: "des inspections de la ville se sont soldées par une réussite conditionnelle; la pire chaîne atteint 19,4 %" },
    { value: "19,4 %", label: "taux de réussite conditionnelle de la pire chaîne (bb.q Chicken), près du triple de la moyenne de la ville" },
  ],
  ranking: {
    kicker: "Classement",
    title: "84 chaînes, classées par taux de réussite conditionnelle.",
    body: "Le taux de réussite conditionnelle divise les inspections soldées par une réussite conditionnelle par le nombre total d'inspections. Les chaînes inspectées plus souvent (les établissements à haut risque sont inspectés jusqu'à 3 fois par an) ne sont pas pénalisées : le taux neutralise la fréquence d'inspection. Cliquez sur une ligne pour voir les établissements de la chaîne et leurs derniers résultats.",
    search: "Rechercher une chaîne…",
    showing: "Affichage de",
    of: "sur",
    noResult: "Aucune chaîne ne correspond.",
    colChain: "Chaîne",
    colLocations: "Établissements",
    colInspections: "Inspections",
    colConditional: "Réussite conditionnelle",
    colCrucial: "Infractions cruciales",
    colClosed: "Fermetures",
    sortBy: "Trier par",
    perInspection: "par inspection",
    detail: {
      back: "Retour au classement",
      locations: "établissements",
      lastInspection: "Dernière inspection",
      variants: "variantes de nom fusionnées",
      variantsSub: "Chaque nom d'établissement brut utilisé par les données sources pour cette chaîne, avec le nombre de lignes d'infraction contribuées. Les franchisés peuvent vérifier la fusion.",
      ofLocations: "des établissements ont eu au moins une réussite conditionnelle dans l'année",
      ofLocationsCrucial: "des établissements ont eu au moins une infraction cruciale dans l'année",
      address: "Adresse",
    },
  },
  status: { Pass: "Réussite", "Conditional Pass": "Réussite conditionnelle", Closed: "Fermé" },
  caveats: {
    kicker: "Limites honnêtes",
    title: "Ce que ceci ne montre pas.",
    items: [
      "Une réussite conditionnelle signifie qu'une infraction à risque important a été constatée puis corrigée lors d'une contre-visite dans les 48 heures. Ce n'est pas un danger permanent.",
      "Les taux sont calculés par inspection, et non par établissement, parce que les établissements à haut risque sont inspectés jusqu'à 3 fois par an contre 1 fois pour les autres. Les chiffres bruts pénaliseraient les chaînes les plus inspectées.",
      "Les données sources ne distinguent pas les établissements franchisés des établissements corporatifs.",
      "DineSafe est actualisé quotidiennement. Cet instantané couvre du 7 octobre 2025 au 7 octobre 2026 et a été extrait le 9 octobre 2026.",
    ],
  },
  methodology: {
    kicker: "Méthodologie",
    title: "Comment le fichier des chaînes a été construit, et où il est faible.",
    items: [
      "Source : le fichier DineSafe des données ouvertes de la Ville de Toronto, extrait le 9 octobre 2026 : 120 879 lignes, une ligne par inspection et infraction, sous la Licence du gouvernement ouvert - Toronto. Page du jeu de données : https://open.toronto.ca/dataset/dinesafe/.",
      "Les inspections ont été construites en regroupant les lignes par (identifiant d'établissement, date d'inspection) : 81 002 inspections au total, 32 421 dans la fenêtre de 12 mois du 7 octobre 2025 au 7 octobre 2026. Le statut d'une inspection est le pire statut de ses lignes; ses indicateurs de gravité sont l'union de ses lignes.",
      "La résolution d'identité des chaînes est déterministe et documentée : noms en majuscules, ponctuation supprimée, suffixes légaux (Inc, Ltd, Corp) et numéros de magasin retirés, puis appariement à une liste d'ancres vérifiée. 84 chaînes canoniques, chacune avec au moins 10 établissements dans la fenêtre, ont passé le seuil. Les établissements à double bannière (combos KFC/Taco Bell) forment leur propre chaîne.",
      "La mesure de classement est le nombre de réussites conditionnelles divisé par les inspections de la fenêtre de 12 mois. Le biais de fréquence d'inspection est neutralisé par l'usage de taux : une chaîne inspectée 3 fois par an par établissement ne peut gagner ou perdre que sur sa part de réussites, pas sur son nombre d'inspections.",
      "La table de correspondance complète (chaque nom brut fusionné dans chaque chaîne, avec le nombre de lignes) est publiée en CSV pour que franchisés et journalistes puissent vérifier chaque fusion. Relancer scripts/build_data.py sur un nouveau téléchargement DineSafe reproduit les tables.",
      "Faiblesses : les données sources ne distinguent pas le corporatif du franchisé; le libellé des statuts est celui de la source; quelques établissements mixtes (campus, stations-service) sont attribués à l'exploitant du local plutôt qu'à la marque alimentaire; les adresses sont publiées telles quelles, sans correction géocodée.",
    ],
    matchTable: "Télécharger la table de correspondance (CSV)",
  },
  developers: {
    kicker: "Données et API",
    title: "Emportez les données avec vous.",
    body: "La table des chaînes classées, la table de correspondance des noms et les établissements par chaîne sont publiés en CSV et JSON. Une API REST et un serveur MCP exposent les mêmes données pour les agents.",
    downloads: [
      { name: "chains.csv", desc: "La table des chaînes classées : établissements, inspections, taux de réussite conditionnelle, cruciales, fermetures." },
      { name: "chains.json", desc: "La même table en JSON." },
      { name: "match_table.csv", desc: "Chaque nom d'établissement brut fusionné dans chaque chaîne, avec le nombre de lignes." },
      { name: "summary.json", desc: "Métadonnées de l'instantané : fenêtre, millésime, moyennes de la ville." },
    ],
    apiTitle: "API REST",
    apiBody: "Points d'accès JSON, sans clé requise.",
    endpoints: [
      { path: "/api/v1/summary", desc: "Métadonnées de l'instantané et moyennes de la ville." },
      { path: "/api/v1/chains", desc: "La table complète des chaînes classées." },
      { path: "/api/v1/chain?id=TIM%20HORTONS", desc: "Une chaîne : statistiques, variantes de nom et établissements avec derniers statuts." },
      { path: "/api/openapi.json", desc: "Document OpenAPI 3.1 de l'API." },
    ],
    mcpTitle: "Serveur MCP",
    mcpBody: "POST JSON-RPC 2.0 vers /mcp. Outils : chain_search, chain_lookup, ranking_summary.",
  },
  footer: {
    line: "Un projet indépendant de données ouvertes. Non affilié au gouvernement du Canada ni à la Ville de Toronto.",
    sources: "Données : Données ouvertes de la Ville de Toronto, DineSafe (Toronto Public Health), Licence du gouvernement ouvert - Toronto. Instantané du 7 octobre 2025 au 7 octobre 2026, extrait le 9 octobre 2026.",
    builtBy: "Conçu par",
  },
};

const dicts = { en, fr };

const LangCtx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: typeof en }>({
  lang: "en",
  setLang: () => {},
  t: en,
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");
  useEffect(() => {
    const saved = window.localStorage.getItem("nshipyard-lang");
    if (saved === "en" || saved === "fr") setLang(saved);
  }, []);
  useEffect(() => {
    window.localStorage.setItem("nshipyard-lang", lang);
    document.documentElement.lang = lang;
  }, [lang]);
  return <LangCtx.Provider value={{ lang, setLang, t: dicts[lang] }}>{children}</LangCtx.Provider>;
}

export function useLang() {
  return useContext(LangCtx);
}
