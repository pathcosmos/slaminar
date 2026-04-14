// ─── File Tree ─────────────────────────────────────────────

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  extension?: string;
  children?: FileNode[];
}

// ─── Package Info ──────────────────────────────────────────

export interface PackageInfo {
  manager: 'npm' | 'cargo' | 'pip' | 'go' | 'maven' | 'gradle';
  name: string | null;
  version: string | null;
  description: string | null;
  scripts: Record<string, string>;
  dependencies: string[];
  devDependencies: string[];
  filePath: string;
}

// ─── Git Info ──────────────────────────────────────────────

export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  date: string;
}

export interface GitInfo {
  totalCommits: number;
  recentCommits: GitCommit[];
  branches: string[];
  contributors: string[];
  currentBranch: string;
}

// ─── AI Context ────────────────────────────────────────────

export interface AiFile {
  type: 'claude-md' | 'claude-settings' | 'claude-plugin';
  path: string;
  lineCount: number;
}

// ─── Config / CI / Docs ────────────────────────────────────

export interface ConfigFile {
  type: string;
  path: string;
}

export interface CiConfig {
  platform: 'github-actions' | 'gitlab-ci' | 'docker' | 'other';
  path: string;
}

export interface DocFile {
  type: 'readme' | 'setup' | 'contributing' | 'other';
  path: string;
  lineCount: number;
}

// ─── Project Snapshot (Scanner output) ─────────────────────

export interface ProjectSnapshot {
  root: string;
  fileTree: FileNode[];
  fileStats: Record<string, number>;
  packages: PackageInfo[];
  git: GitInfo | null;
  existingAiFiles: AiFile[];
  configs: ConfigFile[];
  ci: CiConfig[];
  docs: DocFile[];
  scannedAt: string;
}

// ─── Analyzer types ────────────────────────────────────────

export interface LanguageProfile {
  primary: string;
  secondary: string[];
  framework: string | null;
  runtime: string | null;
  buildTool: string | null;
}

export interface StructureProfile {
  pattern: 'monorepo' | 'spa' | 'cli' | 'library' | 'api' | 'fullstack' | 'unknown';
  entryPoints: string[];
  testPattern: string | null;
  srcLayout: 'flat' | 'feature-based' | 'layer-based' | 'unknown';
}

export interface ConventionProfile {
  naming: 'camelCase' | 'snake_case' | 'kebab-case' | 'unknown';
  testFramework: string | null;
  linter: string | null;
  formatter: string | null;
  commitStyle: 'conventional' | 'emoji' | 'freeform' | 'unknown';
  docLanguage: string;
}

export interface DependencyProfile {
  total: number;
  notable: { name: string; category: string }[];
  devTools: string[];
}

export type ProjectMaturity = 'greenfield' | 'early' | 'growing' | 'mature';

export interface AiContextSummary {
  hasClaudeMd: boolean;
  claudeMdLines: number;
  hasClaudeSettings: boolean;
  hasClaudePlugin: boolean;
}

export interface ProjectProfile {
  name: string;
  description: string;
  language: LanguageProfile;
  structure: StructureProfile;
  conventions: ConventionProfile;
  dependencies: DependencyProfile;
  maturity: ProjectMaturity;
  existingAiContext: AiContextSummary;
}

// ─── Recommender types ─────────────────────────────────────

export interface CatalogTool {
  name: string;
  repo: string;
  category: 'plugin' | 'skill' | 'hook' | 'agent' | 'workflow';
  description: string;
  authRequired: boolean;
  networkRequired: 'none' | 'partial' | 'full';
  installMethod: 'marketplace' | 'npx' | 'git-clone' | 'pip';
  installCommands: string[];
  prerequisites: string[];
  tags: string[];
  maturityFit: ProjectMaturity[];
}

export interface ScoredTool {
  tool: CatalogTool;
  score: number;
  reasons: string[];
}

export interface ToolConflict {
  tools: [string, string];
  relation: 'synergy' | 'overlap' | 'conflict';
  resolution: string;
  winner?: string;
}

export interface RecommendationPlan {
  recommended: ScoredTool[];
  excluded: { tool: CatalogTool; reason: string }[];
  conflicts: ToolConflict[];
  maxTools: number;
}

// ─── Generation types ──────────────────────────────────────

export interface GenerationTarget {
  path: string;
  content: string;
  mode: 'create' | 'merge';
}

export interface BackupRecord {
  originalPath: string;
  backupPath: string;
  timestamp: number;
}

export interface GenerationPlan {
  targets: GenerationTarget[];
  backups: BackupRecord[];
  toolInstalls: { tool: string; commands: string[] }[];
}

// ─── Validation types ──────────────────────────────────────

export interface ValidationCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  detail: string;
}

export interface ValidationResult {
  checks: ValidationCheck[];
  passCount: number;
  failCount: number;
  warnCount: number;
}
