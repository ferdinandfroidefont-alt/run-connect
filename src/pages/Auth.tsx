import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ProfileSetupDialog } from "@/components/ProfileSetupDialog";
import { ReferralCodeInput } from "@/components/ReferralCodeInput";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { FcGoogle } from "react-icons/fc";
import { Loader2, Mail, Lock, KeyRound, User, Eye, EyeOff, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import { googleSignIn, isNativeGoogleSignInAvailable, isNativeIOS } from '@/lib/googleSignIn';
import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';
import { CaptchaWidget, CaptchaWidgetRef } from "@/components/CaptchaWidget";
import appIcon from '@/assets/app-icon.png';

type AuthView = 'landing' | 'email-signin' | 'email-signin-form' | 'email-signup' | 'otp' | 'reset';

const Auth = () => {
  const navigate = useNavigate();
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
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<CaptchaWidgetRef>(null);
  const { toast } = useToast();

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
    const isReset = urlParams.get('reset') === 'true' || urlParams.get('type') === 'recovery' || urlParams.has('code');
    
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
    
    if (isReset) {
      setView('reset');
      return;
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('user_id')
            .eq('user_id', session.user.id)
            .maybeSingle();
            
          if (profileError || !profile) {
            await supabase.auth.signOut({ scope: 'global' });
            localStorage.clear();
            sessionStorage.clear();
            toast({
              title: "Compte supprimé",
              description: "Ce compte n'existe plus.",
              variant: "destructive"
            });
            return;
          }
        } catch (error) {
          console.error('Error checking profile:', error);
        }
        navigate('/', { replace: true });
      }
    });
  }, [toast]);

  // ── All existing handlers (unchanged) ──

  const forceCleanSession = async () => {
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
              setShowProfileSetup(true);
            } else {
              navigate('/', { replace: true });
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
        console.log('🍎 [GOOGLE AUTH] iOS detected, using Browser + appUrlOpen deep link...');
        try {
          const { data: oauthData, error: oauthError } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: 'https://dbptgehpknjsoisirviz.supabase.co/functions/v1/ios-auth-callback',
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
          redirectTo: `${window.location.origin}/`,
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
    try {
      setIsLoading(true);
      console.log('🍎 [APPLE AUTH] Starting...');
      try { await supabase.auth.signOut({ scope: 'local' }); } catch {} // silent cleanup

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: `${window.location.origin}/`,
        }
      });
      if (error) throw error;
    } catch (error: any) {
      console.error('🍎 [APPLE AUTH] Error:', error);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        if (referralCode && signUpData.user) {
          try {
            await supabase.functions.invoke('process-referral-signup', {
              body: { referralCode, newUserId: signUpData.user.id }
            });
            sessionStorage.removeItem('referralCode');
          } catch (refError) {
            console.error('Referral error:', refError);
          }
        }

        setView('otp');
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
        setView('otp');
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
            setShowProfileSetup(true);
          } else {
            navigate('/', { replace: true });
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
      navigate('/', { replace: true });
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
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
  // ██  LANDING VIEW  ██
  // ══════════════════════════════════════════════
  const renderLanding = () => (
    <div className="flex flex-col items-center justify-between min-h-full px-6 py-8" style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 2rem)', paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 2rem)' }}>
      {/* Decorative SVG background */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.04 }} viewBox="0 0 400 800" fill="none" preserveAspectRatio="xMidYMid slice">
        <path d="M-50 600 Q100 400 200 500 T450 300 T200 100" stroke="hsl(var(--primary))" strokeWidth="2" fill="none"/>
        <path d="M-50 700 Q150 500 250 600 T500 400 T250 200" stroke="hsl(var(--primary))" strokeWidth="1.5" fill="none"/>
      </svg>

      {/* Top spacer */}
      <div className="flex-1 min-h-[40px]" />

      {/* Branding */}
      <div className="flex flex-col items-center mb-10 relative z-10">
        <img 
          src={appIcon} 
          alt="RunConnect" 
          className="w-[88px] h-[88px] rounded-[22px] mb-5 overflow-hidden object-cover"
          style={{ boxShadow: '0 8px 24px hsl(var(--primary) / 0.18)' }}
        />
        <h1 className="text-[28px] font-bold text-primary tracking-tight">RunConnect</h1>
        <p className="text-[15px] text-muted-foreground mt-1.5 font-medium">
          Chaque sortie commence ici.
        </p>
      </div>

      {/* Action buttons */}
      <div className="w-full max-w-[340px] space-y-3.5 relative z-10">
        {/* Google */}
        <button
          type="button"
          onClick={handleGoogleAuth}
          disabled={isLoading}
          className="w-full h-[54px] flex items-center justify-center gap-3 rounded-[14px] bg-card text-foreground text-[17px] font-semibold transition-all active:scale-[0.98] disabled:opacity-50"
          style={{ boxShadow: '0 1px 3px hsl(0 0% 0% / 0.08), 0 0 0 1px hsl(0 0% 0% / 0.06)' }}
        >
          <FcGoogle className="h-5 w-5" />
          Continuer avec Google
        </button>

        {/* Apple */}
        <button
          type="button"
          onClick={handleAppleAuth}
          disabled={isLoading}
          className="w-full h-[54px] flex items-center justify-center gap-3 rounded-[14px] bg-foreground text-background text-[17px] font-semibold transition-all active:scale-[0.98] disabled:opacity-50"
          style={{ boxShadow: '0 1px 3px hsl(0 0% 0% / 0.12)' }}
        >
          <AppleIcon />
          Continuer avec Apple
        </button>

        {/* Email */}
        <button
          type="button"
          onClick={() => setView('email-signup')}
          disabled={isLoading}
          className="w-full h-[54px] flex items-center justify-center gap-3 rounded-[14px] bg-primary text-primary-foreground text-[17px] font-semibold transition-all active:scale-[0.98] disabled:opacity-50"
          style={{ boxShadow: '0 2px 8px hsl(var(--primary) / 0.3)' }}
        >
          <Mail className="h-5 w-5" />
          Continuer avec e-mail
        </button>
      </div>

      {/* Bottom spacer */}
      <div className="flex-1 min-h-[24px]" />

      {/* Legal + link */}
      <div className="w-full max-w-[340px] space-y-4 relative z-10">
        <button
          type="button"
          onClick={() => setView('email-signin')}
          className="w-full text-center text-[14px] text-primary font-medium py-2 active:opacity-70 transition-opacity"
        >
          Déjà inscrit ? Se connecter
        </button>
        <p className="text-[12px] text-muted-foreground/70 text-center leading-relaxed px-4">
          En continuant, vous acceptez nos{' '}
          <Link to="/terms" className="underline underline-offset-2 text-muted-foreground">Conditions d'utilisation</Link>
          {' '}et notre{' '}
          <Link to="/privacy" className="underline underline-offset-2 text-muted-foreground">Politique de confidentialité</Link>
          .{' '}
          <Link to="/legal" className="underline underline-offset-2 text-muted-foreground">Mentions légales</Link>.
        </p>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════
  // ██  EMAIL SIGNIN VIEW (3 buttons)  ██
  // ══════════════════════════════════════════════
  const renderEmailSignin = () => (
    <div className="flex flex-col items-center justify-between min-h-full px-6 py-8" style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 2rem)', paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 2rem)' }}>
      {/* Decorative SVG background */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.04 }} viewBox="0 0 400 800" fill="none" preserveAspectRatio="xMidYMid slice">
        <path d="M-50 600 Q100 400 200 500 T450 300 T200 100" stroke="hsl(var(--primary))" strokeWidth="2" fill="none"/>
        <path d="M-50 700 Q150 500 250 600 T500 400 T250 200" stroke="hsl(var(--primary))" strokeWidth="1.5" fill="none"/>
      </svg>

      {/* Header with back arrow */}
      <div className="w-full max-w-[340px] relative z-10">
        <button type="button" onClick={() => setView('landing')} className="p-2 -ml-2 rounded-full active:bg-secondary transition-colors">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
      </div>

      {/* Top spacer */}
      <div className="flex-1 min-h-[40px]" />

      {/* Branding */}
      <div className="flex flex-col items-center mb-10 relative z-10">
        <img 
          src={appIcon} 
          alt="RunConnect" 
          className="w-[88px] h-[88px] rounded-[22px] mb-5"
          style={{ boxShadow: '0 8px 24px hsl(var(--primary) / 0.18)' }}
        />
        <h1 className="text-[28px] font-bold text-primary tracking-tight">Connexion</h1>
        <p className="text-[15px] text-muted-foreground mt-1.5 font-medium">
          Content de vous revoir !
        </p>
      </div>

      {/* Action buttons */}
      <div className="w-full max-w-[340px] space-y-3.5 relative z-10">
        {/* Google */}
        <button
          type="button"
          onClick={handleGoogleAuth}
          disabled={isLoading}
          className="w-full h-[54px] flex items-center justify-center gap-3 rounded-[14px] bg-card text-foreground text-[17px] font-semibold transition-all active:scale-[0.98] disabled:opacity-50"
          style={{ boxShadow: '0 1px 3px hsl(0 0% 0% / 0.08), 0 0 0 1px hsl(0 0% 0% / 0.06)' }}
        >
          <FcGoogle className="h-5 w-5" />
          Se connecter avec Google
        </button>

        {/* Apple */}
        <button
          type="button"
          onClick={handleAppleAuth}
          disabled={isLoading}
          className="w-full h-[54px] flex items-center justify-center gap-3 rounded-[14px] bg-foreground text-background text-[17px] font-semibold transition-all active:scale-[0.98] disabled:opacity-50"
          style={{ boxShadow: '0 1px 3px hsl(0 0% 0% / 0.12)' }}
        >
          <AppleIcon />
          Se connecter avec Apple
        </button>

        {/* Email */}
        <button
          type="button"
          onClick={() => setView('email-signin-form')}
          disabled={isLoading}
          className="w-full h-[54px] flex items-center justify-center gap-3 rounded-[14px] bg-primary text-primary-foreground text-[17px] font-semibold transition-all active:scale-[0.98] disabled:opacity-50"
          style={{ boxShadow: '0 2px 8px hsl(var(--primary) / 0.3)' }}
        >
          <Mail className="h-5 w-5" />
          Se connecter avec e-mail
        </button>
      </div>

      {/* Bottom spacer */}
      <div className="flex-1 min-h-[24px]" />

      {/* Bottom link */}
      <div className="w-full max-w-[340px] space-y-4 relative z-10">
        <button
          type="button"
          onClick={() => { setView('email-signup'); setCaptchaToken(null); captchaRef.current?.resetCaptcha(); }}
          className="w-full text-center text-[14px] text-primary font-medium py-2 active:opacity-70 transition-opacity"
        >
          Vous n'avez pas de compte ? S'inscrire
        </button>
        <p className="text-[12px] text-muted-foreground/70 text-center leading-relaxed px-4">
          En continuant, vous acceptez nos{' '}
          <Link to="/terms" className="underline underline-offset-2 text-muted-foreground">Conditions d'utilisation</Link>
          {' '}et notre{' '}
          <Link to="/privacy" className="underline underline-offset-2 text-muted-foreground">Politique de confidentialité</Link>
          .{' '}
          <Link to="/legal" className="underline underline-offset-2 text-muted-foreground">Mentions légales</Link>.
        </p>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════
  // ██  EMAIL SIGNIN FORM VIEW  ██
  // ══════════════════════════════════════════════
  const renderEmailSigninForm = () => (
    <div className="px-4 py-6 space-y-5 pb-16">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <button type="button" onClick={() => { setView('email-signin'); setCaptchaToken(null); captchaRef.current?.resetCaptcha(); }} className="p-2 -ml-2 rounded-full active:bg-secondary transition-colors">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h2 className="text-[20px] font-bold text-foreground">Connexion par e-mail</h2>
      </div>

      {/* Password signin */}
      <div className="bg-card rounded-[14px] overflow-hidden" style={{ boxShadow: '0 1px 3px hsl(0 0% 0% / 0.04)' }}>
        <div className="px-4 py-3 border-b border-border">
          <p className="text-[13px] text-muted-foreground font-medium uppercase tracking-wider">Avec mot de passe</p>
        </div>
        <form onSubmit={handleUsernameOrEmailSignin} className="p-4 space-y-3">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Pseudonyme ou email"
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              className="pl-11 h-12 rounded-[10px] bg-secondary border-0"
              required
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-11 pr-11 h-12 rounded-[10px] bg-secondary border-0"
              required
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
              {showPassword ? <EyeOff className="h-5 w-5 text-muted-foreground" /> : <Eye className="h-5 w-5 text-muted-foreground" />}
            </button>
          </div>

          {!captchaToken && (
            <CaptchaWidget
              ref={captchaRef}
              onVerify={(token) => setCaptchaToken(token)}
              onExpire={() => setCaptchaToken(null)}
              onError={() => setCaptchaToken(null)}
            />
          )}
          {captchaToken && (
            <div className="text-center text-[13px] text-green-600 font-medium">✅ Vérification réussie</div>
          )}

          <Button type="submit" className="w-full h-12 rounded-[12px]" disabled={isLoading || !captchaToken}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Se connecter
          </Button>
        </form>
      </div>

      {/* Forgot password */}
      <div className="bg-card rounded-[14px] overflow-hidden" style={{ boxShadow: '0 1px 3px hsl(0 0% 0% / 0.04)' }}>
        <button
          type="button"
          onClick={handleForgotPassword}
          disabled={!captchaToken}
          className="w-full flex items-center justify-between px-4 py-3.5 active:bg-secondary/50 transition-colors disabled:opacity-50"
        >
          <span className="text-[15px] text-primary font-medium">Mot de passe oublié ?</span>
          <ChevronRight className="h-5 w-5 text-muted-foreground/40" />
        </button>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4 px-2">
        <div className="flex-1 h-px bg-border" />
        <span className="text-[13px] text-muted-foreground">ou</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* OTP signin */}
      <div className="bg-card rounded-[14px] overflow-hidden" style={{ boxShadow: '0 1px 3px hsl(0 0% 0% / 0.04)' }}>
        <div className="px-4 py-3 border-b border-border">
          <p className="text-[13px] text-muted-foreground font-medium uppercase tracking-wider">Connexion par code</p>
        </div>
        <form onSubmit={handleEmailSubmit} className="p-4 space-y-3">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-11 h-12 rounded-[10px] bg-secondary border-0"
              required
            />
          </div>
          {!captchaToken && (
            <CaptchaWidget
              ref={captchaRef}
              onVerify={(token) => setCaptchaToken(token)}
              onExpire={() => setCaptchaToken(null)}
              onError={() => setCaptchaToken(null)}
            />
          )}
          {captchaToken && (
            <div className="text-center text-[13px] text-green-600 font-medium">✅ Vérification réussie</div>
          )}
          <Button type="submit" variant="outline" className="w-full h-12 rounded-[12px]" disabled={isLoading || !captchaToken}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Recevoir un code
          </Button>
        </form>
      </div>

      {/* Go to signup */}
      <button
        type="button"
        onClick={() => { setView('email-signup'); setCaptchaToken(null); captchaRef.current?.resetCaptcha(); }}
        className="w-full text-center text-[15px] text-primary font-medium py-3 active:opacity-70 transition-opacity"
      >
        Vous n'avez pas de compte ? S'inscrire
      </button>

      {/* Clean session */}
      <button
        type="button"
        onClick={forceCleanSession}
        className="w-full text-center text-[12px] text-muted-foreground/60 hover:text-destructive py-2"
      >
        Problème de connexion ? Nettoyer la session
      </button>
    </div>
  );

  // ══════════════════════════════════════════════
  // ██  EMAIL SIGNUP VIEW  ██
  // ══════════════════════════════════════════════
  const renderEmailSignup = () => (
    <div className="px-4 py-6 space-y-5 pb-16">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <button type="button" onClick={() => { setView('landing'); setCaptchaToken(null); captchaRef.current?.resetCaptcha(); }} className="p-2 -ml-2 rounded-full active:bg-secondary transition-colors">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h2 className="text-[20px] font-bold text-foreground">Créer un compte</h2>
      </div>

      <div className="bg-card rounded-[14px] overflow-hidden" style={{ boxShadow: '0 1px 3px hsl(0 0% 0% / 0.04)' }}>
        <form onSubmit={handleEmailSubmit} className="p-4 space-y-3">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-11 h-12 rounded-[10px] bg-secondary border-0"
              required
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Mot de passe (min. 6 caractères)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-11 pr-11 h-12 rounded-[10px] bg-secondary border-0"
              required
              minLength={6}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
              {showPassword ? <EyeOff className="h-5 w-5 text-muted-foreground" /> : <Eye className="h-5 w-5 text-muted-foreground" />}
            </button>
          </div>

          {!captchaToken && (
            <CaptchaWidget
              ref={captchaRef}
              onVerify={(token) => setCaptchaToken(token)}
              onExpire={() => setCaptchaToken(null)}
              onError={() => setCaptchaToken(null)}
            />
          )}
          {captchaToken && (
            <div className="text-center text-[13px] text-green-600 font-medium">✅ Vérification réussie</div>
          )}

          <Button type="submit" className="w-full h-12 rounded-[12px]" disabled={isLoading || !captchaToken}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Créer mon compte
          </Button>
        </form>
        <div className="px-4 pb-4">
          <ReferralCodeInput />
        </div>
      </div>

      <button
        type="button"
        onClick={() => { setView('email-signin'); setCaptchaToken(null); captchaRef.current?.resetCaptcha(); }}
        className="w-full text-center text-[15px] text-primary font-medium py-3 active:opacity-70 transition-opacity"
      >
        Déjà inscrit ? Se connecter
      </button>
    </div>
  );

  // ══════════════════════════════════════════════
  // ██  OTP VIEW  ██
  // ══════════════════════════════════════════════
  const renderOtp = () => (
    <div className="px-4 py-6 space-y-5 pb-16">
      <div className="flex items-center gap-3 mb-2">
        <button type="button" onClick={() => { setView('email-signin'); setOtp(''); }} className="p-2 -ml-2 rounded-full active:bg-secondary transition-colors">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h2 className="text-[20px] font-bold text-foreground">Vérification</h2>
      </div>

      <div className="bg-card rounded-[14px] overflow-hidden" style={{ boxShadow: '0 1px 3px hsl(0 0% 0% / 0.04)' }}>
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

      <div className="bg-card rounded-[14px] overflow-hidden" style={{ boxShadow: '0 1px 3px hsl(0 0% 0% / 0.04)' }}>
        <button type="button" onClick={resendOtp} className="w-full flex items-center justify-between px-4 py-3.5 active:bg-secondary/50 transition-colors">
          <span className="text-[15px] text-primary font-medium">Renvoyer le code</span>
          <ChevronRight className="h-5 w-5 text-muted-foreground/40" />
        </button>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════
  // ██  RESET VIEW  ██
  // ══════════════════════════════════════════════
  const renderReset = () => (
    <div className="px-4 py-6 space-y-5 pb-16">
      <div className="flex items-center gap-3 mb-2">
        <button type="button" onClick={() => { setView('landing'); window.history.replaceState({}, '', '/auth'); }} className="p-2 -ml-2 rounded-full active:bg-secondary transition-colors">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h2 className="text-[20px] font-bold text-foreground">Réinitialiser</h2>
      </div>

      <div className="bg-card rounded-[14px] overflow-hidden" style={{ boxShadow: '0 1px 3px hsl(0 0% 0% / 0.04)' }}>
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
    </div>
  );

  // ══════════════════════════════════════════════
  // ██  MAIN RENDER  ██
  // ══════════════════════════════════════════════
  return (
    <div className="fixed inset-0 flex flex-col" style={{ overflow: 'hidden', backgroundColor: 'hsl(220 14% 97%)' }}>
      {/* Scrollable content — no header bar on landing for cleaner look */}
      {view !== 'landing' && view !== 'email-signin' && (
        <div className="bg-card border-b border-border" style={{ flexShrink: 0, zIndex: 10, paddingTop: 'env(safe-area-inset-top, 0px)' }}>
          <div className="h-[12px]" />
        </div>
      )}

      <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        {view === 'landing' && renderLanding()}
        {view === 'email-signin' && renderEmailSignin()}
        {view === 'email-signin-form' && renderEmailSigninForm()}
        {view === 'email-signup' && renderEmailSignup()}
        {view === 'otp' && renderOtp()}
        {view === 'reset' && renderReset()}
      </div>

      <ProfileSetupDialog
        open={showProfileSetup}
        onOpenChange={setShowProfileSetup}
        userId={newUserId}
        email={email}
        onComplete={() => {
          console.log('✅ Profil créé - navigation SPA vers /');
          setShowProfileSetup(false);
          navigate('/', { replace: true });
        }}
      />
    </div>
  );
};

export default Auth;
