import { Lock } from "lucide-react";

import { Input, Modal, Button } from "@veriworkly/ui";

interface PasswordGateModalProps {
  password: string;
  verifying: boolean;
  error: string | null;
  onUnlock: () => void;
  onPasswordChange: (value: string) => void;
}

const PasswordGateModal = ({
  password,
  verifying,
  error,
  onUnlock,
  onPasswordChange,
}: PasswordGateModalProps) => {
  return (
    <main className="bg-background surface-grid min-h-screen">
      <Modal open onClose={() => {}}>
        <Modal.Content className="border-border bg-background w-[95vw] max-w-md overflow-hidden rounded-3xl p-0 shadow-2xl md:w-full md:rounded-4xl">
          <div className="surface-grid border-border bg-card/30 relative flex h-24 items-center justify-center border-b md:h-32">
            <div className="bg-card border-border rotate-2 rounded-xl border p-3 shadow-sm md:rounded-2xl md:p-5">
              <Lock className="text-accent h-6 w-6 md:h-8 md:w-8" />
            </div>
          </div>

          <div className="space-y-6 p-6 md:space-y-8 md:p-8">
            <div className="space-y-1.5 text-center md:space-y-2">
              <Modal.Title className="text-foreground text-xl font-black tracking-tighter md:text-3xl">
                Locked Protocol
              </Modal.Title>

              <Modal.Description className="text-muted text-xs leading-relaxed font-medium md:text-sm">
                This document is encrypted. Enter the access key to view and download the document.
              </Modal.Description>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-muted ml-1 text-[9px] font-black tracking-[0.25em] uppercase md:text-[10px]">
                  Access Key
                </label>

                <Input
                  autoFocus
                  type="password"
                  value={password}
                  placeholder="••••••••"
                  onChange={(event) => onPasswordChange(event.target.value)}
                  className="bg-card border-border focus:ring-accent/20 h-12 rounded-xl text-center text-lg font-black tracking-[0.4em] md:h-14 md:rounded-2xl md:text-xl"
                  onKeyDown={(event) => (event.key === "Enter" ? onUnlock() : undefined)}
                />
              </div>

              {error ? (
                <p className="text-accent text-center text-[9px] font-black tracking-widest uppercase md:text-[10px]">
                  {error}
                </p>
              ) : null}

              <Button
                onClick={onUnlock}
                loading={verifying}
                className="bg-accent text-accent-foreground h-12 w-full rounded-xl text-[10px] font-black tracking-[0.2em] uppercase transition-transform active:scale-[0.98] md:h-14 md:rounded-2xl md:text-xs"
              >
                Unlock Document
              </Button>
            </div>
          </div>
        </Modal.Content>
      </Modal>
    </main>
  );
};

export { PasswordGateModal };
