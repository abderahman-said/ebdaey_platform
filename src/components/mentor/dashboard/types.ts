import type { ProductPriceValue } from "@/components/mentor/ProductPriceDisplay";

export interface CourseData {
  id: string;
  title: string;
  slug: string;
  price: number;
  is_published: boolean;
  description: string | null;
  thumbnail_url: string | null;
  banner_type: string | null;
  banner_video_url: string | null;
  product_prices?: ProductPriceValue[];
}

export interface StudentData {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  created_at: string;
}

export interface OrderStudent {
  full_name?: string;
  email?: string;
  phone?: string | null;
}

export interface OrderCourse {
  title?: string;
  price?: number;
}

export interface OrderCoupon {
  code?: string;
  discount_type?: string;
  discount_value?: number;
}

export interface OrderData {
  id: string;
  gross_amount: number;
  payment_status: string;
  created_at: string;
  student_id: string;
  course_id: string | null;
  gateway_fee: number;
  platform_fee: number;
  mentor_net: number;
  coupon_id: string | null;
  is_digital_product?: boolean;
  digital_product_id?: string | null;
  is_live_course?: boolean;
  is_consultation?: boolean;
  gateway?: string;
  currency?: string;
  settled_usd?: number | null;
  amount_paid?: number;
  buyer_country?: string | null;
  product_title?: string;
  students?: OrderStudent;
  courses?: OrderCourse;
  coupons?: OrderCoupon | null;
  digital_products?: { title: string; price: number };
  live_courses?: { title: string; price: number; product_type?: string };
}

export interface CouponData {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  is_active: boolean;
  expires_at: string | null;
  max_uses: number | null;
  used_count: number;
  max_per_customer: number | null;
  course_id: string | null;
  digital_product_id?: string | null;
}

export interface PageViewData {
  created_at: string;
  device: string | null;
  os: string | null;
  country: string | null;
  source: string | null;
  path: string | null;
}

export interface TenantData {
  id: string;
  slug: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  bio: string | null;
  whatsapp_number: string | null;
  whatsapp_default_color: boolean | null;
  profile_image_url: string | null;
  cover_image_url: string | null;
  primary_color: string | null;
  specialty: string | null;
  public_language: string | null;
  dashboard_language: string | null;
  dashboard_dark_mode: boolean | null;
}
