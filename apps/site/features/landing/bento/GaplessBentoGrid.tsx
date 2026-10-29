import BentoResumeCard from "./BentoResumeCard";
import BentoPrivacyCard from "./BentoPrivacyCard";
import BentoPortfolioCard from "./BentoPortfolioCard";
import BentoCoverLetterCard from "./BentoCoverLetterCard";

const GaplessBentoGrid = () => {
  return (
    <div className="grid grid-flow-dense auto-rows-85 grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-4">
      <BentoResumeCard drift="up" />
      <BentoCoverLetterCard drift="down" />
      <BentoPortfolioCard drift="down" />
      <BentoPrivacyCard drift="up" />
    </div>
  );
};

export default GaplessBentoGrid;
