import { currentMode } from '@/stores/conversationPreferences';
import { apiRequest } from "@/lib/api";
import { Mark, type MarkConversation } from "./mark";
export type Workflow = {
  id: number;
  name: string;
  purpose: string;
  enabled: boolean;
};
export type PracticeReport = {
  summary: string;
  score: number | null;
  provisional: boolean;
  strengths: string[];
  improvements: string[];
  critical_errors: string[];
  criteria: {
    text: string;
    status: string;
    feedback: string;
    evidence: number[];
    excerpts: { role: string; text: string }[];
  }[];
};
export type Attempt = {
  conversation_id: number;
  status: string;
  brief: string;
  report: PracticeReport | null;
};
export const Practice = {
  workflows: () => apiRequest<Workflow[]>("/practice/workflows"),
  preferences: (disabled: number[]) =>
    apiRequest("/practice/preferences", {
      method: "PUT",
      body: JSON.stringify({ disabled }),
    }),
  start: (workflow_id?: number) =>
    apiRequest<MarkConversation>("/practice/start", {
      method: "POST",
      body: JSON.stringify({ workflow_id, mode: currentMode() }),
    }),
  attempt: (id: number) => apiRequest<Attempt>(`/practice/${id}`),
  event: (id: number, event_key: string, args: Record<string, unknown>) =>
    apiRequest<{ kind: string }>(`/practice/${id}/events`, {
      method: "POST",
      body: JSON.stringify({ ...args, event_key }),
    }),
  finish: async (id: number, transcript_complete = true) => {
    await Mark.flushTranscripts(id);
    return apiRequest(`/practice/${id}/finish`, {
      method: "POST",
      body: JSON.stringify({ transcript_complete }),
    });
  },
};
