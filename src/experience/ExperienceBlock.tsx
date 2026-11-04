import type { ReactNode } from "react";
import { usePwaExperience } from "../context/PwaExperienceContext";
import type { BLOCK_LABELS } from "../config/pwaExperience";
export function ExperienceBlock({
  id,
  children,
}: {
  id: keyof typeof BLOCK_LABELS;
  children: ReactNode;
}) {
  const { config, active } = usePwaExperience();
  const index = config.home.blocks.findIndex((b) => b.id === id),
    block = config.home.blocks[index];
  if (active && !block?.visible) return null;
  return (
    <div
      className="experience-block"
      data-experience-region="surface"
      data-experience-block={id}
      data-variant={active ? block?.variant : "default"}
      style={active ? { order: index + 1 } : { display: "contents" }}
    >
      {children}
    </div>
  );
}
