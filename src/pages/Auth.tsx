import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ProfileSetupDialog } from "@/components/ProfileSetupDialog";
import { ReferralCodeInput } from "@/components/ReferralCodeInput";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { FcGoogle } from "react-icons/fc";
import { Loader2, Mail, Lock, KeyRound, User } from "lucide-react";

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
  const { toast } = useToast();

  useEffect(() => {
    // Vérifier si c'est une réinitialisation de mot de passe
    const urlParams = new URLSearchParams(window.location.search);
    const isReset = urlParams.get('reset') === 'true';
    
    if (isReset) {
      setAuthStep('reset');
      return;
    }

    // Vérifier si l'utilisateur est déjà connecté
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        try {
          // Vérifier si le profil existe toujours
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('user_id')
            .eq('user_id', session.user.id)
            .maybeSingle();
            
          if (profileError || !profile) {
            // Compte supprimé, forcer la déconnexion
            console.log('🚨 DELETED ACCOUNT DETECTED - clearing session');
            await supabase.auth.signOut({ scope: 'global' });
            localStorage.clear();
            sessionStorage.clear();
            
            toast({
              title: "Compte supprimé",
              description: "Ce compte n'existe plus. Vous avez été déconnecté.",
              variant: "destructive",
            });
            return;
          }
        } catch (error) {
          console.error('Error checking profile on auth page:', error);
        }
        
        window.location.href = '/';
      }
    });
  }, [toast]);

  const handleGoogleAuth = async () => {
    try {
      setIsLoading(true);
      
      // Détection robuste de l'environnement natif Android
      const capacitorNative = (window as any).Capacitor?.isNativePlatform?.();
      const hasAndroidInterface = !!(window as any).Android || !!(window as any).AndroidInterface;
      const isAndroidUA = /Android/i.test(navigator.userAgent);
      const isWebView = /wv|WebView/i.test(navigator.userAgent);
      const isNative = capacitorNative || (isAndroidUA && (hasAndroidInterface || isWebView));
      
      console.log('🔥 Auth Google - Detection:', {
        capacitorNative,
        hasAndroidInterface,
        isAndroidUA,
        isWebView,
        isNative,
        userAgent: navigator.userAgent
      });
      
      if (isNative) {
        // Pour les apps natives, utiliser InAppBrowser pour WebView intégrée
        const { InAppBrowser } = await import('@awesome-cordova-plugins/in-app-browser');
        
        // Construire l'URL d'authentification Google
        const redirectUrl = 'app.runconnect://auth/callback';
        const googleAuthUrl = `https://dbptgehpknjsoisirviz.supabase.co/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectUrl)}`;
        
        // Ouvrir dans une WebView intégrée à l'app
        const browser = InAppBrowser.create(googleAuthUrl, '_blank', {
          location: 'no',
          toolbar: 'yes',
          toolbarcolor: '#1a1a1a',
          closebuttoncaption: 'Fermer',
          closebuttoncolor: '#ffffff',
          hidenavigationbuttons: 'no',
          hideurlbar: 'yes'
        });
        
        console.log('🔥 Ouverture WebView in-app pour Google OAuth');
        
        // Écouter la fermeture de la WebView
        browser.on('exit').subscribe(() => {
          console.log('✅ WebView fermée, vérification session...');
          supabase.auth.getSession();
        });
        
        // Écouter le retour via deep link
        const { App } = await import('@capacitor/app');
        
        App.addListener('appUrlOpen', async (data) => {
          console.log('🔗 Deep link reçu:', data.url);
          
          if (data.url.includes('auth/callback')) {
            // La WebView se ferme automatiquement
            
            // Traiter la callback d'authentification
            const urlParams = new URLSearchParams(data.url.split('#')[1] || '');
            const accessToken = urlParams.get('access_token');
            
            if (accessToken) {
              // Définir la session avec le token reçu
              const { error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: urlParams.get('refresh_token') || ''
              });
              
              if (!error) {
                window.location.href = '/';
              }
            }
          }
        });
        
      } else {
        // Pour le web, utiliser la méthode standard
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/`,
            queryParams: {
              access_type: 'offline',
              prompt: 'consent'
            }
          },
        });
        
        if (error) throw error;
      }
      
    } catch (error: any) {
      console.error('🔥 Erreur Google Auth:', error);
      
      // Gestion spécifique de l'erreur "disallowed_useragent"
      if (error.message?.includes('disallowed_useragent') || error.message?.includes('403')) {
        toast({
          title: "Erreur d'authentification",
          description: "L'authentification Google n'est pas disponible dans cette version de l'app. Utilisez l'authentification par email.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erreur",
          description: error.message || "Erreur lors de l'authentification Google",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (authMode === 'signup') {
        // For signup, use password-based registration
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        if (error) throw error;
        
        // Passer à l'étape OTP pour que l'utilisateur puisse saisir le code
        setAuthStep('otp');
        toast({
          title: "Vérifiez votre email",
          description: "Un code de confirmation vous a été envoyé. Entrez-le ci-dessous.",
        });
      } else {
        // For signin, send OTP avec shouldCreateUser: true pour créer le compte si nécessaire
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
          title: "Code envoyé !",
          description: "Vérifiez votre email pour le code de connexion à 6 chiffres.",
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
        // Gestion spécifique des erreurs d'OTP
        if (error.message.includes('expired') || error.message.includes('invalid')) {
          toast({
            title: "Code expiré",
            description: "Le code a expiré. Cliquez sur 'Renvoyer le code' pour en recevoir un nouveau.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }
      
      // Vérifier si c'est un nouvel utilisateur
      if (data.user) {
        // Attendre un peu pour que le trigger crée le profil
        setTimeout(async () => {
          try {
            // Vérifier si le profil existe déjà
            const { data: existingProfile } = await supabase
              .from('profiles')
              .select('id, username')
              .eq('user_id', data.user.id)
              .maybeSingle();
            
            if (!existingProfile) {
              // Nouveau utilisateur - afficher le setup de profil
              setNewUserId(data.user.id);
              setShowProfileSetup(true);
            } else {
              // Utilisateur existant - rediriger
              window.location.href = '/';
            }
          } catch (profileError: any) {
            console.error('Erreur lors de la vérification du profil:', profileError);
            // En cas d'erreur, afficher le setup de profil par sécurité
            setNewUserId(data.user.id);
            setShowProfileSetup(true);
          }
        }, 1000);
      }
    } catch (error: any) {
      let errorMessage = error.message;
      
      if (error.message.includes('429') || error.message.includes('rate limit')) {
        errorMessage = "Trop de tentatives. Veuillez attendre quelques minutes avant de réessayer.";
      }
      
      toast({
        title: "Erreur",
        description: errorMessage,
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
      
      // Vérifier si c'est un username (ne contient pas @)
      if (!usernameOrEmail.includes('@')) {
        // C'est un username, récupérer l'email associé
        console.log('🔍 Recherche email pour username:', usernameOrEmail);
        const { data: userEmail, error: emailError } = await supabase
          .rpc('get_email_from_username', { username_param: usernameOrEmail });
          
        if (emailError) {
          console.error('🔍 Erreur RPC username:', emailError);
          throw new Error('Impossible de vérifier le nom d\'utilisateur. Réessayez avec votre email.');
        }
        
        if (!userEmail) {
          throw new Error('Nom d\'utilisateur non trouvé. Vérifiez l\'orthographe ou utilisez votre email.');
        }
        
        emailToUse = userEmail;
        console.log('🔍 Email trouvé pour username:', emailToUse);
      }

      console.log('🔐 Tentative de connexion avec email:', emailToUse);
      const { error } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password,
      });
      
      if (error) {
        console.error('🔐 Erreur auth:', error);
        throw error;
      }
      
      console.log('✅ Connexion réussie');
      window.location.href = '/';
    } catch (error: any) {
      console.error('❌ Erreur complète:', error);
      
      let errorMessage = error.message;
      
      // Gestion spécifique des erreurs d'authentification
      if (error.message.includes('Invalid login credentials')) {
        errorMessage = 'Email ou mot de passe incorrect. Vérifiez vos informations.';
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = 'Votre email n\'est pas encore confirmé. Vérifiez votre boîte mail.';
      } else if (error.message.includes('User not found')) {
        errorMessage = 'Aucun compte trouvé avec cet email. Créez un compte d\'abord.';
      } else if (error.message.includes('rate limit') || error.message.includes('429')) {
        errorMessage = 'Trop de tentatives. Attendez quelques minutes avant de réessayer.';
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = 'Problème de connexion. Vérifiez votre internet et réessayez.';
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
        title: "Succès !",
        description: "Votre mot de passe a été mis à jour.",
      });
      
      // Rediriger vers l'accueil
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

  const forceCleanSession = async () => {
    try {
      // Nettoyer complètement toutes les données
      await supabase.auth.signOut({ scope: 'global' });
      localStorage.clear();
      sessionStorage.clear();
      
      // Supprimer spécifiquement les clés Supabase
      const keysToRemove = [
        'supabase.auth.token',
        'sb-dbptgehpknjsoisirviz-auth-token',
        'supabase-auth-token'
      ];
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
      
      toast({
        title: "Session nettoyée",
        description: "Toutes les données de session ont été supprimées.",
      });
      
      // Recharger la page
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      toast({
        title: "Erreur lors du nettoyage",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-accent/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-map-panel">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">RunConnect</CardTitle>
          <CardDescription>
            {authStep === 'reset'
              ? "Définissez votre nouveau mot de passe"
              : authStep === 'otp' 
                ? "Entrez le code reçu par email"
                : authMode === 'signup' 
                  ? "Créez votre compte pour rejoindre la communauté" 
                  : "Connectez-vous à votre compte"
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleGoogleAuth}
            disabled={isLoading}
            variant="outline"
            className="w-full"
          >
            <FcGoogle className="mr-2 h-4 w-4" />
            {authMode === 'signup' ? "S'inscrire" : "Se connecter"} avec Google
          </Button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Ou avec votre email
              </span>
            </div>
          </div>

          {authStep === 'reset' ? (
            // Password Reset Form
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="Nouveau mot de passe"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10"
                    required
                    minLength={6}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="Confirmer le mot de passe"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || newPassword !== confirmPassword}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Mettre à jour le mot de passe
              </Button>
            </form>
          ) : authStep === 'otp' ? (
            // OTP Verification Form
            <form onSubmit={handleOtpSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    Code envoyé à : <span className="font-medium text-foreground">{email}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Le code expire dans 5 minutes
                  </p>
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
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || otp.length !== 6}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Vérifier le code
              </Button>

              <div className="text-center space-y-2">
                <button
                  type="button"
                  onClick={async () => {
                    setIsLoading(true);
                    try {
                      const { error } = await supabase.auth.signInWithOtp({
                        email,
                        options: {
                          emailRedirectTo: `${window.location.origin}/`,
                          shouldCreateUser: true
                        },
                      });
                      if (error) {
                        if (error.message.includes('429') || error.message.includes('rate limit')) {
                          toast({
                            title: "Trop de tentatives",
                            description: "Veuillez attendre quelques minutes avant de demander un nouveau code.",
                            variant: "destructive",
                          });
                        } else {
                          throw error;
                        }
                      } else {
                        setOtp('');
                        toast({
                          title: "Nouveau code envoyé !",
                          description: "Vérifiez votre email pour le nouveau code.",
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
                  }}
                  className="text-sm text-primary hover:underline block mx-auto"
                >
                  Renvoyer le code
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthStep('email');
                    setOtp('');
                  }}
                  className="text-sm text-muted-foreground hover:underline block mx-auto"
                >
                  ← Retour
                </button>
              </div>
            </form>
          ) : authMode === 'signup' ? (
            // Signup Form (email + password)
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="votre.email@exemple.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="Mot de passe (min. 6 caractères)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Continuer
              </Button>

              {/* Code de parrainage pour les nouveaux utilisateurs */}
              <div className="mt-4 pt-4 border-t border-border">
                <ReferralCodeInput />
              </div>
            </form>
          ) : (
            // Signin Options
            <div className="space-y-4">
              {/* OTP Signin */}
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div className="space-y-2">
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="votre.email@exemple.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Recevoir un code par email
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Ou avec mot de passe
                  </span>
                </div>
              </div>

              {/* Password Signin */}
              <form onSubmit={handleUsernameOrEmailSignin} className="space-y-4">
                <div className="space-y-2">
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Pseudonyme ou email"
                      value={usernameOrEmail}
                      onChange={(e) => setUsernameOrEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="Votre mot de passe"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="outline"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Se connecter
                </Button>
              </form>
            </div>
          )}

          <div className="text-center space-y-2">
            {authStep !== 'reset' && (
              <button
                type="button"
                onClick={() => setAuthMode(authMode === 'signup' ? 'signin' : 'signup')}
                className="text-sm text-primary hover:underline block mx-auto"
              >
                {authMode === 'signup' ? "Déjà inscrit ? Connectez-vous" : "Pas de compte ? Inscrivez-vous"}
              </button>
            )}
            
            {/* Bouton de nettoyage d'urgence */}
            <button
              type="button"
              onClick={forceCleanSession}
              className="text-xs text-muted-foreground hover:text-destructive hover:underline block mx-auto mt-4"
              title="En cas de problème de connexion, cliquez ici pour nettoyer complètement votre session"
            >
              Problème de connexion ? Nettoyer la session
            </button>
          </div>
        </CardContent>
      </Card>
      
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