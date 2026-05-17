import React, { ReactNode } from "react";

type SEOContentContainerProps = {
  children: ReactNode;
};

const SEOContentContainer = ({ children }: SEOContentContainerProps) => {
  return (
    <section className="mx-auto max-w-7xl">
      <div className="max-w-3xl space-y-4 px-4 py-10 sm:px-6 lg:px-8">{children}</div>
    </section>
  );
};

export default SEOContentContainer;
