import { gradeLabels } from "@/lib/prevention";
import type { Grade } from "@/lib/types";

export function GradeBadge({ grade, large = false }: { grade: Grade; large?: boolean }) {
  return <span className={`grade-badge grade-${grade.toLowerCase()} ${large ? "grade-badge-large" : ""}`} title={gradeLabels[grade]}>{grade}</span>;
}
