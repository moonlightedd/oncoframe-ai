import type { CandidateRow, ParsedCsv, SplitResult, ModelResult, ErrorRow } from '@/lib/types';
import type { LogisticRegressionModel, RandomForestModel } from '@/lib/models';
import type { ClassificationMetrics } from '@/lib/types';
import type { CalibrationPoint, FeatureBins, BootstrapResult } from '@/lib/types';

export interface AppData {
  parsedCsv: ParsedCsv | null;
  rawRows: Record<string, string>[];
  candidates: CandidateRow[];
  columns: string[];
  numericColumns: string[];
  dataDictionary: { column: string; type: string; description: string; source: string }[] | null;
  auditInfo: { fileCounts?: Record<string, number>; rowCounts?: Record<string, number>; licenseNote?: string } | null;
  split: SplitResult | null;
  modelResults: ModelResult[];
  lrModel: LogisticRegressionModel | null;
  rfModel: RandomForestModel | null;
  errorRows: ErrorRow[];
  errorBins: FeatureBins[];
  bootstrapCis: Record<string, Record<string, BootstrapResult>> | null;
  calibrationData: { model: string; points: CalibrationPoint[] }[];
  trainingProgress: number;
  trainingStatus: string;
}

export const emptyAppData: AppData = {
  parsedCsv: null,
  rawRows: [],
  candidates: [],
  columns: [],
  numericColumns: [],
  dataDictionary: null,
  auditInfo: null,
  split: null,
  modelResults: [],
  lrModel: null,
  rfModel: null,
  errorRows: [],
  errorBins: [],
  bootstrapCis: null,
  calibrationData: [],
  trainingProgress: 0,
  trainingStatus: '',
};
