"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Lang = "en" | "ca";

type Translations = Record<string, Record<Lang, string>>;

const translations: Translations = {
  // Hero
  "hero.title.line1": {
    en: "second brain for people living",
    ca: "segon cervell per a persones que viuen",
  },
  "hero.title.line2": {
    en: "on mars",
    ca: "a Mart",
  },
  "hero.subtitle": {
    en: "march connects your tools and uses AI to surface priorities, decisions, and next actions — so you can stay focused on what matters.",
    ca: "march connecta les teves eines i utilitza IA per mostrar prioritats, decisions i properes accions — perquè puguis centrar-te en el que importa.",
  },
  "hero.cta.github": { en: "GitHub", ca: "GitHub" },
  "hero.cta.start": { en: "Get Started", ca: "Comença" },

  // About
  "about.local.title": { en: "Local-first", ca: "Local-first" },
  "about.local.body": {
    en: "Your data lives on your machine in a SQLite database. No cloud dependency, no vendor lock-in. It works offline and it's yours forever.",
    ca: "Les teves dades viuen a la teva màquina en una base de dades SQLite. Sense dependència del núvol, sense bloqueig de proveïdor. Funciona sense connexió i és teu per sempre.",
  },
  "about.ai.title": { en: "AI-powered", ca: "Impulsat per IA" },
  "about.ai.body": {
    en: "march uses AI to read your inbox, surface what needs attention, and suggest next actions. It doesn't decide for you — it helps you decide faster.",
    ca: "march utilitza IA per llegir la teva safata d'entrada, mostrar el que necessita atenció i suggerir properes accions. No decideix per tu — t'ajuda a decidir més ràpid.",
  },
  "about.inbox.title": { en: "Clean inbox", ca: "Safata neta" },
  "about.inbox.body": {
    en: "A unified view of everything that needs your attention. Emails, tasks, and notes in one place. Use the command bar to triage in seconds.",
    ca: "Una vista unificada de tot el que necessita la teva atenció. Correus, tasques i notes en un sol lloc. Utilitza la barra de comandes per triar en segons.",
  },

  // Philosophy
  "philosophy.title": { en: "Philosophy", ca: "Filosofia" },
  "philosophy.intro": {
    en: "march is opinionated software. Here's what we believe:",
    ca: "march és programari amb opinió. Això és el que creiem:",
  },
  "philosophy.item1.title": { en: "No cloud required", ca: "Sense núvol" },
  "philosophy.item1.body": {
    en: "Your productivity data is personal. It belongs on your machine, not on someone else's server.",
    ca: "Les teves dades de productivitat són personals. Pertanyen a la teva màquina, no al servidor d'algú altre.",
  },
  "philosophy.item2.title": { en: "No feature bloat", ca: "Sense inflació de funcions" },
  "philosophy.item2.body": {
    en: "We intentionally ship less. Every feature earns its place by solving a real problem, not by filling a roadmap.",
    ca: "Intencionalment enviem menys. Cada funció guanya el seu lloc resolent un problema real, no omplint un full de ruta.",
  },
  "philosophy.item3.title": { en: "No busy work", ca: "Sense feina innecessària" },
  "philosophy.item3.body": {
    en: "march doesn't ask you to organize, tag, or categorize. It reads your inputs and does the thinking for you.",
    ca: "march no et demana organitzar, etiquetar o categoritzar. Llegeix les teves entrades i pensa per tu.",
  },
  "philosophy.item4.title": { en: "No lock-in", ca: "Sense bloqueig" },
  "philosophy.item4.body": {
    en: "Your data is a SQLite file. Export it, query it, back it up. You're never trapped.",
    ca: "Les teves dades són un fitxer SQLite. Exporta'l, consulta'l, fes-ne còpia. Mai estàs atrapat.",
  },

  // Footer
  "footer.prefix": { en: "—", ca: "—" },
  "footer.forkText": { en: "fork", ca: "fes un fork" },
  "footer.code": { en: "code", ca: "del codi" },
  "footer.or": { en: "or", ca: "o" },
  "footer.followText": { en: "follow", ca: "segueix" },
  "footer.onx": { en: "on x", ca: "a X" },

  // Language names
  "lang.en": { en: "English", ca: "Anglès" },
  "lang.ca": { en: "Catalan", ca: "Català" },
};

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: keyof typeof translations) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? (localStorage.getItem("lang") as Lang | null) : null;
    if (saved === "en" || saved === "ca") {
      setLangState(saved);
      return;
    }
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("lang", l);
  };

  const t = useMemo(() => {
    return (key: keyof typeof translations) => translations[key][lang] ?? String(key);
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
