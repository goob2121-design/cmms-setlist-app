import { PrintAutoLaunch } from "@/components/print-auto-launch";
import { getSetlist } from "@/lib/setlists";

type PrintPageProps = {
  params: Promise<{
    setlistId: string;
  }>;
  searchParams: Promise<{
    autoprint?: string;
  }>;
};

export default async function SetlistPrintPage({ params, searchParams }: PrintPageProps) {
  const { setlistId } = await params;
  const { autoprint } = await searchParams;
  const setlist = await getSetlist(setlistId);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "Georgia, serif",
          background: "#ffffff",
          color: "#111111"
        }}
      >
        <PrintAutoLaunch enabled={autoprint === "1"} />
        <main
          style={{
            maxWidth: "850px",
            margin: "0 auto",
            padding: "32px 24px 56px"
          }}
        >
          <header style={{ marginBottom: "24px", borderBottom: "2px solid #111111", paddingBottom: "16px" }}>
            <h1 style={{ margin: 0, fontSize: "34px" }}>{setlist.name}</h1>
            {setlist.description ? (
              <p style={{ marginTop: "12px", fontSize: "16px", lineHeight: 1.5 }}>{setlist.description}</p>
            ) : null}
            <p style={{ marginTop: "12px", fontSize: "15px" }}>
              {setlist.songCount} songs | {setlist.totalDurationMinutes.toFixed(1)} minutes
            </p>
          </header>

          <section>
            {setlist.items.map((item, index) => (
              <article
                key={item.id}
                style={{
                  display: "grid",
                  gap: "8px",
                  padding: "14px 0",
                  borderBottom: "1px solid #d0d0d0"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                  <strong style={{ fontSize: "18px" }}>
                    {index + 1}. {item.song.title}
                  </strong>
                  <span style={{ fontSize: "15px" }}>
                    {item.song.key} | {item.song.duration} min
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: "14px" }}>
                  {item.song.tempo} | {item.song.singer}
                </p>
                {item.song.notes ? (
                  <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.45 }}>{item.song.notes}</p>
                ) : null}
                {item.arrangementNotes ? (
                  <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.45 }}>
                    Set notes: {item.arrangementNotes}
                  </p>
                ) : null}
              </article>
            ))}
          </section>
        </main>
      </body>
    </html>
  );
}
