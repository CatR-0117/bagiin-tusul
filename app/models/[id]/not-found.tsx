import Link from "next/link";
import { Box } from "lucide-react";

export default function ModelNotFound() {
  return <main className="not-found-page"><div className="empty-orbit"><Box size={30} /></div><span className="eyebrow">Model not found</span><h1>This spatial asset isn’t available.</h1><p>It may have been deleted, or it belongs to another workspace.</p><Link className="button button-primary" href="/dashboard">Back to dashboard</Link></main>;
}

