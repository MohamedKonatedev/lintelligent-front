import { getPrograms } from "@/lib/getPrograms";
import ProgramsScheduleClient from "./ProgramsScheduleClient";

export default async function Page() {
  const programs = await getPrograms();
  return <ProgramsScheduleClient programs={programs} />;
}