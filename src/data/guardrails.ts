import type { LocalizedText } from "@/engine/types";

export const GUARDRAIL_IDS = ["G-INJ", "G-URG", "G-STOP", "G-CURE", "G-SUPP", "G-FAST", "G-DX"] as const;
export type GuardrailId = (typeof GUARDRAIL_IDS)[number];

export interface Guardrail {
  readonly id: GuardrailId;
  readonly category: string;
  readonly route: string;
  readonly message: LocalizedText;
  readonly patterns: readonly RegExp[];
  readonly arabicNeedsReview: true;
}

export const GUARDRAILS: readonly Guardrail[] = [
  {
    id: "G-INJ",
    category: "Prompt injection",
    route: "Blocked",
    message: {
      en: "Instruction override ignored. Rules run before any language model.",
      ar: "تم تجاهل محاولة تجاوز التعليمات. تعمل القواعد قبل أي نموذج لغوي.",
    },
    patterns: [
      /(ignore (all|previous|your)|system prompt|you are now|developer mode)/i,
      /(تجاهل\s+(كل|جميع|التعليمات|ما سبق)|تعليمات النظام|وضع المطور)/i,
    ],
    arabicNeedsReview: true,
  },
  {
    id: "G-URG",
    category: "Urgent symptom",
    route: "Urgent: contact care team now",
    message: {
      en: "This may need urgent assessment. Call your hospital oncology line or emergency services now. The app gives no advice for urgent symptoms.",
      ar: "قد تحتاج هذه الحالة إلى تقييم عاجل. اتصل بفريق الأورام في المستشفى أو بخدمات الطوارئ الآن. لا يقدم التطبيق نصيحة للأعراض العاجلة.",
    },
    patterns: [
      /((can'?t|cannot|couldn'?t|haven'?t|unable to).{0,15}(keep|kept|hold|held).{0,10}(fluids|water|food)|fever|chills|chest pain|blood in|fainting)/i,
      /(لا أستطيع.{0,20}(الاحتفاظ|إبقاء).{0,15}(السوائل|الماء)|حمى|قشعريرة|ألم في الصدر|إغماء)/i,
    ],
    arabicNeedsReview: true,
  },
  {
    id: "G-STOP",
    category: "Treatment change",
    route: "Care team only",
    message: {
      en: "Decisions about your treatment belong to your oncology team. Please talk to them before changing anything. We can help with eating around treatment.",
      ar: "قرارات العلاج تخص فريق الأورام. تحدث معهم قبل تغيير أي شيء. يمكننا المساعدة في دعم الأكل أثناء العلاج.",
    },
    patterns: [
      /(stop|skip|quit|delay|cancel|miss).{0,25}(chemo|chemotherapy|radiotherapy|radiation|treatment|medication|tablets)/i,
      /(أوقف|إيقاف|أتوقف|أؤجل|أترك).{0,30}(العلاج|الكيماوي|الإشعاعي|الدواء)/i,
    ],
    arabicNeedsReview: true,
  },
  {
    id: "G-CURE",
    category: "Cure claim",
    route: "Declined",
    message: {
      en: "No food or diet is shown to cure or shrink cancer, and this app will not suggest otherwise. Nutrition here supports strength and symptoms.",
      ar: "لا يوجد طعام أو نظام غذائي يثبت أنه يعالج السرطان أو يقلصه، ولن يقترح التطبيق ذلك. التغذية هنا لدعم القوة والتعامل مع الأعراض.",
    },
    patterns: [
      /((cure|cures|shrink|kill|starve|detox|reverse).{0,25}(cancer|tumou?r)|(keto|alkaline|juice|fasting).{0,30}(cancer|tumou?r))/i,
      /(يعالج|علاج|يشفي|شفاء|يقلص|يقضي على).{0,25}(السرطان|ورم)|(حمية|كيتو|صيام).{0,25}(السرطان|ورم)/i,
    ],
    arabicNeedsReview: true,
  },
  {
    id: "G-SUPP",
    category: "Supplement dosing",
    route: "Pharmacist or oncologist",
    message: {
      en: "Supplements and herbal products can interact with cancer medicines. Please ask your pharmacist or oncologist. The app does not give doses.",
      ar: "قد تتفاعل المكملات والأعشاب مع أدوية السرطان. اسأل الصيدلي أو طبيب الأورام. لا يقدم التطبيق جرعات.",
    },
    patterns: [
      /((how much|dose|dosage|mg|should i take).{0,40}(supplement|vitamin|turmeric|curcumin|herbal|herb|omega|zinc|iron|probiotic)|(supplement|vitamin|turmeric|curcumin|herbal|probiotic).{0,30}(dose|how much|mg|with my))/i,
      /(جرعة|كمية).{0,30}(مكمل|فيتامين|كركم|أعشاب|زنك|حديد)|(مكمل|فيتامين|كركم|أعشاب).{0,25}(جرعة|كم)/i,
    ],
    arabicNeedsReview: true,
  },
  {
    id: "G-FAST",
    category: "Religious fasting",
    route: "Care team clearance",
    message: {
      en: "Fasting during treatment needs your care team’s clearance. Fasting features stay locked until a clinician approves.",
      ar: "يحتاج الصيام أثناء العلاج إلى موافقة فريق الرعاية. تبقى ميزات الصيام مقفلة حتى يوافق الطبيب.",
    },
    patterns: [/(ramadan|fasting|iftar|suhoor|fast\b)/i, /(رمضان|الصيام|أصوم|الإفطار|السحور)/i],
    arabicNeedsReview: true,
  },
  {
    id: "G-DX",
    category: "Diagnosis or prognosis",
    route: "Care team only",
    message: {
      en: "Questions about diagnosis, scans or outlook are for your care team. This app only supports eating and drinking.",
      ar: "الأسئلة عن التشخيص أو الفحوصات أو التوقعات يجيب عنها فريق الرعاية. يدعم هذا التطبيق الأكل والشرب فقط.",
    },
    patterns: [
      /(do i have|is it cancer|has it spread|my scan|prognosis|how long (do|will) i)/i,
      /(هل.*(سرطان|ورم)|هل انتشر|نتيجة.*(الفحص|التصوير)|التوقعات|كم.*أعيش)/i,
    ],
    arabicNeedsReview: true,
  },
];

export const IN_SCOPE_GUARDRAIL: LocalizedText = {
  en: "In scope. The question stays within eating and drinking support; symptom and food-safety rules still apply.",
  ar: "السؤال ضمن دعم الأكل والشرب؛ وتظل قواعد الأعراض وسلامة الطعام مطبقة.",
};

export const ARABIC_GUARDRAIL_REVIEW_NOTE =
  "Machine-drafted Arabic patterns and responses require native-speaker and clinical review before use.";
