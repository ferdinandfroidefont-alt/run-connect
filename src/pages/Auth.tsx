import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ProfileSetupDialog } from "@/components/ProfileSetupDialog";
import { ReferralCodeInput } from "@/components/ReferralCodeInput";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { FcGoogle } from "react-icons/fc";
import { Loader2, Mail, Lock, KeyRound, User, Eye, EyeOff, ChevronLeft, ChevronRight } from "lucide-react";
import { googleSignIn, isNativeGoogleSignInAvailable } from '@/lib/googleSignIn';
import { CaptchaWidget, CaptchaWidgetRef } from "@/components/CaptchaWidget";
import { ScrollArea } from "@/components/ui/scroll-area";
import appIcon from '@/assets/app-icon.png';

const Auth = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [authStep, setAuthStep] = useState<'email' | 'otp' | 'password' | 'reset'>('email');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
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

  useEffect(() => {
    // 🔥 NIVEAU 33: Détecter si profil créé mais redirection échouée
    const profileCreated = localStorage.getItem('profileCreatedSuccessfully');
    const profileCreatedAt = localStorage.getItem('profileCreatedAt');
    
    if (profileCreated === 'true' && profileCreatedAt) {
      const createdTime = parseInt(profileCreatedAt, 10);
      const timeSinceCreation = Date.now() - createdTime;
      
      // Si profil créé il y a moins de 30 secondes, vérifier la session puis rediriger
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
        // Nettoyer les vieux flags
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
      setAuthStep('reset');
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
      
      // ✅ Nettoyer toute session existante avant nouvelle connexion
      console.log('🧹 [AUTH] Cleaning existing session before Google login...');
      await supabase.auth.signOut({ scope: 'local' });
      
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
          console.error('🔥 [GOOGLE AUTH] Error message:', nativeError.message);
          console.error('🔥 [GOOGLE AUTH] Error stack:', nativeError.stack);
          toast({
            title: "Erreur Google Sign-In",
            description: nativeError.message || "Erreur lors de l'authentification",
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

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (authMode === 'signup') {
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

        setAuthStep('otp');
        toast({
          title: "Vérifiez votre email",
          description: "Un code de confirmation vous a été envoyé."
        });
      } else {
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
        setAuthStep('otp');
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
      // Note: Ne PAS faire signOut avant verifyOtp - cela détruit la session et empêche la persistance
      
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
      // ✅ Nettoyer toute session existante avant nouvelle connexion
      console.log('🧹 [AUTH] Cleaning existing session before new login...');
      await supabase.auth.signOut({ scope: 'local' });
      
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
      setAuthStep('email');
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

  return (
    <div className="min-h-screen bg-secondary flex flex-col bg-pattern">
      {/* iOS Header */}
      <div className="bg-card border-b border-border">
        <div className="flex items-center justify-center px-4 h-[56px]">
          <h1 className="text-[17px] font-semibold">
            {authStep === 'reset' ? 'Réinitialiser' : authMode === 'signup' ? 'Inscription' : 'Connexion'}
          </h1>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-4 py-6 space-y-6">
          {/* Logo Section */}
          <div className="flex flex-col items-center pt-4 pb-2">
            <img 
              src={appIcon} 
              alt="RunConnect" 
              className="w-20 h-20 rounded-[18px] mb-4"
              style={{ boxShadow: '0 4px 12px hsl(211 100% 50% / 0.2)' }}
            />
            <h2 className="text-2xl font-bold text-primary">RunConnect</h2>
            <p className="text-[13px] text-muted-foreground mt-1">
              {authMode === 'signup' ? 'Créez votre compte' : 'Bienvenue !'}
            </p>
          </div>

          {/* Password Reset Form */}
          {authStep === 'reset' && (
            <div className="space-y-4">
              <div className="bg-card rounded-[10px] overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-[13px] text-muted-foreground">Nouveau mot de passe</p>
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
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
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
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5 text-muted-foreground" /> : <Eye className="h-5 w-5 text-muted-foreground" />}
                    </button>
                  </div>
                  <Button type="submit" className="w-full h-12 rounded-[10px]" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Mettre à jour le mot de passe
                  </Button>
                </form>
              </div>
            </div>
          )}

          {/* OTP Verification */}
          {authStep === 'otp' && (
            <div className="space-y-4">
              <div className="bg-card rounded-[10px] overflow-hidden">
                <div className="px-4 py-3 border-b border-border text-center">
                  <p className="text-[15px] font-medium">Vérification</p>
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
                  <Button type="submit" className="w-full h-12 rounded-[10px]" disabled={isLoading || otp.length !== 6}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Vérifier le code
                  </Button>
                </form>
              </div>

              <div className="bg-card rounded-[10px] overflow-hidden">
                <button
                  type="button"
                  onClick={resendOtp}
                  className="w-full flex items-center justify-between px-4 py-3 active:bg-secondary/50 transition-colors"
                >
                  <span className="text-[15px] text-primary">Renvoyer le code</span>
                  <ChevronRight className="h-5 w-5 text-muted-foreground/40" />
                </button>
                <div className="h-px bg-border ml-4" />
                <button
                  type="button"
                  onClick={() => { setAuthStep('email'); setOtp(''); }}
                  className="w-full flex items-center gap-2 px-4 py-3 active:bg-secondary/50 transition-colors"
                >
                  <ChevronLeft className="h-5 w-5 text-muted-foreground" />
                  <span className="text-[15px]">Retour</span>
                </button>
              </div>
            </div>
          )}

          {/* Email/Password Forms */}
          {authStep === 'email' && (
            <div className="space-y-4">
              {/* Google Sign-In */}
              <div className="bg-card rounded-[10px] overflow-hidden">
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-3 px-4 py-4 active:bg-secondary/50 transition-colors disabled:opacity-50"
                >
                  <FcGoogle className="h-6 w-6" />
                  <span className="text-[17px] font-medium">Continuer avec Google</span>
                </button>
              </div>

              <div className="flex items-center gap-4 px-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[13px] text-muted-foreground">ou</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {authMode === 'signup' ? (
                /* Signup Form */
                <div className="bg-card rounded-[10px] overflow-hidden">
                  <div className="px-4 py-3 border-b border-border">
                    <p className="text-[13px] text-muted-foreground uppercase tracking-wider">Créer un compte</p>
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
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                      >
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
                      <div className="text-center text-[13px] text-green-600">✅ Vérification réussie</div>
                    )}

                    <Button type="submit" className="w-full h-12 rounded-[10px]" disabled={isLoading || !captchaToken}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Continuer
                    </Button>
                  </form>
                  <div className="px-4 pb-4">
                    <ReferralCodeInput />
                  </div>
                </div>
              ) : (
                /* Signin Form */
                <>
                  {/* OTP Signin */}
                  <div className="bg-card rounded-[10px] overflow-hidden">
                    <div className="px-4 py-3 border-b border-border">
                      <p className="text-[13px] text-muted-foreground uppercase tracking-wider">Connexion par code</p>
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
                      {captchaToken && (
                        <div className="text-center text-[13px] text-green-600">✅ Vérification réussie</div>
                      )}
                      <Button type="submit" className="w-full h-12 rounded-[10px]" disabled={isLoading || !captchaToken}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Recevoir un code
                      </Button>
                    </form>
                  </div>

                  {/* Password Signin */}
                  <div className="bg-card rounded-[10px] overflow-hidden">
                    <div className="px-4 py-3 border-b border-border">
                      <p className="text-[13px] text-muted-foreground uppercase tracking-wider">Ou avec mot de passe</p>
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
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2"
                        >
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
                        <div className="text-center text-[13px] text-green-600">✅ Vérification réussie</div>
                      )}

                      <Button type="submit" variant="outline" className="w-full h-12 rounded-[10px]" disabled={isLoading || !captchaToken}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Se connecter
                      </Button>
                    </form>
                  </div>

                  {/* Forgot Password */}
                  <div className="bg-card rounded-[10px] overflow-hidden">
                    <button
                      type="button"
                      onClick={async () => {
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
                      }}
                      disabled={!captchaToken}
                      className="w-full flex items-center justify-between px-4 py-3 active:bg-secondary/50 transition-colors disabled:opacity-50"
                    >
                      <span className="text-[15px] text-primary">🔑 Mot de passe oublié ?</span>
                      <ChevronRight className="h-5 w-5 text-muted-foreground/40" />
                    </button>
                  </div>
                </>
              )}

              {/* Toggle Auth Mode */}
              <div className="bg-card rounded-[10px] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setAuthMode(authMode === 'signup' ? 'signin' : 'signup')}
                  className="w-full flex items-center justify-center px-4 py-4 active:bg-secondary/50 transition-colors"
                >
                  <span className="text-[15px] text-primary">
                    {authMode === 'signup' ? "Déjà inscrit ? Connectez-vous" : "Pas de compte ? Inscrivez-vous"}
                  </span>
                </button>
              </div>

              {/* Clean Session */}
              <button
                type="button"
                onClick={forceCleanSession}
                className="w-full text-center text-[13px] text-muted-foreground hover:text-destructive py-2"
              >
                Problème de connexion ? Nettoyer la session
              </button>
            </div>
          )}
        </div>
      </ScrollArea>

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
