import { useState, useEffect, useLayoutEffect, useRef, useMemo } from "react";
import { useNavigate, Link, useSearchParams, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { isAuthArrivalPreviewUrl } from "@/lib/authArrivalPreview";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ProfileSetupDialog } from "@/components/ProfileSetupDialog";
import { ReferralCodeInput } from "@/components/ReferralCodeInput";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { FcGoogle } from "react-icons/fc";
import { Loader2, Mail, Lock, KeyRound, Eye, EyeOff, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import { googleSignIn, isNativeGoogleSignInAvailable, isNativeIOS } from '@/lib/googleSignIn';
import { Browser } from '@capacitor/browser';
import { getIosSupabaseOAuthBridgeRedirectTo } from "@/lib/oauthMobile";
import { CaptchaWidget, CaptchaWidgetRef } from "@/components/CaptchaWidget";
import {
  AuthFlowProgress,
  AuthLegalFooter,
  authCardShadowStyle,
} from "@/components/auth/AuthChrome";
import { AuthLandingAppleGallery } from "@/components/auth/AuthLandingAppleGallery";
import { IosFixedPageHeaderShell } from "@/components/layout/IosFixedPageHeaderShell";
import { resetBodyInteractionLocks } from "@/lib/bodyInteractionLocks";
import { AUTH_PENDING_PROFILE_SETUP_KEY } from "@/lib/authFlags";

type AuthView = 'landing' | 'email-signin' | 'email-signin-form' | 'email-signup' | 'otp' | 'reset';

const AUTH_FORM_VIEWS = new Set<AuthView>(['email-signin-form', 'email-signup', 'otp', 'reset']);

/** UUID factice pour le dialogue profil en parcours arrivée (aucune écriture DB). */
const ARRIVAL_PREVIEW_FAKE_USER_ID = "00000000-0000-4000-8000-000000000001";
const ARRIVAL_PREVIEW_EMAIL = "nouveau.compte@exemple.runconnect";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { userProfile, loading: profileLoading } = useUserProfile();
  const wantsArrivalPreview = useMemo(() => {
    const v = searchParams.get("arrivalPreview");
    return v === "1" || v === "true";
  }, [searchParams]);
  const authArrivalPreview = useMemo(
    () => isAuthArrivalPreviewUrl(searchParams, user?.email, userProfile?.username),
    [searchParams, user?.email, userProfile?.username]
  );
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState<AuthView>('landing');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [newUserId, setNewUserId] = useState<string>("");
  /** Écran de retour depuis la vérification OTP (inscription vs connexion par code). */
  const [otpBackView, setOtpBackView] = useState<AuthView>("email-signin-form");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [acceptSignupTerms, setAcceptSignupTerms] = useState(false);
  const captchaRef = useRef<CaptchaWidgetRef>(null);
  const { toast } = useToast();

  const waitForSessionAndNavigateHome = async (opts?: { timeoutMs?: number; source?: string }) => {
    const timeoutMs = opts?.timeoutMs ?? 6000;
    const source = opts?.source ?? "unknown";
    const deadline = Date.now() + timeoutMs;

    const readSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    };

    try {
      const current = await readSession();
      if (current?.user) {
        console.log(`[Auth] Session ready (${source}) -> /`);
        navigate("/", { replace: true });
        return;
      }
    } catch (e) {
      console.warn("[Auth] Session check failed:", e);
    }

    await new Promise<void>((resolve) => {
      let done = false;
      let intervalId: number | null = null;
      let timeoutId: number | null = null;

      const finish = () => {
        if (done) return;
        done = true;
        if (intervalId !== null) window.clearInterval(intervalId);
        if (timeoutId !== null) window.clearTimeout(timeoutId);
        subscription.unsubscribe();
        resolve();
      };

      const navigateHome = () => {
        if (done) return;
        console.log(`[Auth] Session confirmed (${source}) -> /`);
        navigate("/", { replace: true });
        finish();
      };

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
        if (event === "SIGNED_IN" && nextSession?.user) {
          navigateHome();
        }
      });

      intervalId = window.setInterval(async () => {
        try {
          const session = await readSession();
          if (session?.user) {
            navigateHome();
          }
        } catch {
          // Ignore transient polling failures.
        }
      }, 250);

      timeoutId = window.setTimeout(() => finish(), Math.max(250, deadline - Date.now()));
    });
  };

  useLayoutEffect(() => {
    resetBodyInteractionLocks();
  }, []);

  // ── Existing useEffect: session check, referral, reset detection ──
  useEffect(() => {
    const profileCreated = localStorage.getItem('profileCreatedSuccessfully');
    const profileCreatedAt = localStorage.getItem('profileCreatedAt');
    
    if (profileCreated === 'true' && profileCreatedAt) {
      const createdTime = parseInt(profileCreatedAt, 10);
      const timeSinceCreation = Date.now() - createdTime;
      
      if (timeSinceCreation < 30000) {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session) {
            if (authArrivalPreview) return;
            console.log('🔥 [Auth] Profil créé + session active, redirection vers /');
            navigate('/', { replace: true });
          } else {
            console.log('⚠️ [Auth] Profil créé mais pas de session');
            localStorage.removeItem('profileCreatedSuccessfully');
            localStorage.removeItem('profileCreatedAt');
          }
        });
        return;
      } else {
        localStorage.removeItem('profileCreatedSuccessfully');
        localStorage.removeItem('profileCreatedAt');
      }
    }

    const cleanExpiredSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const expiresAt = session.expires_at;
          const now = Math.floor(Date.now() / 1000);
          if (expiresAt && expiresAt < now - 86400) {
            await supabase.auth.signOut({ scope: 'global' });
            localStorage.clear();
            sessionStorage.clear();
            toast({
              title: "Session expirée nettoyée",
              description: "Votre ancienne session a été supprimée."
            });
            return;
          }
        }
      } catch (error) {
        console.error('❌ Erreur nettoyage session:', error);
      }
    };
    cleanExpiredSession();

    const referralParams = new URLSearchParams(window.location.search);
    const refCode = referralParams.get('ref') || referralParams.get('r');
    if (refCode) {
      sessionStorage.setItem('referralCode', refCode);
      toast({
        title: "🎁 Code de parrainage détecté !",
        description: "Inscrivez-vous pour bénéficier du bonus",
        duration: 5000
      });
    }

    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const isRecoveryFlow = urlParams.get('reset') === 'true' || urlParams.get('type') === 'recovery';
    const hasOAuthCallbackParams =
      urlParams.has("code") ||
      hashParams.has("code") ||
      hashParams.has("access_token") ||
      hashParams.has("refresh_token");
    
    const error = urlParams.get('error');
    const errorCode = urlParams.get('error_code');
    if (error && errorCode === 'otp_expired') {
      toast({
        variant: "destructive",
        title: "⏰ Lien expiré",
        description: "Ce lien de réinitialisation a expiré."
      });
      window.history.replaceState({}, '', '/auth');
      return;
    }
    
    if (hasOAuthCallbackParams && !isRecoveryFlow) {
      navigate(`/auth/callback${window.location.search}${window.location.hash}`, { replace: true });
      return;
    }

    if (isRecoveryFlow) {
      setView('reset');
      return;
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        if (wantsArrivalPreview && profileLoading) {
          return;
        }
        if (authArrivalPreview) {
          return;
        }
        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('user_id')
            .eq('user_id', session.user.id)
            .maybeSingle();
            
          if (profileError || !profile) {
            if (sessionStorage.getItem(AUTH_PENDING_PROFILE_SETUP_KEY) === session.user.id) {
              console.log('[Auth] Profil en cours de création — pas de déconnexion automatique');
              return;
            }
            // Nouveau compte OAuth / profil pas encore créé : l’accueil gère l’onboarding — ne pas déconnecter.
            console.log('[Auth] Session sans ligne profiles — redirection accueil (onboarding / setup)');
            navigate('/', { replace: true });
            return;
          }
        } catch (error) {
          console.error('Error checking profile:', error);
        }
        navigate('/', { replace: true });
      }
    });
  }, [toast, navigate, wantsArrivalPreview, authArrivalPreview, profileLoading]);

  // ── All existing handlers (unchanged) ──

  const forceCleanSession = async () => {
    if (authArrivalPreview) {
      toast({
        title: "Nettoyage désactivé",
        description:
          "En parcours arrivée (aperçu), votre session créateur est conservée. Retirez ?arrivalPreview=1 de l’URL pour un nettoyage normal.",
      });
      return;
    }
    try {
      await supabase.auth.signOut({ scope: 'global' });
      localStorage.clear();
      sessionStorage.clear();
      toast({
        title: "Session nettoyée",
        description: "Vous pouvez maintenant vous reconnecter."
      });
      window.location.reload();
    } catch (error) {
      console.error('Clean error:', error);
    }
  };

  const handleGoogleAuth = async () => {
    if (authArrivalPreview) {
      setIsLoading(true);
      window.setTimeout(() => {
        setNewUserId(ARRIVAL_PREVIEW_FAKE_USER_ID);
        setEmail((prev) => (prev.trim() ? prev : ARRIVAL_PREVIEW_EMAIL));
        setShowProfileSetup(true);
        setIsLoading(false);
        toast({
          title: "Aperçu — Google",
          description: "Ouverture de la création de profil comme après une première connexion. Aucune requête OAuth.",
        });
      }, 450);
      return;
    }
    try {
      setIsLoading(true);
      console.log('🔥 [GOOGLE AUTH] Starting...');
      try { await supabase.auth.signOut({ scope: 'local' }); } catch {} // silent cleanup
      
      const isNativeAvailable = await isNativeGoogleSignInAvailable();
      console.log('🔥 [GOOGLE AUTH] Native available:', isNativeAvailable);
      
      if (isNativeAvailable) {
        try {
          console.log('🔥 [GOOGLE AUTH] Calling googleSignIn()...');
          const result = await googleSignIn();
          console.log('🔥 [GOOGLE AUTH] Got result:', { 
            hasToken: !!result.idToken, 
            tokenLength: result.idToken?.length,
            email: result.email 
          });
          
          console.log('🔥 [GOOGLE AUTH] Calling firebase-auth edge function...');
          const { data, error } = await supabase.functions.invoke('firebase-auth', {
            body: { idToken: result.idToken }
          });
          
          console.log('🔥 [GOOGLE AUTH] Edge function response:', { data, error });
          
          if (error) {
            console.error('🔥 [GOOGLE AUTH] Edge function error details:', JSON.stringify(error));
            throw error;
          }
          if (!data?.session) {
            console.error('🔥 [GOOGLE AUTH] No session returned:', data);
            throw new Error('No session returned');
          }
          
          console.log('🔥 [GOOGLE AUTH] Setting session...');
          await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token
          });
          
          const user = data.user;
          if (user) {
            const { data: existingProfile } = await supabase
              .from('profiles')
              .select('id, username')
              .eq('user_id', user.id)
              .maybeSingle();
              
            if (!existingProfile) {
              setNewUserId(user.id);
              try {
                sessionStorage.setItem(AUTH_PENDING_PROFILE_SETUP_KEY, user.id);
              } catch {
                /* ignore */
              }
              setShowProfileSetup(true);
            } else {
              await waitForSessionAndNavigateHome({ timeoutMs: 7000, source: 'google-native-existing-profile' });
            }
          }
          return;
        } catch (nativeError: any) {
          console.error('🔥 [GOOGLE AUTH] Native error:', nativeError);
          toast({
            title: "Erreur Google Sign-In",
            description: nativeError.message || "Erreur lors de l'authentification",
            variant: "destructive"
          });
          return;
        }
      }

      if (isNativeIOS()) {
        const iosBridge = getIosSupabaseOAuthBridgeRedirectTo();
        console.log('[OAuth/Google] iOS — redirectTo (bridge → runconnect://auth/callback)', iosBridge);
        try {
          const { data: oauthData, error: oauthError } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: iosBridge,
              skipBrowserRedirect: true,
              queryParams: { access_type: 'offline', prompt: 'consent' }
            }
          });

          if (oauthError || !oauthData?.url) {
            throw oauthError || new Error('No OAuth URL returned');
          }

          await Browser.open({ url: oauthData.url });
          setTimeout(() => { setIsLoading(false); }, 120000);
          return;
        } catch (iosError: any) {
          console.error('🍎 [GOOGLE AUTH] iOS error:', iosError);
          toast({
            title: "Erreur Google Sign-In",
            description: iosError.message || "Erreur lors de l'authentification",
            variant: "destructive"
          });
          return;
        }
      }

      console.log('🔥 [GOOGLE AUTH] Using OAuth fallback (web)...');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { access_type: 'offline', prompt: 'consent' }
        }
      });
      if (error) throw error;
    } catch (error: any) {
      console.error('🔥 [GOOGLE AUTH] Global error:', error);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleAuth = async () => {
    if (authArrivalPreview) {
      setIsLoading(true);
      window.setTimeout(() => {
        setNewUserId(ARRIVAL_PREVIEW_FAKE_USER_ID);
        setEmail((prev) => (prev.trim() ? prev : ARRIVAL_PREVIEW_EMAIL));
        setShowProfileSetup(true);
        setIsLoading(false);
        toast({
          title: "Aperçu — Apple",
          description: "Ouverture de la création de profil comme après une première connexion. Aucune requête OAuth.",
        });
      }, 450);
      return;
    }
    try {
      setIsLoading(true);
      console.log('[OAuth/Apple] Continuer avec Apple — clic');
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch {
        /* silent */
      }

      if (isNativeIOS()) {
        const iosBridge = getIosSupabaseOAuthBridgeRedirectTo();
        console.log('[OAuth/Apple] iOS — redirectTo (bridge → runconnect://auth/callback via ios-callback.html)', iosBridge);
        const { data: oauthData, error: oauthError } = await supabase.auth.signInWithOAuth({
          provider: 'apple',
          options: {
            redirectTo: iosBridge,
            skipBrowserRedirect: true,
          },
        });
        if (oauthError || !oauthData?.url) {
          throw oauthError || new Error('No OAuth URL returned');
        }
        console.log('[OAuth/Apple] Browser.open — authorize URL length', oauthData.url.length);
        await Browser.open({ url: oauthData.url });
        window.setTimeout(() => {
          setIsLoading(false);
        }, 120_000);
        return;
      }

      const webRedirect = `${window.location.origin}/auth/callback`;
      console.log('[OAuth/Apple] web — redirectTo', webRedirect);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: webRedirect,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      console.error('[OAuth/Apple] Error:', error);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (view === 'email-signup' && !acceptSignupTerms) {
      toast({
        title: "Confirmation requise",
        description: "Cochez la case pour confirmer avoir lu les conditions (CGU, confidentialité / RGPD).",
        variant: "destructive",
      });
      return;
    }
    if (authArrivalPreview && (view === "email-signup" || view === "email-signin-form")) {
      setIsLoading(true);
      window.setTimeout(() => {
        setOtpBackView(view === "email-signup" ? "email-signup" : "email-signin-form");
        setView("otp");
        setCaptchaToken(null);
        captchaRef.current?.resetCaptcha();
        toast({
          title: "Aperçu — code e-mail",
          description: "Aucun e-mail envoyé. Saisissez six chiffres (ex. 123456) pour la suite.",
        });
        setIsLoading(false);
      }, 350);
      return;
    }
    setIsLoading(true);
    try {
      if (view === 'email-signup') {
        const { data: signUpData, error } = await supabase.auth.signUp({
          email,
          password: password.trim(),
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            captchaToken: captchaToken || undefined
          }
        });
        if (error) throw error;
        
        setCaptchaToken(null);
        captchaRef.current?.resetCaptcha();

        const referralCode = sessionStorage.getItem('referralCode');
        if (referralCode && signUpData.user && signUpData.session?.access_token) {
          try {
            await supabase.functions.invoke('process-referral-signup', {
              headers: {
                Authorization: `Bearer ${signUpData.session.access_token}`,
              },
              body: { referralCode, newUserId: signUpData.user.id },
            });
            sessionStorage.removeItem('referralCode');
          } catch (refError) {
            console.error('Referral error:', refError);
          }
        }

        setOtpBackView("email-signup");
        setView("otp");
        toast({
          title: "Vérifiez votre email",
          description: "Un code de confirmation vous a été envoyé."
        });
      } else {
        // OTP signin
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            shouldCreateUser: true,
            captchaToken: captchaToken || undefined
          }
        });
        if (error) throw error;
        
        setCaptchaToken(null);
        captchaRef.current?.resetCaptcha();
        setOtpBackView("email-signin-form");
        setView("otp");
        toast({
          title: "Code envoyé !",
          description: "Vérifiez votre email pour le code à 6 chiffres."
        });
      }
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authArrivalPreview) {
      if (otp.length !== 6) {
        toast({
          title: "Code incomplet",
          description: "Entrez 6 chiffres pour l’aperçu.",
          variant: "destructive",
        });
        return;
      }
      setIsLoading(true);
      window.setTimeout(() => {
        setNewUserId(ARRIVAL_PREVIEW_FAKE_USER_ID);
        setEmail((prev) => (prev.trim() ? prev : ARRIVAL_PREVIEW_EMAIL));
        setShowProfileSetup(true);
        setOtp("");
        setIsLoading(false);
        toast({
          title: "Aperçu — code accepté",
          description: "Ouverture de la création de profil. Aucune vérification serveur.",
        });
      }, 400);
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email'
      });
      
      if (error) {
        if (error.message.includes('expired') || error.message.includes('invalid')) {
          toast({
            title: "Code expiré",
            description: "Cliquez sur 'Renvoyer le code' pour en recevoir un nouveau.",
            variant: "destructive"
          });
        } else {
          throw error;
        }
        return;
      }

      if (data.user) {
        setTimeout(async () => {
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id, username')
            .eq('user_id', data.user.id)
            .maybeSingle();
            
          if (!existingProfile) {
            setNewUserId(data.user.id);
            try {
              sessionStorage.setItem(AUTH_PENDING_PROFILE_SETUP_KEY, data.user.id);
            } catch {
              /* ignore */
            }
            setShowProfileSetup(true);
          } else {
            await waitForSessionAndNavigateHome({ timeoutMs: 7000, source: 'otp-existing-profile' });
          }
        }, 1000);
      }
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUsernameOrEmailSignin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authArrivalPreview) {
      toast({
        title: "Aperçu — connexion",
        description: "Aucune requête envoyée. Utilisez le bloc « code e-mail » ou les boutons Google / Apple pour la suite du parcours.",
      });
      return;
    }
    setIsLoading(true);
    try {
      console.log('🧹 [AUTH] Cleaning existing session before new login...');
      try { await supabase.auth.signOut({ scope: 'local' }); } catch {} // silent cleanup
      
      let emailToUse = usernameOrEmail;
      
      if (!usernameOrEmail.includes('@')) {
        const { data: userEmail, error: emailError } = await supabase.rpc('get_email_from_username', {
          username_param: usernameOrEmail
        });
        if (emailError || !userEmail) {
          throw new Error('Nom d\'utilisateur non trouvé.');
        }
        emailToUse = userEmail;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: emailToUse.trim(),
        password: password,
        options: { captchaToken: captchaToken || undefined }
      });

      setCaptchaToken(null);
      captchaRef.current?.resetCaptcha();
      
      if (error) throw error;
      await waitForSessionAndNavigateHome({ timeoutMs: 7000, source: 'password-signin' });
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authArrivalPreview) {
      toast({
        title: "Aperçu",
        description: "Réinitialisation du mot de passe non exécutée.",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        title: "Erreur",
        description: "Les mots de passe ne correspondent pas.",
        variant: "destructive"
      });
      return;
    }
    if (newPassword.length < 6) {
      toast({
        title: "Erreur",
        description: "Le mot de passe doit contenir au moins 6 caractères.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      
      toast({
        title: "Mot de passe mis à jour ✅",
        description: "Vous pouvez maintenant vous connecter."
      });
      setView('landing');
      window.history.replaceState({}, '', '/auth');
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const resendOtp = async () => {
    if (authArrivalPreview) {
      toast({
        title: "Aperçu",
        description: "Aucun code renvoyé.",
      });
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          shouldCreateUser: true,
          captchaToken: captchaToken || undefined
        }
      });
      setCaptchaToken(null);
      captchaRef.current?.resetCaptcha();
      
      if (error) {
        if (error.message.includes('429') || error.message.includes('rate limit')) {
          toast({
            title: "Trop de tentatives",
            description: "Attendez quelques minutes.",
            variant: "destructive"
          });
        } else {
          throw error;
        }
      } else {
        setOtp('');
        toast({ title: "Nouveau code envoyé !", description: "Vérifiez votre email." });
      }
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (authArrivalPreview) {
      toast({
        title: "Aperçu",
        description: "Aucun e-mail de réinitialisation envoyé.",
      });
      return;
    }
    const emailToUse = usernameOrEmail.includes('@') ? usernameOrEmail : undefined;
    if (!emailToUse) {
      toast({
        title: "Email requis",
        description: "Entrez votre email pour réinitialiser le mot de passe",
        variant: "destructive"
      });
      return;
    }
    if (!captchaToken) {
      toast({
        title: "Vérification requise",
        description: "Validez le CAPTCHA d'abord",
        variant: "destructive"
      });
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(emailToUse, {
        redirectTo: 'https://run-connect.lovable.app/auth',
        captchaToken
      });
      setCaptchaToken(null);
      captchaRef.current?.resetCaptcha();
      if (error) throw error;
      toast({
        title: "Email envoyé ✅",
        description: "Vérifiez votre boîte mail"
      });
    } catch (error: any) {
      setCaptchaToken(null);
      captchaRef.current?.resetCaptcha();
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  };

  // ── Apple icon SVG ──
  const AppleIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
    </svg>
  );

  // ══════════════════════════════════════════════
  // ██  LANDING VIEW — Carrousel marketing (maquette runconnect-landing + DESIGN-apple)
  // ══════════════════════════════════════════════
  const renderLanding = () => (
    <AuthLandingAppleGallery
      onSignUp={() => setView("email-signup")}
      onSignIn={() => setView("email-signin")}
      disabled={isLoading}
    />
  );

  // ══════════════════════════════════════════════
  // ██  EMAIL SIGNIN VIEW — Mockup 02 (Apple SignIn)  ██
  // NavBar Retour, small icon hero, "Bon retour" title,
  // CTA email puis "ou" hairline puis Apple/Google.
  // ══════════════════════════════════════════════
  const renderEmailSignin = () => (
    <div
      className="relative flex min-h-full flex-col apple-grouped-bg"
      style={{
        paddingTop: "max(env(safe-area-inset-top, 0px), 0px)",
        paddingBottom: "max(env(safe-area-inset-bottom, 0px), 24px)",
      }}
    >
      {/* NavBar iOS compact : Retour bleu à gauche, titre centré */}
      <div className="px-4 pt-3">
        <div className="flex h-11 items-center justify-between">
          <button
            type="button"
            onClick={() => setView("landing")}
            className="flex items-center gap-1 text-[17px] text-primary active:opacity-60"
            aria-label="Retour"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.4} />
            <span>Retour</span>
          </button>
          <div className="apple-navbar-title">Connexion</div>
          <div className="min-w-[70px]" />
        </div>
      </div>

      {/* Hero compact (mockup : icône 60×60 rounded-14 + 28px display + 15 muted) */}
      <div className="px-4 pt-6 text-center">
        <div
          className="mx-auto flex h-[60px] w-[60px] items-center justify-center rounded-[14px]"
          style={{ background: "hsl(var(--primary))" }}
        >
          <svg width="30" height="30" viewBox="0 0 46 46" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="30" cy="9" r="4" fill="#fff" stroke="none" />
            <path d="M14 38 L20 24 L30 28 L26 38" />
            <path d="M20 24 L32 22 L38 30" />
          </svg>
        </div>
        <div className="mt-4 font-display text-[28px] font-semibold tracking-[-0.5px] text-foreground">
          Bon retour
        </div>
        <div className="mt-1 text-[15px] text-muted-foreground">
          Connecte-toi à ton compte RunConnect.
        </div>
      </div>

      {/* CTA principal : continuer avec e-mail */}
      <div className="mt-8 px-8">
        <button
          type="button"
          onClick={() => setView("email-signin-form")}
          disabled={isLoading}
          className="apple-pill apple-pill-large w-full disabled:opacity-50"
        >
          <Mail className="mr-2 h-4 w-4" />
          Continuer avec e-mail
        </button>
        <button
          type="button"
          onClick={() => setView("email-signup")}
          disabled={isLoading}
          className="mt-3 flex h-[44px] w-full items-center justify-center text-[15px] text-primary active:opacity-60 disabled:opacity-50"
        >
          Pas encore de compte ? S&apos;inscrire
        </button>
      </div>

      {/* "ou" séparateur hairline (mockup 02) */}
      <div className="flex items-center gap-3 px-8 pt-8 pb-4">
        <div className="h-px flex-1 bg-[rgba(60,60,67,0.18)] dark:bg-[rgba(84,84,88,0.65)]" />
        <div className="text-[13px] text-muted-foreground">ou</div>
        <div className="h-px flex-1 bg-[rgba(60,60,67,0.18)] dark:bg-[rgba(84,84,88,0.65)]" />
      </div>

      {/* Apple + Google (50px rounded-12 — apple-social-btn) */}
      <div className="flex flex-col gap-2.5 px-4">
        <button
          type="button"
          onClick={handleAppleAuth}
          disabled={isLoading}
          className="apple-social-btn apple-social-btn-apple disabled:opacity-50"
        >
          <AppleIcon />
          Continuer avec Apple
        </button>
        <button
          type="button"
          onClick={handleGoogleAuth}
          disabled={isLoading}
          className="apple-social-btn apple-social-btn-google disabled:opacity-50"
        >
          <FcGoogle className="h-5 w-5" />
          Continuer avec Google
        </button>
      </div>

      <div className="flex-1" />

      <AuthLegalFooter className="pb-2 pt-6" />
    </div>
  );

  // ══════════════════════════════════════════════
  // ██  EMAIL SIGNIN FORM VIEW  ██
  // ══════════════════════════════════════════════
  // Mockup 02 SignIn (form variant) — NavBar compact Retour/Connexion +
  // Group(FieldRow Pseudo + Mot de passe) + Pill Se connecter +
  // Cell "Mot de passe oublié ?" + "ou" hairline + Group OTP code.
  const renderEmailSigninForm = () => (
    <IosFixedPageHeaderShell
      className="h-full min-h-0 apple-grouped-bg"
      headerWrapperClassName="shrink-0 apple-grouped-bg"
      header={
        <div className="px-4 pt-3">
          <div className="flex h-11 items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setView("email-signin");
                setCaptchaToken(null);
                captchaRef.current?.resetCaptcha();
              }}
              className="flex items-center gap-1 text-[17px] text-primary active:opacity-60"
              aria-label="Retour"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={2.4} />
              <span>Retour</span>
            </button>
            <div className="apple-navbar-title">Connexion</div>
            <div className="min-w-[70px]" />
          </div>
        </div>
      }
    >
      <div className="pt-4 pb-[max(4rem,calc(1.5rem+env(safe-area-inset-bottom)))]">
      {/* Group : FieldRow Pseudonyme/Email + Mot de passe */}
      <div className="apple-group">
        <div className="apple-group-title">Avec mot de passe</div>
        <form onSubmit={handleUsernameOrEmailSignin} className="apple-group-stack">
          <div className="apple-field-row">
            <div className="apple-field-label">Identifiant</div>
            <input
              type="text"
              placeholder="Pseudonyme ou email"
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              className="apple-field-value"
              required
              autoComplete="username"
            />
          </div>
          <div className="apple-field-row apple-field-row-last">
            <div className="apple-field-label">Mot de passe</div>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="apple-field-value pr-7"
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="-mr-1 ml-1 p-1 text-muted-foreground active:opacity-60"
              aria-label={showPassword ? "Masquer" : "Afficher"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </form>
      </div>

      {/* Captcha */}
      <div className="px-4 pb-2">
        {!captchaToken && (
          <CaptchaWidget
            ref={captchaRef}
            onVerify={(token) => setCaptchaToken(token)}
            onExpire={() => setCaptchaToken(null)}
            onError={() => setCaptchaToken(null)}
          />
        )}
        {captchaToken && (
          <div className="text-center text-[13px] font-medium text-green-600 dark:text-green-500">✅ Vérification réussie</div>
        )}
      </div>

      {/* CTA Se connecter — pill Action Blue */}
      <div className="px-4">
        <button
          type="button"
          onClick={(e) => handleUsernameOrEmailSignin(e as unknown as React.FormEvent)}
          disabled={isLoading || !captchaToken}
          className="apple-pill apple-pill-large w-full disabled:opacity-50"
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Se connecter
        </button>
        <button
          type="button"
          onClick={handleForgotPassword}
          disabled={!captchaToken}
          className="mt-3 flex h-[44px] w-full items-center justify-center text-[15px] text-primary active:opacity-60 disabled:opacity-50"
        >
          Mot de passe oublié ?
        </button>
      </div>

      {/* "ou" hairline */}
      <div className="flex items-center gap-3 px-8 pt-6 pb-2">
        <div className="h-px flex-1 bg-[rgba(60,60,67,0.18)] dark:bg-[rgba(84,84,88,0.65)]" />
        <div className="text-[13px] text-muted-foreground">ou</div>
        <div className="h-px flex-1 bg-[rgba(60,60,67,0.18)] dark:bg-[rgba(84,84,88,0.65)]" />
      </div>

      {/* OTP signin — Group(FieldRow Email) + pill secondary "Recevoir un code" */}
      <div className="apple-group">
        <div className="apple-group-title">Connexion par code</div>
        <form onSubmit={handleEmailSubmit} className="apple-group-stack">
          <div className="apple-field-row apple-field-row-last">
            <div className="apple-field-label">Email</div>
            <input
              type="email"
              placeholder="ferdinand@icloud.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="apple-field-value"
              required
              autoComplete="email"
            />
          </div>
        </form>
      </div>

      <div className="px-4">
        <button
          type="button"
          onClick={(e) => handleEmailSubmit(e as unknown as React.FormEvent)}
          disabled={isLoading || !captchaToken}
          className="apple-pill apple-pill-large apple-pill-secondary w-full disabled:opacity-50"
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Recevoir un code
        </button>
        <button
          type="button"
          onClick={() => { setView('email-signup'); setCaptchaToken(null); captchaRef.current?.resetCaptcha(); }}
          className="mt-3 flex h-[44px] w-full items-center justify-center text-[15px] text-primary active:opacity-60"
        >
          Vous n&apos;avez pas de compte ? S&apos;inscrire
        </button>
        <button
          type="button"
          onClick={forceCleanSession}
          className="mt-1 flex h-9 w-full items-center justify-center text-[12px] text-muted-foreground/60 hover:text-destructive"
        >
          Problème de connexion ? Nettoyer la session
        </button>
      </div>

      <AuthLegalFooter className="pt-4" />
      </div>
    </IosFixedPageHeaderShell>
  );

  // ══════════════════════════════════════════════
  // ██  EMAIL SIGNUP VIEW  ██
  // ══════════════════════════════════════════════
  // ══════════════════════════════════════════════
  // ██  EMAIL SIGNUP — Mockup 03 (Apple Inscription)  ██
  // NavBar Annuler/Inscription/step + Group(FieldRow Email/Password)
  // + captcha + Group(Cell CGU check) + Pill Continuer.
  // Logique : `handleEmailSubmit`, `acceptSignupTerms`, captcha — préservés.
  // ══════════════════════════════════════════════
  const renderEmailSignup = () => (
    <IosFixedPageHeaderShell
      className="h-full min-h-0 apple-grouped-bg"
      headerWrapperClassName="shrink-0 apple-grouped-bg"
      header={
        <div className="px-4 pt-3">
          {/* NavBar compact iOS : Annuler bleu / titre / step counter */}
          <div className="flex h-11 items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setView("landing");
                setCaptchaToken(null);
                setAcceptSignupTerms(false);
                captchaRef.current?.resetCaptcha();
              }}
              className="text-[17px] text-primary active:opacity-60"
            >
              Annuler
            </button>
            <div className="apple-navbar-title">Inscription</div>
            <div className="text-[15px] text-muted-foreground">1 / 2</div>
          </div>
        </div>
      }
    >
      <form onSubmit={handleEmailSubmit} className="px-0 pb-[max(4rem,calc(1.5rem+env(safe-area-inset-bottom)))] pt-4">
        {/* Group : Email + Mot de passe (mockup spec FieldRow style) */}
        <div className="apple-group">
          <div className="apple-group-stack">
            <div className="apple-field-row">
              <div className="apple-field-label">Email</div>
              <input
                type="email"
                placeholder="ferdinand@icloud.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="apple-field-value"
                required
                autoComplete="email"
              />
            </div>
            <div className="apple-field-row apple-field-row-last">
              <div className="apple-field-label">Mot de passe</div>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="apple-field-value pr-7"
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="-mr-1 ml-1 p-1 text-muted-foreground active:opacity-60"
                aria-label={showPassword ? "Masquer" : "Afficher"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Captcha (logique préservée) */}
        <div className="px-4 pb-2">
          {!captchaToken && (
            <CaptchaWidget
              ref={captchaRef}
              onVerify={(token) => setCaptchaToken(token)}
              onExpire={() => setCaptchaToken(null)}
              onError={() => setCaptchaToken(null)}
            />
          )}
          {captchaToken && (
            <div className="text-center text-[13px] font-medium text-[hsl(var(--success,142_76%_36%))] dark:text-green-500">
              ✅ Vérification réussie
            </div>
          )}
        </div>

        {/* Group : Conditions d'utilisation (Cell check style mockup) */}
        <div className="apple-group">
          <div className="apple-group-stack">
            <button
              type="button"
              onClick={() => setAcceptSignupTerms(!acceptSignupTerms)}
              className="apple-cell apple-cell-last w-full text-left"
            >
              <div className="min-w-0 flex-1">
                <div className="apple-cell-title">Conditions d&apos;utilisation</div>
                <div className="apple-cell-subtitle">
                  J&apos;accepte les{" "}
                  <Link to="/terms" className="text-primary underline-offset-2 hover:underline" onClick={(e) => e.stopPropagation()}>
                    CGU
                  </Link>{" "}
                  et la{" "}
                  <Link to="/privacy" className="text-primary underline-offset-2 hover:underline" onClick={(e) => e.stopPropagation()}>
                    politique de confidentialité
                  </Link>
                  .
                </div>
              </div>
              {acceptSignupTerms ? (
                <svg width="14" height="11" viewBox="0 0 14 11" aria-hidden style={{ color: "hsl(var(--primary))" }}>
                  <path d="M1 5.5l4 4 8-8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden className="text-muted-foreground/40">
                  <circle cx="7" cy="7" r="6.5" stroke="currentColor" strokeWidth="1" fill="none" />
                </svg>
              )}
            </button>
          </div>
          <div className="apple-group-footer">
            J&apos;ai au moins 13 ans.
          </div>
        </div>

        {/* Code parrainage (logique existante préservée) */}
        <div className="apple-group">
          <div className="apple-group-stack p-2">
            <ReferralCodeInput />
          </div>
        </div>

        {/* CTA bottom : Pill Continuer + lien existant */}
        <div className="mt-2 px-4">
          <button
            type="submit"
            disabled={isLoading || !captchaToken || !acceptSignupTerms}
            className="apple-pill apple-pill-large w-full disabled:opacity-50"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Continuer
          </button>
          <button
            type="button"
            onClick={() => { setView('email-signin'); setCaptchaToken(null); captchaRef.current?.resetCaptcha(); }}
            className="mt-3 flex h-[44px] w-full items-center justify-center text-[15px] text-primary active:opacity-60"
          >
            Déjà inscrit ? Se connecter
          </button>
        </div>

        <AuthLegalFooter className="pt-6" />
      </form>
    </IosFixedPageHeaderShell>
  );

  // ══════════════════════════════════════════════
  // ██  OTP VIEW  ██
  // ══════════════════════════════════════════════
  const renderOtp = () => (
    <IosFixedPageHeaderShell
      className="h-full min-h-0"
      headerWrapperClassName="shrink-0 border-b border-border bg-background"
      header={
        <>
          <div className="border-b border-border bg-background">
            <div className="h-2" />
          </div>
          <div className="space-y-5 px-4 pb-3 pt-6">
            {otpBackView === "email-signup" && <AuthFlowProgress current={2} total={2} />}
            <div className="mb-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setView(otpBackView);
                  setOtp("");
                }}
                className="-ml-2 rounded-full p-2 transition-colors active:bg-secondary"
              >
                <ArrowLeft className="h-5 w-5 text-foreground" />
              </button>
              <h2 className="text-[20px] font-bold text-foreground">Vérification</h2>
            </div>
          </div>
        </>
      }
    >
      <div className="space-y-5 px-4 pb-[max(4rem,calc(1.5rem+env(safe-area-inset-bottom)))] pt-2">
      <div className="bg-card rounded-[14px] overflow-hidden" style={authCardShadowStyle}>
        <div className="px-4 py-3 border-b border-border text-center">
          <p className="text-[13px] text-muted-foreground mt-1">
            Code envoyé à : <span className="font-medium text-foreground">{email}</span>
          </p>
        </div>
        <form onSubmit={handleOtpSubmit} className="p-6 space-y-6">
          <div className="flex justify-center">
            <InputOTP maxLength={6} value={otp} onChange={setOtp}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>
          <p className="text-[12px] text-muted-foreground text-center">Le code expire dans 5 minutes</p>
          <Button type="submit" className="w-full h-12 rounded-[12px]" disabled={isLoading || otp.length !== 6}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Vérifier le code
          </Button>
        </form>
      </div>

      <div className="bg-card rounded-[14px] overflow-hidden" style={authCardShadowStyle}>
        <button type="button" onClick={resendOtp} className="w-full flex items-center justify-between px-4 py-3.5 active:bg-secondary/50 transition-colors">
          <span className="text-[15px] text-primary font-medium">Renvoyer le code</span>
          <ChevronRight className="h-5 w-5 text-muted-foreground/40" />
        </button>
      </div>

      <AuthLegalFooter className="pt-4" />
      </div>
    </IosFixedPageHeaderShell>
  );

  // ══════════════════════════════════════════════
  // ██  RESET VIEW  ██
  // ══════════════════════════════════════════════
  const renderReset = () => (
    <IosFixedPageHeaderShell
      className="h-full min-h-0"
      headerWrapperClassName="shrink-0 border-b border-border bg-background"
      header={
        <>
          <div className="border-b border-border bg-background">
            <div className="h-2" />
          </div>
          <div className="px-4 pb-3 pt-6">
            <div className="mb-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setView("landing");
                  window.history.replaceState({}, "", "/auth");
                }}
                className="-ml-2 rounded-full p-2 transition-colors active:bg-secondary"
              >
                <ArrowLeft className="h-5 w-5 text-foreground" />
              </button>
              <h2 className="text-[20px] font-bold text-foreground">Réinitialiser</h2>
            </div>
          </div>
        </>
      }
    >
      <div className="space-y-5 px-4 pb-[max(4rem,calc(1.5rem+env(safe-area-inset-bottom)))] pt-2">
      <div className="bg-card rounded-[14px] overflow-hidden" style={authCardShadowStyle}>
        <div className="px-4 py-3 border-b border-border">
          <p className="text-[13px] text-muted-foreground font-medium">Nouveau mot de passe</p>
        </div>
        <form onSubmit={handlePasswordReset} className="p-4 space-y-4">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type={showNewPassword ? "text" : "password"}
              placeholder="Nouveau mot de passe"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="pl-11 pr-11 h-12 rounded-[10px] bg-secondary border-0"
              required
              minLength={6}
            />
            <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
              {showNewPassword ? <EyeOff className="h-5 w-5 text-muted-foreground" /> : <Eye className="h-5 w-5 text-muted-foreground" />}
            </button>
          </div>
          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirmer le mot de passe"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-11 pr-11 h-12 rounded-[10px] bg-secondary border-0"
              required
              minLength={6}
            />
            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
              {showConfirmPassword ? <EyeOff className="h-5 w-5 text-muted-foreground" /> : <Eye className="h-5 w-5 text-muted-foreground" />}
            </button>
          </div>
          <Button type="submit" className="w-full h-12 rounded-[12px]" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Mettre à jour le mot de passe
          </Button>
        </form>
      </div>

      <AuthLegalFooter className="pt-4" />
      </div>
    </IosFixedPageHeaderShell>
  );

  // ══════════════════════════════════════════════
  // ██  MAIN RENDER  ██
  // ══════════════════════════════════════════════
  const isPasswordResetFlow =
    searchParams.get("reset") === "true" ||
    searchParams.get("type") === "recovery";

  if (authLoading) {
    return (
      <div
        className="fixed inset-0 flex flex-col items-center justify-center bg-background px-6"
        style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 1.5rem)" }}
      >
        <Loader2 className="mb-4 h-9 w-9 animate-spin text-primary" />
        <p className="text-center text-sm text-muted-foreground">Vérification de la session…</p>
      </div>
    );
  }

  if (user && !authArrivalPreview && !wantsArrivalPreview && !isPasswordResetFlow) {
    console.log("[Auth] Session déjà active — redirection accueil");
    return <Navigate to="/" replace />;
  }

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-background">
      {authArrivalPreview && (
        <div
          className="pointer-events-auto z-[200] shrink-0 border-b border-sky-500/30 bg-sky-500/[0.12] px-3 py-2 shadow-sm backdrop-blur-md dark:border-sky-400/25 dark:bg-sky-500/[0.14]"
          style={{ paddingTop: "max(6px, env(safe-area-inset-top, 6px))" }}
          role="status"
          aria-live="polite"
        >
          <div className="mx-auto flex max-w-lg items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-sky-950 dark:text-sky-50">
                Parcours arrivée (aperçu)
              </p>
              <p className="text-[13px] text-sky-950/85 dark:text-sky-100/85">
                Écrans d&apos;inscription sans créer de compte · vous restez connecté en créateur
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 shrink-0 text-[12px]"
              onClick={() => navigate("/", { replace: true })}
            >
              Accueil
            </Button>
          </div>
        </div>
      )}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {AUTH_FORM_VIEWS.has(view) ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {view === "email-signin-form" && renderEmailSigninForm()}
          {view === "email-signup" && renderEmailSignup()}
          {view === "otp" && renderOtp()}
          {view === "reset" && renderReset()}
        </div>
      ) : (
        <>
          {view !== "landing" && view !== "email-signin" && (
            <div
              className="shrink-0 border-b border-border bg-background"
              style={{ zIndex: 10, paddingTop: "env(safe-area-inset-top, 0px)" }}
            >
              <div className="h-2" />
            </div>
          )}

          <div
            className={`min-h-0 flex-1 ${view === "landing" ? "flex flex-col overflow-hidden" : "overflow-y-auto"}`}
            style={view === "landing" ? undefined : { WebkitOverflowScrolling: "touch" }}
          >
            {view === "landing" && (
              <div className="flex min-h-0 flex-1 flex-col">
                {renderLanding()}
              </div>
            )}
            {view === "email-signin" && renderEmailSignin()}
          </div>
        </>
      )}
      </div>

      <ProfileSetupDialog
        open={showProfileSetup}
        onOpenChange={setShowProfileSetup}
        userId={newUserId}
        email={email}
        arrivalPreview={authArrivalPreview}
        onRequestSignIn={async () => {
          if (authArrivalPreview) {
            setShowProfileSetup(false);
            setNewUserId("");
            setView("email-signin");
            return;
          }
          try {
            sessionStorage.removeItem(AUTH_PENDING_PROFILE_SETUP_KEY);
          } catch {
            /* ignore */
          }
          try {
            await supabase.auth.signOut({ scope: 'global' });
          } catch (e) {
            console.error('[Auth] signOut (retour connexion):', e);
          }
          setShowProfileSetup(false);
          setNewUserId('');
          setView('email-signin-form');
        }}
        onComplete={() => {
          if (authArrivalPreview) {
            setShowProfileSetup(false);
            setNewUserId("");
            setView("landing");
            toast({
              title: "Parcours arrivée (aperçu)",
              description: "Vous restez connecté avec votre compte créateur.",
            });
            return;
          }
          console.log('✅ Profil créé - navigation SPA vers /');
          try {
            sessionStorage.removeItem(AUTH_PENDING_PROFILE_SETUP_KEY);
          } catch {
            /* ignore */
          }
          setShowProfileSetup(false);
          setNewUserId('');
          // Fermeture Dialog + changement de route : enchaîner après le frame courant évite des blocages
          // (focus trap Radix / WebView). Repli hard si la SPA reste sur /auth.
          requestAnimationFrame(() => {
            navigate('/', { replace: true });
            window.setTimeout(() => {
              if (window.location.pathname.startsWith('/auth')) {
                console.warn('[Auth] Redirection SPA inefficace après inscription — window.location.replace');
                window.location.replace(`${window.location.origin}/`);
              }
            }, 450);
          });
        }}
      />
    </div>
  );
};

export default Auth;
