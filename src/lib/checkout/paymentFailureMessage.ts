// Shared helpers for mapping PayMob gateway errors to friendly Arabic messages.

const CODE_MESSAGES: Record<string, string> = {
  "1652": "هذا الرقم لا يحتوي على محفظة إلكترونية. برجاء استخدام رقم آخر أو اختيار طريقة دفع مختلفة.",
  "1653": "المحفظة الإلكترونية غير مفعّلة. برجاء التواصل مع مزود الخدمة أو استخدام طريقة دفع أخرى.",
  "466": "تم رفض العملية من البنك. برجاء التواصل مع البنك أو المحاولة ببطاقة أخرى.",
  "2": "الرصيد غير كافٍ لإتمام العملية. برجاء التأكد من الرصيد والمحاولة مرة أخرى.",
  "51": "الرصيد غير كافٍ لإتمام العملية.",
  "54": "البطاقة منتهية الصلاحية. برجاء استخدام بطاقة أخرى.",
  "14": "رقم البطاقة غير صحيح. برجاء التأكد من البيانات والمحاولة مجدداً.",
  "41": "البطاقة مفقودة أو مسروقة. برجاء التواصل مع البنك.",
  "43": "البطاقة مفقودة أو مسروقة. برجاء التواصل مع البنك.",
  "57": "هذه العملية غير مسموحة على البطاقة. برجاء التواصل مع البنك.",
  "61": "تم تجاوز الحد الأقصى المسموح به. برجاء التواصل مع البنك.",
  "62": "البطاقة مقيّدة. برجاء التواصل مع البنك.",
  "63": "خطأ في الحماية على البطاقة. برجاء التواصل مع البنك.",
  "91": "خدمة البنك غير متاحة حالياً. برجاء المحاولة بعد قليل.",
  "96": "خطأ مؤقت في بوابة الدفع. برجاء المحاولة مرة أخرى.",
};

const REASON_MESSAGES: Record<string, string> = {
  missing_purchase: "تعذّر العثور على بيانات عملية الشراء. برجاء المحاولة مرة أخرى.",
  invalid_signature: "فشل التحقق من صحة العملية. برجاء المحاولة مرة أخرى.",
  processing_error: "حدث خطأ أثناء معالجة الدفع. برجاء المحاولة مرة أخرى.",
};

const humanizeMessage = (raw?: string | null): string | null => {
  if (!raw) return null;
  const m = raw.toLowerCase();
  if (m.includes("does not have a wallet") || m.includes("wallet")) {
    return "هذا الرقم لا يحتوي على محفظة إلكترونية. برجاء استخدام رقم آخر أو اختيار طريقة دفع مختلفة.";
  }
  if (m.includes("insufficient")) return "الرصيد غير كافٍ لإتمام العملية.";
  if (m.includes("expired")) return "البطاقة منتهية الصلاحية.";
  if (m.includes("declin")) return "تم رفض العملية من البنك. برجاء التواصل مع البنك أو المحاولة ببطاقة أخرى.";
  if (m.includes("invalid")) return "بيانات الدفع غير صحيحة. برجاء المراجعة والمحاولة مجدداً.";
  if (m.includes("timeout") || m.includes("time out")) return "انتهت مهلة العملية. برجاء المحاولة مرة أخرى.";
  if (m.includes("cancel")) return "تم إلغاء العملية.";
  return null;
};

export interface PaymentFailureInfo {
  gwCode?: string | null;
  gwMessage?: string | null;
  reason?: string | null;
}

export const getFriendlyPaymentError = ({ gwCode, gwMessage, reason }: PaymentFailureInfo): string | null => {
  return (
    (gwCode && CODE_MESSAGES[gwCode]) ||
    humanizeMessage(gwMessage) ||
    (reason ? REASON_MESSAGES[reason] : null) ||
    null
  );
};

export const GENERIC_PAYMENT_FAILURE = "تعذّر إتمام عملية الدفع. برجاء المحاولة مرة أخرى.";
