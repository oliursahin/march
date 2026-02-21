"use client";

import React from "react";
import { motion } from "framer-motion";
import { useLanguage } from "./LanguageContext";

export default function Hero() {
  const { t } = useLanguage();

  const fadeIn = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.8 } },
  };

  const stagger = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 },
    },
  };

  return (
    <motion.div
      className="flex w-full flex-col items-center pt-32 pb-16 text-center"
      initial="hidden"
      animate="visible"
      variants={stagger}
    >
      <motion.h1
        className="max-w-2xl text-3xl font-bold leading-tight md:text-5xl text-gray-900"
        variants={fadeIn}
      >
        <span className="text-black">{t("hero.title.line1")}</span>{" "}
        <span className="text-gray-400">{t("hero.title.line2")}</span>
      </motion.h1>

      <motion.p
        className="mt-6 max-w-xl text-sm leading-relaxed text-gray-500"
        variants={fadeIn}
      >
        {t("hero.subtitle")}
      </motion.p>

      <motion.div className="mt-8 flex items-center gap-6" variants={fadeIn}>
        <a
          href="https://github.com/marchhq/march"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-gray-900 underline underline-offset-4 hover:text-black transition-colors"
        >
          {t("hero.cta.github")}
        </a>
        <a
          href="https://app.march.cat"
          className="text-sm font-medium text-gray-900 underline underline-offset-4 hover:text-black transition-colors"
        >
          {t("hero.cta.start")}
        </a>
      </motion.div>
    </motion.div>
  );
}
