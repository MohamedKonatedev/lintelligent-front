import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

// Réduction de l'espacement entre les lignes du tableau
const styles = StyleSheet.create({
  page: {
    position: "relative",
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: 26,
    backgroundColor: "#07152b",
    fontSize: 10,
    color: "#ffffff",
    fontFamily: "Helvetica",
  },

  background: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    opacity: 0.13,
  },

  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(5,16,34,0.78)",
  },

  content: {
    position: "relative",
  },

  heroHeader: {
    marginBottom: 18,
    paddingTop: 10,
    paddingBottom: 16,
    paddingHorizontal: 18,
    borderRadius: 18,
    backgroundColor: "rgba(16,31,61,0.9)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  lightHeader: {
    marginBottom: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.18)",
  },

  logoWrap: {
    alignItems: "center",
    marginBottom: 8,
  },

  // Réduction de la taille du logo ici
  logo: {
    width: 140, // Avant: 220
    height: 34, // Avant: 52
    objectFit: "contain",
  },

  badgeWrap: {
    alignItems: "center",
    marginBottom: 8,
  },

  badge: {
    backgroundColor: "#d91f26",
    color: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
  },

  week: {
    textAlign: "center",
    fontSize: 10,
    color: "#d7e5ff",
    marginBottom: 8,
  },

  firstPageDayTitle: {
    textAlign: "center",
    fontSize: 12,
    fontWeight: 700,
    color: "#ffffff",
    marginBottom: 2,
  },

  dayTitle: {
    textAlign: "left",
    fontSize: 14,
    fontWeight: 700,
    color: "#ffffff",
  },

  table: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#355692",
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#ffffff",
  },

  headerRow: {
    flexDirection: "row",
    backgroundColor: "#184f9f",
  },

  row: {
    flexDirection: "row",
  },

  // Espacements réduits ici (padding: 4)
  cellDate: {
    width: "22%",
    padding: 4,
    textAlign: "center",
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#d7dfef",
    color: "#111111",
  },

  cellTitle: {
    width: "40%",
    padding: 4,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#d7dfef",
    color: "#111111",
  },

  cellStart: {
    width: "19%",
    padding: 4,
    textAlign: "center",
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#d7dfef",
    color: "#111111",
  },

  cellEnd: {
    width: "19%",
    padding: 4,
    textAlign: "center",
    borderBottomWidth: 1,
    borderColor: "#d7dfef",
    color: "#111111",
  },

  headerCell: {
    color: "#ffffff",
    fontWeight: 700,
    borderColor: "#3d68b2",
  },

  footer: {
    marginTop: 10,
    textAlign: "center",
    fontSize: 9,
    color: "#d7e5ff",
    fontWeight: 700,
  },

  pageNumber: {
    marginTop: 3,
    textAlign: "center",
    fontSize: 8,
    color: "#b7c8ea",
  },
});

export type PdfRow = {
  dateLabel: string;
  title: string;
  start: string;
  end: string;
};

export function ProgrammePdfDocument({
  rowsByDay,
  weekLabel,
  logoSrc,
  backgroundSrc,
}: {
  rowsByDay: Array<{ dayLabel: string; rows: PdfRow[] }>;
  weekLabel: string;
  logoSrc: string;
  backgroundSrc: string;
}) {
  // Filtrer les groupes sans lignes NI undefined pour éviter toute page vide
  const pages = Array.isArray(rowsByDay)
    ? rowsByDay.filter(
        (group) =>
          group &&
          group.rows &&
          Array.isArray(group.rows) &&
          group.rows.length > 0 &&
          group.dayLabel
      )
    : [];

  // Protection supplémentaire : si pages vide, ne rien générer (évitera une page blanche créée par <Document>)
  if (pages.length === 0) {
    return <Document />;
  }

  return (
    <Document>
      {pages.map((group, index) => {
        const isFirstPage = index === 0;

        return (
          <Page
            key={group.dayLabel}
            size="A4"
            orientation="portrait"
            style={styles.page}
            wrap={false} // Essayez wrap=false pour éviter d'injecter une page vierge à cause de page break
          >
            <Image src={backgroundSrc} style={styles.background} />
            <View style={styles.overlay} />

            <View style={styles.content}>
              {isFirstPage ? (
                <View style={styles.heroHeader}>
                  <View style={styles.logoWrap}>
                    <Image src={logoSrc} style={styles.logo} />
                  </View>

                  <View style={styles.badgeWrap}>
                    <Text style={styles.badge}>
                      Programme Hebdomadaire
                    </Text>
                  </View>

                  <Text style={styles.week}>Semaine du {weekLabel}</Text>
                  <Text style={styles.firstPageDayTitle}>
                    {group.dayLabel}
                  </Text>
                </View>
              ) : (
                <View style={styles.lightHeader}>
                  <Text style={styles.dayTitle}>{group.dayLabel}</Text>
                </View>
              )}

              <View style={styles.table}>
                <View style={styles.headerRow}>
                  <Text style={[styles.cellDate, styles.headerCell]}>
                    Date
                  </Text>
                  <Text style={[styles.cellTitle, styles.headerCell]}>
                    Intitulé de l&apos;émission
                  </Text>
                  <Text style={[styles.cellStart, styles.headerCell]}>
                    Heure de diffusion
                  </Text>
                  <Text style={[styles.cellEnd, styles.headerCell]}>
                    Heure fin
                  </Text>
                </View>

                {group.rows.map((row, rowIndex) => (
                  <View
                    style={styles.row}
                    key={`${group.dayLabel}-${rowIndex}`}
                  >
                    <Text style={styles.cellDate}>{row.dateLabel}</Text>
                    <Text style={styles.cellTitle}>{row.title}</Text>
                    <Text style={styles.cellStart}>{row.start}</Text>
                    <Text style={styles.cellEnd}>{row.end}</Text>
                  </View>
                ))}
              </View>

              <Text style={styles.footer}>
                © L’Intelligent TV — Grille officielle de diffusion
              </Text>
              <Text
                style={styles.pageNumber}
                render={({ pageNumber, totalPages }) =>
                  `Page ${pageNumber} / ${totalPages}`
                }
                fixed
              />
            </View>
          </Page>
        );
      })}
    </Document>
  );
}