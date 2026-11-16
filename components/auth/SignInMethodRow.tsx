import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import { useTheme } from '@/theme/ThemeProvider';
import { AppleIcon, GoogleIcon } from '@/components/auth/SocialIcons';
import { Auth, type SignInMethod } from '@/services/auth';

WebBrowser.maybeCompleteAuthSession();

const googleExtra = Constants.expoConfig?.extra?.googleAuth ?? {};
const normalizeGoogleClientId = (value?: string) => value?.trim().replace(/\/+$/, '') || '';
const googleConfig = {
  webClientId: normalizeGoogleClientId(googleExtra.webClientId),
  iosClientId: normalizeGoogleClientId(googleExtra.iosClientId),
  androidClientId: normalizeGoogleClientId(googleExtra.androidClientId),
};
const reversedIos = googleConfig.iosClientId
  ? `com.googleusercontent.apps.${googleConfig.iosClientId.replace('.apps.googleusercontent.com', '')}`
  : null;
const reversedAndroid = googleConfig.androidClientId
  ? `com.googleusercontent.apps.${googleConfig.androidClientId.replace('.apps.googleusercontent.com', '')}`
  : null;

type Props = {
  provider: 'google' | 'apple';
  methods: SignInMethod[];
  onUpdated: () => void;
};

export function SignInMethodRow({ provider, methods, onUpdated }: Props) {
  const { colors, resolvedMode } = useTheme();
  const [working, setWorking] = useState(false);
  const linked = methods.find(m => m.provider === provider);
  const connected = !!linked;

  const googleRedirectUri = Platform.OS === 'ios' && reversedIos
    ? `${reversedIos}:/oauthredirect`
    : Platform.OS === 'android' && reversedAndroid
      ? `${reversedAndroid}:/oauthredirect`
      : Platform.OS === 'web'
        ? makeRedirectUri({ path: 'oauthredirect' })
        : undefined;

  const [, googleResponse, promptGoogle] = Google.useIdTokenAuthRequest({
    webClientId: googleConfig.webClientId || 'unconfigured.apps.googleusercontent.com',
    iosClientId: googleConfig.iosClientId || 'unconfigured.apps.googleusercontent.com',
    androidClientId: googleConfig.androidClientId || 'unconfigured.apps.googleusercontent.com',
    redirectUri: googleRedirectUri,
    selectAccount: true,
  });

  const name = provider === 'apple' ? 'Apple' : 'Google';
  const icon = provider === 'apple'
    ? <AppleIcon color={connected ? (resolvedMode === 'dark' ? '#FFFFFF' : '#000000') : colors.muted} size={18} />
    : <GoogleIcon color={connected ? undefined : colors.muted} size={16} />;

  const linkGoogle = async () => {
    setWorking(true);
    try {
      const result = await promptGoogle();
      if (result.type !== 'success') { setWorking(false); return; }
      const idToken = result.params?.id_token || result.authentication?.idToken;
      if (!idToken) throw new Error('Google nije vratio token.');
      await Auth.linkMethod('google', { id_token: idToken });
      onUpdated();
    } catch (e: any) {
      if (e?.code !== 'ERR_REQUEST_CANCELED') Alert.alert('Greška', e?.message ?? 'Pokušajte ponovo.');
    } finally {
      setWorking(false);
    }
  };

  const linkApple = async () => {
    if (Platform.OS !== 'ios') {
      Alert.alert('Apple prijava', 'Dostupno samo na iOS uređajima.');
      return;
    }
    setWorking(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) throw new Error('Apple nije vratio token.');
      await Auth.linkMethod('apple', { identity_token: credential.identityToken });
      onUpdated();
    } catch (e: any) {
      const code = String(e?.code ?? '').toUpperCase();
      if (code !== 'ERR_REQUEST_CANCELED' && code !== 'ERR_CANCELED')
        Alert.alert('Greška', e?.message ?? 'Pokušajte ponovo.');
    } finally {
      setWorking(false);
    }
  };

  const disconnect = () => {
    if (methods.length <= 1) {
      Alert.alert(name, 'Ne možete ukloniti jedini način prijave.');
      return;
    }
    Alert.alert(
      name,
      `Uklonite ${name} prijavu? Vaš drugi način prijave ostaje aktivan.`,
      [
        { text: 'Odustani', style: 'cancel' },
        {
          text: `Ukloni ${name}`,
          style: 'destructive',
          onPress: async () => {
            setWorking(true);
            try {
              await Auth.unlinkMethod(provider);
              onUpdated();
            } catch (e: any) {
              Alert.alert('Greška', e?.message ?? 'Pokušajte ponovo.');
            } finally {
              setWorking(false);
            }
          },
        },
      ],
    );
  };

  const handlePress = () => {
    void Haptics.selectionAsync();
    if (connected) {
      disconnect();
    } else if (provider === 'google') {
      void linkGoogle();
    } else {
      void linkApple();
    }
  };

  if (!connected && provider === 'apple' && Platform.OS !== 'ios') return null;

  const s = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 14, minHeight: 56 },
    tile: {
      width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    },
    label: { color: colors.text, fontSize: 15, fontWeight: '600' },
    subtitle: { color: colors.muted, fontSize: 12.5, marginTop: 1 },
    pill: {
      height: 24, paddingHorizontal: 9, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 3,
    },
    pillText: { fontSize: 11.5, fontWeight: '700' },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginLeft: 62 },
  });

  const tileStyle = connected
    ? provider === 'apple'
      ? { backgroundColor: resolvedMode === 'dark' ? '#FFFFFF' : '#000000' }
      : { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DADCE0' }
    : { backgroundColor: colors.input };

  const tileIcon = provider === 'apple'
    ? <AppleIcon color={connected ? (resolvedMode === 'dark' ? '#000000' : '#FFFFFF') : colors.muted} size={18} />
    : <GoogleIcon color={connected ? undefined : colors.muted} size={16} />;

  return (
    <>
      <Pressable
        accessibilityRole="button"
        disabled={working}
        onPress={handlePress}
        style={({ pressed }) => [s.row, { opacity: pressed ? 0.65 : 1 }]}
      >
        <View style={[s.tile, tileStyle]}>{tileIcon}</View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.label}>{connected ? name : `Poveži ${name}`}</Text>
          {connected && linked.email && (
            <Text style={s.subtitle} numberOfLines={1}>{linked.email}</Text>
          )}
          {!connected && (
            <Text style={s.subtitle}>Poveži račun za prijavu s {name}</Text>
          )}
        </View>
        {working ? (
          <ActivityIndicator size="small" />
        ) : connected ? (
          <View style={[s.pill, { backgroundColor: colors.green + '22' }]}>
            <Text style={[s.pillText, { color: colors.green }]}>Povezano</Text>
          </View>
        ) : (
          <View style={[s.pill, { backgroundColor: colors.blue + '22' }]}>
            <Text style={[s.pillText, { color: colors.blue }]}>Poveži</Text>
          </View>
        )}
      </Pressable>
      <View style={s.divider} />
    </>
  );
}
