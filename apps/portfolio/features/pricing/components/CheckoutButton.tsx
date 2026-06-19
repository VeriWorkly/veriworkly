import React from "react";
import Link from "next/link";

interface CheckoutButtonProps {
  children: React.ReactNode;
  className?: string;
  href: string;
}

export function CheckoutButton({ children, className = "", href }: CheckoutButtonProps) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-full px-6 text-sm font-bold transition duration-300 hover:-translate-y-1 active:scale-[0.97] ${className}`}
    >
      {children}
    </Link>
  );
}
