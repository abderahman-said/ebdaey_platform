import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import TopLoadingBar from "@/components/common/TopLoadingBar";
import { Link, useNavigate } from "react-router-dom";
import { getSubdomainInfo, getMentorSiteUrl } from "@/lib/subdomain";
import { CURRENCY_NAMES } from "@/lib/currency";
import mentorDashboardLogo from "@/assets/logo-green.png";
import {
  LayoutDashboard,
  Users,
  Wallet,
  ShoppingCart,
  ShoppingBag,
  LogOut,
  CheckCircle,
  XCircle,
  Clock,
  Ban,
  Settings,
  FileText,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BookOpen,
  AlertTriangle,
  Eye,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Shield,
  ArrowUpRight,
  Banknote,
  ArrowLeftRight,
  UserCog,
  Plus,
  Minus,
  Snowflake,
  BarChart3,
  Activity,
  PieChart,
  Zap,
  Globe,
  HeadphonesIcon,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  MoreVertical,
  Crown,
  RotateCcw,
  Boxes,
  Package,
  GraduationCap,
  Star,
  Coins,
  Bell,
  Send,
  Trash2,
  Sparkles,
  Megaphone,
  Menu,
  ChevronLeft,
  Home,
  CircleDollarSign,
  Rocket,
  Layers,
  CircleUser,
  Loader2,
  KeyRound,
  Link2 as LinkIcon,
  Tag,
} from "lucide-react";
import PlatformAnnouncementsManager from "@/components/admin/PlatformAnnouncementsManager";
import AdminProductsManager from "@/components/admin/AdminProductsManager";
import AdminCouponsManager from "@/components/admin/AdminCouponsManager";
import AdminTransfersManager from "@/components/admin/AdminTransfersManager";
import ChangePassword from "@/components/auth/ChangePassword";
import NotFound from "@/pages/public/NotFound";
import { isDeviceVerified, clearDeviceToken } from "@/lib/adminMfa";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import EmailNotificationsManager from "@/components/admin/EmailNotificationsManager";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

// ---- Currency split helpers (EGP vs USD/Stripe) ----
const isUsdRow = (r: any) =>
  r?.gateway === "stripe" || String(r?.currency || "EGP").toUpperCase() !== "EGP";
const fmtEgp = (n: number) => `${(Math.round(Number(n || 0) * 100) / 100).toLocaleString()} ج.م`;
const fmtUsd = (n: number) => `$${Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
const fmtRow = (n: number, r: any) => (isUsdRow(r) ? fmtUsd(n) : fmtEgp(n));
const sumCur = (rows: any[], get: (r: any) => number, usd: boolean) =>
  rows.filter((r) => isUsdRow(r) === usd).reduce((a, r) => a + Number(get(r) || 0), 0);
/** USD value of a row's gross: Stripe settlement if known, else gross only when charged in USD. */
const grossUsd = (r: any): number => {
  if (r?.settled_usd != null && Number(r.settled_usd) > 0) return Number(r.settled_usd);
  return rowCurrency(r) === "USD" ? Number(r?.gross_amount ?? r?.amount ?? 0) : 0;
};
const grossOf = (r: any) => r.gross_amount;
const fmtGrossBoth = (rows: any[]) => `${fmtEgp(sumCur(rows, grossOf, false))} · ${fmtUsd(sumCur(rows, grossUsd, true))}`;
const fmtBoth = (rows: any[], get: (r: any) => number) =>
  `${fmtEgp(sumCur(rows, get, false))} · ${fmtUsd(sumCur(rows, get, true))}`;
/** Amount in the currency the buyer actually paid (gross_amount is stored in the charged currency). */
const rowCurrency = (r: any) => String(r?.currency || (isUsdRow(r) ? "USD" : "EGP")).toUpperCase();
const fmtOrig = (n: number, r: any) => {
  const cur = rowCurrency(r);
  const v = Number(n || 0);
  if (cur === "EGP") return fmtEgp(v);
  if (cur === "USD") return fmtUsd(v);
  const sym = CURRENCY_NAMES[cur as keyof typeof CURRENCY_NAMES]?.symAr || cur;
  return `${v.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${sym}`;
};
const currencyNameAr = (cur: string) =>
  CURRENCY_NAMES[cur as keyof typeof CURRENCY_NAMES]?.ar || cur;
/** Small secondary line: the USD value after Stripe settlement (only when the charged currency differs). */
const usdSettledNote = (r: any) => {
  const cur = rowCurrency(r);
  const settled = Number(r?.settled_usd || 0);
  if (cur === "EGP" || cur === "USD" || !(r?.gateway === "stripe") || settled <= 0) return null;
  // settled_usd equal to the charged amount means Stripe gave no real conversion
  // (test mode) — showing it as "after conversion" would be misleading.
  const charged = Number(r?.gross_amount ?? r?.amount ?? 0);
  if (Math.abs(settled - charged) < 0.011) return null;
  return `≈ ${fmtUsd(settled)} بعد التحويل`;
};
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from "recharts";

const adminNavGroups = [
  {
    label: "الرئيسية",
    groupIcon: Home,
    items: [
      { icon: LayoutDashboard, label: "نظرة عامة", key: "overview" },
      { icon: Users, label: "إدارة المنتور", key: "mentors" },
      { icon: GraduationCap, label: "إدارة الطلاب", key: "students" },
      { icon: Package, label: "إدارة الطلبات", key: "transactions" },
      { icon: Boxes, label: "إدارة المنتجات", key: "products" },
      { icon: Tag, label: "كوبونات المدربين", key: "coupons" },
    ],
  },
  {
    label: "المالية",
    groupIcon: CircleDollarSign,
    items: [
      { icon: CreditCard, label: "المعاملات المالية", key: "fin-transactions" },
      { icon: ShoppingBag, label: "الطلبات المؤكدة", key: "paid-orders" },
      { icon: Coins, label: "تحكم الأرصدة", key: "balances" },
      { icon: Banknote, label: "التسوية", key: "settlements" },
      { icon: ArrowLeftRight, label: "التحويلات", key: "transfers" },
      { icon: Wallet, label: "البيانات البنكية والسحب", key: "withdrawals" },
      { icon: Crown, label: "إدارة الاشتراكات", key: "subscriptions" },
    ],
  },
  {
    label: "المحتوى",
    groupIcon: Rocket,
    items: [
      { icon: Bell, label: "الإشعارات والتحديثات", key: "notifications" },
      { icon: Megaphone, label: "تحديثات المنصة", key: "platform-announcements" },
    ],
  },
  {
    label: "النظام",
    groupIcon: Layers,
    items: [
      { icon: BarChart3, label: "الأداء والمبيعات", key: "analytics" },
      { icon: Mail, label: "إشعارات الإيميل", key: "email-notifications" },
      { icon: Settings, label: "إعدادات النظام", key: "settings" },
      { icon: FileText, label: "السجلات", key: "logs" },
    ],
  },
  {
    label: "الحساب",
    groupIcon: UserCog,
    items: [{ icon: KeyRound, label: "تغيير كلمة المرور", key: "change-password" }],
  },
];

const adminNav = adminNavGroups.flatMap((g) => g.items);

interface Tenant {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  is_frozen: boolean;
  is_withdrawal_frozen: boolean;

  created_at: string;
  bio: string | null;
  whatsapp_number: string | null;
  profile_image_url: string | null;
  owner_id: string;
  first_name?: string | null;
  last_name?: string | null;
}

interface WithdrawalSetting {
  id: string;
  tenant_id: string;
  legal_name: string;
  iban: string;
  bank_name?: string;
  national_id_image_url: string | null;
  national_id_front_url?: string | null;
  national_id_back_url?: string | null;
  status: string;
  tenants?: { name: string; slug: string };
}

interface WithdrawalRequest {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  tenant_id: string;
  admin_note: string | null;
  tenants?: { name: string };
}

interface Order {
  id: string;
  gross_amount: number;
  platform_fee: number;
  gateway_fee: number;
  mentor_net: number;
  payment_status: string;
  created_at: string;
  kashier_order_id: string | null;
  tenants?: { name: string };
  students?: { full_name: string };
  courses?: { title: string };
  product_type?: "course" | "digital_product" | "live_course";
}

interface ActivityLog {
  id: string;
  action: string;
  actor_type: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

interface RefundRequest {
  id: string;
  order_id: string;
  student_id: string;
  tenant_id: string;
  amount: number;
  reason: string;
  status: string;
  admin_note: string | null;
  refunded_at: string | null;
  created_at: string;
  orders?: { gross_amount: number; kashier_order_id: string | null; courses?: { title: string } };
  students?: { full_name: string; email: string; phone: string | null };
  tenants?: { name: string };
}

// Resolves either a public URL or a mentor-documents storage path to a viewable URL.
const useMentorDocUrl = (pathOrUrl: string | null | undefined) => {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!pathOrUrl) {
      setUrl(null);
      return;
    }
    if (pathOrUrl.startsWith("http")) {
      setUrl(pathOrUrl);
      return;
    }
    supabase.storage
      .from("mentor-documents")
      .createSignedUrl(pathOrUrl, 3600)
      .then(({ data }) => {
        if (!cancelled) setUrl(data?.signedUrl || null);
      });
    return () => {
      cancelled = true;
    };
  }, [pathOrUrl]);
  return url;
};

const MentorDocImage = ({
  pathOrUrl,
  alt,
  className,
}: {
  pathOrUrl: string | null | undefined;
  alt: string;
  className?: string;
}) => {
  const url = useMentorDocUrl(pathOrUrl);
  if (!pathOrUrl) return null;
  if (!url) {
    return <div className={`${className} bg-muted animate-pulse`} />;
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      <img src={url} alt={alt} className={className} />
    </a>
  );
};

const MentorDocLink = ({ pathOrUrl, label }: { pathOrUrl: string | null | undefined; label: string }) => {
  const url = useMentorDocUrl(pathOrUrl);
  if (!pathOrUrl) return null;
  return (
    <a
      href={url || "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary hover:underline flex items-center gap-1 text-xs"
      onClick={(e) => {
        e.stopPropagation();
        if (!url) e.preventDefault();
      }}
    >
      <Eye className="w-3 h-3" /> {label}
    </a>
  );
};

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [ownerEmails, setOwnerEmails] = useState<Record<string, string>>({});
  const [withdrawalSettings, setWithdrawalSettings] = useState<WithdrawalSetting[]>([]);
  const [intlSettings, setIntlSettings] = useState<any[]>([]);
  const [wsKindFilter, setWsKindFilter] = useState("all_kinds");
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [selectedMentor, setSelectedMentor] = useState<Tenant | null>(null);
  const [mentorCourses, setMentorCourses] = useState<any[]>([]);
  const [mentorStudents, setMentorStudents] = useState<any[]>([]);
  const [mentorOrders, setMentorOrders] = useState<Order[]>([]);
  const [revenueRange, setRevenueRange] = useState<"7" | "30" | "90">("30");
  const [txSearch, setTxSearch] = useState("");
  const [mentorSearch, setMentorSearch] = useState("");
  const [mentorStatusFilter, setMentorStatusFilter] = useState("");
  const [mentorSort, setMentorSort] = useState("newest");
  const [txMentorFilter, setTxMentorFilter] = useState("");
  const [txStatusFilter, setTxStatusFilter] = useState("");
  const [rejectNote, setRejectNote] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [wsRejectNote, setWsRejectNote] = useState("");
  const [wsRejectingId, setWsRejectingId] = useState<string | null>(null);
  // Balance adjustment
  const [showBalanceAdjust, setShowBalanceAdjust] = useState(false);
  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceReason, setBalanceReason] = useState("");
  const [balanceAdjustments, setBalanceAdjustments] = useState<any[]>([]);
  // Withdrawal freeze
  const [mentorWithdrawalSettings, setMentorWithdrawalSettings] = useState<WithdrawalSetting | null>(null);
  // Withdrawal filters
  const [wsStatusFilter, setWsStatusFilter] = useState("");
  const [wsSearchFilter, setWsSearchFilter] = useState("");
  const [wrStatusFilter, setWrStatusFilter] = useState("");
  const [wrSearchFilter, setWrSearchFilter] = useState("");
  const [expandedBankId, setExpandedBankId] = useState<string | null>(null);
  // Analytics states
  const [analyticsPeriod, setAnalyticsPeriod] = useState<"7" | "30" | "90">("30");
  const [refreshing, setRefreshing] = useState(false);
  // Refund requests
  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([]);
  const [refundAdminNote, setRefundAdminNote] = useState("");
  const [refundRejectingId, setRefundRejectingId] = useState<string | null>(null);
  // Order detail
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  // Students & Reviews
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [allReviews, setAllReviews] = useState<any[]>([]);
  const [allBalanceAdjustments, setAllBalanceAdjustments] = useState<any[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentMentorFilter, setStudentMentorFilter] = useState("");
  const [reviewSearch, setReviewSearch] = useState("");
  const [reviewStatusFilter, setReviewStatusFilter] = useState("");
  const [balanceSearch, setBalanceSearch] = useState("");
  // Balance adjust from balances tab
  const [balTabTenantId, setBalTabTenantId] = useState("");
  const [balTabAmount, setBalTabAmount] = useState("");
  const [balTabReason, setBalTabReason] = useState("");
  // Settlements
  const [settlementSearch, setSettlementSearch] = useState("");
  const [settlementMentor, setSettlementMentor] = useState<any | null>(null);
  const [usdBalances, setUsdBalances] = useState<Record<string, number>>({});
  const loadUsdBalances = () =>
    supabase.rpc("admin_usd_balances" as any).then(({ data }: any) => {
      const m: Record<string, number> = {};
      (data || []).forEach((r: any) => { m[r.tenant_id] = Number(r.usd_balance) || 0; });
      setUsdBalances(m);
    });
  useEffect(() => { loadUsdBalances(); }, []);
  const [settlementConfirming, setSettlementConfirming] = useState(false);
  const [settlementIdFrontUrl, setSettlementIdFrontUrl] = useState<string | null>(null);
  const [settlementIdBackUrl, setSettlementIdBackUrl] = useState<string | null>(null);
  // Notifications
  const [allNotifications, setAllNotifications] = useState<any[]>([]);
  const [notifSearch, setNotifSearch] = useState("");
  const [notifMentorFilter, setNotifMentorFilter] = useState("");
  // Financial transactions
  const [poSearch, setPoSearch] = useState("");
  const [poFrom, setPoFrom] = useState("");
  const [poTo, setPoTo] = useState("");
  const [poSort, setPoSort] = useState("count");
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [finTxSearch, setFinTxSearch] = useState("");
  const [finTxCategoryFilter, setFinTxCategoryFilter] = useState("");
  const [finTxMentorFilter, setFinTxMentorFilter] = useState("");
  const [finTxDirection, setFinTxDirection] = useState("");
  const [finTxFrom, setFinTxFrom] = useState("");
  const [finTxTo, setFinTxTo] = useState("");
  const [finTxSort, setFinTxSort] = useState("newest");
  const { user, loading: authLoading, signOut } = useAuth();
  const { toast } = useToast();
  const { i18n } = useTranslation();
  const alignRight = i18n.dir() === "rtl" ? "text-start" : "text-start";
  const navigate = useNavigate();

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [deviceVerified, setDeviceVerified] = useState<boolean | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);
  const flyoutCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openFlyout = useCallback((label: string) => {
    if (flyoutCloseTimer.current) clearTimeout(flyoutCloseTimer.current);
    setHoveredGroup(label);
  }, []);

  const closeFlyoutSoon = useCallback(() => {
    flyoutCloseTimer.current = setTimeout(() => setHoveredGroup(null), 120);
  }, []);

  const activeGroupLabel = adminNavGroups.find((g) => g.items.some((item) => item.key === activeTab))?.label ?? null;

  useEffect(() => {
    // Wait for auth to finish initializing before deciding
    if (authLoading) return;

    const info = getSubdomainInfo();
    const loginPath = info.context === "admin" ? "/login" : "/admin-login";

    if (!user) {
      navigate(loginPath, { replace: true });
      return;
    }

    let cancelled = false;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(async ({ data }) => {
        if (cancelled) return;
        if (!data) {
          // Do not reveal that an admin area exists here.
          setIsAdmin(false);
          setDeviceVerified(false);
          return;
        }
        setIsAdmin(true);
        // Second factor must have been completed on this device.
        const verified = await isDeviceVerified();
        if (cancelled) return;
        setDeviceVerified(verified);
        if (!verified) {
          navigate(loginPath, { replace: true });
          return;
        }
        loadData();
      });

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);


  const loadData = async () => {
    const [
      tenantsRes,
      wsRes,
      withdrawalsRes,
      ordersRes,
      dpPurchasesRes,
      liveCoursePurchasesRes,
      logsRes,
      refundsRes,
      studentsRes,
      reviewsRes,
      balAdjRes,
      notifsRes,
      txRes,
    ] = await Promise.all([
      supabase.from("tenants").select("*").order("created_at", { ascending: false }),
      supabase.from("withdrawal_settings").select("*, tenants(name, slug)").order("created_at", { ascending: false }),
      supabase.from("withdrawal_requests").select("*, tenants(name)").order("created_at", { ascending: false }),
      supabase
        .from("orders")
        .select("*, tenants(name), students(full_name, email, phone), courses!orders_course_id_fkey(title)")
        .order("created_at", { ascending: false }),
      supabase
        .from("digital_product_purchases")
        .select(
          "*, tenants(name), students(full_name, email, phone), digital_products!digital_product_purchases_digital_product_id_fkey(title)",
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("live_course_purchases")
        .select(
          "*, tenants(name), students(full_name, email, phone), live_courses!live_course_purchases_live_course_id_fkey(title)",
        )
        .order("created_at", { ascending: false }),
      supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(100),
      supabase
        .from("refund_requests")
        .select(
          "*, orders(gross_amount, kashier_order_id, courses!orders_course_id_fkey(title)), students(full_name, email, phone), tenants(name)",
        )
        .order("created_at", { ascending: false }),
      supabase.from("students").select("*, tenants(name)").order("created_at", { ascending: false }),
      supabase.from("reviews").select("*, tenants(name), courses(title)").order("created_at", { ascending: false }),
      supabase.from("balance_adjustments").select("*, tenants(name)").order("created_at", { ascending: false }),
      supabase.from("notifications").select("*, tenants(name)").order("created_at", { ascending: false }),
      supabase.from("transactions").select("*, tenants(name)").order("created_at", { ascending: false }),
    ]);

    // Merge orders + digital product purchases + live course purchases into a single feed
    const courseOrders = ((ordersRes.data || []) as any[]).map((o) => ({
      ...o,
      product_type: "course" as const,
    }));
    const dpOrders = ((dpPurchasesRes.data || []) as any[]).map((p) => ({
      id: p.id,
      tenant_id: p.tenant_id,
      gross_amount: p.gross_amount,
      platform_fee: p.platform_fee,
      gateway_fee: p.gateway_fee,
      mentor_net: p.mentor_net,
      currency: p.currency,
      settled_usd: p.settled_usd,
      gateway: p.gateway,
      payment_status: p.payment_status === "completed" ? "paid" : p.payment_status,
      created_at: p.created_at,
      kashier_order_id: p.kashier_order_id,
      tenants: p.tenants,
      students: p.students,
      courses: p.digital_products ? { title: `[منتج رقمي] ${p.digital_products.title}` } : undefined,
      product_type: "digital_product" as const,
    }));
    const liveOrders = ((liveCoursePurchasesRes.data || []) as any[]).map((p) => ({
      id: p.id,
      tenant_id: p.tenant_id,
      gross_amount: p.gross_amount,
      platform_fee: p.platform_fee,
      gateway_fee: p.gateway_fee,
      mentor_net: p.mentor_net,
      currency: p.currency,
      settled_usd: p.settled_usd,
      gateway: p.gateway,
      payment_status: p.payment_status === "completed" ? "paid" : p.payment_status,
      created_at: p.created_at,
      kashier_order_id: p.kashier_order_id,
      tenants: p.tenants,
      students: p.students,
      courses: p.live_courses ? { title: `[كورس مباشر] ${p.live_courses.title}` } : undefined,
      product_type: "live_course" as const,
    }));
    const merged = [...courseOrders, ...dpOrders, ...liveOrders].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    supabase
      .from("international_withdrawal_settings")
      .select("*, tenants(name, slug)")
      .order("created_at", { ascending: false })
      .then(({ data }) =>
        setIntlSettings(
          (data || []).map((r: any) => ({
            ...r,
            kind: "international",
            national_id_front_url: r.id_front_url,
            national_id_back_url: r.id_back_url,
            national_id_image_url: null,
          })),
        ),
      );
    if (tenantsRes.data) setTenants(tenantsRes.data as any);
    supabase.rpc("admin_tenant_owner_emails").then(({ data }) => {
      if (!data) return;
      const map: Record<string, string> = {};
      (data as any[]).forEach((r) => {
        if (r.tenant_id && r.email) map[r.tenant_id] = r.email;
      });
      setOwnerEmails(map);
    });
    if (wsRes.data) setWithdrawalSettings(wsRes.data as any);
    if (withdrawalsRes.data) setWithdrawals(withdrawalsRes.data as any);
    setOrders(merged as any);
    if (logsRes.data) setLogs(logsRes.data as any);
    if (refundsRes.data) setRefundRequests(refundsRes.data as any);
    if (studentsRes.data) setAllStudents(studentsRes.data as any);
    if (reviewsRes.data) setAllReviews(reviewsRes.data as any);
    if (balAdjRes.data) setAllBalanceAdjustments(balAdjRes.data as any);
    if (notifsRes.data) setAllNotifications(notifsRes.data as any);
    if (txRes.data) setAllTransactions(txRes.data as any);
  };

  const logAction = async (
    action: string,
    targetType?: string,
    targetId?: string,
    details?: Record<string, unknown>,
  ) => {
    if (!user) return;
    await supabase.from("activity_logs").insert([
      {
        action,
        actor_id: user.id,
        actor_type: "admin",
        target_type: targetType || null,
        target_id: targetId || null,
        details: (details || null) as any,
      },
    ]);
  };

  const toggleTenant = async (tenant: Tenant) => {
    await supabase.from("tenants").update({ is_active: !tenant.is_active }).eq("id", tenant.id);
    setTenants(tenants.map((t) => (t.id === tenant.id ? { ...t, is_active: !t.is_active } : t)));
    if (selectedMentor?.id === tenant.id) setSelectedMentor({ ...selectedMentor, is_active: !tenant.is_active });
    const action = tenant.is_active ? "تعليق مدرب" : "تفعيل مدرب";
    await logAction(action, "tenant", tenant.id, { name: tenant.name });
    toast({ title: tenant.is_active ? "تم إيقاف المدرب" : "تم تفعيل المدرب" });
    loadData();
  };

  const toggleFreeze = async (tenant: Tenant) => {
    const newFrozen = !tenant.is_frozen;
    await supabase
      .from("tenants")
      .update({ is_frozen: newFrozen } as any)
      .eq("id", tenant.id);
    setTenants(tenants.map((t) => (t.id === tenant.id ? { ...t, is_frozen: newFrozen } : t)));
    if (selectedMentor?.id === tenant.id) setSelectedMentor({ ...selectedMentor, is_frozen: newFrozen });
    await logAction(newFrozen ? "تجميد مدرب" : "إلغاء تجميد مدرب", "tenant", tenant.id, { name: tenant.name });
    toast({ title: newFrozen ? "تم تجميد المدرب" : "تم إلغاء التجميد" });
    loadData();
  };

  const openMentorDetail = async (tenant: Tenant) => {
    setSelectedMentor(tenant);
    setShowBalanceAdjust(false);
    setBalanceAmount("");
    setBalanceReason("");
    const [coursesRes, studentsRes, ordersRes, dpRes, liveRes, adjustmentsRes, wsRes] = await Promise.all([
      supabase.from("courses").select("*").eq("tenant_id", tenant.id),
      supabase.from("students").select("*").eq("tenant_id", tenant.id),
      supabase
        .from("orders")
        .select("*, students(full_name), courses!orders_course_id_fkey(title)")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("digital_product_purchases")
        .select("*, students(full_name), digital_products!digital_product_purchases_digital_product_id_fkey(title)")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("live_course_purchases")
        .select("*, students(full_name), live_courses!live_course_purchases_live_course_id_fkey(title)")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("balance_adjustments")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false }),
      supabase.from("withdrawal_settings").select("*").eq("tenant_id", tenant.id).maybeSingle(),
    ]);
    const mCourseOrders = ((ordersRes.data || []) as any[]).map((o) => ({ ...o, product_type: "course" }));
    const mDpOrders = ((dpRes.data || []) as any[]).map((p) => ({
      ...p,
      courses: p.digital_products ? { title: `[منتج رقمي] ${p.digital_products.title}` } : undefined,
      product_type: "digital_product",
    }));
    const mLiveOrders = ((liveRes.data || []) as any[]).map((p) => ({
      ...p,
      courses: p.live_courses ? { title: `[كورس مباشر] ${p.live_courses.title}` } : undefined,
      product_type: "live_course",
    }));
    setMentorCourses(coursesRes.data || []);
    setMentorStudents(studentsRes.data || []);
    setMentorOrders(
      [...mCourseOrders, ...mDpOrders, ...mLiveOrders].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ) as any,
    );
    setBalanceAdjustments(adjustmentsRes.data || []);
    setMentorWithdrawalSettings(wsRes.data as any);
  };

  const impersonateMentor = async (tenant: Tenant) => {
    await logAction("انتحال صلاحيات مدرب", "tenant", tenant.id, { name: tenant.name });
    // On admin.ebdaey.com the admin app is mounted at the host root, so the
    // impersonation route has no "/admin" prefix there.
    const prefix = getSubdomainInfo().context === "admin" ? "" : "/admin";
    navigate(`${prefix}/impersonate/${tenant.id}`);
  };

  const [magicLinkLoading, setMagicLinkLoading] = useState(false);
  const createMentorMagicLink = async (tenant: Tenant) => {
    setMagicLinkLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-mentor-magic-link", {
        body: { tenant_id: tenant.id },
      });
      if (error || !data?.link) throw new Error(error?.message || data?.error || "فشل إنشاء الرابط");
      await navigator.clipboard.writeText(data.link).catch(() => {});
      window.prompt("رابط دخول فوري (صالح لمرة واحدة ولمدة ساعة):", data.link);
      toast({ title: "تم إنشاء رابط الدخول", description: "تم نسخ الرابط. صالح لمرة واحدة ولمدة ساعة." });
    } catch (e) {
      toast({
        title: "تعذر إنشاء الرابط",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setMagicLinkLoading(false);
    }
  };

  const adjustBalance = async () => {
    if (!selectedMentor || !user || !balanceAmount || !balanceReason) return;
    const amount = parseFloat(balanceAmount);
    if (isNaN(amount) || amount === 0) return;

    await supabase.from("balance_adjustments").insert([
      {
        tenant_id: selectedMentor.id,
        amount,
        reason: balanceReason,
        admin_id: user.id,
      },
    ]);

    await logAction("تعديل رصيد", "tenant", selectedMentor.id, {
      name: selectedMentor.name,
      amount,
      reason: balanceReason,
    });

    toast({ title: `تم ${amount > 0 ? "إضافة" : "خصم"} ${Math.abs(amount)} ج.م` });
    setShowBalanceAdjust(false);
    setBalanceAmount("");
    setBalanceReason("");
    // Reload adjustments
    const { data } = await supabase
      .from("balance_adjustments")
      .select("*")
      .eq("tenant_id", selectedMentor.id)
      .order("created_at", { ascending: false });
    setBalanceAdjustments(data || []);
    loadData();
  };

  const toggleWithdrawalFreeze = async (tenant: Tenant) => {
    const currentFrozen = (tenant as any).is_withdrawal_frozen || false;
    const newFrozen = !currentFrozen;
    await supabase
      .from("tenants")
      .update({ is_withdrawal_frozen: newFrozen } as any)
      .eq("id", tenant.id);
    setTenants(tenants.map((t) => (t.id === tenant.id ? ({ ...t, is_withdrawal_frozen: newFrozen } as any) : t)));
    if (selectedMentor?.id === tenant.id)
      setSelectedMentor({ ...selectedMentor, is_withdrawal_frozen: newFrozen } as any);
    await logAction(newFrozen ? "تجميد سحب مدرب" : "إلغاء تجميد سحب", "tenant", tenant.id, { name: tenant.name });
    toast({ title: newFrozen ? "تم تجميد السحب" : "تم إلغاء تجميد السحب" });
  };

  const updateWithdrawal = async (id: string, status: string, note?: string) => {
    await supabase
      .from("withdrawal_requests")
      .update({ status, admin_note: note || null })
      .eq("id", id);
    setWithdrawals(withdrawals.map((w) => (w.id === id ? { ...w, status, admin_note: note || null } : w)));
    const statusAr =
      status === "approved" ? "موافقة على طلب سحب" : status === "rejected" ? "رفض طلب سحب" : "تم التحويل";
    await logAction(statusAr, "withdrawal", id);
    toast({ title: statusAr });
    setRejectingId(null);
    setRejectNote("");
  };

  const updateWithdrawalSetting = async (id: string, status: string, kind: string = "egypt") => {
    const updatePayload: any = { status };
    if (status === "rejected" && wsRejectNote) updatePayload.rejection_reason = wsRejectNote;
    if (status === "approved") updatePayload.rejection_reason = null;
    if (kind === "international") {
      await supabase.from("international_withdrawal_settings").update(updatePayload).eq("id", id);
      setIntlSettings(intlSettings.map((ws) => (ws.id === id ? { ...ws, status } : ws)));
    } else {
      await supabase.from("withdrawal_settings").update(updatePayload).eq("id", id);
      setWithdrawalSettings(withdrawalSettings.map((ws) => (ws.id === id ? { ...ws, status } : ws)));
    }
    await logAction(status === "approved" ? "موافقة على إعدادات سحب" : "رفض إعدادات سحب", "withdrawal_settings", id);
    toast({ title: status === "approved" ? "تمت الموافقة على إعدادات السحب" : "تم رفض إعدادات السحب" });
    setWsRejectingId(null);
    setWsRejectNote("");
  };

  const handleSignOut = async () => {
    clearDeviceToken();
    await signOut();
    navigate("/");
  };

  // Manual gateway reconciliation for a single pending payment.
  const [checkingPaymentId, setCheckingPaymentId] = useState<string | null>(null);
  const checkPaymentWithGateway = async (o: Order) => {
    const kind = o.product_type === "digital_product"
      ? "dp"
      : o.product_type === "live_course"
        ? "lc"
        : "order";
    setCheckingPaymentId(o.id);
    try {
      const { data, error } = await supabase.functions.invoke("reconcile-paymob-payments", {
        body: { kind, id: o.id },
      });
      if (error) throw error;
      const r = (data as any)?.result;
      const gateway = r?.gateway as string | undefined;
      const labels: Record<string, string> = {
        paid: "البوابة تؤكد نجاح الدفع",
        failed: "البوابة تؤكد فشل الدفع",
        pending_at_gateway: "الدفع ما زال قيد التنفيذ في البوابة",
        no_transaction: "لا توجد أي محاولة دفع لهذا الطلب في البوابة",
        not_found: "لم يتم العثور على الطلب في البوابة",
      };
      toast({
        title: labels[gateway || ""] || "تم الاستعلام من البوابة",
        description: [
          r?.txnId ? `رقم المعاملة: ${r.txnId}` : null,
          r?.amount ? `المبلغ: ${r.amount} ج.م` : null,
          r?.action === "completed" ? "تم تأكيد الطلب وتسليم المنتج للطالب." : null,
        ].filter(Boolean).join(" • ") || undefined,
      });
      if (r?.action === "completed") loadData();
    } catch (e) {
      toast({
        title: "تعذر الاستعلام من بوابة الدفع",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setCheckingPaymentId(null);
    }
  };

  // Computed values
  const paidOrders = useMemo(() => orders.filter((o) => o.payment_status === "paid"), [orders]);

  const totalGross = paidOrders.reduce((a, o) => a + o.gross_amount, 0);
  const totalPlatformFees = paidOrders.reduce((a, o) => a + o.platform_fee, 0);
  const totalGatewayFees = paidOrders.reduce((a, o) => a + o.gateway_fee, 0);
  const totalMentorNet = paidOrders.reduce((a, o) => a + o.mentor_net, 0);
  const pendingWithdrawalAmount = withdrawals.filter((w) => w.status === "pending").reduce((a, w) => a + w.amount, 0);
  const activeMentors = tenants.filter((t) => t.is_active).length;
  const totalCourses = mentorCourses.length; // We'll compute globally below

  const personName = (t: Tenant | null) => [t?.first_name, t?.last_name].filter(Boolean).join(" ").trim();
  const ownerEmail = (t: Tenant | null) => (t ? ownerEmails[t.id] || (t as any).email || "" : "");

  const filteredMentors = useMemo(() => {
    const q = mentorSearch.trim().toLowerCase();
    const list = tenants.filter((t) => {
      if (mentorStatusFilter === "active" && !t.is_active) return false;
      if (mentorStatusFilter === "suspended" && t.is_active) return false;
      if (mentorStatusFilter === "frozen" && !t.is_frozen) return false;
      if (q) {
        return (
          (t.name || "").toLowerCase().includes(q) ||
          (t.slug || "").toLowerCase().includes(q) ||
          personName(t).toLowerCase().includes(q) ||
          ownerEmail(t).toLowerCase().includes(q)
        );
      }
      return true;
    });
    const net = (t: any) =>
      orders
        .filter((o) => o.payment_status === "paid" && (o as any).tenant_id === t.id)
        .reduce((a, o) => a + o.mentor_net, 0);
    const count = (t: any) => orders.filter((o) => (o as any).tenant_id === t.id).length;
    const sorted = [...list];
    if (mentorSort === "newest") sorted.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    if (mentorSort === "oldest") sorted.sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
    if (mentorSort === "name") sorted.sort((a, b) => (a.name || "").localeCompare(b.name || "", "ar"));
    if (mentorSort === "net") sorted.sort((a, b) => net(b) - net(a));
    if (mentorSort === "orders") sorted.sort((a, b) => count(b) - count(a));
    return sorted;
  }, [tenants, orders, ownerEmails, mentorSearch, mentorStatusFilter, mentorSort]);

  // Revenue chart data
  const revenueChartData = useMemo(() => {
    const days = Number(revenueRange);
    const now = new Date();
    const data: { date: string; revenue: number; commission: number; revenueUsd: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      const dayOrders = paidOrders.filter((o) => o.created_at.startsWith(key));
      data.push({
        date: d.toLocaleDateString("ar-EG", { day: "numeric", month: "short" }),
        revenue: sumCur(dayOrders, (o) => o.gross_amount, false),
        commission: sumCur(dayOrders, (o) => o.platform_fee, false),
        revenueUsd: sumCur(dayOrders, grossUsd, true),
      });
    }
    return data;
  }, [paidOrders, revenueRange]);

  // Filtered transactions
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (txMentorFilter && !(o as any).tenants?.name?.includes(txMentorFilter)) return false;
      if (txStatusFilter && o.payment_status !== txStatusFilter) return false;
      if (txSearch) {
        const search = txSearch.toLowerCase();
        return (
          (o as any).tenants?.name?.toLowerCase().includes(search) ||
          (o as any).students?.full_name?.toLowerCase().includes(search) ||
          (o as any).courses?.title?.toLowerCase().includes(search) ||
          o.kashier_order_id?.toLowerCase().includes(search)
        );
      }
      return true;
    });
  }, [orders, txSearch, txMentorFilter, txStatusFilter]);

  // Alerts
  const alerts = useMemo(() => {
    const items: {
      text: string;
      type: "warning" | "danger";
      action?: { label: string; onClick: () => void };
    }[] = [];
    const unapprovedWS = [...withdrawalSettings, ...intlSettings].filter((ws) => ws.status === "pending");
    if (unapprovedWS.length > 0)
      items.push({
        text: `${unapprovedWS.length} مدرب بإعدادات سحب غير مُعتمدة`,
        type: "warning",
        action: {
          label: "عرض القائمة",
          onClick: () => {
            setWsStatusFilter("pending");
            setActiveTab("withdrawals");
            if (unapprovedWS.length === 1) setExpandedBankId(unapprovedWS[0].id);
          },
        },
      });
    const largeWithdrawals = withdrawals.filter((w) => w.status === "pending" && w.amount > 5000);
    if (largeWithdrawals.length > 0)
      items.push({
        text: `${largeWithdrawals.length} طلب سحب كبير (> 5,000 ج.م)`,
        type: "danger",
        action: { label: "عرض الطلبات", onClick: () => setActiveTab("withdrawals") },
      });
    const frozenMentors = tenants.filter((t) => t.is_frozen);
    if (frozenMentors.length > 0)
      items.push({
        text: `${frozenMentors.length} مدرب مجمد`,
        type: "warning",
        action: { label: "عرض المدربين", onClick: () => setActiveTab("mentors") },
      });
    const suspendedMentors = tenants.filter((t) => !t.is_active);
    if (suspendedMentors.length > 0)
      items.push({
        text: `${suspendedMentors.length} مدرب موقوف`,
        type: "danger",
        action: { label: "عرض المدربين", onClick: () => setActiveTab("mentors") },
      });
    return items;
  }, [withdrawalSettings, intlSettings, withdrawals, tenants]);

  const mentorDetailOrders = mentorOrders.filter((o) => o.payment_status === "paid");
  const mentorGross = mentorDetailOrders.reduce((a, o) => a + o.gross_amount, 0);
  const mentorNet = mentorDetailOrders.reduce((a, o) => a + o.mentor_net, 0);

  const refreshData = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    toast({ title: "تم تحديث البيانات" });
  };

  const exportData = async (type: string) => {
    // Implementation for data export
    toast({ title: `جاري تصدير ${type}...` });
  };

  // Analytics data
  const mentorStatsData = useMemo(() => {
    return tenants
      .map((t) => {
        const tOrders = orders.filter((o) => o.payment_status === "paid" && (o as any).tenants?.name === t.name);
        return {
          name: t.name,
          revenue: sumCur(tOrders, (o) => o.mentor_net, false),
          revenueUsd: sumCur(tOrders, (o) => o.mentor_net, true),
          orders: tOrders.length,
          status: t.is_active ? "نشط" : "موقوف",
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [tenants, orders]);

  const paymentStatusData = useMemo(() => {
    const paid = orders.filter((o) => o.payment_status === "paid").length;
    const pending = orders.filter((o) => o.payment_status === "pending").length;
    return [
      { name: "مكتمل", value: paid, color: "#10b981" },
      { name: "معلق", value: pending, color: "#f59e0b" },
    ];
  }, [orders]);

  const monthlyGrowthData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }).map((_, i) => {
      const month = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const monthName = month.toLocaleDateString("ar-EG", { month: "long" });
      const monthOrders = paidOrders.filter((o) => {
        const d = new Date(o.created_at);
        return d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear();
      });
      const newMentors = tenants.filter((t) => {
        const d = new Date(t.created_at);
        return d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear();
      }).length;
      return {
        month: monthName,
        revenue: sumCur(monthOrders, (o) => o.gross_amount, false),
        revenueUsd: sumCur(monthOrders, grossUsd, true),
        orders: monthOrders.length,
        mentors: newMentors,
      };
    });
  }, [paidOrders, tenants]);

  // Signed in but not an admin → behave as if this page does not exist.
  if (!authLoading && user && isAdmin === false) {
    return <NotFound />;
  }

  // CRITICAL: never render the admin shell until role AND second factor are confirmed.
  if (authLoading || !user || isAdmin !== true || deviceVerified !== true) {
    return <TopLoadingBar coverPage />;
  }

  return (
    <div className="min-h-screen flex dashboard-bg">
      {/* ─── Mobile overlay ─── */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileSidebarOpen(false)} />
      )}

      {/* ─── Mobile Sidebar ─── */}
      <aside
        className={`fixed inset-y-0 right-0 overflow-y-auto z-50 w-64 glass-sidebar shadow-xl transform transition-transform duration-300 ease-in-out lg:hidden ${
          mobileSidebarOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-5 border-b border-sidebar-border flex items-center justify-between">
          <div className="flex flex-col items-start gap-0.5">
            <Link to="/" className="flex items-center">
              <img src={mentorDashboardLogo} alt="إبداعي" className="h-8 dark:invert" />
            </Link>
            <span className="text-xs font-medium text-foreground">لوحة تحكم المنصة</span>
          </div>
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-2">
          {adminNavGroups.map((group) => (
            <div key={group.label}>
              <p className="sidebar-group-label">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => {
                      setActiveTab(item.key);
                      setSelectedMentor(null);
                      setMobileSidebarOpen(false);
                    }}
                    className={`sidebar-nav-item w-full ${
                      activeTab === item.key ? "sidebar-nav-item-active" : "sidebar-nav-item-inactive"
                    }`}
                  >
                    <item.icon className="w-[18px] h-[18px] sidebar-icon" />
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="p-2 space-y-0.5 border-t border-border/30 mx-3 mb-2">
          <button
            onClick={() => {
              handleSignOut();
              setMobileSidebarOpen(false);
            }}
            className="sidebar-nav-item text-destructive/80 hover:bg-destructive/5 hover:text-destructive"
          >
            <LogOut className="w-[18px] h-[18px] sidebar-icon" />
            تسجيل خروج
          </button>
        </div>
      </aside>

      {/* ─── Mobile top bar ─── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 glass-strong border-b border-border/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <Link to="/">
            <img src={mentorDashboardLogo} alt="إبداعي" className="h-8 dark:invert" />
          </Link>
          <div className="flex gap-2 items-center">
            <Button size="sm" variant="outline" onClick={refreshData} disabled={refreshing}>
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Desktop Sidebar: expanded ─── */}
      <aside className="hidden lg:flex sticky top-0 h-screen shrink-0 z-40 w-56 flex-col bg-white dark:bg-[#181c25f2] border-l border-border/40 order-first">
        <div className="px-6 py-5 border-b border-sidebar-border flex flex-col items-center justify-center gap-2 text-center">
          <Link to="/" className="flex items-center">
            <img src={mentorDashboardLogo} alt="إبداعي" className="h-8 w-auto object-contain dark:invert" />
          </Link>
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-sm font-semibold text-foreground whitespace-nowrap">لوحة تحكم المنصة</span>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">إليك ملخص أداء منصة إبداعي</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3">
          {adminNavGroups.map((group) => (
            <div key={group.label}>
              <p className="sidebar-group-label">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => {
                      setActiveTab(item.key);
                      setSelectedMentor(null);
                    }}
                    className={`sidebar-nav-item w-full ${
                      activeTab === item.key ? "sidebar-nav-item-active" : "sidebar-nav-item-inactive"
                    }`}
                  >
                    <item.icon className="w-[18px] h-[18px] sidebar-icon" />
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="p-2 space-y-0.5 border-t border-border/30 mx-3 mb-2">
          <button
            onClick={handleSignOut}
            className="sidebar-nav-item text-destructive/80 hover:bg-destructive/5 hover:text-destructive w-full"
          >
            <LogOut className="w-[18px] h-[18px] sidebar-icon" />
            تسجيل خروج
          </button>
        </div>
      </aside>

      {/* ─── Main Content ─── */}
      <main className="flex-1 overflow-auto lg:pt-0 pt-16">
        <div className="p-4 lg:p-6 max-w-7xl mx-auto">
          {/* Header with Actions */}
          {/* <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
            <div>
              <h1 className="text-xl font-bold text-foreground mb-1">
                {adminNav.find(item => item.key === activeTab)?.label || "لوحة التحكم"}
              </h1>
              <p className="text-xs text-muted-foreground">
                إدارة وإشراف على منصة إبداعي
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={refreshData} disabled={refreshing}>
                <RefreshCw className={`w-3.5 h-3.5 ml-1.5 ${refreshing ? 'animate-spin' : ''}`} />
                تحديث
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportData(activeTab)}>
                <Download className="w-3.5 h-3.5 ml-1.5" />
                تصدير
              </Button>
            </div>
          </div> */}

          {/* ===== OVERVIEW ===== */}
          {activeTab === "overview" &&
            (() => {
              const todayOrders = orders.filter(
                (o) => new Date(o.created_at).toDateString() === new Date().toDateString(),
              );
              const latestPaidOrders = orders.filter((o) => o.payment_status === "paid").slice(0, 6);
              const topMentors = tenants
                .map((t) => {
                  const tPaid = orders.filter(
                    (o) => o.payment_status === "paid" && (o as any).tenants?.name === t.name,
                  );
                  return { name: t.name, revenue: sumCur(tPaid, (o) => o.gross_amount, false), revenueUsd: sumCur(tPaid, grossUsd, true), count: tPaid.length };
                })
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 5);
              const topMax = topMentors[0]?.revenue || 1;

              const statCards = [
                {
                  icon: DollarSign,
                  label: "إجمالي الإيرادات",
                  value: fmtGrossBoth(paidOrders),
                  iconBg: "bg-emerald-500/10",
                  iconColor: "text-emerald-600",
                  sub: `${paidOrders.length} طلب مكتمل`,
                },
                {
                  icon: TrendingUp,
                  label: "عمولة المنصة",
                  value: fmtBoth(paidOrders, (o) => o.platform_fee),
                  iconBg: "bg-blue-500/10",
                  iconColor: "text-blue-600",
                  sub: `8.0% من الإيرادات`,
                },
                {
                  icon: Users,
                  label: "المدربون النشطون",
                  value: `${activeMentors}`,
                  iconBg: "bg-violet-500/10",
                  iconColor: "text-violet-600",
                  sub: `من ${tenants.length} إجمالي`,
                },
                {
                  icon: Wallet,
                  label: "سحب معلق",
                  value: fmtBoth(withdrawals.filter((w) => w.status === "pending"), (w) => w.amount),
                  iconBg: "bg-amber-500/10",
                  iconColor: "text-amber-600",
                  sub: `${orders.filter((o) => o.payment_status === "pending").length} طلب معلق`,
                },
              ];

              return (
                <>
                  {/* Header greeting */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                    <div className="text-start">
                      <h1 className="text-2xl sm:text-3xl font-extrabold flex items-center gap-2">
                        <Shield className="w-7 h-7 text-primary" />
                        لوحة تحكم المنصة
                      </h1>
                      <p className="text-muted-foreground text-sm mt-1">إليك ملخص أداء منصة إبداعي</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={refreshData} disabled={refreshing}>
                        <RefreshCw className={`w-3.5 h-3.5 ml-1.5 ${refreshing ? "animate-spin" : ""}`} />
                        تحديث
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => exportData("overview")}>
                        <Download className="w-3.5 h-3.5 ml-1.5" />
                        تصدير
                      </Button>
                    </div>
                  </div>

                  {/* Stat Cards — mentor style */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                    {statCards.map((s, i) => (
                      <div
                        key={i}
                        className="glass-card rounded-xl p-3 text-start relative overflow-hidden group hover:shadow-lg transition-all"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-[11px] text-muted-foreground font-medium">{s.label}</p>
                          <div className={`w-8 h-8 rounded-lg ${s.iconBg} flex items-center justify-center shrink-0`}>
                            <s.icon className={`w-4 h-4 ${s.iconColor}`} />
                          </div>
                        </div>
                        <p className="text-lg sm:text-xl font-extrabold leading-tight truncate">{s.value}</p>
                        <p className="mt-1 text-[10px] text-muted-foreground">{s.sub}</p>
                      </div>
                    ))}
                  </div>

                  {/* System alerts — compact */}
                  {alerts.length > 0 && (
                    <div className="mb-6 space-y-2">
                      {alerts.map((a, i) => (
                        <div
                          key={i}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm border ${
                            a.type === "danger"
                              ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800"
                              : "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                          }`}
                        >
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span className="flex-1 font-medium">{a.text}</span>
                          {a.action && (
                            <button
                              onClick={a.action.onClick}
                              className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                                a.type === "danger"
                                  ? "border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-200 dark:hover:bg-red-900/40"
                                  : "border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900/40"
                              }`}
                            >
                              {a.action.label}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Revenue Area Chart */}
                  <div className="glass-card rounded-2xl p-5 mb-6">
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                      <h3 className="font-bold text-start">الإيرادات والعمولات</h3>
                      <div className="flex items-center gap-3 text-[11px]">
                        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          الإيرادات
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(var(--primary))" }} />
                          العمولة
                        </span>
                        <div className="flex gap-1">
                          {(["7", "30", "90"] as const).map((r) => (
                            <button
                              key={r}
                              onClick={() => setRevenueRange(r)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                                revenueRange === r
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-muted-foreground hover:bg-muted/80"
                              }`}
                            >
                              {r}د
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="h-64" dir="ltr">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={revenueChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="adminRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(152 60% 50%)" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="hsl(152 60% 50%)" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="adminCommissionGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 10 }}
                            stroke="hsl(var(--muted-foreground))"
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fontSize: 10 }}
                            stroke="hsl(var(--muted-foreground))"
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip
                            contentStyle={{
                              background: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "10px",
                              fontSize: "12px",
                              boxShadow: "0 8px 24px hsl(var(--foreground) / 0.08)",
                            }}
                            formatter={(value: number, name: string) => [String(name).includes("USD") ? fmtUsd(value) : fmtEgp(value), name]}
                          />
                          <Area
                            type="monotone"
                            dataKey="revenue"
                            name="الإيرادات"
                            stroke="hsl(152 60% 50%)"
                            strokeWidth={2}
                            fill="url(#adminRevenueGrad)"
                          />
                          <Area
                            type="monotone"
                            dataKey="commission"
                            name="العمولة"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            fill="url(#adminCommissionGrad)"
                          />
                          <Area
                            type="monotone"
                            dataKey="revenueUsd"
                            name="الإيرادات (USD)"
                            stroke="hsl(217 91% 60%)"
                            strokeWidth={2}
                            fillOpacity={0}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Latest orders + Top mentors */}
                  <div className="grid lg:grid-cols-2 gap-4 mb-6">
                    {/* Latest paid orders */}
                    <div className="glass-card rounded-2xl p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-start">آخر الطلبات المكتملة</h3>
                        <button
                          onClick={() => setActiveTab("transactions")}
                          className="text-xs text-primary hover:underline font-medium"
                        >
                          عرض الكل
                        </button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-muted-foreground text-[11px] border-b border-border/40">
                              <th className="text-start py-2 font-medium">المنتور</th>
                              <th className="text-start py-2 font-medium">العميل</th>
                              <th className="text-start py-2 font-medium">المبلغ</th>
                              <th className="text-start py-2 font-medium">التاريخ</th>
                            </tr>
                          </thead>
                          <tbody>
                            {latestPaidOrders.map((order) => (
                              <tr
                                key={order.id}
                                className="border-b border-border/20 last:border-0 hover:bg-muted/30 transition-colors"
                              >
                                <td className="py-3 text-xs truncate max-w-[100px]">
                                  {(order as any).tenants?.name || "—"}
                                </td>
                                <td className="py-3 text-xs">{(order as any).students?.full_name || "—"}</td>
                                <td className="py-3 text-xs font-semibold whitespace-nowrap">
                                  {fmtOrig(order.gross_amount, order)}
                                </td>
                                <td className="py-3 text-[11px] text-muted-foreground whitespace-nowrap">
                                  {new Date(order.created_at).toLocaleDateString("ar-EG", {
                                    day: "numeric",
                                    month: "short",
                                  })}
                                </td>
                              </tr>
                            ))}
                            {latestPaidOrders.length === 0 && (
                              <tr>
                                <td colSpan={4} className="text-center py-8 text-muted-foreground text-xs">
                                  لا توجد طلبات بعد
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Top mentors */}
                    <div className="glass-card rounded-2xl p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-start">أكثر المدربين مبيعاً</h3>
                        <button
                          onClick={() => setActiveTab("mentors")}
                          className="text-xs text-primary hover:underline font-medium"
                        >
                          عرض الكل
                        </button>
                      </div>
                      {topMentors.length > 0 ? (
                        <div className="space-y-4">
                          {topMentors.map((t, i) => {
                            const pct = Math.max(8, Math.round((t.revenue / topMax) * 100));
                            return (
                              <div key={i} className="flex items-center gap-3">
                                <div className="w-7 h-7 rounded-full bg-muted/60 flex items-center justify-center text-[11px] font-bold text-muted-foreground shrink-0">
                                  {i + 1}
                                </div>
                                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                  <Users className="w-4 h-4 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                                      {t.count} طلب
                                    </span>
                                    <p className="text-sm font-semibold truncate text-start">{t.name} <span className="text-[11px] text-muted-foreground font-normal">{fmtEgp(t.revenue)} · {fmtUsd(t.revenueUsd)}</span></p>
                                  </div>
                                  <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
                                    <div
                                      className="h-full bg-primary rounded-full transition-all"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm text-center py-8">لا توجد بيانات بعد</p>
                      )}
                    </div>
                  </div>

                  {/* Recent activity log */}
                  <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-start">النشاط الأخير</h3>
                      <button
                        onClick={() => setActiveTab("logs")}
                        className="text-xs text-primary hover:underline font-medium"
                      >
                        عرض الكل
                      </button>
                    </div>
                    <div className="space-y-3">
                      {logs.slice(0, 5).map((log) => (
                        <div
                          key={log.id}
                          className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/30 transition-colors"
                        >
                          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <Activity className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 text-start">
                            <p className="text-sm font-medium">{log.action}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {log.actor_type} •{" "}
                              {new Date(log.created_at).toLocaleDateString("ar-EG", {
                                day: "numeric",
                                month: "short",
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                      ))}
                      {logs.length === 0 && (
                        <p className="text-center text-muted-foreground text-xs py-6">لا يوجد نشاط بعد</p>
                      )}
                    </div>
                  </div>
                </>
              );
            })()}

          {/* ===== ANALYTICS ===== */}
          {activeTab === "analytics" && (
            <>
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-8 gap-4">
                <div className={alignRight}>
                  <h1 className="text-2xl font-bold flex items-center gap-2">
                    <BarChart3 className="w-6 h-6 text-primary" />
                    التحليلات والإحصائيات
                  </h1>
                  <p className="text-muted-foreground text-sm mt-1">نظرة شاملة على أداء المنصة</p>
                </div>
                <Select value={analyticsPeriod} onValueChange={(value: "7" | "30" | "90") => setAnalyticsPeriod(value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">آخر 7 أيام</SelectItem>
                    <SelectItem value="30">آخر 30 يوم</SelectItem>
                    <SelectItem value="90">آخر 90 يوم</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid lg:grid-cols-3 gap-5 mb-6">
                <div className="lg:col-span-2 glass-card rounded-2xl p-5">
                  <h3 className={`font-bold mb-4 ${alignRight}`}>أفضل المدربين إيراداً</h3>
                  <div className="h-72" dir="ltr">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={mentorStatsData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10 }}
                          stroke="hsl(var(--muted-foreground))"
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 10 }}
                          stroke="hsl(var(--muted-foreground))"
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "10px",
                            fontSize: 12,
                          }}
                          formatter={(value: number, name: string) => [String(name).includes("USD") ? fmtUsd(value) : fmtEgp(value), name]}
                        />
                        <Bar dataKey="revenue" name="الإيرادات (EGP)" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="revenueUsd" name="الإيرادات (USD)" fill="hsl(217 91% 60%)" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="glass-card rounded-2xl p-5">
                  <h3 className={`font-bold mb-4 ${alignRight}`}>إحصائيات سريعة</h3>
                  <div className="space-y-3">
                    {[
                      { label: "معدل التحويل", value: "3.2%", change: "+0.5%", positive: true },
                      { label: "متوسط قيمة الطلب", value: "250 ج.م", change: "+12%", positive: true },
                      { label: "معدل إكمال الدورات", value: "78%", change: "-2%", positive: false },
                      { label: "المدربون الجدد", value: "12", change: "+8%", positive: true },
                    ].map((stat, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full ${stat.positive ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400"}`}
                        >
                          {stat.change}
                        </span>
                        <div className={alignRight}>
                          <p className="text-xs text-muted-foreground">{stat.label}</p>
                          <p className="text-sm font-bold">{stat.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="glass-card rounded-2xl p-5">
                <h3 className={`font-bold mb-4 ${alignRight}`}>النمو الشهري</h3>
                <div className="h-72" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyGrowthData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                      <defs>
                        <linearGradient id="analyticsRevGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 10 }}
                        stroke="hsl(var(--muted-foreground))"
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 10 }}
                        stroke="hsl(var(--muted-foreground))"
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "10px",
                          fontSize: 12,
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        fill="url(#analyticsRevGrad)"
                        name="الإيرادات (EGP)"
                      />
                      <Area
                        type="monotone"
                        dataKey="revenueUsd"
                        stroke="hsl(217 91% 60%)"
                        strokeWidth={2}
                        fillOpacity={0}
                        name="الإيرادات (USD)"
                      />
                      <Line
                        type="monotone"
                        dataKey="orders"
                        stroke="hsl(152 60% 50%)"
                        strokeWidth={2}
                        dot={false}
                        name="الطلبات"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}

          {/* ===== MENTORS ===== */}
          {activeTab === "mentors" && !selectedMentor && (
            <>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                <div className="text-start">
                  <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Users className="w-6 h-6 text-primary" />
                    إدارة المدربين
                  </h1>
                  <p className="text-muted-foreground text-sm mt-1">
                    إدارة حسابات المدربين والإشراف على نشاطهم ({tenants.length} مدرب)
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={refreshData} disabled={refreshing}>
                    <RefreshCw className={`w-3.5 h-3.5 ml-1.5 ${refreshing ? "animate-spin" : ""}`} />
                    تحديث
                  </Button>
                </div>
              </div>

              <div className="mb-5 flex flex-wrap gap-3 items-center">
                <div className="flex-1 min-w-48 relative">
                  <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={mentorSearch}
                    onChange={(e) => setMentorSearch(e.target.value)}
                    placeholder="بحث بالاسم أو النطاق..."
                    className="pr-10 bg-white"
                  />
                </div>
                <select
                  value={mentorStatusFilter}
                  onChange={(e) => setMentorStatusFilter(e.target.value)}
                  className="h-10 px-3 rounded-xl border border-border/50 bg-white text-sm"
                >
                  <option value="">كل الحالات</option>
                  <option value="active">نشط</option>
                  <option value="suspended">موقوف</option>
                  <option value="frozen">مجمد</option>
                </select>
                <select
                  value={mentorSort}
                  onChange={(e) => setMentorSort(e.target.value)}
                  className="h-10 px-3 rounded-xl border border-border/50 bg-white text-sm"
                >
                  <option value="newest">الأحدث</option>
                  <option value="oldest">الأقدم</option>
                  <option value="name">الاسم</option>
                  <option value="net">الأعلى أرباحاً</option>
                  <option value="orders">الأكثر طلبات</option>
                </select>
              </div>

              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-muted-foreground text-[11px] border-b border-border/40">
                        <th className="text-start py-3 px-4 font-medium">المدرب</th>
                        <th className="text-start py-3 px-4 font-medium">النطاق</th>
                        <th className="text-start py-3 px-4 font-medium">الحالة</th>
                        <th className="text-start py-3 px-4 font-medium">صافي الأرباح</th>
                        <th className="text-start py-3 px-4 font-medium">الطلبات</th>
                        <th className="text-start py-3 px-4 font-medium">الانضمام</th>
                        <th className="text-start py-3 px-4 font-medium">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMentors.map((t) => {
                        const tOrders = orders.filter(
                          (o) => o.payment_status === "paid" && (o as any).tenant_id === t.id,
                        );
                        const tNet = tOrders.reduce((a, o) => a + o.mentor_net, 0);
                        const tOrderCount = orders.filter((o) => (o as any).tenant_id === t.id).length;
                        return (
                          <tr
                            key={t.id}
                            className="border-b border-border/20 last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                            onClick={() => openMentorDetail(t)}
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                                  {(t.name || "M").charAt(0)}
                                </div>
                                <div className="min-w-0 text-start">
                                  <span className="font-semibold block truncate">{t.name || "—"}</span>
                                  <span className="text-[11px] text-muted-foreground block truncate">
                                    {personName(t) || "—"}
                                  </span>
                                  {ownerEmail(t) && (
                                    <span
                                      className="text-[11px] text-muted-foreground font-mono block truncate"
                                      dir="ltr"
                                    >
                                      {ownerEmail(t)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <code className="text-[11px] bg-muted px-2 py-1 rounded-md" dir="ltr">
                                {t.slug}.ebdaey.com
                              </code>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                                    t.is_active
                                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                      : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                  }`}
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                                  {t.is_active ? "نشط" : "موقوف"}
                                </span>
                                {t.is_frozen && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                                    مجمد
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 font-bold whitespace-nowrap">{fmtEgp(sumCur(tOrders, (o) => o.mentor_net, false))}<div className="text-xs text-muted-foreground">{fmtUsd(sumCur(tOrders, (o) => o.mentor_net, true))}</div></td>
                            <td className="py-3 px-4 text-muted-foreground">{tOrderCount}</td>
                            <td className="py-3 px-4 text-muted-foreground text-xs whitespace-nowrap">
                              {new Date(t.created_at).toLocaleDateString("ar-EG", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </td>
                            <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => toggleTenant(t)}
                                  title={t.is_active ? "إيقاف" : "تفعيل"}
                                  className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border transition-all ${
                                    t.is_active
                                      ? "border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                                      : "border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-900/20"
                                  }`}
                                >
                                  {t.is_active ? (
                                    <Ban className="w-3.5 h-3.5" />
                                  ) : (
                                    <CheckCircle className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                <button
                                  onClick={() => toggleFreeze(t)}
                                  title={t.is_frozen ? "إلغاء التجميد" : "تجميد"}
                                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-border bg-background text-muted-foreground hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-all"
                                >
                                  <Shield className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => window.open(getMentorSiteUrl(t.slug), "_blank", "noopener,noreferrer")}
                                  title="زيارة صفحة المدرب"
                                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-border bg-background text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => impersonateMentor(t)}
                                  title="الدخول كمدرب"
                                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-border bg-background text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all"
                                >
                                  <UserCog className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredMentors.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-muted-foreground text-sm">
                            لا يوجد مدربون مطابقون
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Mentor Detail Panel */}
          {activeTab === "mentors" && selectedMentor && (
            <>
              <div className="flex items-center gap-3 mb-8">
                <button
                  onClick={() => setSelectedMentor(null)}
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← رجوع
                </button>
                <span className="text-muted-foreground">/</span>
                <h1 className="text-xl font-bold">{selectedMentor.name || "مدرب"}</h1>
              </div>

              <div className="grid lg:grid-cols-3 gap-5 mb-6">
                {/* Profile Card */}
                <div className="glass-card rounded-2xl p-6 lg:col-span-1">
                  <div className="flex items-center gap-4 mb-5">
                    {selectedMentor.profile_image_url ? (
                      <img src={selectedMentor.profile_image_url} className="w-16 h-16 rounded-2xl object-cover" />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-2xl font-black shrink-0">
                        {(selectedMentor.name || "M").charAt(0)}
                      </div>
                    )}
                    <div className="text-start">
                      <p className="font-bold text-lg">{selectedMentor.name}</p>
                      <p className="text-xs text-muted-foreground font-mono" dir="ltr">
                        {selectedMentor.slug}.ebdaey.com
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3 text-sm mb-5">
                    {[
                      { label: "اسم الشخص", value: personName(selectedMentor) || "—" },
                      {
                        label: "تاريخ الانضمام",
                        value: new Date(selectedMentor.created_at).toLocaleDateString("ar-EG"),
                      },
                      { label: "البريد الإلكتروني", value: ownerEmail(selectedMentor) || "—", dir: "ltr" },
                      { label: "الهاتف", value: (selectedMentor as any).phone || "—", dir: "ltr" },
                      { label: "واتساب", value: selectedMentor.whatsapp_number || "—", dir: "ltr" },
                    ].map((item, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span
                          className={`text-muted-foreground ${item.dir === "ltr" ? "font-mono" : ""}`}
                          dir={item.dir as any}
                        >
                          {item.value}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full ${selectedMentor.is_active ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                        {selectedMentor.is_active ? "نشط" : "موقوف"}
                      </span>
                      <span className="text-muted-foreground">الحالة</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full ${selectedMentor.is_withdrawal_frozen ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"}`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                        {selectedMentor.is_withdrawal_frozen ? "مجمد" : "مفعل"}
                      </span>
                      <span className="text-muted-foreground">السحب</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                          mentorWithdrawalSettings?.status === "approved"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : mentorWithdrawalSettings
                              ? "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                        {mentorWithdrawalSettings?.status === "approved"
                          ? "معتمد"
                          : mentorWithdrawalSettings
                            ? "معلق"
                            : "غير مقدم"}
                      </span>
                      <span className="text-muted-foreground">إعدادات السحب</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleTenant(selectedMentor)}
                        className={`flex-1 ${selectedMentor.is_active ? "text-destructive hover:bg-destructive/5" : "text-emerald-600 hover:bg-emerald-50"}`}
                      >
                        <Ban className="w-3.5 h-3.5 ml-1" />
                        {selectedMentor.is_active ? "إيقاف" : "تفعيل"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleFreeze(selectedMentor)}
                        className={`flex-1 ${selectedMentor.is_frozen ? "text-blue-600" : ""}`}
                      >
                        <Shield className="w-3.5 h-3.5 ml-1" />
                        {selectedMentor.is_frozen ? "إلغاء التجميد" : "تجميد"}
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleWithdrawalFreeze(selectedMentor)}
                        className={`flex-1 ${selectedMentor.is_withdrawal_frozen ? "text-blue-600" : ""}`}
                      >
                        <Snowflake className="w-3.5 h-3.5 ml-1" />
                        {selectedMentor.is_withdrawal_frozen ? "تفعيل السحب" : "تجميد السحب"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowBalanceAdjust(!showBalanceAdjust)}
                        className="flex-1"
                      >
                        <DollarSign className="w-3.5 h-3.5 ml-1" />
                        تعديل الرصيد
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      className="w-full gradient-primary text-primary-foreground border-0"
                      onClick={() => impersonateMentor(selectedMentor)}
                    >
                      <UserCog className="w-3.5 h-3.5 ml-1" />
                      الدخول كمدرب
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      disabled={magicLinkLoading}
                      onClick={() => createMentorMagicLink(selectedMentor)}
                    >
                      {magicLinkLoading ? (
                        <Loader2 className="w-3.5 h-3.5 ml-1 animate-spin" />
                      ) : (
                        <LinkIcon className="w-3.5 h-3.5 ml-1" />
                      )}
                      رابط دخول فوري
                    </Button>
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      {
                        label: "إجمالي المبيعات",
                        value: fmtGrossBoth(mentorDetailOrders),
                        icon: DollarSign,
                        color: "text-emerald-600",
                        bg: "bg-emerald-500/10",
                      },
                      {
                        label: "صافي الأرباح",
                        value: fmtBoth(mentorDetailOrders, (o) => o.mentor_net),
                        icon: TrendingUp,
                        color: "text-blue-600",
                        bg: "bg-blue-500/10",
                      },
                      {
                        label: "عدد الدورات",
                        value: String(mentorCourses.length),
                        icon: BookOpen,
                        color: "text-violet-600",
                        bg: "bg-violet-500/10",
                      },
                      {
                        label: "عدد الطلاب",
                        value: String(mentorStudents.length),
                        icon: Users,
                        color: "text-amber-600",
                        bg: "bg-amber-500/10",
                      },
                    ].map((m, i) => (
                      <div key={i} className="glass-card rounded-2xl p-4 text-start">
                        <div className="flex items-center justify-between mb-2">
                          <div className={`w-9 h-9 rounded-xl ${m.bg} flex items-center justify-center`}>
                            <m.icon className={`w-4 h-4 ${m.color}`} />
                          </div>
                          <p className="text-xs text-muted-foreground">{m.label}</p>
                        </div>
                        <p className="text-xl font-extrabold">{m.value}</p>
                      </div>
                    ))}
                  </div>

                  {showBalanceAdjust && (
                    <div className="glass-card rounded-2xl p-5 border border-amber-200 dark:border-amber-800">
                      <h3 className="font-bold mb-4 flex items-center gap-2 text-start">
                        <DollarSign className="w-4 h-4 text-amber-600" />
                        تعديل الرصيد — {selectedMentor.name}
                      </h3>
                      <div className="grid sm:grid-cols-2 gap-4 mb-4">
                        <div>
                          <Label className="mb-1 block text-start">المبلغ (+ للإضافة، - للخصم)</Label>
                          <Input
                            value={balanceAmount}
                            onChange={(e) => setBalanceAmount(e.target.value)}
                            placeholder="مثال: 500 أو -200"
                            type="number"
                            dir="ltr"
                          />
                        </div>
                        <div>
                          <Label className="mb-1 block text-start">السبب (إلزامي)</Label>
                          <Input
                            value={balanceReason}
                            onChange={(e) => setBalanceReason(e.target.value)}
                            placeholder="سبب التعديل..."
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={adjustBalance}
                          disabled={!balanceAmount || !balanceReason}
                          className="gradient-primary text-primary-foreground border-0"
                        >
                          تأكيد التعديل
                        </Button>
                        <Button variant="outline" onClick={() => setShowBalanceAdjust(false)}>
                          إلغاء
                        </Button>
                      </div>
                    </div>
                  )}

                  {balanceAdjustments.length > 0 && (
                    <div className="glass-card rounded-2xl p-5">
                      <h3 className="font-bold mb-3 text-start">سجل تعديلات الرصيد</h3>
                      <div className="space-y-2">
                        {balanceAdjustments.slice(0, 5).map((adj: any) => (
                          <div
                            key={adj.id}
                            className="flex items-center justify-between text-sm p-3 rounded-xl hover:bg-muted/30 transition-colors"
                          >
                            <span className="text-xs text-muted-foreground">
                              {new Date(adj.created_at).toLocaleDateString("ar-EG")}
                            </span>
                            <div className="text-start">
                              <span className={`font-bold ${adj.amount > 0 ? "text-emerald-600" : "text-red-500"}`}>
                                {adj.amount > 0 ? "+" : ""}
                                {fmtRow(adj.amount, adj)}
                              </span>
                              <span className="text-muted-foreground mr-2 text-xs">— {adj.reason}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {(() => {
                const ws = withdrawalSettings.find((w: any) => w.tenant_id === selectedMentor.id);
                if (!ws) return null;
                return (
                  <>
                    <h2 className="text-lg font-bold mb-4 text-start flex items-center gap-2">
                      <Shield className="w-5 h-5 text-primary" />
                      البيانات البنكية وبطاقة الهوية
                    </h2>
                    <div className="glass-card rounded-2xl p-5 mb-8">
                      <div className="grid md:grid-cols-2 gap-4 mb-5 text-start">
                        {[
                          { label: "الاسم القانوني", value: ws.legal_name || "—" },
                          { label: "البنك", value: ws.bank_name || "—" },
                          { label: "IBAN", value: ws.iban || "—", dir: "ltr" as const },
                          { label: "رقم الحساب", value: (ws as any).account_number || "—", dir: "ltr" as const },
                          { label: "الرقم القومي", value: (ws as any).national_id || "—", dir: "ltr" as const },
                          {
                            label: "الحالة",
                            value:
                              ws.status === "approved"
                                ? "معتمد"
                                : ws.status === "rejected"
                                  ? "مرفوض"
                                  : "بانتظار الاعتماد",
                          },
                        ].map((f, i) => (
                          <div key={i} className="flex items-center justify-between border-b border-border/30 pb-2">
                            <span className="font-semibold text-sm" dir={(f as any).dir || undefined}>
                              {f.value}
                            </span>
                            <span className="text-xs text-muted-foreground">{f.label}</span>
                          </div>
                        ))}
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        {ws.national_id_front_url && (
                          <div className="text-start">
                            <p className="text-xs text-muted-foreground mb-2">وجه بطاقة الهوية</p>
                            <MentorDocImage pathOrUrl={ws.national_id_front_url} alt="وجه البطاقة" />
                          </div>
                        )}
                        {ws.national_id_back_url && (
                          <div className="text-start">
                            <p className="text-xs text-muted-foreground mb-2">ظهر بطاقة الهوية</p>
                            <MentorDocImage pathOrUrl={ws.national_id_back_url} alt="ظهر البطاقة" />
                          </div>
                        )}
                        {!ws.national_id_front_url && !ws.national_id_back_url && ws.national_id_image_url && (
                          <div className="text-start sm:col-span-2">
                            <p className="text-xs text-muted-foreground mb-2">صورة البطاقة</p>
                            <MentorDocImage pathOrUrl={ws.national_id_image_url} alt="البطاقة" />
                          </div>
                        )}
                        {!ws.national_id_front_url && !ws.national_id_back_url && !ws.national_id_image_url && (
                          <p className="text-sm text-muted-foreground sm:col-span-2 text-start">
                            لم يتم رفع صور البطاقة بعد
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                );
              })()}

              <h2 className="text-lg font-bold mb-4 text-start">الدورات ({mentorCourses.length})</h2>
              <div className="glass-card rounded-2xl overflow-hidden mb-5">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-muted-foreground text-[11px] border-b border-border/40">
                        <th className="text-start py-3 px-4 font-medium">العنوان</th>
                        <th className="text-start py-3 px-4 font-medium">السعر</th>
                        <th className="text-start py-3 px-4 font-medium">الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mentorCourses.map((c: any) => (
                        <tr
                          key={c.id}
                          className="border-b border-border/20 last:border-0 hover:bg-muted/30 transition-colors"
                        >
                          <td className="py-3 px-4 font-medium">{c.title}</td>
                          <td className="py-3 px-4">{c.price} ج.م</td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                                c.is_published
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                  : "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                              }`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                              {c.is_published ? "منشورة" : "مسودة"}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {mentorCourses.length === 0 && (
                        <tr>
                          <td colSpan={3} className="py-10 text-center text-muted-foreground text-sm">
                            لا توجد دورات
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <h2 className="text-lg font-bold mb-4 text-start">آخر الطلبات ({mentorOrders.length})</h2>
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-muted-foreground text-[11px] border-b border-border/40">
                        <th className="text-start py-3 px-4 font-medium">الطالب</th>
                        <th className="text-start py-3 px-4 font-medium">الدورة</th>
                        <th className="text-start py-3 px-4 font-medium">المبلغ</th>
                        <th className="text-start py-3 px-4 font-medium">التاريخ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mentorOrders.slice(0, 10).map((o) => (
                        <tr
                          key={o.id}
                          className="border-b border-border/20 last:border-0 hover:bg-muted/30 transition-colors"
                        >
                          <td className="py-3 px-4">{(o as any).students?.full_name || "—"}</td>
                          <td className="py-3 px-4 text-muted-foreground">{(o as any).courses?.title || "—"}</td>
                          <td className="py-3 px-4 font-bold whitespace-nowrap">{fmtOrig(o.gross_amount, o)}</td>
                          <td className="py-3 px-4 text-xs text-muted-foreground">
                            {new Date(o.created_at).toLocaleDateString("ar-EG")}
                          </td>
                        </tr>
                      ))}
                      {mentorOrders.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-10 text-center text-muted-foreground text-sm">
                            لا توجد طلبات
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ===== TRANSACTIONS ===== */}
          {activeTab === "transactions" && (
            <>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                <div className="text-start">
                  <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Package className="w-6 h-6 text-primary" />
                    إدارة الطلبات
                  </h1>
                </div>
                <Button variant="outline" size="sm" onClick={refreshData} disabled={refreshing}>
                  <RefreshCw className={`w-3.5 h-3.5 ml-1.5 ${refreshing ? "animate-spin" : ""}`} />
                  تحديث
                </Button>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[
                  {
                    label: "إجمالي الطلبات",
                    value: String(orders.length),
                    icon: ShoppingBag,
                    bg: "bg-blue-500/10",
                    color: "text-blue-600",
                  },
                  {
                    label: "طلبات مكتملة",
                    value: String(orders.filter((o) => o.payment_status === "paid").length),
                    icon: CheckCircle,
                    bg: "bg-emerald-500/10",
                    color: "text-emerald-600",
                  },
                  {
                    label: "طلبات معلقة",
                    value: String(orders.filter((o) => o.payment_status === "pending").length),
                    icon: Clock,
                    bg: "bg-amber-500/10",
                    color: "text-amber-600",
                  },
                  {
                    label: "إجمالي الإيرادات",
                    value: fmtGrossBoth(paidOrders),
                    icon: TrendingUp,
                    bg: "bg-primary/10",
                    color: "text-primary",
                  },
                ].map((m, i) => (
                  <div key={i} className="glass-card rounded-xl p-2.5 text-start">
                    <div className="flex items-center justify-between mb-1">
                      <div className={`w-7 h-7 rounded-lg ${m.bg} flex items-center justify-center`}>
                        <m.icon className={`w-3.5 h-3.5 ${m.color}`} />
                      </div>
                      <p className="text-[11px] text-muted-foreground">{m.label}</p>
                    </div>
                    <p className="text-base font-extrabold">{m.value}</p>
                  </div>
                ))}
              </div>

              <div className="mb-5 flex flex-wrap gap-3 items-center">
                <div className="flex-1 min-w-48 relative">
                  <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={txSearch}
                    onChange={(e) => setTxSearch(e.target.value)}
                    placeholder="بحث بالاسم أو الدورة أو رقم المعاملة..."
                    className="pr-10 bg-white"
                  />
                </div>
                <select
                  value={txStatusFilter}
                  onChange={(e) => setTxStatusFilter(e.target.value)}
                  className="h-10 px-3 rounded-xl border border-border/50 bg-white text-sm"
                >
                  <option value="">كل الحالات</option>
                  <option value="paid">مكتمل</option>
                  <option value="pending">معلق</option>
                </select>
              </div>

              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-muted-foreground text-[10px] border-b border-border/40">
                        <th className="text-start py-2 px-2 font-medium">رقم المعاملة</th>
                        <th className="text-start py-2 px-2 font-medium">المدرب</th>
                        <th className="text-start py-2 px-2 font-medium">الطالب</th>
                        <th className="text-start py-2 px-2 font-medium">الدورة</th>
                        <th className="text-start py-2 px-2 font-medium">الإجمالي</th>
                        <th className="text-start py-2 px-2 font-medium">عمولة المنصة</th>
                        <th className="text-start py-2 px-2 font-medium">رسوم البوابة</th>
                        <th className="text-start py-2 px-2 font-medium">صافي المدرب</th>
                        <th className="text-start py-2 px-2 font-medium">الحالة</th>
                        <th className="text-start py-2 px-2 font-medium">التاريخ</th>
                        <th className="text-start py-2 px-2 font-medium">خيارات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((o) => (
                        <tr
                          key={o.id}
                          className="border-b border-border/20 last:border-0 hover:bg-muted/30 transition-colors"
                        >
                          <td className="py-1.5 px-2 font-mono text-[10px] text-muted-foreground" dir="ltr">
                            {o.kashier_order_id || o.id.slice(0, 8)}
                          </td>
                          <td className="py-1.5 px-2 font-semibold">{(o as any).tenants?.name || "—"}</td>
                          <td className="py-1.5 px-2 text-muted-foreground">{(o as any).students?.full_name || "—"}</td>
                          <td className="py-1.5 px-2 text-muted-foreground">{(o as any).courses?.title || "—"}</td>
                          <td className="py-1.5 px-2 whitespace-nowrap">
                            <div className="font-bold">{fmtOrig(o.gross_amount, o)}</div>
                            {usdSettledNote(o) && (
                              <div className="text-[10px] text-muted-foreground">{usdSettledNote(o)}</div>
                            )}
                          </td>
                          <td className="py-1.5 px-2 text-primary whitespace-nowrap">{fmtRow(o.platform_fee, o)}</td>
                          <td className="py-1.5 px-2 text-amber-600 whitespace-nowrap">{fmtRow(o.gateway_fee, o)}</td>
                          <td className="py-1.5 px-2 font-bold text-emerald-600 whitespace-nowrap">
                            {fmtRow(o.mentor_net, o)}
                          </td>
                          <td className="py-1.5 px-2">
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                o.payment_status === "paid"
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                  : "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                              }`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                              {o.payment_status === "paid" ? "مكتمل" : "معلق"}
                            </span>
                          </td>
                          <td className="py-1.5 px-2 text-[10px] text-muted-foreground whitespace-nowrap">
                            {new Date(o.created_at).toLocaleDateString("ar-EG")}
                          </td>
                          <td className="py-1.5 px-2">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setSelectedOrder(o as any)}
                                className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-border bg-background text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all"
                                title="عرض التفاصيل"
                              >
                                <Eye className="w-3 h-3" />
                              </button>
                              {o.payment_status !== "paid" && (
                                <button
                                  onClick={() => checkPaymentWithGateway(o)}
                                  disabled={checkingPaymentId === o.id}
                                  className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-border bg-background text-muted-foreground hover:text-emerald-600 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all disabled:opacity-50"
                                  title="التحقق من الدفع مع البوابة"
                                >
                                  <RefreshCw
                                    className={`w-3 h-3 ${checkingPaymentId === o.id ? "animate-spin" : ""}`}
                                  />
                                </button>
                              )}
                            </div>
                          </td>

                        </tr>
                      ))}

                      {filteredOrders.length === 0 && (
                        <tr>
                          <td colSpan={11} className="py-12 text-center text-muted-foreground text-sm">
                            لا توجد معاملات
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Order Details Dialog */}
              <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
                <DialogContent className="max-w-md">
                  {selectedOrder && (
                    <>
                      <DialogHeader>
                        <DialogTitle className="text-center text-lg font-bold">
                          {(selectedOrder as any).courses?.title || "-"}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 text-sm">
                        <div className="text-center space-y-1">
                          <p className="text-muted-foreground">
                            {new Date(selectedOrder.created_at).toLocaleDateString("ar-EG", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                            })}
                          </p>
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${
                              selectedOrder.payment_status === "paid"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                            {selectedOrder.payment_status === "paid" ? "مكتمل" : "معلق"}
                          </span>
                        </div>

                        <div className="text-center space-y-1">
                          <h4 className="font-bold">رقم المعاملة</h4>
                          <p className="font-mono text-xs" dir="ltr">
                            {(selectedOrder as any).kashier_order_id || selectedOrder.id}
                          </p>
                        </div>

                        <div className="text-center space-y-1">
                          <h4 className="font-bold">السعر الأصلي للمنتج</h4>
                          <div className="flex justify-between px-4">
                            <span>السعر المدفوع</span>
                            <span className="font-bold">
                              {fmtOrig(Number(selectedOrder.gross_amount), selectedOrder)}
                              {rowCurrency(selectedOrder) !== "EGP" && (
                                <span className="text-xs font-normal text-muted-foreground">
                                  {" "}({currencyNameAr(rowCurrency(selectedOrder))})
                                </span>
                              )}
                            </span>
                          </div>
                          {usdSettledNote(selectedOrder) && (
                            <div className="flex justify-between px-4 text-xs text-muted-foreground">
                              <span>بعد التحويل للدولار</span>
                              <span>{usdSettledNote(selectedOrder)?.replace("≈ ", "")}</span>
                            </div>
                          )}
                        </div>

                        <div className="text-center space-y-1">
                          <h4 className="font-bold">مبلغ التسوية</h4>
                          <div className="flex justify-between px-4">
                            <span>المبلغ الكلي</span>
                            <span>
                              {isUsdRow(selectedOrder) && Number((selectedOrder as any).settled_usd) > 0
                                ? fmtUsd(Number((selectedOrder as any).settled_usd))
                                : fmtOrig(Number(selectedOrder.gross_amount), selectedOrder)}
                            </span>
                          </div>
                          <div className="flex justify-between px-4">
                            <span>رسوم الدفع</span>
                            <span className="text-destructive">{fmtRow(Number(selectedOrder.gateway_fee), selectedOrder)}</span>
                          </div>
                          <div className="flex justify-between px-4">
                            <span>رسوم المنصة</span>
                            <span className="text-destructive">
                              {fmtRow(Number(selectedOrder.platform_fee), selectedOrder)}
                            </span>
                          </div>
                          <div className="flex justify-between px-4 font-bold">
                            <span>صافي المدرب</span>
                            <span className="text-emerald-600">{fmtRow(Number(selectedOrder.mentor_net), selectedOrder)}</span>
                          </div>
                        </div>

                        <div className="text-center space-y-1">
                          <h4 className="font-bold">المدرب</h4>
                          <p>{(selectedOrder as any).tenants?.name || "-"}</p>
                        </div>

                        <div className="text-center space-y-1">
                          <h4 className="font-bold">المنتج</h4>
                          <p>{(selectedOrder as any).courses?.title || "-"}</p>
                        </div>

                        <div className="text-center space-y-1">
                          <h4 className="font-bold">العميل</h4>
                          <p>{(selectedOrder as any).students?.full_name || "-"}</p>
                          {(selectedOrder as any).students?.email && (
                            <p className="text-primary" dir="ltr">
                              {(selectedOrder as any).students.email}
                            </p>
                          )}
                          {(selectedOrder as any).students?.phone && (
                            <p className="text-muted-foreground" dir="ltr">
                              {(selectedOrder as any).students.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </DialogContent>
              </Dialog>
            </>
          )}

          {activeTab === "withdrawals" &&
            (() => {
              const combinedWs: any[] = [...withdrawalSettings, ...intlSettings];
              const pendingSettings = combinedWs.filter((ws) => ws.status === "pending").length;
              const approvedSettings = combinedWs.filter((ws) => ws.status === "approved").length;
              const pendingRequests = withdrawals.filter((w) => w.status === "pending").length;
              const totalRequestAmount = withdrawals
                .filter((w) => w.status === "pending" || w.status === "approved")
                .reduce((s, w) => s + w.amount, 0);
              const paidAmount = withdrawals.filter((w) => w.status === "paid").reduce((s, w) => s + w.amount, 0);

              const allSettings: any[] = [
                ...withdrawalSettings.map((ws) => ({ ...ws, kind: "egypt" })),
                ...intlSettings,
              ];
              const filteredSettings = allSettings.filter((ws) => {
                if (wsKindFilter !== "all_kinds" && ws.kind !== wsKindFilter) return false;
                if (wsStatusFilter && wsStatusFilter !== "all_statuses" && ws.status !== wsStatusFilter) return false;
                if (wsSearchFilter) {
                  const search = wsSearchFilter.toLowerCase();
                  if (
                    !(ws.tenants?.name || "").toLowerCase().includes(search) &&
                    !ws.legal_name.toLowerCase().includes(search) &&
                    !ws.iban.toLowerCase().includes(search) &&
                    !(ws.bank_name || "").toLowerCase().includes(search)
                  )
                    return false;
                }
                return true;
              });

              const filteredRequests = withdrawals.filter((w) => {
                if (wrStatusFilter && wrStatusFilter !== "all_wr" && w.status !== wrStatusFilter) return false;
                if (wrSearchFilter && !(w.tenants?.name || "").toLowerCase().includes(wrSearchFilter.toLowerCase()))
                  return false;
                return true;
              });

              return (
                <>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                    <div className="text-start">
                      <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Banknote className="w-6 h-6 text-primary" />
                        السحب والبيانات البنكية
                      </h1>
                      <p className="text-muted-foreground text-sm mt-1">اعتماد الإعدادات البنكية وإدارة طلبات السحب</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={refreshData} disabled={refreshing}>
                      <RefreshCw className={`w-3.5 h-3.5 ml-1.5 ${refreshing ? "animate-spin" : ""}`} />
                      تحديث
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    {[
                      { label: "إجمالي الإعدادات", value: String(combinedWs.length), color: "" },
                      { label: "بانتظار الاعتماد", value: String(pendingSettings), color: "text-amber-600" },
                      { label: "معتمدة", value: String(approvedSettings), color: "text-emerald-600" },
                      { label: "طلبات سحب معلقة", value: String(pendingRequests), color: "text-primary" },
                      { label: "إجمالي المحوّل", value: fmtBoth(withdrawals.filter((w) => w.status === "paid"), (w) => w.amount), color: "" },
                    ].map((s, i) => (
                      <div key={i} className="glass-card rounded-2xl p-4 text-center">
                        <p className={`text-lg font-extrabold ${s.color}`}>{s.value}</p>
                        <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-start">
                    <Shield className="w-5 h-5 text-primary" />
                    البيانات البنكية واعتماد إعدادات السحب
                  </h2>

                  <div className="glass-card rounded-2xl p-4 mb-4 flex flex-wrap gap-3">
                    <Select value={wsKindFilter} onValueChange={setWsKindFilter}>
                      <SelectTrigger className="w-[160px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all_kinds">جميع الأنواع</SelectItem>
                        <SelectItem value="egypt">تحويل مصري</SelectItem>
                        <SelectItem value="international">تحويل دولي</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="بحث بالاسم، IBAN، البنك..."
                      value={wsSearchFilter}
                      onChange={(e) => setWsSearchFilter(e.target.value)}
                      className="flex-1 min-w-48"
                    />
                    <Select value={wsStatusFilter} onValueChange={setWsStatusFilter}>
                      <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="جميع الحالات" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all_statuses">جميع الحالات</SelectItem>
                        <SelectItem value="pending">معلق</SelectItem>
                        <SelectItem value="approved">معتمد</SelectItem>
                        <SelectItem value="rejected">مرفوض</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="glass-card rounded-2xl overflow-hidden mb-10">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-muted-foreground text-[11px] border-b border-border/40">
                            <th className="text-start py-3 px-4 font-medium">المدرب</th>
                            <th className="text-start py-3 px-4 font-medium">النوع</th>
                            <th className="text-start py-3 px-4 font-medium">الاسم القانوني</th>
                            <th className="text-start py-3 px-4 font-medium">البنك</th>
                            <th className="text-start py-3 px-4 font-medium">IBAN</th>
                            <th className="text-start py-3 px-4 font-medium">الهوية</th>
                            <th className="text-start py-3 px-4 font-medium">الحالة</th>
                            <th className="text-start py-3 px-4 font-medium">إجراءات</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredSettings.map((ws) => (
                            <>
                              <tr
                                key={ws.id}
                                className="border-b border-border/20 last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                                onClick={() => setExpandedBankId(expandedBankId === ws.id ? null : ws.id)}
                              >
                                <td className="py-3 px-4 font-semibold">{(ws as any).tenants?.name || "—"}</td>
                                <td className="py-3 px-4">
                                  <span
                                    className={`inline-flex text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${
                                      ws.kind === "international"
                                        ? "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400"
                                        : "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                    }`}
                                  >
                                    {ws.kind === "international"
                                      ? `دولي${ws.country_code ? ` · ${String(ws.country_code).toUpperCase()}` : ""}`
                                      : "مصري"}
                                  </span>
                                </td>
                                <td className="py-3 px-4">{ws.legal_name}</td>
                                <td className="py-3 px-4 text-xs">{(ws as any).bank_name || "—"}</td>
                                <td className="py-3 px-4 font-mono text-xs" dir="ltr">
                                  {ws.iban}
                                </td>
                                <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex gap-2">
                                    {ws.national_id_front_url ? (
                                      <MentorDocLink pathOrUrl={ws.national_id_front_url} label="وجه" />
                                    ) : ws.national_id_image_url ? (
                                      <MentorDocLink pathOrUrl={ws.national_id_image_url} label="عرض" />
                                    ) : (
                                      <span className="text-muted-foreground text-xs">—</span>
                                    )}
                                    {ws.national_id_back_url && (
                                      <MentorDocLink pathOrUrl={ws.national_id_back_url} label="ظهر" />
                                    )}
                                  </div>
                                </td>

                                <td className="py-3 px-4">
                                  <span
                                    className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                                      ws.status === "approved"
                                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                        : ws.status === "rejected"
                                          ? "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                          : "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                    }`}
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                                    {ws.status === "approved" ? "معتمد" : ws.status === "rejected" ? "مرفوض" : "معلق"}
                                  </span>
                                </td>
                                <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                                  {ws.status === "pending" && (
                                    <div className="flex gap-1.5">
                                      <button
                                        onClick={() => updateWithdrawalSetting(ws.id, "approved", ws.kind)}
                                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-emerald-200 text-emerald-600 hover:bg-emerald-50 transition-all"
                                      >
                                        <CheckCircle className="w-3.5 h-3.5" />
                                      </button>
                                      {wsRejectingId === ws.id ? (
                                        <div className="flex gap-1 items-center">
                                          <Input
                                            value={wsRejectNote}
                                            onChange={(e) => setWsRejectNote(e.target.value)}
                                            placeholder="سبب الرفض"
                                            className="h-8 w-32 text-xs"
                                          />
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-destructive h-8"
                                            onClick={() => updateWithdrawalSetting(ws.id, "rejected", ws.kind)}
                                          >
                                            رفض
                                          </Button>
                                          <button
                                            onClick={() => setWsRejectingId(null)}
                                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-border text-muted-foreground hover:bg-muted/30 transition-all"
                                          >
                                            <XCircle className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          onClick={() => setWsRejectingId(ws.id)}
                                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-all"
                                        >
                                          <XCircle className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  )}
                                  {ws.status !== "pending" && (
                                    <button
                                      onClick={() => updateWithdrawalSetting(ws.id, "pending", ws.kind)}
                                      className="text-xs px-2 py-1 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all"
                                    >
                                      إعادة مراجعة
                                    </button>
                                  )}
                                </td>
                              </tr>
                              {expandedBankId === ws.id && (
                                <tr key={`${ws.id}-detail`}>
                                  <td colSpan={8} className="p-0">
                                    <div className="bg-muted/20 p-5 border-t border-border/30">
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                          <p className="text-xs text-muted-foreground mb-1">الاسم القانوني</p>
                                          <p className="font-medium text-sm">{ws.legal_name}</p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-muted-foreground mb-1">البنك</p>
                                          <p className="font-medium text-sm">{ws.bank_name || "غير محدد"}</p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-muted-foreground mb-1">IBAN</p>
                                          <p className="font-mono text-sm" dir="ltr">
                                            {ws.iban}
                                          </p>
                                        </div>
                                        {ws.kind === "international" && (
                                          <>
                                            <div>
                                              <p className="text-xs text-muted-foreground mb-1">الدولة</p>
                                              <p className="font-medium text-sm">{String(ws.country_code || "").toUpperCase()}</p>
                                            </div>
                                            <div>
                                              <p className="text-xs text-muted-foreground mb-1">SWIFT / BIC</p>
                                              <p className="font-mono text-sm" dir="ltr">{ws.swift_code}</p>
                                            </div>
                                            <div>
                                              <p className="text-xs text-muted-foreground mb-1">مستند الهوية</p>
                                              <p className="font-medium text-sm">{ws.id_document_type === "passport" ? "جواز السفر" : "بطاقة الهوية"}</p>
                                            </div>
                                          </>
                                        )}
                                        <div>
                                          <p className="text-xs text-muted-foreground mb-1">المدرب</p>
                                          <p className="font-medium text-sm">
                                            {ws.tenants?.name} ({ws.tenants?.slug})
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-muted-foreground mb-1">حالة السحب</p>
                                          <p className="font-medium text-sm">
                                            {tenants.find((t) => t.id === ws.tenant_id)?.is_withdrawal_frozen
                                              ? "🔒 مجمّد"
                                              : "✅ مفعّل"}
                                          </p>
                                        </div>
                                        <div className="flex gap-3 flex-wrap">
                                          {ws.national_id_front_url && (
                                            <div>
                                              <p className="text-xs text-muted-foreground mb-1">وجه الهوية</p>
                                              <MentorDocImage
                                                pathOrUrl={ws.national_id_front_url}
                                                alt="وجه الهوية"
                                                className="w-28 h-20 object-cover rounded-xl border border-border hover:opacity-80 transition block"
                                              />
                                            </div>
                                          )}
                                          {ws.national_id_back_url && (
                                            <div>
                                              <p className="text-xs text-muted-foreground mb-1">ظهر الهوية</p>
                                              <MentorDocImage
                                                pathOrUrl={ws.national_id_back_url}
                                                alt="ظهر الهوية"
                                                className="w-28 h-20 object-cover rounded-xl border border-border hover:opacity-80 transition block"
                                              />
                                            </div>
                                          )}
                                          {!ws.national_id_front_url &&
                                            !ws.national_id_back_url &&
                                            ws.national_id_image_url && (
                                              <div>
                                                <p className="text-xs text-muted-foreground mb-1">صورة الهوية</p>
                                                <MentorDocImage
                                                  pathOrUrl={ws.national_id_image_url}
                                                  alt="الهوية"
                                                  className="w-28 h-20 object-cover rounded-xl border border-border hover:opacity-80 transition block"
                                                />
                                              </div>
                                            )}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </>
                          ))}
                          {filteredSettings.length === 0 && (
                            <tr>
                              <td colSpan={7} className="py-12 text-center text-muted-foreground text-sm">
                                لا توجد إعدادات سحب
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-start">
                    <Wallet className="w-5 h-5 text-primary" />
                    طلبات السحب
                  </h2>

                  <div className="glass-card rounded-2xl p-4 mb-4 flex flex-wrap gap-3">
                    <Input
                      placeholder="بحث باسم المدرب..."
                      value={wrSearchFilter}
                      onChange={(e) => setWrSearchFilter(e.target.value)}
                      className="flex-1 min-w-48"
                    />
                    <Select value={wrStatusFilter} onValueChange={setWrStatusFilter}>
                      <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="جميع الحالات" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all_wr">جميع الحالات</SelectItem>
                        <SelectItem value="pending">معلق</SelectItem>
                        <SelectItem value="approved">تمت الموافقة</SelectItem>
                        <SelectItem value="paid">تم التحويل</SelectItem>
                        <SelectItem value="rejected">مرفوض</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="glass-card rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-muted-foreground text-[11px] border-b border-border/40">
                            <th className="text-start py-3 px-4 font-medium">المدرب</th>
                            <th className="text-start py-3 px-4 font-medium">المبلغ</th>
                            <th className="text-start py-3 px-4 font-medium">البنك / IBAN</th>
                            <th className="text-start py-3 px-4 font-medium">الهوية</th>
                            <th className="text-start py-3 px-4 font-medium">الحالة</th>
                            <th className="text-start py-3 px-4 font-medium">التاريخ</th>
                            <th className="text-start py-3 px-4 font-medium">ملاحظات</th>
                            <th className="text-start py-3 px-4 font-medium">إجراءات</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredRequests.map((w) => {
                            const mentorWs = withdrawalSettings.find((ws) => ws.tenant_id === w.tenant_id);
                            return (
                              <tr
                                key={w.id}
                                className="border-b border-border/20 last:border-0 hover:bg-muted/30 transition-colors"
                              >
                                <td className="py-3 px-4 font-semibold">{(w as any).tenants?.name || "—"}</td>
                                <td className="py-3 px-4 font-bold">{fmtRow(w.amount, w)}</td>
                                <td className="py-3 px-4 text-xs">
                                  {mentorWs ? (
                                    <div>
                                      <p className="font-medium">{mentorWs.bank_name || "—"}</p>
                                      <p className="font-mono text-muted-foreground" dir="ltr">
                                        {mentorWs.iban}
                                      </p>
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </td>
                                <td className="py-3 px-4">
                                  {mentorWs &&
                                  (mentorWs.national_id_front_url ||
                                    mentorWs.national_id_back_url ||
                                    mentorWs.national_id_image_url) ? (
                                    <div className="flex gap-2">
                                      {mentorWs.national_id_front_url ? (
                                        <MentorDocLink pathOrUrl={mentorWs.national_id_front_url} label="وجه" />
                                      ) : mentorWs.national_id_image_url ? (
                                        <MentorDocLink pathOrUrl={mentorWs.national_id_image_url} label="عرض" />
                                      ) : null}
                                      {mentorWs.national_id_back_url && (
                                        <MentorDocLink pathOrUrl={mentorWs.national_id_back_url} label="ظهر" />
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">—</span>
                                  )}
                                </td>
                                <td className="py-3 px-4">
                                  <span
                                    className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                                      w.status === "pending"
                                        ? "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                        : w.status === "approved"
                                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                          : w.status === "paid"
                                            ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                            : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                    }`}
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                                    {w.status === "pending"
                                      ? "معلق"
                                      : w.status === "approved"
                                        ? "تمت الموافقة"
                                        : w.status === "paid"
                                          ? "تم التحويل"
                                          : "مرفوض"}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">
                                  {new Date(w.created_at).toLocaleDateString("ar-EG")}
                                </td>
                                <td className="py-3 px-4 text-xs text-muted-foreground">{w.admin_note || "—"}</td>
                                <td className="py-3 px-4">
                                  {w.status === "pending" && (
                                    <div className="flex gap-1.5">
                                      <button
                                        onClick={() => updateWithdrawal(w.id, "approved")}
                                        className="text-xs px-2.5 py-1 rounded-lg border border-emerald-200 text-emerald-600 hover:bg-emerald-50 font-medium transition-all"
                                      >
                                        موافقة
                                      </button>
                                      {rejectingId === w.id ? (
                                        <div className="flex gap-1 items-center">
                                          <Input
                                            value={rejectNote}
                                            onChange={(e) => setRejectNote(e.target.value)}
                                            placeholder="سبب الرفض"
                                            className="h-8 w-28 text-xs"
                                          />
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-destructive h-8"
                                            onClick={() => updateWithdrawal(w.id, "rejected", rejectNote)}
                                          >
                                            رفض
                                          </Button>
                                          <button
                                            onClick={() => setRejectingId(null)}
                                            className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-border text-muted-foreground hover:bg-muted/30"
                                          >
                                            <XCircle className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          onClick={() => setRejectingId(w.id)}
                                          className="text-xs px-2.5 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 font-medium transition-all"
                                        >
                                          رفض
                                        </button>
                                      )}
                                    </div>
                                  )}
                                  {w.status === "approved" && (
                                    <Button
                                      size="sm"
                                      className="gradient-primary text-primary-foreground border-0 h-8"
                                      onClick={() => updateWithdrawal(w.id, "paid")}
                                    >
                                      <Banknote className="w-3.5 h-3.5 ml-1" /> تم التحويل
                                    </Button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                          {filteredRequests.length === 0 && (
                            <tr>
                              <td colSpan={8} className="py-12 text-center text-muted-foreground text-sm">
                                لا توجد طلبات سحب
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              );
            })()}

          {/* ===== SYSTEM SETTINGS ===== */}
          {activeTab === "settings" && (
            <>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                <div className={alignRight}>
                  <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Settings className="w-6 h-6 text-primary" />
                    إعدادات النظام
                  </h1>
                  <p className="text-muted-foreground text-sm mt-1">إدارة إعدادات المنصة وضبطها</p>
                </div>
                <Button variant="outline" size="sm" onClick={refreshData} disabled={refreshing}>
                  <RefreshCw className={`w-3.5 h-3.5 ml-1.5 ${refreshing ? "animate-spin" : ""}`} />
                  تحديث
                </Button>
              </div>
              <div className="grid gap-5 grid-cols-1  md:grid-cols-2">
                <div className="glass-card rounded-2xl p-6">
                  <h3 className={`font-bold mb-4 flex items-center gap-2 ${alignRight}`}>
                    <DollarSign className="w-5 h-5 text-primary" />
                    الإعدادات المالية
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <Label className={`mb-1 block ${alignRight}`}>عمولة المنصة (%)</Label>
                      <Input value="8" disabled className="max-w-32" />
                      <p className="text-xs text-muted-foreground mt-1">القيمة الافتراضية للـ MVP</p>
                    </div>
                    <div>
                      <Label className={`mb-1 block ${alignRight}`}>رسوم بوابة الدفع</Label>
                      <Input value="2% + 2 ج.م" disabled className="max-w-40" dir="ltr" />
                      <p className="text-xs text-muted-foreground mt-1">
                        تُضاف ضريبة القيمة المضافة 14% على رسوم البوابة
                      </p>
                    </div>
                  </div>
                </div>

                <div className="glass-card rounded-2xl p-6">
                  <h3 className={`font-bold mb-4 flex items-center gap-2 ${alignRight}`}>
                    <Shield className="w-5 h-5 text-primary" />
                    إعدادات الأمان
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                      <span>تسجيل المدربين الذاتي</span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" /> مفعل
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                      <span>ظهور الدورات الجديدة تلقائياً</span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" /> مسودة
                      </span>
                    </div>
                  </div>
                </div>

                <div className="glass-card rounded-2xl p-6">
                  <h3 className={`font-bold mb-4 flex items-center gap-2 ${alignRight}`}>
                    <Settings className="w-5 h-5 text-primary" />
                    إعدادات المنصة
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <Label className={`mb-1 block ${alignRight}`}>بريد الدعم</Label>
                      <Input placeholder="support@ebdaey.com" dir="ltr" disabled />
                    </div>
                    <div>
                      <Label className={`mb-1 block ${alignRight}`}>رقم واتساب المنصة</Label>
                      <Input placeholder="201234567890" dir="ltr" disabled />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      ستكون هذه الإعدادات قابلة للتعديل في الإصدارات القادمة
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ===== SUBSCRIPTIONS MANAGEMENT ===== */}
          {activeTab === "subscriptions" && (
            <>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                <div className={alignRight}>
                  <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Crown className="w-6 h-6 text-primary" />
                    إدارة الاشتراكات
                  </h1>
                  <p className="text-muted-foreground text-sm mt-1">
                    إدارة اشتراكات المستخدمين والفوترة لجميع المدربين
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => {}} disabled={refreshing}>
                  <RefreshCw className={`w-3.5 h-3.5 ml-1.5 ${refreshing ? "animate-spin" : ""}`} />
                  تحديث
                </Button>
              </div>

              {/* Filters */}
              <div className="glass-card rounded-2xl p-5 mb-6 flex flex-wrap gap-3 items-center">
                <div className="flex-1 min-w-48 relative">
                  <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="البحث بالبريد الإلكتروني أو الاسم أو المعرف..." className="pr-10" />
                </div>
                <select className="h-10 px-3 rounded-xl border border-border/50 bg-background text-sm">
                  <option value="all-status">جميع الحالات</option>
                  <option value="active">نشط</option>
                  <option value="expired">منتهي</option>
                  <option value="cancelled">ملغي</option>
                </select>
                <select className="h-10 px-3 rounded-xl border border-border/50 bg-background text-sm">
                  <option value="all-plans">جميع الخطط</option>
                  <option value="monthly">شهري</option>
                  <option value="yearly">سنوي</option>
                </select>
                <select className="h-10 px-3 rounded-xl border border-border/50 bg-background text-sm">
                  <option value="all-mentors">جميع المدربين</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subscriptions Table */}
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className={`p-5 border-b border-border/30 ${alignRight}`}>
                  <h3 className="font-bold">إدارة الاشتراكات (0)</h3>
                  <p className="text-xs text-muted-foreground mt-1">عرض 0 من 0 اشتراك</p>
                </div>
                <div className="p-12 text-center text-muted-foreground text-sm">لم يتم العثور على اشتراكات</div>
              </div>
            </>
          )}

          {/* ===== STUDENTS MANAGEMENT ===== */}
          {activeTab === "students" && (
            <>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                <div className="text-start">
                  <h1 className="text-2xl font-bold flex items-center gap-2">
                    <GraduationCap className="w-6 h-6 text-primary" />
                    إدارة الطلاب
                  </h1>
                </div>
                <Button variant="outline" size="sm" onClick={refreshData} disabled={refreshing}>
                  <RefreshCw className={`w-3.5 h-3.5 ml-1.5 ${refreshing ? "animate-spin" : ""}`} />
                  تحديث
                </Button>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                {[
                  {
                    label: "إجمالي الطلاب",
                    value: String(allStudents.length),
                    icon: Users,
                    bg: "bg-blue-500/10",
                    color: "text-blue-600",
                  },
                  {
                    label: "عدد المدربين",
                    value: String(tenants.length),
                    icon: UserCog,
                    bg: "bg-primary/10",
                    color: "text-primary",
                  },
                  {
                    label: "متوسط الطلاب/مدرب",
                    value: String(tenants.length > 0 ? Math.round(allStudents.length / tenants.length) : 0),
                    icon: TrendingUp,
                    bg: "bg-emerald-500/10",
                    color: "text-emerald-600",
                  },
                ].map((m, i) => (
                  <div key={i} className="glass-card rounded-xl p-2.5 text-start">
                    <div className="flex items-center justify-between mb-1">
                      <div className={`w-7 h-7 rounded-lg ${m.bg} flex items-center justify-center`}>
                        <m.icon className={`w-3.5 h-3.5 ${m.color}`} />
                      </div>
                      <p className="text-[11px] text-muted-foreground">{m.label}</p>
                    </div>
                    <p className="text-base font-extrabold">{m.value}</p>
                  </div>
                ))}
              </div>

              <div className="mb-5 flex flex-wrap gap-3 items-center">
                <div className="flex-1 min-w-48 relative">
                  <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="بحث بالاسم أو البريد أو الهاتف..."
                    className="pr-10 bg-white"
                  />
                </div>
                <select
                  value={studentMentorFilter}
                  onChange={(e) => setStudentMentorFilter(e.target.value)}
                  className="h-10 px-3 rounded-xl border border-border/50 bg-white text-sm"
                >
                  <option value="">كل المدربين</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-muted-foreground text-[11px] border-b border-border/40">
                        <th className="text-start py-3 px-4 font-medium">الطالب</th>
                        <th className="text-start py-3 px-4 font-medium">البريد</th>
                        <th className="text-start py-3 px-4 font-medium">الهاتف</th>
                        <th className="text-start py-3 px-4 font-medium">المدرب</th>
                        <th className="text-start py-3 px-4 font-medium">تاريخ التسجيل</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allStudents
                        .filter((s) => {
                          if (studentMentorFilter && s.tenant_id !== studentMentorFilter) return false;
                          if (studentSearch) {
                            const q = studentSearch.toLowerCase();
                            return (
                              s.full_name?.toLowerCase().includes(q) ||
                              s.email?.toLowerCase().includes(q) ||
                              s.phone?.includes(q)
                            );
                          }
                          return true;
                        })
                        .map((s: any) => (
                          <tr
                            key={s.id}
                            className="border-b border-border/20 last:border-0 hover:bg-muted/30 transition-colors"
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                                  {(s.full_name || "S").charAt(0)}
                                </div>
                                <span className="font-semibold">{s.full_name || "—"}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-muted-foreground text-xs" dir="ltr">
                              {s.email || "—"}
                            </td>
                            <td className="py-3 px-4 text-muted-foreground text-xs" dir="ltr">
                              {s.phone || "—"}
                            </td>
                            <td className="py-3 px-4">{s.tenants?.name || "—"}</td>
                            <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">
                              {new Date(s.created_at).toLocaleDateString("ar-EG")}
                            </td>
                          </tr>
                        ))}
                      {allStudents.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-muted-foreground text-sm">
                            لا يوجد طلاب
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ===== CONFIRMED ORDERS BY MENTOR (gateway vs 100% discount) ===== */}
          {activeTab === "paid-orders" &&
            (() => {
              const inRange = (d: string) => {
                if (poFrom && new Date(d) < new Date(`${poFrom}T00:00:00`)) return false;
                if (poTo && new Date(d) > new Date(`${poTo}T23:59:59`)) return false;
                return true;
              };
              const confirmed = orders.filter(
                (o: any) => o.payment_status === "paid" && inRange(o.created_at),
              );
              const isGateway = (o: any) => Number(o.gross_amount || 0) > 0;

              const byMentor = new Map<
                string,
                { name: string; total: number; gateway: number; free: number; revenue: number; revenueUsd: number }
              >();
              confirmed.forEach((o: any) => {
                const key = o.tenant_id || "unknown";
                const row =
                  byMentor.get(key) || {
                    name: o.tenants?.name || "—",
                    total: 0,
                    gateway: 0,
                    free: 0,
                    revenue: 0,
                    revenueUsd: 0,
                  };
                row.total += 1;
                if (isGateway(o)) {
                  row.gateway += 1;
                  if (isUsdRow(o)) row.revenueUsd += grossUsd(o); else row.revenue += Number(o.gross_amount || 0);
                } else {
                  row.free += 1;
                }
                byMentor.set(key, row);
              });

              let rows = Array.from(byMentor.values()).map((r) => ({
                ...r,
                pct: r.total > 0 ? (r.gateway / r.total) * 100 : 0,
              }));
              if (poSearch) {
                const s = poSearch.toLowerCase();
                rows = rows.filter((r) => r.name.toLowerCase().includes(s));
              }
              rows.sort((a, b) =>
                poSort === "pct"
                  ? b.pct - a.pct
                  : poSort === "revenue"
                    ? b.revenue - a.revenue
                    : b.total - a.total,
              );

              const totalCount = confirmed.length;
              const gatewayCount = confirmed.filter(isGateway).length;
              const freeCount = totalCount - gatewayCount;
              const gatewayPct = totalCount > 0 ? (gatewayCount / totalCount) * 100 : 0;

              return (
                <>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                    <div className="text-start">
                      <h1 className="text-2xl font-bold flex items-center gap-2">
                        <ShoppingBag className="w-6 h-6 text-primary" />
                        الطلبات المؤكدة
                      </h1>
                      <p className="text-muted-foreground text-sm mt-1">
                        نسبة الطلبات المدفوعة فعلياً عبر بوابة الدفع مقابل الطلبات بخصم 100% لكل مدرب
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={refreshData} disabled={refreshing}>
                      <RefreshCw className={`w-3.5 h-3.5 ml-1.5 ${refreshing ? "animate-spin" : ""}`} />
                      تحديث
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {[
                      {
                        label: "طلبات مؤكدة",
                        value: String(totalCount),
                        icon: CheckCircle,
                        bg: "bg-blue-500/10",
                        color: "text-blue-600",
                      },
                      {
                        label: "مدفوعة عبر البوابة",
                        value: String(gatewayCount),
                        icon: CreditCard,
                        bg: "bg-emerald-500/10",
                        color: "text-emerald-600",
                      },
                      {
                        label: "بخصم 100%",
                        value: String(freeCount),
                        icon: Tag,
                        bg: "bg-amber-500/10",
                        color: "text-amber-600",
                      },
                      {
                        label: "نسبة الدفع عبر البوابة",
                        value: `${gatewayPct.toFixed(1)}%`,
                        icon: TrendingUp,
                        bg: "bg-primary/10",
                        color: "text-primary",
                      },
                    ].map((m, i) => (
                      <div key={i} className="glass-card rounded-xl p-2.5 text-start">
                        <div className="flex items-center justify-between mb-1">
                          <div className={`w-7 h-7 rounded-lg ${m.bg} flex items-center justify-center`}>
                            <m.icon className={`w-3.5 h-3.5 ${m.color}`} />
                          </div>
                          <p className="text-[11px] text-muted-foreground">{m.label}</p>
                        </div>
                        <p className="text-base font-extrabold">{m.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mb-5 flex flex-wrap gap-3 items-center">
                    <div className="flex-1 min-w-48 relative">
                      <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={poSearch}
                        onChange={(e) => setPoSearch(e.target.value)}
                        placeholder="بحث باسم المدرب..."
                        className="pr-10 bg-background"
                      />
                    </div>
                    <Input
                      type="date"
                      value={poFrom}
                      onChange={(e) => setPoFrom(e.target.value)}
                      className="h-10 w-auto bg-background"
                    />
                    <Input
                      type="date"
                      value={poTo}
                      onChange={(e) => setPoTo(e.target.value)}
                      className="h-10 w-auto bg-background"
                    />
                    <select
                      value={poSort}
                      onChange={(e) => setPoSort(e.target.value)}
                      className="h-10 px-3 rounded-xl border border-border/50 bg-background text-sm"
                    >
                      <option value="count">الأكثر طلبات</option>
                      <option value="pct">الأعلى نسبة دفع</option>
                      <option value="revenue">الأعلى إيراداً</option>
                    </select>
                    {(poSearch || poFrom || poTo || poSort !== "count") && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPoSearch("");
                          setPoFrom("");
                          setPoTo("");
                          setPoSort("count");
                        }}
                      >
                        مسح الفلاتر
                      </Button>
                    )}
                  </div>

                  <div className="glass-card rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-muted-foreground text-[10px] border-b border-border/40">
                            <th className="text-start py-2 px-2 font-medium">المدرب</th>
                            <th className="text-start py-2 px-2 font-medium">طلبات مؤكدة</th>
                            <th className="text-start py-2 px-2 font-medium">عبر البوابة</th>
                            <th className="text-start py-2 px-2 font-medium">بخصم 100%</th>
                            <th className="text-start py-2 px-2 font-medium">نسبة الدفع عبر البوابة</th>
                            <th className="text-start py-2 px-2 font-medium">إيراد البوابة</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((r) => (
                            <tr
                              key={r.name}
                              className="border-b border-border/20 last:border-0 hover:bg-muted/30 transition-colors"
                            >
                              <td className="py-1.5 px-2 font-semibold">{r.name}</td>
                              <td className="py-1.5 px-2">{r.total}</td>
                              <td className="py-1.5 px-2 text-emerald-600 font-bold">{r.gateway}</td>
                              <td className="py-1.5 px-2 text-amber-600 font-bold">{r.free}</td>
                              <td className="py-1.5 px-2">
                                <div className="flex items-center gap-2 min-w-32">
                                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                    <div
                                      className="h-full bg-primary rounded-full"
                                      style={{ width: `${r.pct}%` }}
                                    />
                                  </div>
                                  <span className="font-bold tabular-nums">{r.pct.toFixed(1)}%</span>
                                </div>
                              </td>
                              <td className="py-1.5 px-2 font-bold whitespace-nowrap">
                                {fmtEgp(r.revenue)} · {fmtUsd(r.revenueUsd)}
                              </td>
                            </tr>
                          ))}
                          {rows.length === 0 && (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-muted-foreground">
                                لا توجد طلبات مؤكدة في هذه الفترة
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              );
            })()}

          {/* ===== FINANCIAL TRANSACTIONS ===== */}

          {activeTab === "fin-transactions" &&
            (() => {
              const categoryLabels: Record<string, string> = {
                purchase: "شراء",
                subscription: "اشتراك",
                commission: "عمولة",
                gateway_fee: "رسوم دفع",
                withdrawal: "سحب رصيد",
                refund: "استرداد",
              };
              const filteredTx = allTransactions
                .filter((tx: any) => {
                  if (finTxCategoryFilter && tx.category !== finTxCategoryFilter) return false;
                  if (finTxMentorFilter && tx.tenant_id !== finTxMentorFilter) return false;
                  if (finTxDirection === "in" && !(tx.amount > 0)) return false;
                  if (finTxDirection === "out" && !(tx.amount < 0)) return false;
                  if (finTxFrom && new Date(tx.created_at) < new Date(`${finTxFrom}T00:00:00`)) return false;
                  if (finTxTo && new Date(tx.created_at) > new Date(`${finTxTo}T23:59:59`)) return false;
                  if (finTxSearch) {
                    const s = finTxSearch.toLowerCase();
                    return (
                      (tx.description || "").toLowerCase().includes(s) ||
                      (tx.tenants?.name || "").toLowerCase().includes(s) ||
                      (categoryLabels[tx.category] || "").includes(s)
                    );
                  }
                  return true;
                })
                .sort((a: any, b: any) => {
                  if (finTxSort === "oldest") return +new Date(a.created_at) - +new Date(b.created_at);
                  if (finTxSort === "highest") return Math.abs(b.amount) - Math.abs(a.amount);
                  if (finTxSort === "lowest") return Math.abs(a.amount) - Math.abs(b.amount);
                  return +new Date(b.created_at) - +new Date(a.created_at);
                });
              const totalPositive = filteredTx
                .filter((t: any) => t.amount > 0)
                .reduce((a: number, t: any) => a + t.amount, 0);
              const totalNegative = filteredTx
                .filter((t: any) => t.amount < 0)
                .reduce((a: number, t: any) => a + Math.abs(t.amount), 0);
              return (
                <>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                    <div className="text-start">
                      <h1 className="text-2xl font-bold flex items-center gap-2">
                        <CreditCard className="w-6 h-6 text-primary" />
                        المعاملات المالية
                      </h1>
                      <p className="text-muted-foreground text-sm mt-1">سجل جميع المعاملات المالية على المنصة</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={refreshData} disabled={refreshing}>
                      <RefreshCw className={`w-3.5 h-3.5 ml-1.5 ${refreshing ? "animate-spin" : ""}`} />
                      تحديث
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {[
                      {
                        label: "إجمالي المعاملات",
                        value: String(filteredTx.length),
                        icon: Activity,
                        bg: "bg-blue-500/10",
                        color: "text-blue-600",
                      },
                      {
                        label: "إجمالي الوارد",
                        value: fmtBoth(filteredTx.filter((t: any) => t.amount > 0), (t: any) => t.amount),
                        icon: TrendingUp,
                        bg: "bg-emerald-500/10",
                        color: "text-emerald-600",
                      },
                      {
                        label: "إجمالي الصادر",
                        value: fmtBoth(filteredTx.filter((t: any) => t.amount < 0), (t: any) => Math.abs(t.amount)),
                        icon: TrendingDown,
                        bg: "bg-red-500/10",
                        color: "text-red-600",
                      },
                      {
                        label: "صافي المعاملات",
                        value: fmtBoth(filteredTx, (t: any) => t.amount),
                        icon: Coins,
                        bg: "bg-primary/10",
                        color: "text-primary",
                      },
                    ].map((m, i) => (
                      <div key={i} className="glass-card rounded-2xl p-4 text-start">
                        <div className="flex items-center justify-between mb-2">
                          <div className={`w-9 h-9 rounded-xl ${m.bg} flex items-center justify-center`}>
                            <m.icon className={`w-4 h-4 ${m.color}`} />
                          </div>
                          <p className="text-xs text-muted-foreground">{m.label}</p>
                        </div>
                        <p className="text-xl font-extrabold">{m.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="glass-card rounded-2xl p-4 mb-5 flex flex-wrap gap-3">
                    <div className="relative flex-1 min-w-48">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="بحث بالوصف أو المدرب..."
                        value={finTxSearch}
                        onChange={(e) => setFinTxSearch(e.target.value)}
                        className="pr-10"
                      />
                    </div>
                    <Select
                      value={finTxCategoryFilter}
                      onValueChange={(v) => setFinTxCategoryFilter(v === "all" ? "" : v)}
                    >
                      <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="التصنيف" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">الكل</SelectItem>
                        <SelectItem value="purchase">شراء</SelectItem>
                        <SelectItem value="subscription">اشتراك</SelectItem>
                        <SelectItem value="commission">عمولة</SelectItem>
                        <SelectItem value="gateway_fee">رسوم دفع</SelectItem>
                        <SelectItem value="withdrawal">سحب رصيد</SelectItem>
                        <SelectItem value="refund">استرداد</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={finTxMentorFilter || "all"}
                      onValueChange={(v) => setFinTxMentorFilter(v === "all" ? "" : v)}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="المدرب" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">كل المدربين</SelectItem>
                        {tenants.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={finTxDirection || "all"}
                      onValueChange={(v) => setFinTxDirection(v === "all" ? "" : v)}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="الاتجاه" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">وارد وصادر</SelectItem>
                        <SelectItem value="in">وارد فقط</SelectItem>
                        <SelectItem value="out">صادر فقط</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={finTxSort} onValueChange={setFinTxSort}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="الترتيب" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">الأحدث</SelectItem>
                        <SelectItem value="oldest">الأقدم</SelectItem>
                        <SelectItem value="highest">الأعلى مبلغاً</SelectItem>
                        <SelectItem value="lowest">الأقل مبلغاً</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="date"
                      value={finTxFrom}
                      onChange={(e) => setFinTxFrom(e.target.value)}
                      className="w-[150px] bg-background dark:bg-input"
                      title="من تاريخ"
                    />
                    <Input
                      type="date"
                      value={finTxTo}
                      onChange={(e) => setFinTxTo(e.target.value)}
                      className="w-[150px] bg-background dark:bg-input"
                      title="إلى تاريخ"
                    />
                    {(finTxSearch ||
                      finTxCategoryFilter ||
                      finTxMentorFilter ||
                      finTxDirection ||
                      finTxFrom ||
                      finTxTo ||
                      finTxSort !== "newest") && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-10"
                        onClick={() => {
                          setFinTxSearch("");
                          setFinTxCategoryFilter("");
                          setFinTxMentorFilter("");
                          setFinTxDirection("");
                          setFinTxFrom("");
                          setFinTxTo("");
                          setFinTxSort("newest");
                        }}
                      >
                        مسح الفلاتر
                      </Button>
                    )}
                  </div>

                  <div className="glass-card rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-muted-foreground text-[11px] border-b border-border/40">
                            <th className="text-start py-3 px-4 font-medium">التاريخ والوقت</th>
                            <th className="text-start py-3 px-4 font-medium">المبلغ</th>
                            <th className="text-start py-3 px-4 font-medium">التصنيف</th>
                            <th className="text-start py-3 px-4 font-medium">الوصف</th>
                            <th className="text-start py-3 px-4 font-medium">المصدر (المدرب)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredTx.length === 0 && (
                            <tr>
                              <td colSpan={5} className="py-12 text-center text-muted-foreground text-sm">
                                لا توجد معاملات
                              </td>
                            </tr>
                          )}
                          {filteredTx.map((tx: any) => {
                            const d = new Date(tx.created_at);
                            const dateStr = d.toLocaleDateString("ar-EG", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            });
                            const timeStr = d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
                            const isPositive = tx.amount > 0;
                            const categoryBadgeColors: Record<string, string> = {
                              purchase: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
                              subscription: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                              commission: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                              gateway_fee: "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
                              withdrawal: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                              refund: "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
                            };
                            return (
                              <tr
                                key={tx.id}
                                className="border-b border-border/20 last:border-0 hover:bg-muted/30 transition-colors"
                              >
                                <td className="py-3 px-4">
                                  <div className="font-medium text-xs">{dateStr}</div>
                                  <div className="text-[11px] text-muted-foreground">{timeStr}</div>
                                </td>
                                <td className="py-3 px-4">
                                  <span
                                    className={`font-bold text-sm ${isPositive ? "text-emerald-600" : "text-red-600"}`}
                                  >
                                    {isPositive ? "+" : "-"}
                                    {fmtRow(Math.abs(tx.amount), tx)}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <span
                                    className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full ${categoryBadgeColors[tx.category] || "bg-muted text-muted-foreground"}`}
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                                    {categoryLabels[tx.category] || tx.category}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-muted-foreground max-w-[250px] truncate text-xs">
                                  {tx.description || "—"}
                                </td>
                                <td className="py-3 px-4 font-medium text-xs">{tx.tenants?.name || "—"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              );
            })()}

          {/* ===== BALANCE CONTROL ===== */}
          {activeTab === "balances" && (
            <>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                <div className={alignRight}>
                  <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Coins className="w-6 h-6 text-primary" />
                    تحكم الأرصدة
                  </h1>
                  <p className="text-muted-foreground text-sm mt-1">إدارة أرصدة المدربين وتعديلاتها</p>
                </div>
                <Button variant="outline" size="sm" onClick={refreshData} disabled={refreshing}>
                  <RefreshCw className={`w-3.5 h-3.5 ml-1.5 ${refreshing ? "animate-spin" : ""}`} />
                  تحديث
                </Button>
              </div>

              <div className="glass-card rounded-2xl overflow-hidden mb-5">
                <div className={`p-5 border-b border-border/30 flex   items-center gap-2 ${alignRight}`}>
                  <h3 className="font-bold">أرصدة المدربين</h3>
                  <Coins className="w-5 h-5 text-primary" />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-muted-foreground text-[11px] border-b border-border/40">
                        <th className={`${alignRight} py-3 px-4 font-medium`}>المدرب</th>
                        <th className={`${alignRight} py-3 px-4 font-medium`}>إجمالي المبيعات</th>
                        <th className={`${alignRight} py-3 px-4 font-medium`}>صافي الأرباح</th>
                        <th className={`${alignRight} py-3 px-4 font-medium`}>التعديلات</th>
                        <th className={`${alignRight} py-3 px-4 font-medium`}>الرصيد الفعلي</th>
                        <th className={`${alignRight} py-3 px-4 font-medium`}>حالة السحب</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tenants.map((t) => {
                        const tOrders = orders.filter(
                          (o) => o.payment_status === "paid" && (o as any).tenant_id === t.id,
                        );
                        const tGross = sumCur(tOrders, (o) => o.gross_amount, false);
                        const tNet = sumCur(tOrders, (o) => o.mentor_net, false);
                        const tGrossUsd = sumCur(tOrders, grossUsd, true);
                        const tNetUsd = sumCur(tOrders, (o) => o.mentor_net, true);
                        const tUsdBal = Number(usdBalances[t.id] || 0);
                        const tAdj = allBalanceAdjustments
                          .filter((a: any) => a.tenant_id === t.id && !isUsdRow(a))
                          .reduce((a: number, adj: any) => a + adj.amount, 0);
                        const tWithdrawn = withdrawals
                          .filter((w) => w.tenant_id === t.id && (w.status === "paid" || w.status === "approved") && ((w as any).currency || "EGP") !== "USD")
                          .reduce((a, w) => a + w.amount, 0);
                        const effectiveBalance = tNet + tAdj - tWithdrawn;
                        return (
                          <tr
                            key={t.id}
                            className="border-b border-border/20 last:border-0 hover:bg-muted/30 transition-colors"
                          >
                            <td className={`${alignRight} py-3 px-4`}>
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                                  {(t.name || "M").charAt(0)}
                                </div>
                                <span className="font-semibold">{t.name}</span>
                              </div>
                            </td>
                            <td className={`${alignRight} py-3 px-4 text-muted-foreground`}>
                              {fmtEgp(tGross)}<div className="text-xs">{fmtUsd(tGrossUsd)}</div>
                            </td>
                            <td className={`${alignRight} py-3 px-4 font-bold text-emerald-600`}>
                              {fmtEgp(tNet)}<div className="text-xs">{fmtUsd(tNetUsd)}</div>
                            </td>
                            <td className={`${alignRight} py-3 px-4`}>
                              <span className={`font-semibold ${tAdj >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                {tAdj > 0 ? "+" : ""}
                                {fmtEgp(tAdj)}
                              </span>
                            </td>
                            <td className={`${alignRight} py-3 px-4 font-bold`}>
                              {fmtEgp(effectiveBalance)}<div className="text-xs text-muted-foreground">{fmtUsd(tUsdBal)}</div>
                            </td>
                            <td className={`${alignRight} py-3 px-4`}>
                              <span
                                className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                                  (t as any).is_withdrawal_frozen
                                    ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                    : "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                }`}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                                {(t as any).is_withdrawal_frozen ? "مجمد" : "مفعل"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="glass-card rounded-2xl p-5 mb-5 border border-amber-200/40 dark:border-amber-800/30">
                <h3 className={`font-bold mb-4 flex flex-row-reverse items-center gap-2 ${alignRight}`}>
                  تعديل رصيد سريع
                  <DollarSign className="w-5 h-5 text-amber-600" />
                </h3>
                <div className="grid sm:grid-cols-3 gap-4 mb-4">
                  <div>
                    <Label className={`mb-1 block ${alignRight}`}>المدرب</Label>
                    <select
                      value={balTabTenantId}
                      onChange={(e) => setBalTabTenantId(e.target.value)}
                      className={`w-full h-10 px-3 rounded-xl border border-border/50 bg-background text-sm ${alignRight}`}
                    >
                      <option value="">اختر المدرب...</option>
                      {tenants.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className={`mb-1 block ${alignRight}`}>المبلغ (+ للإضافة، - للخصم)</Label>
                    <Input
                      value={balTabAmount}
                      onChange={(e) => setBalTabAmount(e.target.value)}
                      placeholder="500 أو -200"
                      type="number"
                      className={alignRight}
                    />
                  </div>
                  <div>
                    <Label className={`mb-1 block ${alignRight}`}>السبب (إلزامي)</Label>
                    <Input
                      value={balTabReason}
                      onChange={(e) => setBalTabReason(e.target.value)}
                      placeholder="سبب التعديل..."
                      className={alignRight}
                    />
                  </div>
                </div>
                <div className={alignRight}>
                  <Button
                    onClick={async () => {
                      if (!balTabTenantId || !balTabAmount || !balTabReason || !user) return;
                      const amount = parseFloat(balTabAmount);
                      if (isNaN(amount) || amount === 0) return;
                      await supabase
                        .from("balance_adjustments")
                        .insert([{ tenant_id: balTabTenantId, amount, reason: balTabReason, admin_id: user.id }]);
                      const tName = tenants.find((t) => t.id === balTabTenantId)?.name;
                      await logAction("تعديل رصيد", "tenant", balTabTenantId, {
                        name: tName,
                        amount,
                        reason: balTabReason,
                      });
                      toast({ title: `تم ${amount > 0 ? "إضافة" : "خصم"} ${Math.abs(amount)} ج.م` });
                      setBalTabTenantId("");
                      setBalTabAmount("");
                      setBalTabReason("");
                      loadData();
                    }}
                    disabled={!balTabTenantId || !balTabAmount || !balTabReason}
                    className="gradient-primary text-primary-foreground border-0"
                  >
                    تأكيد التعديل
                  </Button>
                </div>
              </div>

              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="p-5 border-b border-border/30 flex flex-row-reverse items-center justify-between gap-3">
                  <h3 className={`font-bold ${alignRight}`}>سجل التعديلات</h3>
                  <div className="relative w-56">
                    <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={balanceSearch}
                      onChange={(e) => setBalanceSearch(e.target.value)}
                      placeholder="بحث..."
                      className="pr-10"
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-muted-foreground text-[11px] border-b border-border/40">
                        <th className={`${alignRight} py-3 px-4 font-medium`}>المدرب</th>
                        <th className={`${alignRight} py-3 px-4 font-medium`}>المبلغ</th>
                        <th className={`${alignRight} py-3 px-4 font-medium`}>السبب</th>
                        <th className={`${alignRight} py-3 px-4 font-medium`}>التاريخ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allBalanceAdjustments
                        .filter((a: any) => {
                          if (!balanceSearch) return true;
                          const q = balanceSearch.toLowerCase();
                          return a.tenants?.name?.toLowerCase().includes(q) || a.reason?.toLowerCase().includes(q);
                        })
                        .map((adj: any) => (
                          <tr
                            key={adj.id}
                            className="border-b border-border/20 last:border-0 hover:bg-muted/30 transition-colors"
                          >
                            <td className={`${alignRight} py-3 px-4 font-semibold`}>{adj.tenants?.name || "—"}</td>
                            <td className={`${alignRight} py-3 px-4`}>
                              <span className={`font-bold ${adj.amount > 0 ? "text-emerald-600" : "text-red-600"}`}>
                                {adj.amount > 0 ? "+" : ""}
                                {fmtRow(adj.amount, adj)}
                              </span>
                            </td>
                            <td className={`${alignRight} py-3 px-4 text-muted-foreground text-xs`}>{adj.reason}</td>
                            <td className={`${alignRight} py-3 px-4 text-muted-foreground text-xs whitespace-nowrap`}>
                              {new Date(adj.created_at).toLocaleDateString("ar-EG")}
                            </td>
                          </tr>
                        ))}
                      {allBalanceAdjustments.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-12 text-center text-muted-foreground text-sm">
                            لا توجد تعديلات
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ===== SETTLEMENTS ===== */}
          {activeTab === "settlements" &&
            (() => {
              const rows = tenants
                .map((t) => {
                  const tOrders = orders.filter((o) => o.payment_status === "paid" && (o as any).tenant_id === t.id && (o as any).gateway !== "stripe");
                  const tNet = tOrders.reduce((a, o) => a + o.mentor_net, 0);
                  const tAdj = allBalanceAdjustments
                    .filter((a: any) => a.tenant_id === t.id && (a.currency || "EGP") !== "USD")
                    .reduce((a: number, adj: any) => a + adj.amount, 0);
                  const tWithdrawn = withdrawals
                    .filter((w) => w.tenant_id === t.id && (w.status === "paid" || w.status === "approved") && !isUsdRow(w))
                    .reduce((a, w) => a + w.amount, 0);
                  const balance = tNet + tAdj - tWithdrawn;
                  const ws = withdrawalSettings.find((w) => w.tenant_id === t.id);
                  const usd = Number(usdBalances[t.id] || 0);
                  return { tenant: t, balance, tNet, tAdj, tWithdrawn, ws, usd };
                })
                .filter((r) => Math.round(r.balance) !== 0 || r.usd > 0)
                .filter((r) => {
                  if (!settlementSearch) return true;
                  const q = settlementSearch.toLowerCase();
                  return r.tenant.name?.toLowerCase().includes(q) || r.tenant.slug?.toLowerCase().includes(q);
                })
                .sort((a, b) => b.balance - a.balance);

              const totalDue = rows.reduce((a, r) => a + Math.max(0, r.balance), 0);

              return (
                <>
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-6 gap-4">
                    <div className={alignRight}>
                      <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Banknote className="w-6 h-6 text-primary" />
                        التسوية
                      </h1>
                      <p className="text-muted-foreground text-sm mt-1">
                        عرض الأرصدة غير الصفرية وتنفيذ التسوية البنكية للمدربين
                      </p>
                    </div>
                    <div className="flex items-center flex-wrap gap-2">
                      <div className="glass-card rounded-xl px-3 py-1.5 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                          <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                        </div>
                        <div className={`${alignRight} leading-tight`}>
                          <p className="text-[10px] text-muted-foreground">إجمالي المستحق</p>
                          <p className="text-sm font-extrabold">{fmtEgp(totalDue)} · {fmtUsd(rows.reduce((a, r) => a + Math.max(0, r.usd), 0))}</p>
                        </div>
                      </div>
                      <div className="glass-card rounded-xl px-3 py-1.5 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <UserCog className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div className={`${alignRight} leading-tight`}>
                          <p className="text-[10px] text-muted-foreground">عدد المدربين</p>
                          <p className="text-sm font-extrabold">{rows.length}</p>
                        </div>
                      </div>
                      <div className="glass-card rounded-xl px-3 py-1.5 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        </div>
                        <div className={`${alignRight} leading-tight`}>
                          <p className="text-[10px] text-muted-foreground">بدون بيانات بنكية</p>
                          <p className="text-sm font-extrabold">
                            {rows.filter((r) => !r.ws || r.ws.status !== "approved").length}
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={refreshData} disabled={refreshing}>
                        <RefreshCw className={`w-3.5 h-3.5 ml-1.5 ${refreshing ? "animate-spin" : ""}`} />
                        تحديث
                      </Button>
                    </div>
                  </div>

                  <div className="glass-card rounded-2xl overflow-hidden">
                    <div className="p-5 border-b border-border/30 flex items-center justify-between gap-3">
                      <h3 className={`font-bold ${alignRight} flex items-center gap-2`}>
                        <Banknote className="w-5 h-5 text-primary" />
                        الأرصدة غير الصفرية
                      </h3>
                      <div className="relative w-56">
                        <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={settlementSearch}
                          onChange={(e) => setSettlementSearch(e.target.value)}
                          placeholder="بحث عن مدرب..."
                          className="pr-10"
                        />
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-muted-foreground text-[11px] border-b border-border/40">
                            <th className="text-start py-3 px-4 font-medium">المدرب</th>
                            <th className="text-start py-3 px-4 font-medium">صافي الأرباح</th>
                            <th className="text-start py-3 px-4 font-medium">التعديلات</th>
                            <th className="text-start py-3 px-4 font-medium">المسحوب</th>
                            <th className="text-start py-3 px-4 font-medium">الرصيد المستحق</th>
                            <th className="text-start py-3 px-4 font-medium">البيانات البنكية</th>
                            <th className="text-start py-3 px-4 font-medium">إجراء</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((r) => (
                            <tr
                              key={r.tenant.id}
                              className="border-b border-border/20 last:border-0 hover:bg-muted/30 transition-colors"
                            >
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                                    {(r.tenant.name || "M").charAt(0)}
                                  </div>
                                  <div>
                                    <div className="font-semibold">{r.tenant.name}</div>
                                    <div className="text-[11px] text-muted-foreground">{r.tenant.slug}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-emerald-600 font-semibold">
                                {fmtEgp(r.tNet)}
                              </td>
                              <td className="py-3 px-4">
                                <span className={r.tAdj >= 0 ? "text-emerald-600" : "text-red-600"}>
                                  {r.tAdj > 0 ? "+" : ""}
                                  {fmtEgp(r.tAdj)}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-muted-foreground">{fmtEgp(r.tWithdrawn)}</td>
                              <td className="py-3 px-4">
                                <span
                                  className={`font-extrabold ${r.balance > 0 ? "text-emerald-600" : "text-red-600"}`}
                                >
                                  {fmtEgp(r.balance)}
                                </span>
                                <div className="text-xs text-muted-foreground">{fmtUsd(r.usd)}</div>
                              </td>
                              <td className="py-3 px-4">
                                {r.ws?.status === "approved" ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                    <CheckCircle className="w-3 h-3" />
                                    متوفرة
                                  </span>
                                ) : r.ws ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                    <Clock className="w-3 h-3" />
                                    {r.ws.status === "pending" ? "قيد المراجعة" : r.ws.status}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                    <XCircle className="w-3 h-3" />
                                    غير مسجلة
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                <Button size="sm" variant="outline" onClick={() => setSettlementMentor(r)}>
                                  <Eye className="w-3.5 h-3.5 ml-1" />
                                  فتح
                                </Button>
                              </td>
                            </tr>
                          ))}
                          {rows.length === 0 && (
                            <tr>
                              <td colSpan={7} className="py-12 text-center text-muted-foreground text-sm">
                                لا توجد أرصدة تحتاج للتسوية
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <Dialog open={!!settlementMentor} onOpenChange={(o) => !o && setSettlementMentor(null)}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className={`flex items-center gap-2 ${alignRight}`}>
                          <Banknote className="w-5 h-5 text-primary" />
                          تفاصيل تسوية الرصيد
                        </DialogTitle>
                      </DialogHeader>
                      {settlementMentor && (
                        <div className="space-y-5">
                          <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                            <div className="flex items-center gap-3 mb-4">
                              <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                                {(settlementMentor.tenant.name || "M").charAt(0)}
                              </div>
                              <div className={`${alignRight} flex-1`}>
                                <div className="font-bold">{settlementMentor.tenant.name}</div>
                                <div className="text-xs text-muted-foreground">{settlementMentor.tenant.slug}</div>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div className="rounded-lg bg-background p-3 border border-border/40">
                                <div className="text-[11px] text-muted-foreground mb-1">صافي الأرباح</div>
                                <div className="font-bold text-emerald-600">
                                  {fmtEgp(settlementMentor.tNet)}
                                </div>
                              </div>
                              <div className="rounded-lg bg-background p-3 border border-border/40">
                                <div className="text-[11px] text-muted-foreground mb-1">تعديلات</div>
                                <div
                                  className={`font-bold ${settlementMentor.tAdj >= 0 ? "text-emerald-600" : "text-red-600"}`}
                                >
                                  {settlementMentor.tAdj > 0 ? "+" : ""}
                                  {fmtEgp(settlementMentor.tAdj)}
                                </div>
                              </div>
                              <div className="rounded-lg bg-background p-3 border border-border/40">
                                <div className="text-[11px] text-muted-foreground mb-1">مسحوب سابقاً</div>
                                <div className="font-bold text-muted-foreground">
                                  {fmtEgp(settlementMentor.tWithdrawn)}
                                </div>
                              </div>
                              <div className="rounded-lg bg-primary/5 p-3 border border-primary/30">
                                <div className="text-[11px] text-muted-foreground mb-1">الرصيد المستحق للتحويل</div>
                                <div
                                  className={`font-extrabold text-lg ${settlementMentor.balance > 0 ? "text-emerald-600" : "text-red-600"}`}
                                >
                                  {fmtEgp(settlementMentor.balance)}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                            <h3 className={`font-bold mb-3 flex items-center gap-2 ${alignRight}`}>
                              <CreditCard className="w-4 h-4 text-primary" />
                              البيانات البنكية
                            </h3>
                            {settlementMentor.ws ? (
                              <div className="space-y-2 text-sm">
                                {settlementMentor.ws.status !== "approved" && (
                                  <div className="mb-3 flex items-center gap-2 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-2.5 text-xs">
                                    <AlertTriangle className="w-4 h-4 shrink-0" />
                                    البيانات البنكية غير معتمدة (الحالة: {settlementMentor.ws.status})
                                  </div>
                                )}
                                {[
                                  { label: "الاسم القانوني", value: settlementMentor.ws.legal_name },
                                  { label: "اسم البنك", value: settlementMentor.ws.bank_name },
                                  { label: "المستفيد", value: (settlementMentor.ws as any).beneficiary_name },
                                  { label: "IBAN", value: settlementMentor.ws.iban, dir: "ltr" as const },
                                  { label: "العنوان", value: (settlementMentor.ws as any).address },
                                  {
                                    label: "نوع الحساب",
                                    value:
                                      (settlementMentor.ws as any).account_type === "company"
                                        ? "شركة"
                                        : (settlementMentor.ws as any).account_type === "personal"
                                          ? "شخصي"
                                          : null,
                                  },
                                ]
                                  .filter((r) => r.value)
                                  .map((r) => (
                                    <div
                                      key={r.label}
                                      className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0 gap-3"
                                    >
                                      <span
                                        className={`text-sm font-mono font-semibold break-all ${alignRight}`}
                                        dir={r.dir || undefined}
                                      >
                                        {r.value}
                                      </span>
                                      <span className="text-xs text-muted-foreground shrink-0">{r.label}</span>
                                    </div>
                                  ))}
                              </div>
                            ) : (
                              <div className="text-sm text-muted-foreground text-center py-4">
                                لم يقم المدرب بتسجيل بياناته البنكية بعد
                              </div>
                            )}
                          </div>

                          {settlementMentor.usd > 0 && (() => {
                            const usd = settlementMentor.usd as number;
                            const fee = Math.round(Math.max(15, usd * 0.025) * 100) / 100;
                            const net = Math.max(0, Math.round((usd - fee) * 100) / 100);
                            return (
                              <div className="rounded-xl border border-border p-4 space-y-2 text-sm">
                                <div className="flex justify-between"><span className="font-semibold">${usd.toFixed(2)}</span><span className="text-muted-foreground">رصيد Stripe (دولار)</span></div>
                                <div className="flex justify-between"><span>−${fee.toFixed(2)}</span><span className="text-muted-foreground">رسوم السحب (٢٫٥٪، حد أدنى ١٥$)</span></div>
                                <div className="flex justify-between font-bold"><span>${net.toFixed(2)}</span><span>المبلغ المحوّل</span></div>
                                <Button
                                  variant="outline"
                                  className="w-full"
                                  disabled={settlementConfirming || !user || net <= 0}
                                  onClick={async () => {
                                    if (!user || !confirm(`تأكيد تسوية $${usd.toFixed(2)} للمدرب ${settlementMentor.tenant.name}؟ سيتم تحويل $${net.toFixed(2)} بعد الرسوم.`)) return;
                                    setSettlementConfirming(true);
                                    const { error } = await supabase.from("balance_adjustments").insert([{
                                      tenant_id: settlementMentor.tenant.id, amount: -usd, currency: "USD", kind: "settlement", admin_id: user.id,
                                      reason: `تسوية رصيد Stripe - $${usd.toFixed(2)} (رسوم $${fee.toFixed(2)}، صافي محوّل $${net.toFixed(2)})`,
                                    } as any]);
                                    setSettlementConfirming(false);
                                    if (error) { toast({ title: "فشل تنفيذ التسوية", description: error.message, variant: "destructive" }); return; }
                                    await logAction("تسوية رصيد دولار", "tenant", settlementMentor.tenant.id, { amount_usd: usd, fee_usd: fee, net_usd: net });
                                    toast({ title: "تمت تسوية رصيد الدولار" });
                                    setSettlementMentor(null);
                                    loadUsdBalances();
                                    loadData();
                                  }}
                                >
                                  تسوية رصيد الدولار
                                </Button>
                              </div>
                            );
                          })()}
                          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                            <Button variant="outline" onClick={() => setSettlementMentor(null)}>
                              إلغاء
                            </Button>
                            <Button
                              className="gradient-primary text-primary-foreground border-0"
                              disabled={
                                settlementConfirming ||
                                !settlementMentor.ws ||
                                settlementMentor.ws.status !== "approved" ||
                                Math.round(settlementMentor.balance) === 0 ||
                                !user
                              }
                              onClick={async () => {
                                if (!settlementMentor || !user) return;
                                const amount = -settlementMentor.balance;
                                if (
                                  !confirm(
                                    `تأكيد تسوية رصيد ${settlementMentor.balance.toLocaleString()} ج.م للمدرب ${settlementMentor.tenant.name}؟ سيتم تصفير الرصيد.`,
                                  )
                                )
                                  return;
                                setSettlementConfirming(true);
                                const { data: adjustment, error } = await supabase
                                  .from("balance_adjustments")
                                  .insert([
                                    {
                                      tenant_id: settlementMentor.tenant.id,
                                      amount,
                                      reason: `تسوية رصيد وتحويل بنكي - ${settlementMentor.balance.toLocaleString()} ج.م`,
                                      admin_id: user.id,
                                      kind: "settlement",
                                    },
                                  ])
                                  .select("id")
                                  .single();

                                setSettlementConfirming(false);
                                if (error) {
                                  toast({
                                    title: "فشل تنفيذ التسوية",
                                    description: error.message,
                                    variant: "destructive",
                                  });
                                  return;
                                }
                                await logAction("تسوية رصيد", "tenant", settlementMentor.tenant.id, {
                                  name: settlementMentor.tenant.name,
                                  amount: settlementMentor.balance,
                                });
                                // Notify the mentor by email (best-effort — settlement already succeeded).
                                try {
                                  await supabase.functions.invoke("send-settlement-email", {
                                    body: {
                                      tenant_id: settlementMentor.tenant.id,
                                      amount: settlementMentor.balance,
                                      adjustment_id: adjustment?.id,
                                    },


                                  });
                                } catch (mailErr) {
                                  console.error("settlement email failed", mailErr);
                                }
                                toast({
                                  title: "تم تنفيذ التسوية بنجاح",
                                  description: `تم تصفير رصيد ${settlementMentor.tenant.name} وإرسال إشعار بريدي للمدرب`,
                                });
                                setSettlementMentor(null);
                                loadData();
                              }}
                            >
                              <CheckCircle className="w-4 h-4 ml-2" />
                              {settlementConfirming ? "جاري التنفيذ..." : "تأكيد التسوية وتصفير الرصيد"}
                            </Button>
                          </div>
                          {settlementMentor.ws?.status !== "approved" && (
                            <p className="text-xs text-amber-600 text-center">
                              لا يمكن تنفيذ التسوية قبل اعتماد البيانات البنكية من قسم "البيانات البنكية والسحب"
                            </p>
                          )}
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </>
              );
            })()}

          {/* ===== NOTIFICATIONS MANAGEMENT ===== */}

          {activeTab === "notifications" && (
            <>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                <div className="text-start">
                  <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Bell className="w-6 h-6 text-primary" />
                    الإشعارات
                  </h1>
                  <p className="text-muted-foreground text-sm mt-1">إدارة ومراقبة جميع الإشعارات عبر المنصة</p>
                </div>
                <Button variant="outline" size="sm" onClick={refreshData} disabled={refreshing}>
                  <RefreshCw className={`w-3.5 h-3.5 ml-1.5 ${refreshing ? "animate-spin" : ""}`} />
                  تحديث
                </Button>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {[
                  {
                    label: "إجمالي الإشعارات",
                    value: allNotifications.length,
                    icon: Bell,
                    bg: "bg-blue-500/10",
                    color: "text-blue-600",
                  },
                  {
                    label: "المدربون المُرسِلون",
                    value: new Set(allNotifications.map((n: any) => n.tenant_id)).size,
                    icon: UserCog,
                    bg: "bg-primary/10",
                    color: "text-primary",
                  },
                  {
                    label: "آخر 7 أيام",
                    value: allNotifications.filter(
                      (n: any) => new Date(n.created_at) > new Date(Date.now() - 7 * 86400000),
                    ).length,
                    icon: Clock,
                    bg: "bg-emerald-500/10",
                    color: "text-emerald-600",
                  },
                ].map((m, i) => (
                  <div key={i} className="glass-card rounded-2xl p-4 text-start">
                    <div className="flex items-center justify-between mb-2">
                      <div className={`w-9 h-9 rounded-xl ${m.bg} flex items-center justify-center`}>
                        <m.icon className={`w-4 h-4 ${m.color}`} />
                      </div>
                      <p className="text-xs text-muted-foreground">{m.label}</p>
                    </div>
                    <p className="text-xl font-extrabold">{m.value}</p>
                  </div>
                ))}
              </div>

              <div className="glass-card rounded-2xl p-4 mb-5 flex flex-wrap gap-3">
                <div className="flex-1 min-w-48 relative">
                  <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={notifSearch}
                    onChange={(e) => setNotifSearch(e.target.value)}
                    placeholder="بحث بالعنوان أو الوصف..."
                    className="pr-9"
                  />
                </div>
                <select
                  value={notifMentorFilter}
                  onChange={(e) => setNotifMentorFilter(e.target.value)}
                  className="h-10 px-3 rounded-xl border border-border/50 bg-background text-sm"
                >
                  <option value="">كل المدربين</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-muted-foreground text-[11px] border-b border-border/40">
                        <th className="text-start py-3 px-4 font-medium">العنوان</th>
                        <th className="text-start py-3 px-4 font-medium">الوصف</th>
                        <th className="text-start py-3 px-4 font-medium">الأيقونة</th>
                        <th className="text-start py-3 px-4 font-medium">المدرب</th>
                        <th className="text-start py-3 px-4 font-medium">التاريخ</th>
                        <th className="text-start py-3 px-4 font-medium">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allNotifications
                        .filter((n: any) => {
                          if (notifMentorFilter && n.tenant_id !== notifMentorFilter) return false;
                          if (notifSearch) {
                            const q = notifSearch.toLowerCase();
                            return n.title?.toLowerCase().includes(q) || n.description?.toLowerCase().includes(q);
                          }
                          return true;
                        })
                        .map((n: any) => (
                          <tr
                            key={n.id}
                            className="border-b border-border/20 last:border-0 hover:bg-muted/30 transition-colors"
                          >
                            <td className="py-3 px-4 font-semibold text-xs">{n.title}</td>
                            <td
                              className="py-3 px-4 text-muted-foreground max-w-[180px] truncate text-xs"
                              title={n.description || ""}
                            >
                              {n.description || "—"}
                            </td>
                            <td className="py-3 px-4">
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                                {n.icon_name}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-xs">{n.tenants?.name || "—"}</td>
                            <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">
                              {new Date(n.created_at).toLocaleDateString("ar-EG")}
                            </td>
                            <td className="py-3 px-4">
                              <button
                                onClick={async () => {
                                  await supabase.from("notifications").delete().eq("id", n.id);
                                  await logAction("حذف إشعار", "notification", n.id, { title: n.title });
                                  toast({ title: "تم حذف الإشعار" });
                                  loadData();
                                }}
                                className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      {allNotifications.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-muted-foreground text-sm">
                            لا توجد إشعارات
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {activeTab === "products" && (
            <AdminProductsManager
              tenants={tenants}
              onOpenMentorDetail={(tenantId) => {
                const tenant = tenants.find((t) => t.id === tenantId);
                if (tenant) {
                  setActiveTab("mentors");
                  openMentorDetail(tenant);
                }
              }}
            />
          )}

          {activeTab === "transfers" && <AdminTransfersManager />}

          {activeTab === "coupons" && <AdminCouponsManager />}

          {activeTab === "platform-announcements" && <PlatformAnnouncementsManager />}

          {/* ===== CHANGE PASSWORD ===== */}
          {activeTab === "change-password" && <ChangePassword />}

          {/* ===== EMAIL NOTIFICATIONS ===== */}
          {activeTab === "email-notifications" && <EmailNotificationsManager />}

          {/* ===== ACTIVITY LOGS ===== */}
          {activeTab === "logs" && (
            <>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                <div className={alignRight}>
                  <h1 className="text-2xl font-bold">سجل النشاط 📜</h1>
                  <p className="text-muted-foreground text-sm mt-1">تتبع جميع الإجراءات والتغييرات على المنصة</p>
                </div>
                <Button variant="outline" size="sm" onClick={refreshData} disabled={refreshing}>
                  <RefreshCw className={`w-3.5 h-3.5 ml-1.5 ${refreshing ? "animate-spin" : ""}`} />
                  تحديث
                </Button>
              </div>
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-muted-foreground text-[11px] border-b border-border/40">
                        <th className={`${alignRight} py-3 px-4 font-medium`}>الإجراء</th>
                        <th className={`${alignRight} py-3 px-4 font-medium`}>النوع</th>
                        <th className={`${alignRight} py-3 px-4 font-medium`}>المستخدم</th>
                        <th className={`${alignRight} py-3 px-4 font-medium`}>التاريخ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log) => (
                        <tr
                          key={log.id}
                          className="border-b border-border/20 last:border-0 hover:bg-muted/30 transition-colors"
                        >
                          <td className="py-3 px-4 font-semibold text-xs">{log.action}</td>
                          <td className="py-3 px-4">
                            {log.target_type ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                                {log.target_type}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-xs text-muted-foreground">{log.actor_type}</td>
                          <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString("ar-EG")}
                          </td>
                        </tr>
                      ))}
                      {logs.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-12 text-center text-muted-foreground text-sm">
                            لا توجد سجلات بعد
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
