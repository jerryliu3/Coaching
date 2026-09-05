import { currentProfile, listGuidelines } from "@/lib/data";
import { AnalysisForm } from "./analysis-form";

export default async function AnalysisPage() {
  const { user } = await currentProfile();
  const guidelines = user ? await listGuidelines({}) : [];
  return <AnalysisForm initialGuidelines={guidelines} />;
}
