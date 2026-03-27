import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import StudioSidebar from "@/components/StudioSidebar";
import { User, Lock, Trash2, Save, Gift, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const Settings: React.FC = () => {
  const { user, isAuthenticated, loading: authLoading, logout, updateDisplayName, changePassword } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  React.useEffect(() => {
    if (user?.displayName) setDisplayName(user.displayName);
  }, [user]);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await updateDisplayName(displayName);
      toast({ title: "Saved", description: "Profile updated successfully." });
    } catch {
      toast({ title: "Error", description: "Failed to update profile.", variant: "destructive" });
    }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      toast({ title: "Error", description: "Password must be at least 8 characters.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match.", variant: "destructive" });
      return;
    }
    setChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast({ title: "Success", description: "Password updated successfully." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      toast({ title: "Error", description: "Failed to update password.", variant: "destructive" });
    }
    setChangingPassword(false);
  };

  const handleDeleteAccount = async () => {
    await logout();
    toast({ title: "Signed Out", description: "Contact support to permanently delete your account." });
  };

  const handleCopyInviteCode = () => {
    if (user?.inviteCode) {
      navigator.clipboard.writeText(user.inviteCode);
      toast({ title: "Copied!", description: "Invite code copied to clipboard." });
    }
  };

  if (authLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <StudioSidebar
        activeTab="settings"
        onTabChange={() => {}}
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((p) => !p)}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-12 lg:py-16 space-y-10">
          <div>
            <h1 className="font-heading text-3xl lg:text-4xl text-foreground mb-2">
              Account <span className="text-gradient-gold">Settings</span>
            </h1>
            <p className="text-muted-foreground font-body">
              Manage your profile and preferences
            </p>
          </div>

          {/* Profile Section */}
          <section className="glass rounded-xl p-6 space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="text-primary" size={20} />
              </div>
              <div>
                <h2 className="font-heading text-xl text-foreground">Profile</h2>
                <p className="text-xs text-muted-foreground font-body">Your personal information</p>
              </div>
            </div>

            <div>
              <label className="text-xs font-body font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Email
              </label>
              <Input value={user?.email || ""} disabled className="bg-muted/50 font-body" />
              <p className="text-xs text-muted-foreground font-body mt-1">Email cannot be changed</p>
            </div>

            <div>
              <label className="text-xs font-body font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Display Name
              </label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="bg-background/50 font-body"
              />
            </div>

            <div className="flex items-center gap-2 text-sm font-body">
              <span className="text-muted-foreground">Plan:</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                user?.plan !== "FREE"
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}>
                {user?.plan === "PRO" ? "Pro" : user?.plan === "PRO_PLUS" ? "Pro+" : "Free"}
              </span>
              <span className="text-muted-foreground ml-2">{user?.credits ?? 0} credits</span>
            </div>

            <Button onClick={handleSaveProfile} disabled={saving} className="font-body">
              <Save size={16} className="mr-2" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </section>

          {/* Referral Section */}
          <section className="glass rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
                <Gift className="text-secondary" size={20} />
              </div>
              <div>
                <h2 className="font-heading text-xl text-foreground">Refer & Earn</h2>
                <p className="text-xs text-muted-foreground font-body">Share this code to get 5 free credits</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 glass rounded-lg px-4 py-3 font-body font-medium text-foreground tracking-widest text-lg">
                {user?.inviteCode || "LOVERS-XXXXXX"}
              </div>
              <Button variant="outline" className="glass font-body" onClick={handleCopyInviteCode}>
                <Copy size={16} className="mr-2" />
                Copy
              </Button>
            </div>
            <p className="text-xs text-muted-foreground font-body">
              When someone signs up with your code, both of you earn 5 bonus credits.
            </p>
          </section>

          {/* Password Section */}
          <section className="glass rounded-xl p-6 space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Lock className="text-primary" size={20} />
              </div>
              <div>
                <h2 className="font-heading text-xl text-foreground">Security</h2>
                <p className="text-xs text-muted-foreground font-body">Change your password</p>
              </div>
            </div>

            <div>
              <label className="text-xs font-body font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Current Password
              </label>
              <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" className="bg-background/50 font-body" />
            </div>

            <div>
              <label className="text-xs font-body font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                New Password
              </label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" className="bg-background/50 font-body" />
            </div>

            <div>
              <label className="text-xs font-body font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Confirm Password
              </label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className="bg-background/50 font-body" />
            </div>

            <Button onClick={handleChangePassword} disabled={changingPassword} variant="outline" className="font-body">
              {changingPassword ? "Updating..." : "Update Password"}
            </Button>
          </section>

          {/* Danger Zone */}
          <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <Trash2 className="text-destructive" size={20} />
              </div>
              <div>
                <h2 className="font-heading text-xl text-foreground">Danger Zone</h2>
                <p className="text-xs text-muted-foreground font-body">Irreversible account actions</p>
              </div>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="font-body">
                  <Trash2 size={16} className="mr-2" />
                  Delete Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Account</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will sign you out. Contact support to permanently delete your account and all associated data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAccount}>
                    Continue
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Settings;
