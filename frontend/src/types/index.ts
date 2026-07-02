export type DashboardMetric = {
  label: string;
  value: number;
  hint: string;
};

export type PlacementApplication = {
  id: string;
  company: string;
  role: string;
  appliedDate: string;
  oaStatus: string;
  interviewRound: string;
  hrRound: string;
  offerStatus: string;
  notes: string;
};

export type StudyTask = {
  day: string;
  focus: string;
  duration: string;
  outcome: string;
};
