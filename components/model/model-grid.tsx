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
        <span className="eyebrow">Таны орон зайн сан хоосон байна</span>
        <h2>Бүх талаас нь үзэж болох зүйл бүтээгээрэй.</h2>
        <p>Бүтээгдэхүүний нэг тод зургаас эхэлж 3D болон AR загвар болгоно.</p>
        <Link className="button button-primary" href="/create"><Plus size={17} /> Анхны загвараа үүсгэх</Link>
      </div>
    );
  }
  return (
    <div className="model-grid">
      {items.map(({ project, thumbnailUrl }) => <ModelCard key={project.id} project={project} thumbnailUrl={thumbnailUrl} />)}
      <Link className="model-card create-card" href="/create">
        <div><Plus size={24} /><h3>Дараагийн загвараа үүсгэх</h3><p>Шинэ бүтээгдэхүүний зураг оруулах</p><span>Үүсгэж эхлэх <ArrowRight size={15} /></span></div>
      </Link>
    </div>
  );
}
