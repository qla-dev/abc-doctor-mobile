import { ModePicker } from '@/components/mark/ModePicker';
import { useCallback, useEffect, useState } from "react";
import { Button, ScrollView, Switch, Text, View } from "react-native";
import {
  router,
  Stack,
  useLocalSearchParams,
  useFocusEffect,
} from "expo-router";
import { Practice, type Workflow, type Attempt } from "@/services/practice";
import { useTheme } from "@/theme/ThemeProvider";
export default function PracticeScreen() {
  const { conversationId } = useLocalSearchParams<{
    conversationId?: string;
  }>();
  const id = Number(conversationId);
  const { colors } = useTheme();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    try {
      if (id) setAttempt(await Practice.attempt(id));
      else setWorkflows(await Practice.workflows());
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id]);
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );
  useEffect(() => {
    if (attempt?.status !== "evaluating") return;
    const timer = setInterval(() => void refresh(), 3000);
    return () => clearInterval(timer);
  }, [attempt?.status, refresh]);
  const run = async (task: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await task();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const start = (workflow?: number) =>
    run(async () => {
      const c = await Practice.start(workflow);
      router.push({
        pathname: "/practice",
        params: { conversationId: String(c.id) },
      });
    });
  const finish = () =>
    run(async () => {
      await Practice.finish(id);
      await refresh();
    });
  const report = attempt?.report;
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 24, gap: 20, paddingBottom: 60 }}
    >
      <Stack.Screen
        options={{ title: id ? "Practice encounter" : "Practice" }}
      />
      {error ? (
        <>
          <Text accessibilityRole="alert" style={{ color: colors.red }}>
            {error}
          </Text>
          <Button title="Retry" onPress={() => void refresh()} />
        </>
      ) : null}
      <ModePicker />
      {!id ? (
        <>
          <Text style={{ color: colors.text, fontSize: 25, fontWeight: "700" }}>
            Choose what to practice
          </Text>
          <Text style={{ color: colors.muted }}>
            Enable the workflows you want. Your patient case is a surprise.
          </Text>
          <Button
            title="Surprise me"
            disabled={busy || !workflows.some((w) => w.enabled)}
            onPress={() => void start()}
          />
          {workflows.map((w) => (
            <View
              key={w.id}
              style={{
                padding: 18,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: colors.separator,
                gap: 10,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: colors.text,
                    fontWeight: "700",
                    fontSize: 18,
                    flex: 1,
                  }}
                >
                  {w.name}
                </Text>
                <Switch
                  accessibilityLabel={`Enable ${w.name}`}
                  value={w.enabled}
                  disabled={busy}
                  onValueChange={(enabled) =>
                    void run(async () => {
                      const next = workflows.map((x) =>
                        x.id === w.id ? { ...x, enabled } : x,
                      );
                      await Practice.preferences(
                        next.filter((x) => !x.enabled).map((x) => x.id),
                      );
                      setWorkflows(next);
                    })
                  }
                />
              </View>
              <Text style={{ color: colors.muted }}>{w.purpose}</Text>
              <Button
                title="Start workflow"
                disabled={busy || !w.enabled}
                onPress={() => void start(w.id)}
              />
            </View>
          ))}
          {!workflows.length && !error ? (
            <Text style={{ color: colors.muted }}>
              No published workflows yet. Your administrator can add and publish
              starter examples.
            </Text>
          ) : null}
        </>
      ) : null}
      {attempt ? (
        <>
          <Text style={{ color: colors.text, fontSize: 18, lineHeight: 27 }}>
            {attempt.brief}
          </Text>
          {attempt.status === "active" ? (
            <>
              <Button
                title="Open conversation"
                onPress={() =>
                  router.push({
                    pathname: "/mark",
                    params: { conversationId: String(id), practice: "1" },
                  })
                }
              />
              <Button
                title={busy ? "Finishing…" : "Finish and review"}
                disabled={busy}
                onPress={() => void finish()}
              />
            </>
          ) : null}
          {attempt.status === "evaluating" ? (
            <Text style={{ color: colors.muted }}>
              Preparing your feedback…
            </Text>
          ) : null}
          {attempt.status === "evaluation_failed" ? (
            <>
              <Text style={{ color: colors.red }}>
                Feedback could not be generated. Your encounter is saved.
              </Text>
              <Button
                title="Retry evaluation"
                disabled={busy}
                onPress={() => void finish()}
              />
            </>
          ) : null}
        </>
      ) : null}
      {report ? (
        <>
          <Text style={{ color: colors.text, fontSize: 26, fontWeight: "700" }}>
            {report.provisional ? "Provisional feedback" : "Your feedback"}
            {report.score !== null ? ` · ${report.score}/100` : ""}
          </Text>
          <Text style={{ color: colors.text }}>{report.summary}</Text>
          {(["strengths", "improvements", "critical_errors"] as const).map(
            (key) => report[key].length ? (
              <View key={key} style={{ gap: 8 }}>
                <Text style={{ color: colors.text, fontWeight: "700" }}>
                  {key.replace("_", " ").toUpperCase()}
                </Text>
                {report[key].map((item, i) => (
                  <Text key={i} style={{ color: colors.text }}>
                    • {item}
                  </Text>
                ))}
              </View>
            ) : null,
          )}
          {report.criteria.map((c, i) => (
            <View key={i} style={{ gap: 5 }}>
              <Text style={{ color: colors.text, fontWeight: "700" }}>
                {c.text} — {c.status.replace("_", " ")}
              </Text>
              <Text style={{ color: colors.muted }}>{c.feedback}</Text>
              {c.excerpts?.map((quote, q) => (
                <Text
                  key={q}
                  style={{ color: colors.muted, fontStyle: "italic" }}
                >
                  {quote.role}: “{quote.text}”
                </Text>
              ))}
            </View>
          ))}
          <Button
            title="View conversation evidence"
            onPress={() =>
              router.push({
                pathname: "/mark",
                params: { conversationId: String(id) },
              })
            }
          />
          <Button
            title="Practice another case"
            onPress={() => router.push("/practice")}
          />
        </>
      ) : null}
    </ScrollView>
  );
}
