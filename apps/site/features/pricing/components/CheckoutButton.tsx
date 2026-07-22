import React from "react";
import { ArrowRight, Coins, LoaderCircle } from "lucide-react";

interface CheckoutButtonProps {
  children: React.ReactNode;
  className: string;
  loading: boolean;
  onClick: () => void;
  disabled?: boolean;
}

const CheckoutButton = ({
  children,
  className,
  loading,
  onClick,
  disabled,
}: CheckoutButtonProps) => {
  return (
    <button
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      disabled={loading || disabled}
      onClick={onClick}
      type="button"
    >
      {loading ? <LoaderCircle className="size-4 animate-spin" /> : <Coins className="size-4" />}
      {loading ? "Opening secure checkout" : children}
      {!loading ? <ArrowRight className="size-4" /> : null}
    </button>
  );
};

export default CheckoutButton;
