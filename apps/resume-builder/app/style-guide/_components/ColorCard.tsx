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
    <div className="p-4 space-y-1">
      <p className="text-foreground font-semibold">{name}</p>
      <p className="text-muted text-xs font-mono uppercase">{hex}</p>
      <p className="text-muted text-[10px] font-mono">{variable}</p>
      <p className="text-muted text-xs mt-2 leading-relaxed">{description}</p>
    </div>
  </Card>
);
