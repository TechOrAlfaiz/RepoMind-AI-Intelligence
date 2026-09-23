export type HealthGrade = "A" | "B" | "C" | "D" | "F";

export interface HealthMetricDetail {
  score: number; // 0 - 100
  weight: number; // 0.0 - 1.0
  summary: string;
  status: "excellent" | "good" | "warning" | "critical";
}

export interface RepoHealthScore {
  repositoryId: string;
  repositoryName: string;
  overallScore: number; // 0 - 100
  grade: HealthGrade;
  calculatedAt: string;
  metrics: {
    testCoverage: HealthMetricDetail;
    docCoverage: HealthMetricDetail;
    dependencyFreshness: HealthMetricDetail;
    codeChurnStability: HealthMetricDetail;
  };
  fileStats: {
    totalFiles: number;
    testFiles: number;
    sourceFiles: number;
    documentedFiles: number;
  };
  recommendations: string[];
}

export interface OnboardingStep {
  rank: number;
  phase: string;
  title: string;
  filePath: string;
  symbolName?: string;
  startLine?: number;
  endLine?: number;
  readingGoal: string;
  estimatedMinutes: number;
  importance: "essential" | "recommended" | "optional";
  snippet?: string;
}

export interface OnboardingPlaybook {
  repositoryId: string;
  repositoryName: string;
  targetRole: string;
  generatedAt: string;
  totalEstimatedMinutes: number;
  steps: OnboardingStep[];
  summary: string;
}

export interface TimeMachineSnapshot {
  commitSha: string;
  message: string;
  author: string;
  date: string;
  tag?: string;
  fileCount: number;
  isHead: boolean;
}

export interface TimeMachineQueryRequest {
  repositoryId: string;
  query: string;
  atCommitSha?: string;
  tag?: string;
}
