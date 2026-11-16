import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Easing, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { AppleIcon, GoogleIcon } from '@/components/auth/SocialIcons';
import { LoginParticles } from '@/components/auth/LoginParticles';
import { AppButton } from '@/components/common/AppButton';
import { useTheme } from '@/theme/ThemeProvider';
import { Auth } from '@/services/auth';
import { playClickSound } from '@/lib/sound';
import { ArrowLeft, Mail } from 'lucide-react-native';

const googleExtra = Constants.expoConfig?.extra?.googleAuth ?? {};
const normalizeGoogleClientId = (value?: string) => value?.trim().replace(/\/+$/, '') || '';
const googleConfig = {
  webClientId: normalizeGoogleClientId(googleExtra.webClientId),
  iosClientId: normalizeGoogleClientId(googleExtra.iosClientId),
  androidClientId: normalizeGoogleClientId(googleExtra.androidClientId),
};
const googleRequestConfig = {
  webClientId: googleConfig.webClientId || 'unconfigured.apps.googleusercontent.com',
  iosClientId: googleConfig.iosClientId || 'unconfigured.apps.googleusercontent.com',
  androidClientId: googleConfig.androidClientId || 'unconfigured.apps.googleusercontent.com',
};
const reversedGoogleClientId = googleConfig.iosClientId
  ? `com.googleusercontent.apps.${googleConfig.iosClientId.replace('.apps.googleusercontent.com', '')}`
  : null;
const reversedAndroidGoogleClientId = googleConfig.androidClientId
  ? `com.googleusercontent.apps.${googleConfig.androidClientId.replace('.apps.googleusercontent.com', '')}`
  : null;
const PRIVACY_URL = 'https://qla.dev/abc/privacy';
const TERMS_URL = 'https://qla.dev/abc/terms';

WebBrowser.maybeCompleteAuthSession();

export function AuthScreen() {
  const { signIn } = useAuth();
  const { colors, resolvedMode } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [promptingProvider, setPromptingProvider] = useState<'apple' | 'google' | null>(null);
  const [signingInProvider, setSigningInProvider] = useState<'apple' | 'google' | null>(null);
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signingInEmail, setSigningInEmail] = useState(false);
  const processedGoogleToken = useRef<string | null>(null);
  const passwordRef = useRef<any>(null);
  const transitionX = useRef(new Animated.Value(width)).current;
  const googleRedirectUri = Platform.OS === 'ios' && reversedGoogleClientId
    ? `${reversedGoogleClientId}:/oauthredirect`
    : Platform.OS === 'android' && reversedAndroidGoogleClientId
      ? `${reversedAndroidGoogleClientId}:/oauthredirect`
      : Platform.OS === 'web'
        ? makeRedirectUri({ path: 'oauthredirect' })
        : undefined;
  const [, googleResponse, promptGoogleSignIn] = Google.useIdTokenAuthRequest({
    ...googleRequestConfig,
    redirectUri: googleRedirectUri,
    selectAccount: true,
  });
  const primaryProvider = Platform.OS === 'ios' ? 'apple' : 'google';
  const secondaryProvider = primaryProvider === 'apple' ? 'google' : 'apple';
  const providerLabel = (provider: 'apple' | 'google') => provider === 'apple'
    ? 'Nastavi s Apple računom'
    : 'Nastavi s Google računom';
  const providerIcon = (provider: 'apple' | 'google', color: string) => provider === 'apple'
    ? <AppleIcon color={color} />
    : <GoogleIcon color={color} />;

  const finishSignIn = async (result: { token: string; user: { id: number; name: string; email: string } }) => {
    await signIn(result.token, result.user);
    transitionX.setValue(width);
    await new Promise<void>(resolve => {
      Animated.timing(transitionX, {
        toValue: 0,
        duration: 360,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => resolve());
    });
  };

  const showAuthError = (error: unknown) => {
    setPromptingProvider(null);
    setSigningInProvider(null);
    Alert.alert('Prijava nije uspjela', error instanceof Error ? error.message : 'Pokušajte ponovo.');
  };

  const showAuthCancelled = () => {
    setPromptingProvider(null);
    setSigningInProvider(null);
  };

  const isAuthCancellation = (error: unknown) => {
    if (!error || typeof error !== 'object') return false;
    const code = 'code' in error ? String(error.code).toUpperCase() : '';
    return code === 'ERR_REQUEST_CANCELED' || code === 'ERR_REQUEST_CANCELLED';
  };

  const openLegalLink = (url: string) => {
    void Haptics.selectionAsync();
    void playClickSound();
    void WebBrowser.openBrowserAsync(url, {
      controlsColor: colors.blue,
      toolbarColor: colors.card,
    });
  };

  const handleSignIn = async (provider: 'apple' | 'google') => {
    try {
      setPromptingProvider(provider);
      if (provider === 'google') {
        const platformClientId = Platform.OS === 'ios'
          ? googleConfig.iosClientId
          : Platform.OS === 'android'
            ? googleConfig.androidClientId
            : googleConfig.webClientId;
        if (!platformClientId) {
          throw new Error(`Google prijava nije konfigurisana za ${Platform.OS}.`);
        }
        const result = await promptGoogleSignIn();
        setPromptingProvider(null);
        if (result.type === 'success') {
          setSigningInProvider('google');
        } else if (result.type === 'cancel' || result.type === 'dismiss') {
          showAuthCancelled();
        }
        return;
      }

      if (Platform.OS !== 'ios' || !(await AppleAuthentication.isAvailableAsync())) {
        throw new Error('Apple prijava je dostupna samo na podržanim Apple uređajima.');
      }
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) throw new Error('Apple nije vratio identifikacijski token.');
      setPromptingProvider(null);
      setSigningInProvider('apple');
      const fullName = [credential.fullName?.givenName, credential.fullName?.familyName].filter(Boolean).join(' ');
      await finishSignIn(await Auth.apple(credential.identityToken, fullName));
    } catch (error) {
      if (isAuthCancellation(error)) {
        showAuthCancelled();
      } else {
        showAuthError(error);
      }
    }
  };

  const handleEmailLogin = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) return;
    try {
      setSigningInEmail(true);
      const result = await Auth.login(trimmedEmail, password);
      await finishSignIn(result);
    } catch (error) {
      setSigningInEmail(false);
      Alert.alert('Prijava nije uspjela', error instanceof Error ? error.message : 'Provjerite email i lozinku.');
    }
  };

  useEffect(() => {
    if (!googleResponse) return;
    if (googleResponse.type !== 'success') {
      setPromptingProvider(null);
      setSigningInProvider(null);
      return;
    }
    const idToken = googleResponse.params?.id_token || googleResponse.authentication?.idToken;
    if (!idToken) {
      showAuthError(new Error('Google nije vratio identifikacijski token.'));
      return;
    }
    if (processedGoogleToken.current === idToken) return;
    setPromptingProvider(null);
    setSigningInProvider('google');
    processedGoogleToken.current = idToken;
    void Auth.google(idToken)
      .then(finishSignIn)
      .catch(error => {
        processedGoogleToken.current = null;
        showAuthError(error);
      });
  }, [googleResponse]);

  if (showEmailLogin) {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <LinearGradient colors={['#11182A', '#080B12', '#05070B']} style={[StyleSheet.absoluteFill]} />
        <LoginParticles />
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 18, paddingBottom: insets.bottom + 14, paddingHorizontal: 18, justifyContent: 'space-between' }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ gap: 6 }}>
            <Pressable
              accessibilityRole="button"
              onPress={() => { void Haptics.selectionAsync(); setShowEmailLogin(false); }}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, opacity: pressed ? 0.55 : 1, paddingVertical: 4 })}
            >
              <ArrowLeft size={18} color="#8C93A3" />
              <Text style={{ color: '#8C93A3', fontSize: 13, fontWeight: '600' }}>Nazad</Text>
            </Pressable>
          </View>

          <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1, gap: 7 }}>
            <Image source={require('../../assets/icon.png')} style={a.logo} />
            <Text style={a.brand}>ABC Doctor</Text>
          </View>

          <View style={[a.sheet, {
            backgroundColor: colors.card,
            marginHorizontal: -18,
            marginBottom: -(insets.bottom + 14),
            paddingBottom: 13,
          }]}>
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: '800', textAlign: 'center' }}>
              Prijava emailom
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email adresa"
              placeholderTextColor={colors.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoFocus
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              editable={!signingInEmail}
              style={[a.input, { backgroundColor: colors.input, color: colors.text }]}
            />
            <TextInput
              ref={passwordRef}
              value={password}
              onChangeText={setPassword}
              placeholder="Lozinka"
              placeholderTextColor={colors.muted}
              secureTextEntry
              autoComplete="password"
              returnKeyType="go"
              onSubmitEditing={() => void handleEmailLogin()}
              editable={!signingInEmail}
              style={[a.input, { backgroundColor: colors.input, color: colors.text }]}
            />
            <AppButton
              tone="dark"
              label={signingInEmail ? 'Prijavljujem se…' : 'Prijavi se'}
              icon={signingInEmail ? <ActivityIndicator size="small" color={resolvedMode === 'dark' ? '#000000' : '#FFFFFF'} /> : <Mail size={18} color={resolvedMode === 'dark' ? '#000000' : '#FFFFFF'} />}
              disabled={signingInEmail || !email.trim() || !password}
              onPress={() => void handleEmailLogin()}
              full
            />
            <View style={a.legalOptions}>
              {[
                ['Privatnost', PRIVACY_URL],
                ['Uslovi korištenja', TERMS_URL],
              ].map(([label, url], index) => (
                <View key={url} style={a.legalOption}>
                  {index > 0 && <Text style={[a.legalSeparator, { color: colors.muted }]}>•</Text>}
                  <Pressable
                    accessibilityRole="link"
                    accessibilityLabel={`Otvori: ${label}`}
                    onPress={() => openLegalLink(url)}
                    style={({ pressed }) => pressed && { opacity: .55 }}
                  >
                    <Text style={[a.legalOptionText, { color: colors.muted }]}>{label}</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, a.transition, { backgroundColor: colors.background, transform: [{ translateX: transitionX }] }]}
        >
          <Image source={require('../../assets/icon.png')} style={a.transitionLogo} />
          <Text style={[a.transitionText, { color: colors.text }]}>ABC Doctor</Text>
        </Animated.View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <LinearGradient colors={['#11182A', '#080B12', '#05070B']} style={[StyleSheet.absoluteFill]} />
      <LoginParticles />
      <View style={{ flex: 1, paddingTop: insets.top + 18, paddingBottom: insets.bottom + 14, paddingHorizontal: 18, justifyContent: 'space-between' }}>
        <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1, gap: 7, transform: [{ translateY: -22 }] }}>
          <Image source={require('../../assets/icon.png')} style={a.logo} />
          <View style={{ alignItems: 'center', gap: 3 }}>
            <Text style={a.brand}>ABC Doctor</Text>
            <Text style={a.suiteText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78}>
              <Text style={a.qlaText}>qla</Text>
              <Text style={a.devText}>.dev</Text>
              <Text> · AI asistent za medicinsko učenje</Text>
            </Text>
          </View>
        </View>
        <View style={a.loginFooter}>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Otvori politiku privatnosti"
            onPress={() => openLegalLink(PRIVACY_URL)}
            style={({ pressed }) => [a.consentRow, pressed && { opacity: .55 }]}
          >
            <Text style={a.consentText}>
              Nastavkom pristajete na{' '}
              <Text style={[a.consentLink, { color: colors.blue }]}>Politiku privatnosti</Text>.
            </Text>
          </Pressable>
          <View style={[a.sheet, {
            backgroundColor: colors.card,
            marginHorizontal: -18,
            marginBottom: -(insets.bottom + 14),
            paddingBottom: 13,
          }]}>
            <AppButton
              tone="dark"
              label={signingInProvider === primaryProvider ? 'Prijavljujem se…' : providerLabel(primaryProvider)}
              icon={signingInProvider === primaryProvider
                ? <ActivityIndicator size="small" color={resolvedMode === 'dark' ? '#000000' : '#FFFFFF'} />
                : providerIcon(primaryProvider, resolvedMode === 'dark' ? '#000000' : '#FFFFFF')}
              disabled={promptingProvider !== null || signingInProvider !== null}
              onPress={() => void handleSignIn(primaryProvider)}
            />
            {Platform.OS === 'ios' && <AppButton
              tone="secondary"
              label={signingInProvider === secondaryProvider ? 'Prijavljujem se…' : providerLabel(secondaryProvider)}
              icon={signingInProvider === secondaryProvider
                ? <ActivityIndicator size="small" color={colors.text} />
                : providerIcon(secondaryProvider, colors.text)}
              disabled={promptingProvider !== null || signingInProvider !== null}
              onPress={() => void handleSignIn(secondaryProvider)}
            />}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 2 }}>
              <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.separator }} />
              <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '600' }}>ili</Text>
              <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.separator }} />
            </View>
            <AppButton
              tone="ghost"
              label="Prijava emailom"
              icon={<Mail size={18} color={colors.blue} />}
              onPress={() => { void Haptics.selectionAsync(); setShowEmailLogin(true); }}
            />
            <View style={a.legalOptions}>
              {[
                ['Privatnost', PRIVACY_URL],
                ['Uslovi korištenja', TERMS_URL],
              ].map(([label, url], index) => (
                <View key={url} style={a.legalOption}>
                  {index > 0 && <Text style={[a.legalSeparator, { color: colors.muted }]}>•</Text>}
                  <Pressable
                    accessibilityRole="link"
                    accessibilityLabel={`Otvori: ${label}`}
                    onPress={() => openLegalLink(url)}
                    style={({ pressed }) => pressed && { opacity: .55 }}
                  >
                    <Text style={[a.legalOptionText, { color: colors.muted }]}>{label}</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          a.transition,
          {
            backgroundColor: colors.background,
            transform: [{ translateX: transitionX }],
          },
        ]}
      >
        <Image source={require('../../assets/icon.png')} style={a.transitionLogo} />
        <Text style={[a.transitionText, { color: colors.text }]}>ABC Doctor</Text>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const a = StyleSheet.create({
  logo: { width: 84, height: 84, borderRadius: 18 },
  brand: { color: '#fff', fontWeight: '800', fontSize: 30, letterSpacing: -.7 },
  loginFooter: { gap: 4 },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 19, gap: 11, shadowColor: '#000', shadowOpacity: .3, shadowRadius: 28, shadowOffset: { width: 0, height: 15 } },
  consentRow: { minHeight: 24, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  consentText: { color: '#8C93A3', textAlign: 'center', fontSize: 10, lineHeight: 15 },
  consentLink: { fontWeight: '800' },
  legalOptions: { minHeight: 18, marginTop: -3, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  legalOption: { flexDirection: 'row', alignItems: 'center' },
  legalSeparator: { marginHorizontal: 8, fontSize: 10 },
  legalOptionText: { fontSize: 10, lineHeight: 14, fontWeight: '800' },
  transition: { zIndex: 100, alignItems: 'center', justifyContent: 'center', gap: 10 },
  transitionLogo: { width: 74, height: 74, borderRadius: 17 },
  transitionText: { fontWeight: '800', fontSize: 24 },
  suiteText: { color: '#8C93A3', fontSize: 13, marginTop: -7 },
  qlaText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  devText: { color: '#0195F5', fontWeight: '800', fontSize: 13 },
  input: { borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15 },
});
