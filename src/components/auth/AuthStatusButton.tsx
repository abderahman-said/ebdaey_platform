import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { LogOut } from "lucide-react";
import AuthDialog from "./AuthDialog";
import { useMentorUrls } from "@/hooks/useMentorUrls";

interface AuthStatusButtonProps extends Omit<ButtonProps, "children"> {
  mentorSlug?: string;
  loggedOutLabel?: string;
  studentOnly?: boolean;
}

const AuthStatusButton = ({
  mentorSlug,
  loggedOutLabel,
  studentOnly = false,
  className = "block text-sm backdrop-blur-sm font-semibold bg-transparent text-slate-600 hover:text-primary px-4 py-2 rounded-xl border border-transparent hover:border-primary hover:bg-transparent transition-all duration-150",
  variant = "outline",
  size = "default",
  ...props
}: AuthStatusButtonProps) => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const urls = useMentorUrls(mentorSlug);
  const { t } = useTranslation();
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const loginLabel = loggedOutLabel ?? t("common.login");

  if (loading) return null;

  const currentRole = typeof user?.user_metadata?.role === "string" ? user.user_metadata.role : null;

  // On mentor public sites (studentOnly), don't reflect mentor/admin sessions — this
  // header is for students only. Mentors/admins signed in elsewhere see the login button.
  const treatAsLoggedOut = !user || (studentOnly && (currentRole === "mentor" || currentRole === "admin"));

  if (treatAsLoggedOut) {
    const useDialog = !!mentorSlug;

    if (useDialog) {
      return (
        <>
          <Button
            className={className}
            variant={variant}
            size={size}
            onClick={() => setShowAuthDialog(true)}
            {...props}
          >
            {loginLabel}
          </Button>
          <AuthDialog open={showAuthDialog} onOpenChange={setShowAuthDialog} mentorSlug={mentorSlug} mode="student" />
        </>
      );
    }

    const loginHref = urls.mentorAppUrl("/login");
    return (
      <a href={loginHref}>
        <Button className={className} variant={variant} size={size} {...props}>
          {loginLabel}
        </Button>
      </a>
    );
  }

  const role = typeof user.user_metadata?.role === "string" ? user.user_metadata.role : null;
  const mentorDashboardSlug = typeof user.user_metadata?.slug === "string" ? user.user_metadata.slug : mentorSlug;

  const accountHref =
    role === "mentor"
      ? urls.mentorAppUrl("/")
      : role === "admin"
        ? urls.adminUrl()
        : mentorSlug
          ? urls.studentDashboardUrl()
          : "/";

  const handleSignOut = async (e: React.MouseEvent) => {
    e.preventDefault();
    await signOut();
    navigate(mentorSlug ? urls.profileUrl() : "/");
  };

  return (
    <div className="flex items-center gap-2">
      <Link to={accountHref}>
        <Button className={className} variant={variant} size={size} {...props}>
          {t("common.myAccount")}
        </Button>
      </Link>
      <Button
        variant="outline"
        size="icon"
        className="rounded-full w-9 h-9 p-0 bg-background text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
        onClick={handleSignOut}
        title={t("common.logout")}
      >
        <LogOut className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default AuthStatusButton;
