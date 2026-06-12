import React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

import AccountMenuItem from "./AccountMenuItem";

const AccountMenuTheme = ({
  setOpen,
}: {
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const { resolvedTheme, setTheme } = useTheme();

  const themeLabel = resolvedTheme === "dark" ? "Light mode" : "Dark mode";

  const onToggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  const close = () => setOpen(false);

  return (
    <AccountMenuItem
      icon={themeLabel === "Light mode" ? Sun : Moon}
      label={themeLabel}
      onClick={() => {
        close();
        onToggleTheme();
      }}
    />
  );
};

export default AccountMenuTheme;
