import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Hero } from "@/components/landing/hero";
import { FragmentedLearning } from "@/components/landing/fragmented-learning";
import { BuildExperience } from "@/components/landing/build-experience";
import { IntelligentLearning } from "@/components/landing/intelligent-learning";
import { AiDemo } from "@/components/landing/ai-demo";
import { MoreThanAChatbot } from "@/components/landing/more-than-chatbot";
import { ProductShowcase } from "@/components/landing/product-showcase";
import { LearningJourney } from "@/components/landing/learning-journey";
import { Community } from "@/components/landing/community";
import { Motivation } from "@/components/landing/motivation";
import { FutureLearning } from "@/components/landing/future-learning";
import { WaitlistCTA } from "@/components/landing/waitlist-cta";

export default function Home() {
  return (
    <>
      <Navbar />
      <main id="main">
        <Hero />
        <FragmentedLearning />
        <BuildExperience />
        <IntelligentLearning />
        <AiDemo />
        <MoreThanAChatbot />
        <ProductShowcase />
        <LearningJourney />
        <Community />
        <Motivation />
        <FutureLearning />
        <WaitlistCTA />
      </main>
      <Footer />
    </>
  );
}
