import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ProfileSetupDialog } from "@/components/ProfileSetupDialog";
import { ReferralCodeInput } from "@/components/ReferralCodeInput";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { FcGoogle } from "react-icons/fc";
import { Loader2, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { googleSignIn, isNativeGoogleSignInAvailable } from '@/lib/googleSignIn';

const Auth = () => {
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
  const { toast } = useToast();

  useEffect(() => {
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
              title: "Session expirée",
              description: "Votre ancienne session a été supprimée.",
            });
            return;
          }
        }
      } catch (error) {
        console.error('Erreur nettoyage session:', error);
      }
    };
    
    cleanExpiredSession();
    
    const referralParams = new URLSearchParams(window.location.search);
    const refCode = referralParams.get('ref') || referralParams.get('r');
    if (refCode) {
      sessionStorage.setItem('referralCode', refCode);
      toast({
        title: "Code de parrainage détecté",
        description: "Inscrivez-vous pour bénéficier du bonus",
        duration: 5000
      });
    }
    
    const urlParams = new URLSearchParams(window.location.search);
    const isReset = 
      urlParams.get('reset') === 'true' || 
      urlParams.get('type') === 'recovery' || 
      urlParams.get('action') === 'recovery' || 
      urlParams.has('code');
    
    const error = urlParams.get('error');
    const errorCode = urlParams.get('error_code');
    
    if (error && errorCode === 'otp_expired') {
      toast({
        variant: "destructive",
        title: "Lien expiré",
        description: "Ce lien de réinitialisation a expiré. Demandez-en un nouveau.",
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
              variant: "destructive",
            });
            return;
          }
        } catch (error) {
          console.error('Error checking profile:', error);
        }
        
        window.location.href = '/';
      }
    });
  }, [toast]);

  const handleGoogleAuth = async () => {
    try {
      setIsLoading(true);
      
      const isNativeAvailable = await isNativeGoogleSignInAvailable();
      
      if (isNativeAvailable) {
        try {
          const { idToken } = await googleSignIn();
          
          const { data, error } = await supabase.functions.invoke('firebase-auth', {
            body: { idToken }
          });
          
          if (error) {
            toast({
              title: "Erreur Google Sign-In",
              description: error.message || 'Erreur inconnue',
              variant: "destructive",
            });
            return;
          }

          if (!data?.session) {
            throw new Error('No session returned');
          }

          const { error: sessionError } = await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });

          if (sessionError) throw sessionError;
          
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
              window.location.href = '/';
            }
          }
          
          return;
        } catch (nativeError: any) {
          toast({
            title: "Erreur Google Sign-In",
            description: nativeError.message || "Erreur lors de l'authentification",
            variant: "destructive",
          });
          return;
        }
      }
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) throw error;
      
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de l'authentification Google",
        variant: "destructive",
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
          },
        });
        if (error) throw error;
        
        const referralCode = sessionStorage.getItem('referralCode');
        if (referralCode && signUpData.user) {
          try {
            await supabase.functions.invoke('process-referral-signup', {
              body: { referralCode, newUserId: signUpData.user.id }
            });
            sessionStorage.removeItem('referralCode');
          } catch (refError) {
            console.error('Erreur parrainage:', refError);
          }
        }
        
        setAuthStep('otp');
        toast({
          title: "Vérifiez votre email",
          description: "Un code de confirmation vous a été envoyé.",
        });
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            shouldCreateUser: true
          },
        });
        if (error) throw error;
        
        setAuthStep('otp');
        toast({
          title: "Code envoyé",
          description: "Vérifiez votre email pour le code à 6 chiffres.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
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
        type: 'email',
      });
      if (error) {
        if (error.message.includes('expired') || error.message.includes('invalid')) {
          toast({
            title: "Code expiré",
            description: "Demandez un nouveau code.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }
      
      if (data.user) {
        setTimeout(async () => {
          try {
            const { data: existingProfile } = await supabase
              .from('profiles')
              .select('id, username')
              .eq('user_id', data.user.id)
              .maybeSingle();
            
            if (!existingProfile) {
              setNewUserId(data.user.id);
              setShowProfileSetup(true);
            } else {
              window.location.href = '/';
            }
          } catch (profileError: any) {
            setNewUserId(data.user.id);
            setShowProfileSetup(true);
          }
        }, 1000);
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUsernameOrEmailSignin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let emailToUse = usernameOrEmail;
      
      if (!usernameOrEmail.includes('@')) {
        const { data: userEmail, error: emailError } = await supabase
          .rpc('get_email_from_username', { username_param: usernameOrEmail });
          
        if (emailError) {
          throw new Error('Impossible de vérifier le nom d\'utilisateur.');
        }
        
        if (!userEmail) {
          throw new Error('Nom d\'utilisateur non trouvé.');
        }
        
        emailToUse = userEmail;
      }
      
      const { error } = await supabase.auth.signInWithPassword({
        email: emailToUse.trim(),
        password: password,
      });
      
      if (error) throw error;
      
      const targetUsername = sessionStorage.getItem('targetProfileUsername');
      if (targetUsername) {
        sessionStorage.removeItem('targetProfileUsername');
        window.location.href = `/p/${targetUsername}`;
      } else {
        window.location.href = '/';
      }
    } catch (error: any) {
      let errorMessage = error.message;
      
      if (error.message.includes('Invalid login credentials')) {
        errorMessage = 'Email ou mot de passe incorrect.';
      }
      
      toast({
        title: "Connexion échouée",
        description: errorMessage,
        variant: "destructive",
      });
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
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Erreur",
        description: "Le mot de passe doit contenir au moins 6 caractères.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      
      toast({
        title: "Mot de passe mis à jour",
        description: "Vous allez être redirigé.",
      });
      
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const emailToUse = usernameOrEmail.includes('@') ? usernameOrEmail : undefined;
    if (!emailToUse) {
      toast({
        title: "Email requis",
        description: "Entrez votre email pour réinitialiser le mot de passe.",
        variant: "destructive",
      });
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(emailToUse, {
        redirectTo: 'https://run-connect.lovable.app/auth',
      });
      if (error) throw error;
      toast({
        title: "Email envoyé",
        description: "Vérifiez votre boîte mail.",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resendOtp = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          shouldCreateUser: true
        },
      });
      if (error) throw error;
      setOtp('');
      toast({
        title: "Nouveau code envoyé",
        description: "Vérifiez votre email.",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">RunConnect</h1>
          <p className="text-sm text-muted-foreground">
            {authStep === 'reset'
              ? "Nouveau mot de passe"
              : authStep === 'otp' 
                ? "Vérification"
                : authMode === 'signup' 
                  ? "Créer un compte" 
                  : "Connexion"
            }
          </p>
        </div>

        {/* Forms */}
        <div className="space-y-6">
          {authStep === 'reset' ? (
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div className="relative">
                <Input
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Nouveau mot de passe"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pr-10"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirmer le mot de passe"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pr-10"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || newPassword !== confirmPassword}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Mettre à jour
              </Button>
            </form>
          ) : authStep === 'otp' ? (
            <form onSubmit={handleOtpSubmit} className="space-y-6">
              <div className="text-center space-y-1">
                <p className="text-sm text-muted-foreground">Code envoyé à</p>
                <p className="text-sm font-medium">{email}</p>
              </div>
              
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={(value) => setOtp(value)}
                >
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

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || otp.length !== 6}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Vérifier
              </Button>

              <div className="flex justify-center gap-4 text-sm">
                <button
                  type="button"
                  onClick={resendOtp}
                  className="text-primary hover:underline"
                >
                  Renvoyer le code
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthStep('email');
                    setOtp('');
                  }}
                  className="text-muted-foreground hover:underline flex items-center gap-1"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Retour
                </button>
              </div>
            </form>
          ) : authMode === 'signup' ? (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Mot de passe (min. 6 caractères)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Créer un compte
              </Button>

              <ReferralCodeInput />
            </form>
          ) : (
            <div className="space-y-4">
              {/* Google Sign-In */}
              <Button
                onClick={handleGoogleAuth}
                disabled={isLoading}
                variant="outline"
                className="w-full h-11"
              >
                <FcGoogle className="mr-2 h-5 w-5" />
                Continuer avec Google
              </Button>
              
              {/* Separator */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-background px-3 text-muted-foreground">ou</span>
                </div>
              </div>

              {/* Password Sign-In */}
              <form onSubmit={handleUsernameOrEmailSignin} className="space-y-4">
                <Input
                  type="text"
                  placeholder="Email ou pseudonyme"
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  required
                />
                
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Se connecter
                </Button>
              </form>
            </div>
          )}

          {/* Toggle Sign-in/Sign-up */}
          {authStep !== 'reset' && authStep !== 'otp' && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => setAuthMode(authMode === 'signup' ? 'signin' : 'signup')}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {authMode === 'signup' 
                  ? "Déjà inscrit ? Se connecter" 
                  : "Pas de compte ? S'inscrire"
                }
              </button>
            </div>
          )}
        </div>
      </div>
      
      <ProfileSetupDialog
        open={showProfileSetup}
        onOpenChange={setShowProfileSetup}
        userId={newUserId}
        email={email}
      />
    </div>
  );
};

export default Auth;
