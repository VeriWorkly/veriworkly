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
    title: "TLS 1.3 & AES-256",
    desc: "Encrypted in transit and at rest for optional cloud sync.",
  },
  {
    icon: Zap,
    title: "24-Hour SLA",
    desc: "Rapid triage and point of contact for security reports.",
  },
  {
    icon: Code2,
    title: "Auditable MIT Core",
    desc: "Transparent open-source architecture on GitHub.",
  },
];
