import type { Dispatch, SetStateAction } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

import AccountMenuItem from "./AccountMenuItem";

interface AccountMenuThemeProps {
  setOpen: Dispatch<SetStateAction<boolean>>;
}

const AccountMenuTheme = ({ setOpen }: AccountMenuThemeProps) => {
  const { resolvedTheme, setTheme } = useTheme();

  const themeLabel = resolvedTheme === "dark" ? "Light mode" : "Dark mode";

  const onToggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <AccountMenuItem
      icon={themeLabel === "Light mode" ? Sun : Moon}
      label={themeLabel}
      onClick={() => {
        setOpen(false);
        onToggleTheme();
      }}
    />
  );
};

export default AccountMenuTheme;
