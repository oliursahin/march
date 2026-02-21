"use client";

import React from "react";
import { motion } from "framer-motion";
import { useLanguage } from "./LanguageContext";

export default function Footer() {
  const { t } = useLanguage();

  return (
    <motion.footer
      className="w-full py-8"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
    >
      <div className="flex justify-center items-center">
        <div className="text-sm text-gray-400">
          {t("footer.prefix")}{" "}
          <a
            href="https://github.com/marchhq/march"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-gray-700 transition-colors"
          >
            {t("footer.forkText")}
          </a>{" "}
          {t("footer.code")} {t("footer.or")}{" "}
          <a
            href="https://x.com/_marchhq"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-gray-700 transition-colors"
          >
            {t("footer.followText")}
          </a>{" "}
          {t("footer.onx")}
        </div>
      </div>
    </motion.footer>
  );
}
