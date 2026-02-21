"use client";

import React from "react";
import { motion } from "framer-motion";
import { useLanguage } from "./LanguageContext";

const items = [
  { titleKey: "philosophy.item1.title", bodyKey: "philosophy.item1.body" },
  { titleKey: "philosophy.item2.title", bodyKey: "philosophy.item2.body" },
  { titleKey: "philosophy.item3.title", bodyKey: "philosophy.item3.body" },
  { titleKey: "philosophy.item4.title", bodyKey: "philosophy.item4.body" },
] as const;

export default function Philosophy() {
  const { t } = useLanguage();

  const fadeIn = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.6 } },
  };

  const stagger = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  return (
    <motion.div
      className="w-full max-w-xl mx-auto"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={stagger}
    >
      <motion.h2
        className="text-sm font-semibold text-gray-900"
        variants={fadeIn}
      >
        {t("philosophy.title")}
      </motion.h2>
      <motion.p
        className="mt-2 text-sm text-gray-500"
        variants={fadeIn}
      >
        {t("philosophy.intro")}
      </motion.p>

      <div className="mt-8 space-y-6">
        {items.map((item) => (
          <motion.div key={item.titleKey} variants={fadeIn}>
            <h3 className="text-sm font-medium text-gray-900">
              — {t(item.titleKey)}
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-gray-500 pl-4">
              {t(item.bodyKey)}
            </p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
