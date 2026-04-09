import { NextResponse } from "next/server";
import { pdf } from "@react-pdf/renderer";
import weeklySchedule from "@/data/weekly-schedule.json";
import {
  ProgrammePdfDocument,
  type PdfRow,
} from "@/lib/pdf/programme-pdf-document";
import fs from "node:fs/promises";
import path from "node:path";

const WP_BASE = "http://cms.lintelligent.tv";

type WeeklyScheduleItem = {
  day: string;
  start: string;
  end: string;
  emission: string;
  type: string;
};

type WpEmission = {
  id: number;
  slug: string;
  title: { rendered: string };
};

const DAY_ORDER = [
  "lundi",
  "mardi",
  "mercredi",
  "jeudi",
  "vendredi",
  "samedi",
  "dimanche",
] as const;

function cleanText(value?: string) {
  return (value ?? "")
    .replace(/&#8211;/g, "–")
    .replace(/&#8217;/g, "’")
    .replace(/&#038;/g, "&")
    .trim();
}

function getCurrentWeekDates() {
  const now = new Date();
  const jsDay = now.getDay();
  const diffToMonday = jsDay === 0 ? -6 : 1 - jsDay;

  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() + diffToMonday);

  return DAY_ORDER.map((day, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return { day, date };
  });
}

function formatDateFr(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatLongDateFr(date: Date) {
  const formatted = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function formatWeekLabel(start: Date, end: Date) {
  const fmt = new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return `${fmt.format(start)} - ${fmt.format(end)}`;
}

async function fileToDataUri(relativePath: string, mimeType: string) {
  const absolutePath = path.join(process.cwd(), "public", relativePath);
  const fileBuffer = await fs.readFile(absolutePath);
  const base64 = fileBuffer.toString("base64");
  return `data:${mimeType};base64,${base64}`;
}

export async function GET() {
  try {
    const emissionsRes = await fetch(`${WP_BASE}/wp-json/wp/v2/emissions?per_page=100`, {
      next: { revalidate: 300 },
    });

    if (!emissionsRes.ok) {
      return NextResponse.json(
        { error: "Impossible de charger les émissions" },
        { status: 500 }
      );
    }

    const emissions: WpEmission[] = await emissionsRes.json();
    const emissionMap = new Map(
      emissions.map((item) => [item.slug, cleanText(item.title?.rendered)])
    );

    const weekDates = getCurrentWeekDates();
    const weekStart = weekDates[0].date;
    const weekEnd = weekDates[6].date;
    const schedule = weeklySchedule as WeeklyScheduleItem[];

    const rowsByDay: Array<{ dayLabel: string; rows: PdfRow[] }> = weekDates.map(
      ({ day, date }) => {
        const rows = schedule
          .filter((item) => item.day === day)
          .sort((a, b) => a.start.localeCompare(b.start))
          .map((item) => ({
            dateLabel: formatDateFr(date),
            title: emissionMap.get(item.emission) ?? item.emission,
            start: item.start.replace(":", "H"),
            end: item.end.replace(":", "H"),
          }));

        return {
          dayLabel: formatLongDateFr(date),
          rows,
        };
      }
    );

    const logoSrc = await fileToDataUri("home/IAtv-logo.png", "image/png");
    const backgroundSrc = await fileToDataUri("bg-live.jpg", "image/jpeg");

    const blob = await pdf(
      <ProgrammePdfDocument
        rowsByDay={rowsByDay}
        weekLabel={formatWeekLabel(weekStart, weekEnd)}
        logoSrc={logoSrc}
        backgroundSrc={backgroundSrc}
      />
    ).toBlob();

    const arrayBuffer = await blob.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="grille-programme-semaine.pdf"',
      },
    });
  } catch (error) {
    console.error("Erreur génération PDF:", error);
    return NextResponse.json({ error: "Erreur génération PDF" }, { status: 500 });
  }
}