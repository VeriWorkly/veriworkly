import { EyeOff, Lock, Zap, Code2 } from "lucide-react";
import type { SecurityCommitment } from "../types";

export const SECURITY_COMMITMENTS: SecurityCommitment[] = [
  {
    icon: EyeOff,
    title: "0 Keystroke Telemetry",
    desc: "We never monitor or transmit your document typing.",
  },
  {
    icon: Lock,
    title: "Encrypted in Transit",
    desc: "HTTPS on every connection. At-rest encryption is provided by our infrastructure providers.",
  },
  {
    icon: Zap,
    title: "24-48h Response",
    desc: "A named point of contact who acknowledges every security report.",
  },
  {
    icon: Code2,
    title: "Auditable MIT Core",
    desc: "Transparent open-source architecture on GitHub.",
  },
];
