"use client";

import React, { useState } from "react";

import { ContactForm } from "./components/ContactForm";
import { ContactFaqSidebar } from "./components/ContactFaqSidebar";
import { ContactChannelsSection } from "./components/ContactChannelsSection";
import { ContactSuccessModal, type ContactSuccessData } from "./components/ContactSuccessModal";

export const ContactExperience = () => {
  const [successData, setSuccessData] = useState<ContactSuccessData | null>(null);

  return (
    <div className="space-y-10">
      <ContactChannelsSection />

      <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <ContactForm onSuccess={setSuccessData} />
        <ContactFaqSidebar />
      </section>

      <ContactSuccessModal data={successData} onClose={() => setSuccessData(null)} />
    </div>
  );
};

export default ContactExperience;
