import { useState } from "react";
import { Button, Text, TextInput, View } from "react-native";
import { apiRequest } from "@/lib/api";
import { useAuth, type User } from "@/context/AuthContext";
import { useTheme } from "@/theme/ThemeProvider";
export function PracticeLogin() {
  const { signIn } = useAuth();
  const { colors } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const login = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await apiRequest<{ token: string; user: User }>(
        "/auth/login",
        { method: "POST", body: JSON.stringify({ email, password }) },
      );
      await signIn(result.token, result.user);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        padding: 28,
        gap: 18,
        backgroundColor: colors.background,
      }}
    >
      <Text style={{ color: colors.text, fontSize: 28, fontWeight: "700" }}>
        ABC Doctor
      </Text>
      <Text style={{ color: colors.muted }}>
        Sign in with the account provided by your administrator.
      </Text>
      <TextInput
        accessibilityLabel="Email"
        placeholder="Email"
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        value={email}
        onChangeText={setEmail}
        style={{
          color: colors.text,
          borderWidth: 1,
          borderColor: colors.separator,
          padding: 14,
          borderRadius: 12,
        }}
      />
      <TextInput
        accessibilityLabel="Password"
        placeholder="Password"
        placeholderTextColor={colors.muted}
        secureTextEntry
        autoComplete="current-password"
        value={password}
        onChangeText={setPassword}
        style={{
          color: colors.text,
          borderWidth: 1,
          borderColor: colors.separator,
          padding: 14,
          borderRadius: 12,
        }}
      />
      {error ? (
        <Text accessibilityRole="alert" style={{ color: colors.red }}>
          {error}
        </Text>
      ) : null}
      <Button
        title={busy ? "Signing in…" : "Sign in"}
        disabled={busy || !email || !password}
        onPress={() => void login()}
      />
    </View>
  );
}
