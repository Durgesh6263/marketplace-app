import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/home/HeroSection";
import FeaturedProjects from "@/components/home/FeaturedProjects";
import HowItWorks from "@/components/home/HowItWorks";
import JoinSection from "@/components/home/JoinSection";
import CTASection from "@/components/home/CTASection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16">
        <HeroSection />
        <HowItWorks />
        <FeaturedProjects />
        <JoinSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
