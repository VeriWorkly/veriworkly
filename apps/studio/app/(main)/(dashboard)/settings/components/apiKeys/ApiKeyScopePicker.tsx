import { Checkbox, Card } from "@veriworkly/ui";

import { API_KEY_SCOPE_OPTIONS } from "./ApiKeyScopes";

type ApiKeyScopePickerProps = {
  availableScopes: readonly string[];
  selectedScopes: string[];
  onChange: (value: string[]) => void;
};

export default function ApiKeyScopePicker({
  availableScopes,
  selectedScopes,
  onChange,
}: ApiKeyScopePickerProps) {
  const setScope = (scope: string, checked: boolean) => {
    if (checked) {
      onChange(Array.from(new Set([...selectedScopes, scope])));
      return;
    }

    onChange(selectedScopes.filter((value) => value !== scope));
  };

  return (
    <Card className="border-border/60 bg-background/30 p-4">
      <div className="space-y-3">
        <div className="space-y-1">
          <p className="text-foreground text-sm font-semibold">Scopes</p>

          <p className="text-muted-foreground text-xs">
            Choose exactly what this key can do. Start with the least access possible.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {API_KEY_SCOPE_OPTIONS.filter((option) => availableScopes.includes(option.value)).map(
            (option) => (
              <label
                key={option.value}
                className="hover:border-accent/30 hover:bg-accent/5 border-border/70 flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 text-sm transition-colors"
              >
                <Checkbox
                  checked={selectedScopes.includes(option.value)}
                  onCheckedChange={(checked) => setScope(option.value, Boolean(checked))}
                  className="mt-0.5"
                />

                <span className="min-w-0 space-y-0.5">
                  <span className="text-foreground block font-medium">{option.label}</span>

                  <span className="text-muted-foreground block text-xs leading-relaxed">
                    {option.description}
                  </span>
                </span>
              </label>
            ),
          )}
        </div>
      </div>
    </Card>
  );
}
