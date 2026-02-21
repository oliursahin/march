import React from "react";
import Navbar from "./Navbar";
import Hero from "./hero";
import About from "./about";
import Philosophy from "./philosophy";
import { Section } from "./section";
import Footer from "./footer";

const PageContent = () => {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Navbar />
      <div className="flex-grow">
        <Section>
          <Hero />
        </Section>
        <Section>
          <About />
        </Section>
        <Section>
          <Philosophy />
        </Section>
      </div>
      <Footer />
    </div>
  );
};

export default PageContent;
