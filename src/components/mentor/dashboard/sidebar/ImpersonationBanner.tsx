import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

interface ImpersonationBannerProps {
  mentorName: string;
}

export const ImpersonationBanner: React.FC<ImpersonationBannerProps> = ({ mentorName }) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="bg-destructive text-destructive-foreground py-2.5 px-4 flex items-center justify-between text-sm sticky top-0 z-50">
      <span className="font-bold">⚠️ أنت تتصفح كمسؤول — لوحة المدرب: {mentorName}</span>
      <button
        onClick={() => navigate(location.pathname.startsWith("/admin/") ? "/admin" : "/")}
        className="bg-destructive-foreground/20 hover:bg-destructive-foreground/30 px-3 py-1 rounded-lg font-medium transition-colors"
      >
        الخروج من وضع الانتحال
      </button>
    </div>
  );
};
