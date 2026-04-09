"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ScheduleProgram } from "@/lib/getPrograms";

type Props = {
  programs: ScheduleProgram[];
};

type WeekdayKey =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

const WEEKDAYS: Array<{ key: WeekdayKey; label: string; jsDay: number }> = [
  { key: "monday", label: "Lundi", jsDay: 1 },
  { key: "tuesday", label: "Mardi", jsDay: 2 },
  { key: "wednesday", label: "Mercredi", jsDay: 3 },
  { key: "thursday", label: "Jeudi", jsDay: 4 },
  { key: "friday", label: "Vendredi", jsDay: 5 },
  { key: "saturday", label: "Samedi", jsDay: 6 },
  { key: "sunday", label: "Dimanche", jsDay: 0 },
];

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function parseAcfDate(dateString: string) {
  const year = Number(dateString.slice(0, 4));
  const month = Number(dateString.slice(4, 6)) - 1;
  const day = Number(dateString.slice(6, 8));
  return new Date(year, month, day);
}

function normalizeTime(value?: string) {
  if (!value) return "--:--";
  return value.slice(0, 5);
}

function formatSelectedDate(date: Date) {
  const formatted = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function getTodayInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function inputToDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

function dateToInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getWeekRangeLabel(date: Date) {
  const jsDay = date.getDay();
  const diffToMonday = jsDay === 0 ? -6 : 1 - jsDay;

  const monday = new Date(date);
  monday.setDate(date.getDate() + diffToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const format = (d: Date) =>
    new Intl.DateTimeFormat("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);

  const start = format(monday);
  const end = format(sunday);

  return `${start.charAt(0).toUpperCase() + start.slice(1)} – ${end}`;
}

function getWeekdayKeyFromDate(date: Date): WeekdayKey {
  const map: Record<number, WeekdayKey> = {
    0: "sunday",
    1: "monday",
    2: "tuesday",
    3: "wednesday",
    4: "thursday",
    5: "friday",
    6: "saturday",
  };
  return map[date.getDay()];
}

function getWeekdayKeyFromProgramDate(acfDate: string): WeekdayKey {
  return getWeekdayKeyFromDate(parseAcfDate(acfDate));
}

function moveDateToWeekday(baseDate: Date, targetJsDay: number) {
  const currentJsDay = baseDate.getDay();
  const diffToMonday = currentJsDay === 0 ? -6 : 1 - currentJsDay;

  const monday = new Date(baseDate);
  monday.setDate(baseDate.getDate() + diffToMonday);

  const result = new Date(monday);
  const offset = targetJsDay === 0 ? 6 : targetJsDay - 1;
  result.setDate(monday.getDate() + offset);
  return result;
}

function timeToMinutes(value?: string) {
  if (!value) return -1;
  const [h = "0", m = "0"] = value.split(":");
  return Number(h) * 60 + Number(m);
}

function isProgramNow(program: ScheduleProgram, selectedDate: Date) {
  const now = new Date();

  const sameDay =
    now.getFullYear() === selectedDate.getFullYear() &&
    now.getMonth() === selectedDate.getMonth() &&
    now.getDate() === selectedDate.getDate();

  if (!sameDay) return false;

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const start = timeToMinutes(program.start);
  const end = timeToMinutes(program.end);

  return nowMinutes >= start && nowMinutes < end;
}

function getCurrentProgramId(programs: ScheduleProgram[], selectedDate: Date) {
  const now = new Date();
  const sameDay =
    now.getFullYear() === selectedDate.getFullYear() &&
    now.getMonth() === selectedDate.getMonth() &&
    now.getDate() === selectedDate.getDate();

  if (!sameDay) return programs[0]?.id ?? "";

  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const current = programs.find((program) => {
    const start = timeToMinutes(program.start);
    const end = timeToMinutes(program.end);
    return nowMinutes >= start && nowMinutes < end;
  });

  return current?.id ?? programs[0]?.id ?? "";
}

function rotateFromActive(programs: ScheduleProgram[], activeId: string) {
  const index = programs.findIndex((item) => item.id === activeId);
  if (index <= 0) return programs;
  return [...programs.slice(index), ...programs.slice(0, index)];
}

function ProgramBadge({ type }: { type: string }) {
  if (type === "special") {
    return (
      <span className="inline-flex items-center rounded-full bg-[#d91f26] px-3 py-[5px] text-[10px] font-extrabold uppercase tracking-[0.12em] text-white shadow-[0_8px_18px_rgba(217,31,38,0.28)]">
        Spécial
      </span>
    );
  }

  if (type === "modified") {
    return (
      <span className="inline-flex items-center rounded-full bg-[#f4c430] px-3 py-[5px] text-[10px] font-extrabold uppercase tracking-[0.12em] text-black shadow-[0_8px_18px_rgba(244,196,48,0.28)]">
        Modifié
      </span>
    );
  }

  return null;
}

function NowBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-[#ff2a2a] px-3 py-[5px] text-[10px] font-extrabold uppercase tracking-[0.12em] text-white shadow-[0_10px_24px_rgba(255,42,42,0.35)]">
      En ce moment
    </span>
  );
}

export default function ProgramsScheduleClient({ programs }: Props) {
  const [selectedDateInput, setSelectedDateInput] = useState(getTodayInputValue());
  const [showCalendar, setShowCalendar] = useState(false);
  const [activeProgramId, setActiveProgramId] = useState<string>("");

  const daysRailRef = useRef<HTMLDivElement | null>(null);

  const selectedDate = useMemo(() => inputToDate(selectedDateInput), [selectedDateInput]);
  const activeWeekday = useMemo(() => getWeekdayKeyFromDate(selectedDate), [selectedDate]);

  const programsByWeekday = useMemo(() => {
    const grouped = WEEKDAYS.reduce<Record<WeekdayKey, ScheduleProgram[]>>(
      (acc, day) => ({ ...acc, [day.key]: [] }),
      {} as Record<WeekdayKey, ScheduleProgram[]>
    );

    for (const program of programs) {
      const weekdayKey = getWeekdayKeyFromProgramDate(program.date);
      grouped[weekdayKey].push(program);
    }

    for (const day of WEEKDAYS) {
      grouped[day.key].sort((a, b) => a.start.localeCompare(b.start));
    }

    return grouped;
  }, [programs]);

  const currentPrograms = programsByWeekday[activeWeekday] ?? [];
  const activeProgram =
    currentPrograms.find((item) => item.id === activeProgramId) ?? currentPrograms[0] ?? null;

  useEffect(() => {
    if (!currentPrograms.length) {
      setActiveProgramId("");
      return;
    }
    setActiveProgramId(getCurrentProgramId(currentPrograms, selectedDate));
  }, [currentPrograms, selectedDate]);

  const orderedPrograms = useMemo(() => {
    return rotateFromActive(currentPrograms, activeProgram?.id ?? "");
  }, [currentPrograms, activeProgram]);

  const activeIndex = currentPrograms.findIndex((item) => item.id === activeProgram?.id);
  const canGoPrev = activeIndex > 0;
  const canGoNext = activeIndex >= 0 && activeIndex < currentPrograms.length - 1;

  const goPrev = () => {
    if (!canGoPrev) return;
    setActiveProgramId(currentPrograms[activeIndex - 1].id);
  };

  const goNext = () => {
    if (!canGoNext) return;
    setActiveProgramId(currentPrograms[activeIndex + 1].id);
  };

  const onSelectWeekday = (day: (typeof WEEKDAYS)[number]) => {
    const newDate = moveDateToWeekday(selectedDate, day.jsDay);
    setSelectedDateInput(dateToInputValue(newDate));
  };

  const scrollDays = (direction: "left" | "right") => {
    if (!daysRailRef.current) return;
    daysRailRef.current.scrollBy({
      left: direction === "right" ? 220 : -220,
      behavior: "smooth",
    });
  };

  if (!programs.length) {
    return (
      <main className="min-h-screen bg-[#070b1a] text-white pt-24 sm:pt-28 lg:pt-32 mx-auto max-w-[1380px] px-4 pb-12 sm:pb-16 lg:pb-20 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[#08111f] shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(255,74,74,0.12),transparent_18%),radial-gradient(circle_at_72%_28%,rgba(120,120,140,0.14),transparent_18%),linear-gradient(180deg,#10151e_0%,#040812_100%)]" />
          <div className="relative px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
            <h1 className="text-[clamp(1.8rem,4.2vw,3.35rem)] font-extrabold tracking-tight text-white leading-[0.95]">
              Calendrier des programmes
            </h1>
            <p className="mt-4 text-lg text-white/75">Consultez les programmes</p>

            <div className="mt-8 rounded-[26px] border border-white/10 bg-white/[0.04] px-6 py-8 text-center text-white sm:px-8 sm:py-10">
              <h2 className="text-[clamp(1.1rem,3vw,2rem)] font-extrabold leading-[0.95]">
                Aucun Programme
              </h2>
              <p className="mt-4 text-lg text-white/70">
                Pas de programme disponible pour le moment.
              </p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070b1a] text-white pt-24 sm:pt-28 lg:pt-32 mx-auto max-w-[1380px] px-4 pb-12 sm:pb-16 lg:pb-20 sm:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[#08111f] shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_18%,rgba(255,98,98,0.13),transparent_18%),radial-gradient(circle_at_34%_58%,rgba(55,85,140,0.16),transparent_22%),radial-gradient(circle_at_76%_24%,rgba(120,120,140,0.16),transparent_18%),linear-gradient(180deg,#121720_0%,#030811_100%)]" />

        <div className="relative px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
          <div className="max-w-4xl">
            <h1 className="text-[clamp(1.8rem,4.2vw,3.35rem)] font-extrabold tracking-tight text-white leading-[0.95]">
              Calendrier des programmes
            </h1>
            <p className="mt-4 text-lg text-white/75">Consultez les programmes</p>
          </div>

          <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1 lg:max-w-[640px]">
              <button
                type="button"
                onClick={() => setShowCalendar((prev) => !prev)}
                className="flex w-full min-w-0 items-center justify-between rounded-2xl border border-white/30 bg-white/10 px-4 py-3 text-left text-white backdrop-blur-md transition hover:bg-white/14 sm:px-5 sm:py-4"
              >
                <span className="min-w-0 truncate pr-3 text-[0.95rem] font-medium text-white/95 sm:text-base">
                  {getWeekRangeLabel(selectedDate)}
                </span>

                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-lg sm:h-11 sm:w-11 sm:text-xl">
                  📅
                </span>
              </button>

              {showCalendar && (
                <div className="absolute left-0 top-[calc(100%+12px)] z-30 w-full max-w-[360px] rounded-[24px] border border-white/10 bg-[#0b1422]/95 p-5 shadow-[0_25px_70px_rgba(0,0,0,0.4)] backdrop-blur-xl">
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-white/80">
                      Choisir une date
                    </span>
                    <input
                      type="date"
                      value={selectedDateInput}
                      onChange={(e) => setSelectedDateInput(e.target.value)}
                      className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-white outline-none"
                    />
                  </label>

                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowCalendar(false)}
                      className="rounded-full bg-[#d91f26] px-4 py-2 text-sm font-bold text-white shadow-[0_10px_25px_rgba(217,31,38,0.35)]"
                    >
                      Appliquer
                    </button>
                  </div>
                </div>
              )}
            </div>

            <a
              href="/api/programme-pdf"
              className="inline-flex h-[54px] w-fit min-w-[270px] items-center justify-center rounded-full bg-[#d91f26] px-6 text-center text-[0.95rem] font-extrabold leading-none text-white shadow-[0_14px_34px_rgba(217,31,38,0.35)] transition hover:scale-[1.01] hover:bg-[#ef2a31] sm:h-[56px] sm:min-w-[320px] sm:px-7 sm:text-[0.98rem] lg:min-w-[360px] xl:h-[58px] xl:min-w-[400px] xl:px-8 xl:text-base"
            >
              Télécharger notre grille de programme
            </a>
          </div>

          <div className="relative mt-8 flex items-center">
            <button
              type="button"
              onClick={() => scrollDays("left")}
              className="absolute left-0 z-10 grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-[#08111f] text-lg text-white transition hover:border-white/40 md:hidden"
              aria-label="Faire défiler les jours à gauche"
            >
              ‹
            </button>

            <div
              ref={daysRailRef}
              className="no-scrollbar flex min-w-0 flex-1 gap-2 overflow-x-auto px-10"
            >
              {WEEKDAYS.map((day) => {
                const isActive = day.key === activeWeekday;

                return (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() => onSelectWeekday(day)}
                    className={cn(
                      "inline-flex shrink-0 min-w-[90px] items-center justify-center rounded-full px-3 py-2 text-[0.8rem] font-bold text-white transition sm:min-w-[100px] sm:px-4 sm:py-2.5 sm:text-[0.85rem]",
                      isActive
                        ? "bg-[#d91f26] shadow-[0_12px_26px_rgba(217,31,38,0.35)]"
                        : "bg-[#303238] hover:bg-[#3c3f46]"
                    )}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => scrollDays("right")}
              className="absolute right-0 z-10 grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-[#08111f] text-lg text-white transition hover:border-white/40 md:hidden"
              aria-label="Faire défiler les jours à droite"
            >
              ›
            </button>
          </div>

          <div className="mt-10 flex items-center gap-4">
            <h2 className="text-[clamp(1.35rem,3vw,2rem)] font-semibold text-white leading-tight">
              Programme du {formatSelectedDate(selectedDate)}
            </h2>
            <div className="hidden h-px flex-1 bg-white/25 md:block" />
            <div className="ml-auto hidden items-center gap-3 md:flex">
              <button
                type="button"
                onClick={goPrev}
                disabled={!canGoPrev}
                className={cn(
                  "grid h-12 w-12 place-items-center rounded-full border text-2xl text-white transition",
                  canGoPrev
                    ? "border-white/35 bg-transparent hover:border-white/60"
                    : "cursor-not-allowed border-white/10 bg-transparent text-white/25"
                )}
                aria-label="Programme précédent"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={!canGoNext}
                className={cn(
                  "grid h-12 w-12 place-items-center rounded-full border text-2xl text-white transition",
                  canGoNext
                    ? "border-white/35 bg-transparent hover:border-white/60"
                    : "cursor-not-allowed border-white/10 bg-transparent text-white/25"
                )}
                aria-label="Programme suivant"
              >
                ›
              </button>
            </div>
          </div>

          {!currentPrograms.length ? (
            <div className="mt-8 rounded-[26px] border border-white/10 bg-white/[0.04] px-6 py-8 text-center text-white sm:px-8 sm:py-10">
              <h3 className="text-[clamp(1.1rem,3vw,2rem)] font-extrabold leading-[0.95]">
                Aucun Programme
              </h3>
              <p className="mt-4 text-lg text-white/70">
                Pas de programme ce jour. Veuillez choisir une autre date.
              </p>
            </div>
          ) : (
            <>
              <div className="mt-10 hidden md:flex md:gap-6 xl:gap-8">
                <div className="w-[96px] shrink-0">
                  <div className="mt-[180px] flex items-center">
                    <div className="rounded-xl bg-[#d91f26] px-3 py-4 text-center shadow-[0_16px_28px_rgba(217,31,38,0.35)]">
                      <div className="text-[1.35rem] font-extrabold leading-none text-white">
                        {normalizeTime(activeProgram?.start)}
                      </div>
                      <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white/90">
                        GMT
                      </div>
                    </div>
                    <div className="h-px flex-1 bg-white/30" />
                  </div>
                </div>

                <div className="min-w-0 flex-1 overflow-x-auto pb-2">
                  <div className="flex min-w-max items-end gap-6">
                    {orderedPrograms.map((program, index) => {
                      const isActive = index === 0;
                      const isCurrent = isProgramNow(program, selectedDate);

                      return (
                        <button
                          key={program.id}
                          type="button"
                          onClick={() => setActiveProgramId(program.id)}
                          className="w-[320px] shrink-0 text-left"
                        >
                          <div className="flex items-center">
                            {!isActive && (
                              <div className="mr-4 w-[24px] shrink-0" />
                            )}

                            <div
                              className={cn(
                                "relative overflow-hidden rounded-[26px] border-[3px] transition-all duration-300",
                                isActive
                                  ? "border-[#d91f26]"
                                  : "border-transparent"
                              )}
                            >
                              <div className="aspect-[0.72] w-full overflow-hidden rounded-[22px] bg-[linear-gradient(180deg,#14385d_0%,#09111d_100%)]">
                                {program.emission?.image ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={program.emission.image}
                                    alt={program.title}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="h-full w-full bg-[linear-gradient(180deg,#14385d_0%,#09111d_100%)]" />
                                )}
                              </div>

                              {!isActive && (
                                <div className="absolute right-4 top-4 rounded-full bg-[#d91f26] px-4 py-2 text-lg font-extrabold text-white shadow-[0_10px_20px_rgba(217,31,38,0.3)]">
                                  {normalizeTime(program.start)}
                                </div>
                              )}

                              {isCurrent && (
                                <div className="absolute left-4 top-4">
                                  <NowBadge />
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="px-2 pb-1 pt-4 text-center">
                            <div className="flex flex-wrap items-center justify-center gap-2">
                              <h3
                                className="text-[1.95rem] font-extrabold uppercase leading-[0.95] text-white"
                                style={{ fontSize: "clamp(1.1rem, 1.9vw, 2rem)" }}
                              >
                                {program.title}
                              </h3>
                              <ProgramBadge type={program.type} />
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-8 md:hidden">
                <div className="space-y-8">
                  {currentPrograms.map((program) => {
                    const isActive = program.id === activeProgram?.id;
                    const isCurrent = isProgramNow(program, selectedDate);

                    return (
                      <button
                        key={program.id}
                        type="button"
                        onClick={() => setActiveProgramId(program.id)}
                        className={cn(
                          "flex w-full items-start gap-4 text-left transition-transform duration-300",
                          isCurrent && "scale-[1.01]"
                        )}
                      >
                        <div className="flex w-[68px] shrink-0 flex-col items-center">
                          <div
                            className={cn(
                              "rounded-xl px-2 py-3 text-center",
                              isActive ? "bg-[#d91f26]" : "bg-[#5a5d66]",
                              isCurrent && "bg-[#ff2a2a] shadow-[0_10px_22px_rgba(255,42,42,0.28)]"
                            )}
                          >
                            <div className="text-[1.08rem] font-extrabold leading-none text-white">
                              {normalizeTime(program.start)}
                            </div>
                            <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/90">
                              GMT
                            </div>
                          </div>
                          <div className="w-px flex-1 bg-white/25" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="mb-3 flex flex-wrap items-center gap-2">
                            <h4 className="text-[1.15rem] font-extrabold uppercase leading-tight text-white">
                              {program.title}
                            </h4>
                            <ProgramBadge type={program.type} />
                            {isCurrent && <NowBadge />}
                          </div>

                          <div
                            className={cn(
                              "relative overflow-hidden rounded-[24px] border-[3px] transition-all duration-300",
                              isActive ? "border-[#d91f26]" : "border-transparent"
                            )}
                          >
                            <div className="aspect-[0.72] w-full overflow-hidden rounded-[20px] bg-[linear-gradient(180deg,#14385d_0%,#09111d_100%)]">
                              {program.emission?.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={program.emission.image}
                                  alt={program.title}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="h-full w-full bg-[linear-gradient(180deg,#14385d_0%,#09111d_100%)]" />
                              )}
                            </div>

                            {!isActive && (
                              <div className="absolute right-4 top-4 rounded-full bg-[#d91f26] px-4 py-2 text-base font-extrabold text-white">
                                {normalizeTime(program.start)}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}