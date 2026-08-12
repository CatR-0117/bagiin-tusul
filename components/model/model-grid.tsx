import Link from "next/link";
import { ArrowRight, Box, Plus } from "lucide-react";
import { ModelCard } from "@/components/model/model-card";
import type { Project } from "@/types/project";

export type ProjectWithThumbnail = { project: Project; thumbnailUrl: string | null };

export function ModelGrid({ items }: { items: ProjectWithThumbnail[] }) {
  if (items.length === 0) {
    return (
      <div className="empty-models">
        <div className="empty-orbit"><Box size={30} /></div>
        <span className="eyebrow">Your spatial library is empty</span>
        <h2>Create something you can walk around.</h2>
        <p>Start with one clear product image. We’ll guide it all the way to 3D and AR.</p>
        <Link className="button button-primary" href="/create"><Plus size={17} /> Create your first model</Link>
      </div>
    );
  }
  return (
    <div className="model-grid">
      {items.map(({ project, thumbnailUrl }) => <ModelCard key={project.id} project={project} thumbnailUrl={thumbnailUrl} />)}
      <Link className="model-card create-card" href="/create">
        <div><Plus size={24} /><h3>Create another model</h3><p>Upload a new product image</p><span>Start creating <ArrowRight size={15} /></span></div>
      </Link>
    </div>
  );
}

