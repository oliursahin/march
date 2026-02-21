"use client";

import React from "react";
import { motion } from "framer-motion";
import { useLanguage } from "./LanguageContext";

const features = [
  { titleKey: "about.local.title", bodyKey: "about.local.body" },
  { titleKey: "about.ai.title", bodyKey: "about.ai.body" },
  { titleKey: "about.inbox.title", bodyKey: "about.inbox.body" },
] as const;

export default function About() {
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
      className="w-full max-w-xl mx-auto space-y-12"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={stagger}
    >
      {features.map((feature) => (
        <motion.div key={feature.titleKey} variants={fadeIn}>
          <h3 className="text-sm font-semibold text-gray-900">
            {t(feature.titleKey)}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-gray-500">
            {t(feature.bodyKey)}
          </p>
        </motion.div>
      ))}
    </motion.div>
  );
}
