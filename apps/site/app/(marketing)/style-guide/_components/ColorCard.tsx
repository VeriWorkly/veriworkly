import { Card } from "@veriworkly/ui";

interface ColorCardProps {
  name: string;
  hex: string;
  variable: string;
  description: string;
}

export const ColorCard = ({ name, hex, variable, description }: ColorCardProps) => (
  <Card className="overflow-hidden">
    <div className="h-24 w-full" style={{ backgroundColor: hex }} />
    <div className="space-y-1 p-4">
      <p className="text-foreground font-semibold">{name}</p>
      <p className="text-muted font-mono text-xs uppercase">{hex}</p>
      <p className="text-muted font-mono text-[10px]">{variable}</p>
      <p className="text-muted mt-2 text-xs leading-relaxed">{description}</p>
    </div>
  </Card>
);
