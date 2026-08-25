import ComparisonTable from "./ComparisonTable";
import ComparisonMatrixCTA from "./ComparisonMatrixCTA";
import ComparisonMatrixHeader from "./ComparisonMatrixHeader";

const ComparisonMatrix = () => {
  return (
    <section className="relative w-full overflow-hidden bg-white py-24 sm:py-32 md:py-40 dark:bg-[#000000]">
      <div className="mx-auto max-w-350 px-6 md:px-8">
        <ComparisonMatrixHeader />
        <ComparisonTable />
        <ComparisonMatrixCTA />
      </div>
    </section>
  );
};

export default ComparisonMatrix;
