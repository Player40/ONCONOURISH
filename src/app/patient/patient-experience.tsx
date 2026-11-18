"use client";

import { useEffect, useMemo, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { signOut } from "@/app/login/actions";
import {
  buildDailyPlan,
  evaluateCheckIn,
  evaluateNutritionAlert,
  getActionText,
  getLapseResponse,
  getPhaseForCycleDay,
  getProgressBank,
  getWorkedActionStats,
} from "@/engine";
import { BARRIERS } from "@/data/barriers";
import { FOODS } from "@/data/foods";
import { RED_FLAGS, SYMPTOMS } from "@/data/symptoms";
import { ACTION_IDS, BARRIER_IDS, RED_FLAG_IDS, SYMPTOM_IDS } from "@/engine/types";
import type { ActionId, BarrierId, CheckIn, Locale } from "@/engine/types";
import { answerQuestion, type QuestionResponse } from "@/lib/question-workflow";
import type { PatientSnapshot } from "./service";
import { parseOfflineCheckInDraft } from "./offline-draft";
import {
  requestRamadanAction,
  saveActionAction,
  saveBarrierAction,
  saveCheckInAction,
  setConsentAction,
} from "./actions";

const text = (locale: Locale, en: string, ar: string): string => locale === "ar" ? ar : en;

const intakeChoices = [25, 50, 75, 100] as const;
const appetiteChoices = [1, 2, 3, 4, 5] as const;
const actionLabels: Record<Locale, Record<ActionId, string>> = {
  en: { liquid: "Fortified drinks", small: "Small snacks", fluids: "Sipping fluids", cold: "Cold foods", hot: "Hot meals" },
  ar: { liquid: "مشروبات مدعّمة", small: "وجبات خفيفة", fluids: "رشفات السوائل", cold: "أطعمة باردة", hot: "وجبات ساخنة" },
};

const barrierDetails: Record<BarrierId, { title: string; response: string; technique: string }> = {
  nausea: {
    title: "Cold, small and sippable",
    response: "Try 100 ml of cold laban or banana milk every 2 hours instead of full meals today.",
    technique: "Problem solving; Graded tasks",
  },
  taste: {
    title: "Work around the taste",
    response: "Cold or room-temperature foods, plastic cutlery and mild flavours often help. If something tastes wrong, another food counts the same.",
    technique: "Problem solving",
  },
  tired: {
    title: "Zero-prep only",
    response: "Today we only use ready options: yoghurt, dates with tahini, a ready drink. Ask someone to put them within reach.",
    technique: "Restructuring the physical environment; Social support (practical)",
  },
  cost: {
    title: "Use what you already have",
    response: "We lean on staples: lentils, rice, eggs, laban. No special products needed.",
    technique: "Problem solving",
  },
  forgot: {
    title: "Attach it to a habit",
    response: "Take your drink with your morning medicines. Reminder moved to 08:30 so it rides on something you already do.",
    technique: "Action planning; Prompts and cues",
  },
  guilt: {
    title: "Fortify, do not forbid",
    response: "Any food you can eat counts toward your goal. Comfort foods stay, with small boosts like a spoon of nut butter.",
    technique: "Reduce negative emotions; Cognitive restructuring",
  },
};

const arabicBarrierDetails: Record<BarrierId, { title: string; response: string; technique: string }> = {
  nausea: {
    title: "بارد، قليل، وسهل الارتشاف",
    response: "جرّبي ١٠٠ مل من اللبن البارد أو حليب الموز كل ساعتين بدلًا من الوجبات الكبيرة اليوم.",
    technique: "حل المشكلات؛ المهام المتدرجة",
  },
  taste: {
    title: "التعامل مع تغيّر المذاق",
    response: "قد تناسبك الأطعمة الباردة أو بدرجة حرارة الغرفة، وأدوات المائدة البلاستيكية والنكهات الخفيفة. إذا لم يناسبك مذاق طعام، اختاري غيره.",
    technique: "حل المشكلات",
  },
  tired: {
    title: "خيارات لا تحتاج إلى تحضير",
    response: "اليوم نختار أطعمة جاهزة مثل الزبادي والتمر بالطحينة ومشروب جاهز. اطلبي من شخص وضعها في متناولك.",
    technique: "تهيئة البيئة؛ دعم عملي",
  },
  cost: {
    title: "استخدمي ما هو متوفر لديك",
    response: "نختار أطعمة أساسية مثل العدس والأرز والبيض واللبن، دون الحاجة إلى منتجات خاصة.",
    technique: "حل المشكلات",
  },
  forgot: {
    title: "اربطيها بعادة يومية",
    response: "ضعي مشروبك مع أدوية الصباح. يمكن ضبط التذكير ليرتبط بعادة تقومين بها بالفعل.",
    technique: "تخطيط العمل؛ التذكيرات والإشارات",
  },
  guilt: {
    title: "عزّزي الطعام بدلًا من منعه",
    response: "أي طعام تستطيعين تناوله يُحتسب. يمكن إضافة كمية صغيرة مثل ملعقة من زبدة المكسرات إلى الأطعمة المريحة لك.",
    technique: "تقليل المشاعر السلبية؛ إعادة صياغة الأفكار",
  },
};

function localizeReason(reason: string, locale: Locale): string {
  if (locale === "en") return reason;
  const calories = reason.match(/^(\d+) kcal and (\d+) g protein per serving \(placeholder values\)\.$/);
  if (calories) return `${calories[1]} سعرة حرارية و${calories[2]} غ بروتين لكل حصة (قيم مؤقتة).`;
  if (reason.startsWith("Cold:")) return "بارد: قد يكون أسهل مع الغثيان أو المذاق المعدني (TX-02، TX-04).";
  if (reason.startsWith("Liquid calories")) return "سعرات سائلة عندما تكون الشهية منخفضة (TX-06).";
  if (reason.startsWith("Matches foods")) return "يناسب أطعمة في الملف التجريبي.";
  if (reason.startsWith("Passed food-safety")) return "اجتاز مرشحات سلامة الطعام والأعراض.";
  return reason;
}

function localizeExclusion(ruleId: string, locale: Locale, reason: string): string {
  if (locale === "en") return reason;
  if (ruleId === "FS-01") return `${reason.split(" (")[0]} (قاعدة التعامل الآمن مع الطعام)`;
  if (ruleId === "TX-01") return "قد يهيّج تقرّحات الفم.";
  if (ruleId === "TX-02") return "مع الغثيان الشديد: خيارات باردة أو بدرجة حرارة الغرفة وقليلة الرائحة فقط.";
  if (ruleId === "TX-03") return "قد تزيد الأطعمة الدسمة الغثيان.";
  if (ruleId === "TX-04") return "قد يسبب اللحم الأحمر مذاقًا معدنيًا.";
  return reason;
}

function localizeConditionDetail(
  condition: ReturnType<typeof evaluateNutritionAlert>["conditions"][number],
  locale: Locale,
): string {
  if (locale === "en") return condition.detail;
  if (condition.id === "intake") {
    return condition.value === null
      ? "البيانات غير كافية: يلزم وجود ثلاثة تسجيلات."
      : `متوسط المدخول ${condition.value.toFixed(1)}٪.`;
  }
  if (condition.id === "weight") {
    return condition.value === null
      ? "لا يوجد وزن مسجل."
      : `انخفاض بنسبة ${condition.value.toFixed(1)}٪ عن خط الأساس.`;
  }
  return condition.value === null
    ? "لا توجد أعراض متكررة."
    : `تكرر العرض نفسه في ${condition.value} تسجيلات.`;
}

function localizeAlertStatus(status: "alert" | "watch" | "clear", locale: Locale): string {
  if (locale === "en") return status;
  return status === "alert" ? "تنبيه" : status === "watch" ? "مراقبة" : "واضح";
}

function toggleValue<T extends string>(values: readonly T[], value: T): T[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function selectedBarrier(snapshot: PatientSnapshot, day: number): BarrierId | undefined {
  return snapshot.barriers.find((record) => record.day === day)?.barrier;
}

function getDraftStorageKey(patientId: string, day: number): string {
  return `onconourish:checkin:${patientId}:${day}`;
}

export default function PatientExperience({ initialSnapshot }: { readonly initialSnapshot: PatientSnapshot }) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [selectedDay, setSelectedDay] = useState(initialSnapshot.activeDay);
  const [locale, setLocale] = useState<Locale>("en");
  const [draft, setDraft] = useState<CheckIn | undefined>(
    () => initialSnapshot.days[initialSnapshot.activeDay - 1]?.checkIn ?? undefined,
  );
  const [draftDirty, setDraftDirty] = useState(false);
  const [editing, setEditing] = useState(Boolean(draft));
  const [controlsOpen, setControlsOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [question, setQuestion] = useState("");
  const [questionResponse, setQuestionResponse] = useState<QuestionResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeDay = snapshot.days[selectedDay - 1];
  const draftStorageKey = getDraftStorageKey(snapshot.patient.id, draft?.day ?? selectedDay);
  const selectedDayDraftStorageKey = getDraftStorageKey(snapshot.patient.id, selectedDay);
  const currentCheckIn = activeDay?.checkIn;
  const barrier = selectedBarrier(snapshot, selectedDay);
  const lapse = getLapseResponse(
    activeDay?.missedDays ?? 0,
    activeDay?.lastIntakeBeforeGap,
    {
      whatsappReminders: snapshot.consents.whatsapp_reminders ?? false,
      caregiverContact: snapshot.consents.caregiver_access ?? false,
    },
  );
  const dailyPlan = buildDailyPlan({
    missedDays: activeDay?.missedDays ?? 0,
    ...(barrier ? { selectedBarrier: barrier } : {}),
  });
  const draftEvaluation = editing && draft?.day === selectedDay ? evaluateCheckIn(draft, locale) : null;
  const storedEvaluation = currentCheckIn ? evaluateCheckIn(currentCheckIn, locale) : null;
  const evaluation = draftEvaluation ?? storedEvaluation;
  const urgentEvaluation = draftEvaluation?.urgent
    ? draftEvaluation
    : storedEvaluation?.urgent
      ? storedEvaluation
      : null;
  const isUrgent = Boolean(urgentEvaluation);
  const recommendations = isUrgent ? null : evaluation?.recommendations ?? null;
  const phase = getPhaseForCycleDay(selectedDay);
  const loggedCheckIns = useMemo(
    () => snapshot.days.flatMap((day) => day.day <= selectedDay && day.checkIn ? [day.checkIn] : []),
    [snapshot.days, selectedDay],
  );
  const alert = evaluateNutritionAlert(loggedCheckIns, snapshot.patient.baselineWeightKg);
  const progressDays = useMemo(
    () => snapshot.days.map((day) => {
      if (!day.checkIn) return { day: day.day, logged: false as const };
      return {
        ...day.checkIn,
        logged: true as const,
        actionsOffered: day.actionsOffered,
        actionsCompleted: day.actionsCompleted,
      };
    }),
    [snapshot.days],
  );
  const banked = getProgressBank(progressDays, selectedDay);
  const worked = getWorkedActionStats(progressDays, selectedDay).slice(0, 3);
  const approvedPlan = [...snapshot.plans].sort((a, b) => b.version - a.version)[0];
  const latestRamadan = [...snapshot.ramadanRequests].at(-1);
  const isLogged = Boolean(currentCheckIn);
  const isDraftStarted = Boolean(draft && draft.day === selectedDay);
  const arabic = locale === "ar";

  useEffect(() => {
    if (selectedDay >= 14) {
      setPlaying(false);
      return;
    }
    if (!playing) return;
    const timer = window.setTimeout(() => setSelectedDay((day) => Math.min(day + 1, 14)), 1800);
    return () => window.clearTimeout(timer);
  }, [playing, selectedDay]);

  useEffect(() => {
    const nextDay = snapshot.days[selectedDay - 1];
    setDraft(nextDay?.checkIn ?? undefined);
    setEditing(Boolean(nextDay?.checkIn));
    setDraftDirty(false);
  }, [selectedDay]);

  useEffect(() => {
    if (!draftDirty || !draft) return;
    try {
      window.localStorage.setItem(draftStorageKey, JSON.stringify(draft));
    } catch {
      setErrorMessage("This browser could not save the check-in draft on this device.");
    }
  }, [draft, draftDirty, draftStorageKey]);

  async function mutate(operation: () => Promise<PatientSnapshot>): Promise<PatientSnapshot | undefined> {
    setErrorMessage(null);
    try {
      const updated = await operation();
      setSnapshot(updated);
      return updated;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "The update could not be saved.");
      return undefined;
    }
  }

  function updateDraft(update: (current: CheckIn) => CheckIn) {
    setDraft((current) => current ? update(current) : current);
    setDraftDirty(true);
  }

  function startCheckIn() {
    setErrorMessage(null);
    try {
      const saved = window.localStorage.getItem(selectedDayDraftStorageKey);
      const restored = saved ? parseOfflineCheckInDraft(JSON.parse(saved)) : null;
      if (restored?.day === selectedDay) {
        setDraft(restored);
        setDraftDirty(true);
        setEditing(true);
        return;
      }
    } catch {
      setErrorMessage("This browser could not read the saved check-in draft. You can still start a new check-in.");
    }
    setDraft({
      day: selectedDay,
      symptoms: [],
      appetite: 3,
      intakePercent: 50,
      redFlags: [],
    });
    setDraftDirty(true);
    setEditing(true);
  }

  function cancelEdit() {
    setDraft(currentCheckIn ?? undefined);
    setDraftDirty(false);
    setEditing(Boolean(currentCheckIn));
    try {
      window.localStorage.removeItem(selectedDayDraftStorageKey);
    } catch {
      setErrorMessage("The draft was closed, but this browser could not clear its saved copy.");
    }
  }

  function saveCheckIn() {
    if (!draft) return;
    startTransition(async () => {
      const updated = await mutate(() => saveCheckInAction(draft));
      if (updated) {
        setDraft(updated.days[selectedDay - 1]?.checkIn ?? draft);
        setEditing(true);
        setDraftDirty(false);
        try {
          window.localStorage.removeItem(selectedDayDraftStorageKey);
        } catch {
          setErrorMessage("The check-in was saved, but this browser could not clear its local draft.");
        }
      }
    });
  }

  function saveAction(action: string, done: boolean) {
    startTransition(async () => {
      await mutate(() => saveActionAction(selectedDay, action, done));
    });
  }

  function saveBarrier(value: BarrierId) {
    startTransition(async () => {
      await mutate(() => saveBarrierAction(selectedDay, value));
    });
  }

  function saveConsent(purpose: "share_with_care_team" | "caregiver_access" | "whatsapp_reminders", granted: boolean) {
    startTransition(async () => {
      await mutate(() => setConsentAction(purpose, granted, selectedDay));
    });
  }

  function requestRamadan() {
    startTransition(async () => {
      await mutate(() => requestRamadanAction(selectedDay));
    });
  }

  function updateWeight(value: string) {
    updateDraft((current) => ({
      ...current,
      ...(value.trim() ? { weightKg: Number(value) } : { weightKg: undefined }),
    }));
  }

  function askQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!question.trim()) return;
    const latest = snapshot.days.reduce<CheckIn | undefined>(
      (mostRecent, day) => day.checkIn && (!mostRecent || day.checkIn.day > mostRecent.day) ? day.checkIn : mostRecent,
      undefined,
    );
    setQuestionResponse(answerQuestion(question, locale, latest));
  }

  const dayLabel = (day: number) => text(locale, `Day ${day}`, `اليوم ${day}`);
  const canEdit = isLogged || isDraftStarted;
  const activePlanActions = isUrgent ? [] : dailyPlan.actions;

  return (
    <main className="app-shell" lang={locale} dir={arabic ? "rtl" : "ltr"}>
      <header className="topbar">
        <div>
          <Link className="brand" href="/">OncoNourish</Link>
          <span className="version">{text(locale,
            snapshot.mode === "demo" ? "Patient demo" : "Patient workspace",
            snapshot.mode === "demo" ? "تجربة المريض" : "مساحة المريض",
          )}</span>
        </div>
        <div className="row">
          <span className="badge">{text(locale, "Synthetic data · not medical advice", "بيانات اصطناعية · ليست نصيحة طبية")}</span>
          {snapshot.mode === "supabase" && <form action={signOut}><button className="button small" type="submit">{text(locale, "Sign out", "تسجيل الخروج")}</button></form>}
        </div>
      </header>

      <nav className="daybar" aria-label={text(locale,
        snapshot.mode === "demo" ? "Demo day navigation" : "Cycle day navigation",
        snapshot.mode === "demo" ? "التنقل بين أيام العرض" : "التنقل بين أيام الدورة",
      )}>
        <strong>{text(locale, snapshot.mode === "demo" ? "Demo day" : "Cycle day", snapshot.mode === "demo" ? "يوم العرض" : "يوم الدورة")}</strong>
        <button className="button small" type="button" disabled={selectedDay <= 1 || isPending} onClick={() => setSelectedDay((day) => Math.max(1, day - 1))}>
          {text(locale, "Previous", "السابق")}
        </button>
        <div className="day-pills">
          {snapshot.days.map((day) => (
            <button
              aria-current={day.day === selectedDay ? "date" : undefined}
              aria-label={`${dayLabel(day.day)}${day.checkIn ? "" : text(locale, " (no check-in)", " (لا يوجد تسجيل)")}`}
              className={`day-pill${day.checkIn ? "" : " missed"}${day.day === selectedDay ? " selected" : ""}`}
              disabled={isPending}
              key={day.day}
              onClick={() => setSelectedDay(day.day)}
              type="button"
            >
              {day.day}
            </button>
          ))}
        </div>
        <button className="button small" type="button" disabled={selectedDay >= 14 || isPending} onClick={() => setSelectedDay((day) => Math.min(14, day + 1))}>
          {text(locale, "Next", "التالي")}
        </button>
        {snapshot.mode === "demo" && <button className="button small primary" type="button" aria-pressed={playing} onClick={() => setPlaying((value) => !value)}>
          {playing ? text(locale, "Stop story", "إيقاف العرض") : text(locale, "Play story", "تشغيل العرض")}
        </button>}
        <span className="day-hint">{text(locale,
          snapshot.mode === "demo" ? "Cycle 2 · Days 6–8 show a missed-check-in scenario." : "Choose a cycle day to review or record a check-in.",
          snapshot.mode === "demo" ? "الدورة ٢ · الأيام ٦–٨ تعرض مثالًا على انقطاع التسجيل." : "اختاري يومًا لمراجعة التسجيل أو إضافته.",
        )}</span>
      </nav>

      {errorMessage && <p className="error-banner" role="alert">{errorMessage}</p>}
      {isPending && <p className="status-message" role="status">{text(locale, "Saving your update…", "جارٍ حفظ التحديث…")}</p>}

      <div className="experience-grid" aria-busy={isPending}>
        <section className="phone" aria-label={text(locale, "Patient experience", "تجربة المريض")} dir={arabic ? "rtl" : "ltr"}>
          <header className="patient-heading">
            <div>
              <span className="eyebrow">{text(locale, "OncoNourish", "أونكونوريش")}</span>
              <h1>{text(locale, `Good morning, ${snapshot.patient.pseudonym.split(" ")[0]}`, "أهلًا بك")}</h1>
            </div>
            <div className="language-toggle" aria-label={text(locale, "Language", "اللغة")}>
              <button type="button" aria-pressed={!arabic} className={!arabic ? "selected" : ""} onClick={() => setLocale("en")}>EN</button>
              <button type="button" aria-pressed={arabic} className={arabic ? "selected" : ""} onClick={() => setLocale("ar")}>عربي</button>
            </div>
          </header>

          <div className="tag-row">
            <span className="tag">{text(locale,
              snapshot.mode === "demo" ? `Cycle 2, day ${selectedDay}` : `Cycle day ${selectedDay}`,
              snapshot.mode === "demo" ? `الدورة ٢، اليوم ${selectedDay}` : `يوم الدورة ${selectedDay}`,
            )}</span>
            <span className="tag ok">{phase.label[locale]}</span>
          </div>

          {approvedPlan && (
            <section className="banner success">
              <strong>{text(locale, "Your approved plan", "خطتك المعتمدة")}</strong>
              <ul>
                {approvedPlan.items.map((item) => <li key={item}>{actionLabels[locale][item]}</li>)}
              </ul>
              <p className="muted small">{approvedPlan.note ?? text(locale, "Approved by your care team.", "اعتمدها فريق الرعاية.")}</p>
            </section>
          )}

          {!isLogged && (
            <section className="card">
              <h2>{text(locale, "No check-in today. Nothing is lost.", "لا يوجد تسجيل اليوم. لم تخسري شيئًا.")}</h2>
              <p className="muted">{text(locale, `${banked} check-ins remain banked. Check in whenever you are ready.`, `تسجيلاتك ${banked} ما زالت محفوظة. سجّلي عندما تكونين مستعدة.`)}</p>
              {!isDraftStarted && (
                <button className="button primary" type="button" onClick={startCheckIn}>
                  {text(locale, "Start today's check-in", "ابدئي تسجيل اليوم")}
                </button>
              )}
              {lapse.sendGentleNudge && (
                <p className="small muted">{text(locale, "A gentle nudge is available; no message is sent by this demo.", "يتوفر تذكير لطيف؛ لا تُرسل هذه التجربة أي رسائل.")}</p>
              )}
              {lapse.offerWhatsAppReminder && (
                <p className="small muted">{text(locale, "WhatsApp reminders are enabled, but this demo does not send messages.", "تذكيرات واتساب مفعّلة، لكن هذه التجربة لا ترسل رسائل.")}</p>
              )}
              {lapse.raiseRoutineFlag && (
                <p className="small muted">{text(locale, "The lapse meets the placeholder threshold for a summary-only care-team flag.", "يتوافق هذا الانقطاع مع حدّ مؤقت لتنبيه ملخص لفريق الرعاية.")}</p>
              )}
            </section>
          )}

          {isLogged && lapse.welcomeBackWithoutCatchUp && (
            <section className="card">
              <h2>{text(locale, "Welcome back. No catching up needed.", "أهلًا بعودتك. لا حاجة للتعويض.")}</h2>
              <p className="muted">{text(locale, `${banked - 1} previous check-ins stay banked. What got in the way?`, `تسجيلاتك السابقة (${Math.max(0, banked - 1)}) ما زالت محفوظة. ما الذي أعاقك؟`)}</p>
              <div className="chip-row">
                {BARRIER_IDS.map((id) => {
                  const selected = barrier === id;
                  return (
                    <button
                      aria-pressed={selected}
                      className={`chip${selected ? " active" : ""}`}
                      disabled={isPending || Boolean(barrier)}
                      key={id}
                      onClick={() => saveBarrier(id)}
                      type="button"
                    >
                      {BARRIERS[id].label[locale]}
                    </button>
                  );
                })}
              </div>
              {barrier && (
                <div className="banner success barrier-response">
                  <strong>{(arabic ? arabicBarrierDetails : barrierDetails)[barrier].title}</strong>
                  <p>{(arabic ? arabicBarrierDetails : barrierDetails)[barrier].response}</p>
                  <p className="muted small">{text(locale, "Technique: ", "الأسلوب: ")}{(arabic ? arabicBarrierDetails : barrierDetails)[barrier].technique}</p>
                </div>
              )}
              {!barrier && lapse.mayContactCaregiver && (
                <p className="small muted">{text(locale, "Caregiver access is consented to; no contact is sent by this demo.", "تمت الموافقة على وصول مقدم الرعاية؛ لا تُرسل هذه التجربة أي تواصل.")}</p>
              )}
            </section>
          )}

          {canEdit && draft && (
            <section className="card">
              <div className="section-heading">
                <div>
                  <h2>{text(locale, "Daily check-in", "التسجيل اليومي")}</h2>
                  <p className="muted small">{text(locale, "How are you feeling today?", "كيف تشعرين اليوم؟")}</p>
                </div>
                {isLogged && !editing && (
                  <button className="button small" type="button" onClick={() => setEditing(true)}>{text(locale, "Edit", "تعديل")}</button>
                )}
              </div>
              {editing ? (
                <>
                  {draftDirty && <p className="status-message" role="status">{text(locale,
                    "Unsaved draft is stored on this device only. Save it when you are online.",
                    "تُحفظ المسودة غير المرسلة على هذا الجهاز فقط. احفظيها عند الاتصال بالإنترنت.",
                  )}</p>}
                  <fieldset className="choice-group">
                    <legend>{text(locale, "Symptoms", "الأعراض")}</legend>
                    <div className="chip-row">
                      {SYMPTOM_IDS.map((id) => {
                        const pressed = draft.symptoms.includes(id);
                        return (
                          <button
                            aria-pressed={pressed}
                            className={`chip${pressed ? " active" : ""}`}
                            key={id}
                            onClick={() => updateDraft((current) => ({ ...current, symptoms: toggleValue(current.symptoms, id) }))}
                            type="button"
                          >
                            {SYMPTOMS[id][locale]}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                  <fieldset className="choice-group">
                    <legend>{text(locale, "Appetite (1 very low · 5 great)", "الشهية (١ منخفضة جدًا · ٥ ممتازة)")}</legend>
                    <div className="chip-row">
                      {appetiteChoices.map((value) => (
                        <button
                          aria-pressed={draft.appetite === value}
                          className={`chip number-chip${draft.appetite === value ? " active" : ""}`}
                          key={value}
                          onClick={() => updateDraft((current) => ({ ...current, appetite: value }))}
                          type="button"
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <fieldset className="choice-group">
                    <legend>{text(locale, "How much of your usual eating did you manage?", "كم استطعتِ تناولًا مقارنةً بمعتادك؟")}</legend>
                    <div className="chip-row">
                      {draft.intakePercent !== undefined && !intakeChoices.some((value) => value === draft.intakePercent) && (
                        <button
                          aria-pressed
                          className="chip active"
                          onClick={() => updateDraft((current) => ({ ...current, intakePercent: draft.intakePercent }))}
                          type="button"
                        >
                          {text(locale, `Existing demo: ${draft.intakePercent}%`, `سجل تجريبي سابق: ${draft.intakePercent}٪`)}
                        </button>
                      )}
                      {intakeChoices.map((value) => (
                        <button
                          aria-pressed={draft.intakePercent === value}
                          className={`chip${draft.intakePercent === value ? " active" : ""}`}
                          key={value}
                          onClick={() => updateDraft((current) => ({ ...current, intakePercent: value }))}
                          type="button"
                        >
                          {value}%
                        </button>
                      ))}
                    </div>
                    <p className="small muted">{text(locale, "Self-reported proxy; not a measured nutrition value.", "تقدير ذاتي تقريبي؛ وليس قياسًا غذائيًا.")}</p>
                  </fieldset>
                  <div className="field">
                    <label htmlFor="weight">{text(locale, "Weight in kg (optional)", "الوزن بالكيلوغرام (اختياري)")}</label>
                    <input
                      id="weight"
                      max="500"
                      min="1"
                      onChange={(event) => updateWeight(event.currentTarget.value)}
                      placeholder={text(locale, "Leave blank if unknown", "اتركيه فارغًا إذا لم تعرفيه")}
                      step="0.1"
                      type="number"
                      value={draft.weightKg ?? ""}
                    />
                  </div>
                  <fieldset className="choice-group">
                    <legend>{text(locale, "Something urgent?", "هل هناك شيء عاجل؟")}</legend>
                    <div className="chip-row">
                      {RED_FLAG_IDS.map((id) => {
                        const pressed = draft.redFlags?.includes(id) ?? false;
                        return (
                          <button
                            aria-pressed={pressed}
                            className={`chip urgent-chip${pressed ? " active" : ""}`}
                            key={id}
                            onClick={() => updateDraft((current) => ({
                              ...current,
                              redFlags: toggleValue(current.redFlags ?? [], id),
                            }))}
                            type="button"
                          >
                            {RED_FLAGS[id][locale]}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                  <div className="row">
                    <button className="button primary" disabled={isPending} onClick={saveCheckIn} type="button">
                      {text(locale, "Save check-in", "حفظ التسجيل")}
                    </button>
                    <button className="button" disabled={isPending} onClick={cancelEdit} type="button">
                      {text(locale, "Cancel", "إلغاء")}
                    </button>
                  </div>
                </>
              ) : (
                <div className="row">
                  <span className="tag">{text(locale, `${currentCheckIn?.intakePercent}% intake recorded`, `تم تسجيل ${currentCheckIn?.intakePercent}٪ من المعتاد`)}</span>
                  <span className="tag">{text(locale, `Appetite ${currentCheckIn?.appetite}/5`, `الشهية ${currentCheckIn?.appetite}/٥`)}</span>
                </div>
              )}
            </section>
          )}

          {isUrgent && urgentEvaluation?.urgent && (
            <section className="banner critical" role="alert">
              <h2>{text(locale, "This may be urgent", "قد تكون هذه حالة عاجلة")}</h2>
              <p>{urgentEvaluation.message}</p>
              <p className="small muted">{text(locale, "Contact your hospital oncology team now or call emergency services. This app gives no food advice for urgent symptoms.", "تواصلي مع فريق الأورام الآن أو اتصلي بالطوارئ. لا يقدم التطبيق نصائح غذائية عند وجود أعراض عاجلة.")}</p>
            </section>
          )}

          {isLogged && !isUrgent && (
            <>
              <section className="card">
                <h2>{text(locale, "Today's small steps", "خطواتك الصغيرة اليوم")}</h2>
                <div className="action-list">
                  {activePlanActions.map((action) => (
                    <label className="check-row" key={action.id}>
                      <input
                        checked={activeDay?.actionsCompleted.includes(action.id) ?? false}
                        disabled={isPending}
                        onChange={(event) => saveAction(action.id, event.currentTarget.checked)}
                        type="checkbox"
                      />
                      <span>{getActionText(action, locale)}</span>
                    </label>
                  ))}
                </div>
                {(dailyPlan.shrunk || barrier) && (
                  <p className="muted small">{text(locale, "Shrunk to one step. Technique: graded tasks. Limit: this illustrative plan does not replace your dietitian's goals.", "تم تقليص الخطة إلى خطوة واحدة. الأسلوب: المهام المتدرجة. الحد: لا تحل هذه الخطة التوضيحية محل أهداف أخصائي التغذية.")}</p>
                )}
              </section>

              {evaluation && !isUrgent && !evaluation.urgent && (
                <section className="card">
                  <h2>{text(locale, "Safe options for you today", "خيارات مناسبة لك اليوم")}</h2>
                  {evaluation.recommendations.recommendations.map(({ food, reasons, technique, limit }) => (
                    <article className="food-item" key={food.id}>
                      <div className="food-heading">
                        <strong>{food.name[locale]}</strong>
                        <span className="small muted">{food.serving} · {food.caloriesKcal} kcal · {food.proteinGrams} g</span>
                      </div>
                      <div className="tag-row">
                        <span className="tag ok">{text(locale, food.temperature === "room" ? "Room temperature" : food.temperature, food.temperature === "room" ? "بدرجة حرارة الغرفة" : food.temperature === "cold" ? "بارد" : "دافئ")}</span>
                        <span className="tag">{text(locale, "Ready to eat", "جاهز للأكل")}</span>
                        {food.cost === 1 && <span className="tag">{text(locale, "Budget-friendly", "اقتصادي")}</span>}
                      </div>
                      <details>
                        <summary>{text(locale, "Why this?", "لماذا هذا الخيار؟")}</summary>
                        <ul>
                          {reasons.map((reason) => <li key={reason}>{localizeReason(reason, locale)}</li>)}
                        </ul>
                        <p className="small muted">{text(locale, "Technique: ", "الأسلوب: ")}{locale === "en" ? technique : "التذكيرات والإشارات"}. {locale === "en" ? limit : "القيم الغذائية مؤقتة حتى يراجعها أخصائي التغذية؛ ولا تحل هذه الخيارات محل أهدافه."}</p>
                      </details>
                    </article>
                  ))}
                  <p className="small muted">{draft?.appetite && draft.appetite <= 2
                    ? text(locale, "Fortify, do not forbid: a small addition such as nut butter may increase energy (placeholder values).", "عزّزي الطعام بدلًا من منعه: قد تزيد إضافة صغيرة مثل زبدة المكسرات الطاقة (قيم مؤقتة).")
                    : text(locale, "Small portions may feel more manageable when energy is low.", "قد تكون الحصص الصغيرة أسهل عندما تكون الطاقة منخفضة.")}</p>
                </section>
              )}

              <section className="card">
                <div className="section-heading">
                  <div>
                    <h2>{text(locale, "Progress bank", "رصيد التقدم")}</h2>
                    <p className="muted small">{text(locale, "Gaps never reset your progress.", "الانقطاع لا يعيد تقدمك إلى الصفر.")}</p>
                  </div>
                  <span className="tag ok">{banked} {text(locale, "check-ins banked", "تسجيلات محفوظة")}</span>
                </div>
                {worked.length > 0 && (
                  <>
                    <h3 className="eyebrow">{text(locale, "What has worked for you", "ما الذي نجح معك")}</h3>
                    {worked.map((item) => (
                      <div className="bar-row" key={item.action}>
                        <span>{actionLabels[locale][item.action]}</span>
                        <div className="meter" role="img" aria-label={`${item.completed} of ${item.offered} ${actionLabels[locale][item.action]} completed`}>
                          <span style={{ width: `${Math.round(item.completionRate * 100)}%` }} />
                        </div>
                        <span className="small muted">{item.completed}/{item.offered}</span>
                      </div>
                    ))}
                  </>
                )}
              </section>
            </>
          )}

          <section className="card">
            <h2>{text(locale, "Ask a nutrition question", "اسألي سؤالًا عن التغذية")}</h2>
            <p className="muted small">{text(locale, "Questions are checked on this device and are not saved. Urgent symptoms receive an urgent response, never food advice.", "تُراجع الأسئلة على هذا الجهاز ولا تُحفظ. تحصل الأعراض العاجلة على استجابة عاجلة دون نصائح غذائية.")}</p>
            <form className="question-form" onSubmit={askQuestion}>
              <label htmlFor="nutrition-question">{text(locale, "Your question", "سؤالك")}</label>
              <textarea
                id="nutrition-question"
                maxLength={2000}
                onChange={(event) => setQuestion(event.currentTarget.value)}
                placeholder={text(locale, "What can I eat when food tastes metallic?", "ماذا يمكنني أن آكل عندما يصبح مذاق الطعام معدنيًا؟")}
                required
                rows={3}
                value={question}
              />
              <button className="button primary" disabled={!question.trim()} type="submit">
                {text(locale, "Check question", "تحققي من السؤال")}
              </button>
            </form>
            {questionResponse && (
              <div className={`banner ${questionResponse.id === "G-URG" ? "critical" : questionResponse.id === "IN-SCOPE" ? "success" : "warning"}`} role={questionResponse.id === "G-URG" ? "alert" : "status"}>
                <div className="row between"><strong>{questionResponse.category}</strong><span className="tag">{questionResponse.id}</span></div>
                <p>{questionResponse.message}</p>
                {questionResponse.options && questionResponse.options.length > 0 && (
                  <ul>{questionResponse.options.map((option) => <li key={option.id}>{option.name}</li>)}</ul>
                )}
              </div>
            )}
          </section>

          <section className="card">
            <div className="section-heading">
              <h2>{text(locale, "Your controls", "إعداداتك")}</h2>
              <button
                aria-expanded={controlsOpen}
                className="button small"
                onClick={() => setControlsOpen((open) => !open)}
                type="button"
              >
                {controlsOpen ? text(locale, "Hide", "إخفاء") : text(locale, "Show", "عرض")}
              </button>
            </div>
            {controlsOpen && (
              <>
                <label className="check-row">
                  <input checked={snapshot.consents.share_with_care_team ?? false} disabled={isPending} onChange={(event) => saveConsent("share_with_care_team", event.currentTarget.checked)} type="checkbox" />
                  <span>{text(locale, "Share summary with my care team", "مشاركة ملخص مع فريق الرعاية")}</span>
                </label>
                <label className="check-row">
                  <input checked={snapshot.consents.caregiver_access ?? false} disabled={isPending} onChange={(event) => saveConsent("caregiver_access", event.currentTarget.checked)} type="checkbox" />
                  <span>{text(locale, "Allow my caregiver to access check-ins", "السماح لمقدم الرعاية بالوصول إلى تسجيلاتي")}</span>
                </label>
                <p className="muted small">
                  {snapshot.activeCaregiverLinks > 0
                    ? text(locale,
                      `${snapshot.activeCaregiverLinks} synthetic caregiver account(s) linked. Access also requires your consent.`,
                      `تم ربط ${snapshot.activeCaregiverLinks} حساب رعاية اصطناعي. يتطلب الوصول موافقتك أيضًا.`,
                    )
                    : text(locale,
                      "No caregiver account is linked yet. Ask the project administrator to create a synthetic link; this control alone does not grant access.",
                      "لم يُربط حساب لمقدم رعاية بعد. اطلبي من مسؤول المشروع إنشاء رابط اصطناعي؛ هذا الخيار وحده لا يمنح الوصول.",
                    )}
                </p>
                <label className="check-row">
                  <input checked={snapshot.consents.whatsapp_reminders ?? false} disabled={isPending} onChange={(event) => saveConsent("whatsapp_reminders", event.currentTarget.checked)} type="checkbox" />
                  <span>{text(locale, "WhatsApp reminder preference (nothing is sent)", "تفضيل تذكيرات واتساب (لا تُرسل رسائل)")}</span>
                </label>
                <div className="ramadan-control">
                  <div className="section-heading">
                    <strong>{text(locale, "Ramadan mode", "وضع رمضان")}</strong>
                    {latestRamadan && <span className={`tag ${latestRamadan.status === "cleared" ? "ok" : "warn"}`}>{text(locale, latestRamadan.status, latestRamadan.status === "pending" ? "بانتظار الموافقة" : latestRamadan.status === "cleared" ? "تمت الموافقة" : "مرفوض")}</span>}
                  </div>
                  {!latestRamadan || latestRamadan.status === "declined" ? (
                    <button className="button small" disabled={isPending} onClick={requestRamadan} type="button">{text(locale, "Ask my care team", "اسألي فريق الرعاية")}</button>
                  ) : null}
                  <p className="muted small">
                    {latestRamadan?.status === "cleared"
                      ? text(locale, "Clearance is recorded, but this prototype does not provide fasting advice.", "تم تسجيل الموافقة، لكن هذا النموذج لا يقدم نصائح للصيام.")
                      : text(locale, "Locked by default. Fasting advice is unavailable until a clinician reviews the request; this prototype does not provide fasting advice.", "مقفل افتراضيًا. لا تتوفر نصائح للصيام قبل مراجعة الطبيب؛ وهذا النموذج لا يقدم نصائح للصيام.")}
                  </p>
                </div>
                <p className="muted small">{text(locale, "Your data is not shared with employers or insurers and is not used for advertising.", "لا تُشارك بياناتك مع أصحاب العمل أو شركات التأمين ولا تُستخدم للإعلانات.")}</p>
              </>
            )}
          </section>
          <footer className="patient-footer">{text(locale,
            snapshot.mode === "demo" ? "Synthetic demo data · Supportive care only · Not medical advice" : "Synthetic Supabase test data · Supportive care only · Not medical advice",
            snapshot.mode === "demo" ? "بيانات عرض اصطناعية · رعاية داعمة فقط · ليست نصيحة طبية" : "بيانات اختبار اصطناعية من Supabase · رعاية داعمة فقط · ليست نصيحة طبية",
          )}</footer>
        </section>

        <aside className="engine-panel" aria-label={text(locale, "How the engine decided", "كيف اتخذ المحرك قراره")}>
          <section className="card">
            <span className="eyebrow">{text(locale, `Under the hood · Day ${selectedDay}`, `آلية العمل · اليوم ${selectedDay}`)}</span>
            <h2>{text(locale, "What the engine decided", "قرار المحرك")}</h2>
            <p className="muted small">{text(locale, "Rules run first in code. No language model is used in this prototype.", "تُطبّق القواعد البرمجية أولًا. لا يستخدم هذا النموذج أي نموذج لغوي.")}</p>
            {currentCheckIn ? (
              <ul className="info-list">
                <li>{text(locale, "Phase: ", "المرحلة: ")}{phase.label[locale]} <span className="muted">({text(locale, "illustrative schedule", "جدول توضيحي")})</span></li>
                {isUrgent ? (
                  <li>{text(locale, "Urgent path: no food recommendations.", "مسار عاجل: لا توجد توصيات غذائية.")}</li>
                ) : (
                  <li>{text(locale, "Rules applied: ", "القواعد المطبقة: ")}{recommendations?.appliedRules.join(", ") || text(locale, "none", "لا شيء")}</li>
                )}
                <li>{lapse.welcomeBackWithoutCatchUp
                  ? text(locale, `${activeDay?.missedDays}-day gap: smaller goal and barrier question.`, `انقطاع ${activeDay?.missedDays} أيام: هدف أصغر وسؤال عن العائق.`)
                  : text(locale, "No recent lapse return.", "لا توجد عودة بعد انقطاع مؤخرًا.")}</li>
                <li>{text(locale, `Nutrition alert: ${alert.status} (${alert.metConditions}/3 conditions). Thresholds are placeholders.`, `تنبيه التغذية: ${localizeAlertStatus(alert.status, locale)} (${alert.metConditions}/٣ شروط). الحدود مؤقتة.`)}</li>
                {lapse.raiseRoutineFlag && <li>{text(locale, "Saving this check-in can make a summary available to your assigned clinician. No notification is sent.", "قد يتيح حفظ هذا التسجيل ملخصًا للطبيب المعيّن لك. لا يتم إرسال إشعار.")}</li>}
              </ul>
            ) : (
              <ul className="info-list">
                <li>{text(locale, `Lapse detector: ${activeDay?.missedDays ?? 0} missed day(s) in a row.`, `رصد الانقطاع: ${activeDay?.missedDays ?? 0} أيام متتالية دون تسجيل.`)}</li>
                <li>{text(locale, `Progress remains at ${banked} banked check-ins.`, `التقدم محفوظ: ${banked} تسجيلات.`)}</li>
                <li>{text(locale, "A check-in will run the same deterministic rules.", "سيؤدي التسجيل إلى تطبيق القواعد الحتمية نفسها.")}</li>
              </ul>
            )}
          </section>

          {recommendations && recommendations.excluded.length > 0 && (
            <section className="card">
              <h2>{text(locale, `Filtered out today (${recommendations.excluded.length})`, `تم استبعادها اليوم (${recommendations.excluded.length})`)}</h2>
              <div className="table-scroll">
                <table>
                  <thead><tr><th>{text(locale, "Food", "الطعام")}</th><th>{text(locale, "Rule", "القاعدة")}</th><th>{text(locale, "Reason", "السبب")}</th></tr></thead>
                  <tbody>
                    {recommendations.excluded.slice(0, 8).map((item) => (
                      <tr key={`${item.foodId}-${item.ruleId}`}>
                        <td>{FOODS.find(({ id }) => id === item.foodId)?.name[locale] ?? item.foodId}</td>
                        <td><span className="tag critical-tag">{item.ruleId}</span></td>
                        <td>{localizeExclusion(item.ruleId, locale, item.reason)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="muted small">{text(locale, "Food values and rules are placeholders pending dietitian review.", "قيم الأطعمة والقواعد مؤقتة وتحتاج إلى مراجعة أخصائي التغذية.")}</p>
            </section>
          )}

          {currentCheckIn && !isUrgent && (
            <section className="card">
              <h2>{text(locale, "Alert conditions", "شروط التنبيه")}</h2>
              <p className="muted small">{text(locale, "This is an explainable prototype rule, not a diagnosis.", "هذه قاعدة توضيحية للنموذج وليست تشخيصًا.")}</p>
              {alert.conditions.map((condition) => (
                <div className="condition-row" key={condition.id}>
                  <span className={`tag ${condition.met ? "ok" : "warn"}`}>{condition.met ? text(locale, "Met", "متحقق") : text(locale, "Not met", "غير متحقق")}</span>
                  <div>
                    <strong>{locale === "en" ? condition.label : condition.id === "intake" ? "متوسط المدخول خلال آخر ٣ تسجيلات أقل من ٦٠٪" : condition.id === "weight" ? "انخفاض الوزن بنسبة ٢٪ أو أكثر عن خط الأساس" : "تكرار العرض نفسه في ٣ تسجيلات أو أكثر"}</strong>
                    <p className="small muted">{localizeConditionDetail(condition, locale)} · {text(locale, "Source days: ", "أيام المصدر: ")}{condition.sourceDays.join(", ") || "—"}</p>
                  </div>
                </div>
              ))}
            </section>
          )}
        </aside>
      </div>
      <Link className="back-link" href="/login">{text(locale, "Back to demo entry", "العودة إلى صفحة العرض")}</Link>
    </main>
  );
}
