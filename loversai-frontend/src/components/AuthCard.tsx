import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Sparkles, Gift, Mail, Lock, ArrowRight, User } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import axios from "axios";
import { useGoogleLogin } from "@react-oauth/google";

/* ─── Google SVG Icon ─── */
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

/* ─── Decorative Floating Orb ─── */
const FloatingOrb = ({
  className,
  delay = 0,
}: {
  className: string;
  delay?: number;
}) => (
  <div
    className={`absolute rounded-full blur-3xl opacity-60 pointer-events-none ${className}`}
    style={{
      animation: `float ${8 + delay}s ease-in-out infinite`,
      animationDelay: `${delay}s`,
    }}
  />
);

const AuthCard: React.FC = () => {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { login, signup, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup")
        await signup(email, password, name, inviteCode || undefined);
      else await login(email, password);
      navigate("/studio");
    } catch (err: unknown) {
      let message = "Something went wrong. Please try again.";
      if (axios.isAxiosError(err)) {
        message = err.response?.data?.message || message;
      } else if (err instanceof Error) {
        message = err.message;
      }
      toast({
        title: "Authentication Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Google login — gets access token, fetches user info, sends to backend
  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGoogleLoading(true);
      try {
        // Step 1: Get user info from Google
        const userInfo = await axios.get(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          { headers: { Authorization: `Bearer ${tokenResponse.access_token}` } }
        );

        // Step 2: Send to your backend
        await loginWithGoogle({
          email: userInfo.data.email,
          googleId: userInfo.data.sub,
          name: userInfo.data.name,
          avatar: userInfo.data.picture,
        });

        navigate("/studio");
      } catch (err: unknown) {
        let message = "Google sign-in failed. Please try again.";
        if (axios.isAxiosError(err)) {
          message = err.response?.data?.message || message;
        } else if (err instanceof Error) {
          message = err.message;
        }
        toast({
          title: "Google Sign-In Error",
          description: message,
          variant: "destructive",
        });
      } finally {
        setGoogleLoading(false);
      }
    },
    onError: () => {
      toast({
        title: "Google Sign-In Failed",
        description: "Could not connect to Google. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleGoogleAuth = () => {
    googleLogin();
  };

  return (
    <div className="auth-bg min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* ── Decorative floating gradient orbs ── */}
      <FloatingOrb
        className="w-72 h-72 bg-lovers-blush/25 -top-20 -left-20"
        delay={0}
      />
      <FloatingOrb
        className="w-96 h-96 bg-lovers-gold/20 -bottom-32 -right-24"
        delay={2}
      />
      <FloatingOrb
        className="w-56 h-56 bg-lovers-blush/15 top-1/3 right-10"
        delay={4}
      />
      <FloatingOrb
        className="w-40 h-40 bg-lovers-gold/15 bottom-1/4 left-16"
        delay={6}
      />

      {/* ── Main Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md relative z-10"
      >
        {/* ── Branding ── */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-lovers-blush/15 backdrop-blur-sm border border-lovers-blush/20 mb-4"
          >
            <Sparkles className="text-lovers-blush" size={26} />
          </motion.div>
          <h1 className="font-heading text-3xl sm:text-4xl text-gray-800 dark:text-gray-100 tracking-tight">
            Welcome to{" "}
            <span className="text-gradient-gold">Lovers AI</span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 font-body text-sm mt-2">
            AI-powered moodboards for extraordinary weddings
          </p>
        </div>

        {/* ── Glass Card ── */}
        <div className="bg-white/40 dark:bg-black/40 backdrop-blur-md md:backdrop-blur-lg border border-white/30 dark:border-gray-700/50 shadow-xl shadow-black/5 rounded-3xl p-7 sm:p-8">
          {/* ── Tab Toggle ── */}
          <div className="flex mb-7 bg-white/30 dark:bg-white/5 rounded-2xl p-1 border border-white/20 dark:border-white/5">
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`relative flex-1 py-2.5 text-sm font-body font-medium rounded-xl transition-all duration-300 ${mode === m
                    ? "text-gray-800 dark:text-gray-100"
                    : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                  }`}
              >
                {mode === m && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-white/60 dark:bg-white/10 shadow-sm rounded-xl border border-white/40 dark:border-white/10"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">
                  {m === "login" ? "Sign In" : "Sign Up"}
                </span>
              </button>
            ))}
          </div>

          {/* ── Form ── */}
          <AnimatePresence mode="wait">
            <motion.form
              key={mode}
              initial={{ opacity: 0, x: mode === "login" ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: mode === "login" ? 20 : -20 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              {/* Name (Signup only) */}
              {mode === "signup" && (
                <div>
                  <label className="text-xs font-body font-semibold text-lovers-blush/80 uppercase tracking-wider mb-1.5 block">
                    Name
                  </label>
                  <div className="relative">
                    <User
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lovers-blush/40"
                      size={16}
                    />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      className="w-full h-11 pl-10 pr-4 rounded-xl font-body text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400/70 bg-white/50 focus:bg-white/70 dark:bg-white/5 dark:focus:bg-white/10 border border-white/40 dark:border-white/10 focus:border-lovers-blush outline-none transition-all duration-300"
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div>
                <label className="text-xs font-body font-semibold text-lovers-blush/80 uppercase tracking-wider mb-1.5 block">
                  Email
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lovers-blush/40"
                    size={16}
                  />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full h-11 pl-10 pr-4 rounded-xl font-body text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400/70 bg-white/50 focus:bg-white/70 dark:bg-white/5 dark:focus:bg-white/10 border border-white/40 dark:border-white/10 focus:border-lovers-blush outline-none transition-all duration-300"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="text-xs font-body font-semibold text-lovers-blush/80 uppercase tracking-wider mb-1.5 block">
                  Password
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lovers-blush/40"
                    size={16}
                  />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    minLength={mode === "signup" ? 8 : undefined}
                    className="w-full h-11 pl-10 pr-4 rounded-xl font-body text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400/70 bg-white/50 focus:bg-white/70 dark:bg-white/5 dark:focus:bg-white/10 border border-white/40 dark:border-white/10 focus:border-lovers-blush outline-none transition-all duration-300"
                  />
                </div>
              </div>

              {/* Invite Code (Signup only) */}
              {mode === "signup" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {!showInvite ? (
                    <button
                      type="button"
                      onClick={() => setShowInvite(true)}
                      className="flex items-center gap-1.5 text-xs text-lovers-blush font-body font-medium hover:text-lovers-blush/80 transition-colors"
                    >
                      <Gift size={14} />
                      Have an Invite Code?
                    </button>
                  ) : (
                    <div>
                      <label className="text-xs font-body font-semibold text-lovers-blush/80 uppercase tracking-wider mb-1.5 block">
                        Invite Code (Optional)
                      </label>
                      <input
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value)}
                        placeholder="e.g. LOVERS-ABC123"
                        className="w-full h-11 px-4 rounded-xl font-body text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400/70 bg-white/50 focus:bg-white/70 dark:bg-white/5 dark:focus:bg-white/10 border border-white/40 dark:border-white/10 focus:border-lovers-blush outline-none transition-all duration-300"
                      />
                      <p className="text-[11px] text-gray-400 font-body mt-1.5">
                        Enter an invite code to get 5 bonus credits!
                      </p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="w-full h-12 mt-2 flex items-center justify-center gap-2 rounded-xl font-body font-semibold text-sm text-white bg-lovers-blush/80 hover:bg-lovers-blush backdrop-blur-sm border border-white/20 shadow-lg shadow-lovers-blush/20 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {mode === "login" ? "Sign In" : "Create Account"}
                    <ArrowRight size={16} className="ml-1" />
                  </>
                )}
              </motion.button>
            </motion.form>
          </AnimatePresence>

          {/* ── Divider ── */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-lovers-blush/20 to-transparent" />
            <span className="text-[11px] font-body text-gray-400 uppercase tracking-widest">
              or
            </span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-lovers-blush/20 to-transparent" />
          </div>

          {/* ── Google Auth Button ── */}
          <motion.button
            type="button"
            onClick={handleGoogleAuth}
            disabled={googleLoading}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="w-full h-12 flex items-center justify-center gap-3 rounded-xl font-body font-medium text-sm text-gray-700 dark:text-gray-200 bg-white/50 hover:bg-white/70 dark:bg-white/5 dark:hover:bg-white/10 backdrop-blur-sm border border-white/40 dark:border-white/10 shadow-sm transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {googleLoading ? (
              <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            ) : (
              <>
                <GoogleIcon />
                Continue with Google
              </>
            )}
          </motion.button>

          {/* ── Footer text ── */}
          {mode === "signup" && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[11px] text-gray-400 text-center mt-5 font-body"
            >
              Start with 1 free generation. No credit card required.
            </motion.p>
          )}
        </div>

        {/* ── Bottom branding ── */}
        <p className="text-center text-[11px] text-gray-400/60 font-body mt-6 tracking-wide">
          Crafted with love for your perfect day ✦
        </p>
      </motion.div>
    </div>
  );
};

export default AuthCard;