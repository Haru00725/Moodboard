import React, { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import StudioSidebar from "@/components/StudioSidebar";
import { createOrder, verifyPayment, getPaymentHistory, type Payment } from "@/lib/services/paymentService";
import { openRazorpayCheckout } from "@/lib/razorpay";
import { Check, Crown, Sparkles, Zap, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface Plan {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  popular?: boolean;
  planKey: "FREE" | "PRO" | "PRO_PLUS";
}

const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: "₹0",
    period: "",
    planKey: "FREE",
    description: "Try it out with 1 free generation",
    features: [
      "1 free image generation (Entry Stage only)",
      "Basic AI model",
      "Standard resolution",
      "Community support",
    ],
  },
  {
    id: "pro_monthly",
    name: "Pro",
    price: "₹999",
    period: "/month",
    planKey: "PRO",
    description: "For professional wedding planners",
    popular: true,
    features: [
      "3 moodboard generations",
      "All 5 stages unlocked",
      "Advanced AI model",
      "High resolution exports",
      "Priority support",
      "Save & organize projects",
    ],
  },
  {
    id: "pro_plus",
    name: "Pro Plus",
    price: "₹4,999",
    period: "/month",
    planKey: "PRO_PLUS",
    description: "Unlimited creative freedom",
    features: [
      "Unlimited image & moodboard generations",
      "Max AI model",
      "4K resolution exports",
      "Dedicated account manager",
      "Custom branding options",
      "API access",
    ],
  },
];

const Billing: React.FC = () => {
  const { user, isAuthenticated, loading: authLoading, refreshProfile } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const navigate = useNavigate();

  // Fetch payment history
  useEffect(() => {
    if (!isAuthenticated) return;
    getPaymentHistory()
      .then(setPayments)
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  }, [isAuthenticated]);

  const handleSubscribe = async (plan: Plan) => {
    if (plan.planKey === "FREE") return;
    setLoading(plan.id);
    try {
      const order = await createOrder({
        type: "subscription",
        plan: plan.planKey,
      });

      openRazorpayCheckout({
        orderId: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: "Lovers AI 💍",
        description: `${plan.name} Plan — Lovers AI`,
        prefill: order.prefill,
        onSuccess: async (response) => {
          try {
            await verifyPayment({
              razorpayOrderId: response.razorpayOrderId,
              razorpayPaymentId: response.razorpayPaymentId,
              razorpaySignature: response.razorpaySignature,
            });
            await refreshProfile();
            toast({
              title: "Plan Upgraded! 🎉",
              description: `You are now on the ${plan.name} plan.`,
            });
            // Refresh payment history
            getPaymentHistory().then(setPayments).catch(() => {});
          } catch {
            toast({
              title: "Verification Failed",
              description: "Payment received but verification failed. Please contact support.",
              variant: "destructive",
            });
          } finally {
            setLoading(null);
          }
        },
        onFailure: (err) => {
          if (err?.message !== "Payment cancelled") {
            toast({
              title: "Payment Failed",
              description: "Payment was not completed. Please try again.",
              variant: "destructive",
            });
          }
          setLoading(null);
        },
      });
    } catch {
      toast({
        title: "Error",
        description: "Could not initiate payment. Please try again.",
        variant: "destructive",
      });
      setLoading(null);
    }
  };

  if (authLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <StudioSidebar
        activeTab="billing"
        onTabChange={() => { }}
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((p) => !p)}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-12 lg:py-16">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-body mb-4">
              <Crown size={14} />
              Upgrade Your Plan
            </div>
            <h1 className="font-heading text-3xl lg:text-4xl text-foreground mb-3">
              Choose Your <span className="text-gradient-gold">Perfect Plan</span>
            </h1>
            <p className="text-muted-foreground font-body max-w-lg mx-auto">
              Unlock unlimited moodboard generations and premium features for your wedding planning business.
            </p>
          </div>

          <div className="mb-10 glass rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap size={18} className="text-secondary" />
              <div>
                <p className="text-sm font-body font-medium text-foreground">
                  Current Plan: <span className="capitalize">{user?.plan || "FREE"}</span>
                </p>
                <p className="text-xs text-muted-foreground font-body">
                  {user?.credits ?? 0} credits remaining
                </p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {PLANS.map((plan) => {
              const isCurrent = plan.planKey === user?.plan;

              return (
                <div
                  key={plan.id}
                  className={`relative glass rounded-xl p-6 flex flex-col transition-all duration-300 hover:shadow-lg ${
                    plan.popular ? "ring-2 ring-primary" : ""
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center gap-1 bg-primary text-primary-foreground text-xs font-body font-medium px-3 py-1 rounded-full">
                        <Sparkles size={12} />
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className="font-heading text-xl text-foreground mb-1">{plan.name}</h3>
                    <p className="text-xs text-muted-foreground font-body">{plan.description}</p>
                  </div>

                  <div className="mb-6">
                    <span className="font-heading text-3xl text-foreground">{plan.price}</span>
                    {plan.period && (
                      <span className="text-sm text-muted-foreground font-body">{plan.period}</span>
                    )}
                  </div>

                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm font-body text-foreground">
                        <Check size={16} className="text-primary mt-0.5 shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full font-body"
                    variant={plan.popular ? "default" : "outline"}
                    disabled={isCurrent || loading === plan.id}
                    onClick={() => handleSubscribe(plan)}
                  >
                    {loading === plan.id
                      ? "Processing..."
                      : isCurrent
                        ? "Current Plan"
                        : plan.planKey === "FREE"
                          ? "Get Started"
                          : "Subscribe Now"}
                  </Button>
                </div>
              );
            })}
          </div>

          {/* Payment History */}
          <div className="mt-16">
            <div className="flex items-center gap-3 mb-6">
              <Receipt size={20} className="text-primary" />
              <h2 className="font-heading text-xl text-foreground">Payment History</h2>
            </div>

            {loadingHistory ? (
              <div className="glass rounded-xl p-8 text-center">
                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
              </div>
            ) : payments.length === 0 ? (
              <div className="glass rounded-xl p-8 text-center">
                <p className="text-sm text-muted-foreground font-body">No transactions yet.</p>
              </div>
            ) : (
              <div className="glass rounded-xl overflow-hidden">
                <table className="w-full text-sm font-body">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left p-4 text-xs text-muted-foreground uppercase tracking-wider">Date</th>
                      <th className="text-left p-4 text-xs text-muted-foreground uppercase tracking-wider">Type</th>
                      <th className="text-left p-4 text-xs text-muted-foreground uppercase tracking-wider">Description</th>
                      <th className="text-right p-4 text-xs text-muted-foreground uppercase tracking-wider">Amount</th>
                      <th className="text-center p-4 text-xs text-muted-foreground uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p._id} className="border-b border-border/30 last:border-0 hover:bg-white/5 transition-colors">
                        <td className="p-4 text-foreground">
                          {new Date(p.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="p-4 capitalize text-foreground">{p.type}</td>
                        <td className="p-4 text-muted-foreground">
                          {p.type === "subscription" ? `${p.plan} Plan` : "Template Purchase"}
                        </td>
                        <td className="p-4 text-right font-medium text-foreground">₹{p.amount}</td>
                        <td className="p-4 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                              p.status === "paid"
                                ? "bg-green-500/10 text-green-600 dark:text-green-400"
                                : p.status === "failed"
                                ? "bg-red-500/10 text-red-600 dark:text-red-400"
                                : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <p className="text-center text-xs text-muted-foreground font-body mt-10">
            Payments are securely processed. Cancel anytime from your account settings.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Billing;