// Aggregates public storefront translations. Each namespace lives in its own JSON.
import mentorPublicAr from "./mentorPublic.ar.json";
import mentorPublicEn from "./mentorPublic.en.json";
import coursePageAr from "./coursePage.ar.json";
import coursePageEn from "./coursePage.en.json";
import liveCourseAr from "./liveCourse.ar.json";
import liveCourseEn from "./liveCourse.en.json";
import digitalProductAr from "./digitalProduct.ar.json";
import digitalProductEn from "./digitalProduct.en.json";
import miscPublicAr from "./miscPublic.ar.json";
import miscPublicEn from "./miscPublic.en.json";

export const publicAr = {
  mentorPublic: mentorPublicAr,
  coursePage: coursePageAr,
  liveCourse: liveCourseAr,
  digitalProduct: digitalProductAr,
  miscPublic: miscPublicAr,
};

export const publicEn = {
  mentorPublic: mentorPublicEn,
  coursePage: coursePageEn,
  liveCourse: liveCourseEn,
  digitalProduct: digitalProductEn,
  miscPublic: miscPublicEn,
};
