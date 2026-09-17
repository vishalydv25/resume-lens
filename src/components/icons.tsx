export function Icon({ name, size = 20 }: { name: "document" | "arrow" | "upload" | "check" | "shield" | "spark" | "download"; size?: number }) {
  const paths = {
    document: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
    upload: <><path d="M12 16V3M7 8l5-5 5 5M4 15v5h16v-5"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9S4 17 4 12V6z"/><path d="m8 12 3 3 5-6"/></>,
    spark: <><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z"/></>,
    download: <><path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/></>
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
