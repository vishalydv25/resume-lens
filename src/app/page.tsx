import ResumeApp from "../components/resume-app";
import { isLiveEnabled } from "../lib/security.ts";
export const dynamic = "force-dynamic";
export default function Home() { return <ResumeApp liveEnabled={isLiveEnabled()} />; }
