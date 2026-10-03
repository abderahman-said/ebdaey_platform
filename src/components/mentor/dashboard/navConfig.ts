import React from "react";
import {
  Home,
  ShoppingCart,
  Users,
  Tag,
  Wallet,
  TrendingUp,
  Edit2,
  KeyRound,
  Star,
  Crown,
  BadgeCheck,
  CreditCard,
  Bell,
  Award,
  ArrowUpDown,
  Video as VideoIcon,
  CalendarClock,
  CalendarCheck,
  Banknote,
  FileArchive,
  Globe2,
} from "lucide-react";
import { AppsPlusIcon } from "@/components/common/AppsPlusIcon";
import {
  UserChatIcon,
  UserChatDotsIcon,
  PlayCircleSolid,
} from "./icons";

export {
  UserChatIcon,
  UserChatDoubleIcon,
  UserChatDotsIcon,
  PlayCircleSolid,
} from "./icons";

export interface NavItemDef {
  icon: React.ComponentType<{ className?: string }>;
  labelKey: string;
  key: string;
  children?: NavItemDef[];
}

export interface NavGroupDef {
  key: string;
  labelKey: string;
  items: NavItemDef[];
}

export const navGroups: NavGroupDef[] = [
  {
    key: "home",
    labelKey: "mentorSidebar.groups.home",
    items: [
      { icon: Home, labelKey: "mentorSidebar.items.home", key: "overview" },
      { icon: ShoppingCart, labelKey: "mentorSidebar.items.orders", key: "orders" },
      { icon: Users, labelKey: "mentorSidebar.items.students", key: "students" },
      { icon: CalendarClock, labelKey: "mentorSidebar.items.schedules", key: "schedules" },
      { icon: CalendarCheck, labelKey: "mentorSidebar.items.upcomingAppointments", key: "upcoming-appointments" },
      { icon: Globe2, labelKey: "mentorSidebar.items.profile", key: "profile" },
    ],
  },
  {
    key: "products",
    labelKey: "mentorSidebar.groups.products",
    items: [
      { icon: PlayCircleSolid, labelKey: "mentorSidebar.items.courses", key: "courses" },
      { icon: FileArchive, labelKey: "mentorSidebar.items.digitalProducts", key: "digital-products" },
      { icon: VideoIcon, labelKey: "mentorSidebar.items.liveCourses", key: "live-courses" },
      { icon: UserChatIcon, labelKey: "mentorSidebar.items.consultations", key: "consultations" },
      { icon: UserChatDotsIcon, labelKey: "mentorSidebar.items.sessionBundles", key: "session-bundles" },
    ],
  },
  {
    key: "finance",
    labelKey: "mentorSidebar.groups.finance",
    items: [
      { icon: ArrowUpDown, labelKey: "mentorSidebar.items.transactions", key: "transactions" },
      { icon: Wallet, labelKey: "mentorSidebar.items.withdrawals", key: "withdrawals" },
      { icon: Banknote, labelKey: "mentorSidebar.items.transfers", key: "transfers" },
      { icon: CreditCard, labelKey: "mentorSidebar.items.paymentGateways", key: "payment-gateways" },
    ],
  },
  {
    key: "marketing",
    labelKey: "mentorSidebar.groups.marketing",
    items: [
      { icon: Tag, labelKey: "mentorSidebar.items.coupons", key: "coupons" },
      { icon: AppsPlusIcon, labelKey: "mentorSidebar.items.marketingApps", key: "marketing" },
      { icon: TrendingUp, labelKey: "mentorSidebar.items.promotionalOffers", key: "promotional-offers" },
      { icon: Star, labelKey: "mentorSidebar.items.reviews", key: "reviews" },
      { icon: Bell, labelKey: "mentorSidebar.items.notifications", key: "notifications" },
      { icon: Award, labelKey: "mentorSidebar.items.certificate", key: "certificate" },
    ],
  },
  {
    key: "subscriptions",
    labelKey: "mentorSidebar.groups.subscriptions",
    items: [
      { icon: Crown, labelKey: "mentorSidebar.items.plans", key: "plans" },
      { icon: Users, labelKey: "mentorSidebar.items.subscriptions", key: "subscriptions" },
    ],
  },
];

export const accountNavItems: NavItemDef[] = [
  { icon: Globe2, labelKey: "mentorSidebar.items.profile", key: "profile" },
  { icon: Edit2, labelKey: "mentorSidebar.items.editMyData", key: "edit-my-data" },
  { icon: BadgeCheck, labelKey: "mentorSidebar.items.membership", key: "membership" },
  { icon: KeyRound, labelKey: "mentorSidebar.items.changePassword", key: "change-password" },
];

export const navItems: NavItemDef[] = [
  ...navGroups.flatMap((g) => g.items.flatMap((item: NavItemDef) => (item.children ? [item, ...item.children] : [item]))),
  ...accountNavItems,
];

export const itemMatchesTab = (item: NavItemDef, tab: string): boolean => {
  if (item.key === tab) return true;
  if (item.children) {
    return item.children.some((child) => child.key === tab);
  }
  return false;
};
