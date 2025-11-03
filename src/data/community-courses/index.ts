import c_job from "./c_job.json";
import c_portfolio from "./c_portfolio.json";
import c_va from "./c_va.json";
import c_design from "./c_design.json";
import c_react from "./c_react.json";

export type CommunityCourse = {
  id: string;
  title: string;
  level: string;
  lessons: number;
  communityId: string;
};

export const communityIdToCourses: Record<string, CommunityCourse[]> = {
  c_job,
  c_portfolio,
  c_va,
  c_design,
  c_react,
};

export function getAllCourses(): CommunityCourse[] {
  return Object.values(communityIdToCourses).flat();
}


