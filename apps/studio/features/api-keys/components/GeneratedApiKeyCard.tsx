import Link from "next/link";
import { AlertCircle, Check, Copy } from "lucide-react";

import { Button, Card } from "@veriworkly/ui";

import { LocalDate } from "@/components/LocalDate";

type GeneratedApiKeyCardProps = {
  generatedKey: string;
  /** The new key's id and expiry, for a link to its page; left out on that page itself. */
  keyId?: string;
  expiresAt?: string | null;
  copied: boolean;
  onCopy: () => void;
  onDismiss: () => void;
};

export default function GeneratedApiKeyCard({
  generatedKey,
  keyId,
  expiresAt,
  copied,
  onCopy,
  onDismiss,
}: GeneratedApiKeyCardProps) {
  return (
    <Card className="animate-in zoom-in-95 border-accent/20 bg-accent/5 p-6 duration-300">
      <div className="space-y-4">
        <div className="text-accent flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <h3 className="font-bold">Save your API Key</h3>
        </div>

        <p className="text-muted-foreground text-sm">
          For security reasons, this key will only be shown once. Please copy it now.
        </p>

        <div className="group border-accent/20 bg-background/80 flex items-center justify-between gap-2 rounded-lg border p-3 font-mono text-sm break-all">
          <span className="text-foreground">{generatedKey}</span>

          <Button size="sm" variant="ghost" onClick={onCopy} className="shrink-0">
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>

        {keyId ? (
          <p className="text-muted-foreground text-xs">
            {expiresAt ? (
              <>
                Expires <LocalDate value={expiresAt} />.{" "}
              </>
            ) : null}
            <Link
              href={`/api-keys/${encodeURIComponent(keyId)}`}
              className="text-foreground font-semibold underline"
            >
              View this key
            </Link>
          </p>
        ) : null}

        <Button size="sm" onClick={onDismiss} className="w-full">
          I have saved the key
        </Button>
      </div>
    </Card>
  );
}
