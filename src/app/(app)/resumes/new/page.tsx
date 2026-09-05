import { currentProfile, listProfiles } from "@/lib/data";
import { NewResumeForm } from "./new-resume-form";

export default async function NewResumePage() {
  const { profile } = await currentProfile();
  const profiles = profile?.role === "owner" ? await listProfiles() : [];
  return <NewResumeForm canAssign={profile?.role === "owner"} profiles={profiles} />;
}
