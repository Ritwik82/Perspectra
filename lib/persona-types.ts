export type PersonaId = "conspiracy" | "entrepreneur" | "redditor" | "gym_bro";

export interface PersonaInfo {
  id: PersonaId;
  name: string;
  tagline: string;
  avatarIcon: string;
  accentColor: string;
  badge: string;
  description: string;
  communicationStyle: string[];
  reasoningWeaknesses: string[];
  starterTopics: string[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface DebateEvaluation {
  topic: string;
  headline: string;
  summary: string;
  personaClaims: Array<{ claim: string; quote: string; reasoningSoundness: string }>;
  userClaims: Array<{ claim: string; quote: string; reasoningSoundness: string }>;
  fallaciesIdentified: Array<{ speaker: "Persona" | "User"; fallacy: string; quote: string; explanation: string }>;
  steelmannedConsensus: string;
  whatWouldSettleIt: string;
  personaScore: number | null;
  userScore: number | null;
  refereeVerdict: string;
  criticalThinkingTakeaway: string;
  raw?: string;
}
