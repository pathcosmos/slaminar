// ─── Team config types ─────────────────────────────────────

export type CatalogMode = 'extend' | 'replace';

// v0.8 — multi-source catalog federation
export type CatalogSourceType = 'official' | 'url' | 'file' | 'github';
export type CatalogSourceScope = 'bundled' | 'official' | 'user' | 'project' | 'env' | 'cli';
export type CatalogSourceTrust = 'trusted' | 'untrusted' | 'verified';

export interface CatalogSource {
  id: string;
  type: CatalogSourceType;
  uri: string;
  priority: number;
  mode: CatalogMode;
  enabled: boolean;
  trust: CatalogSourceTrust;
  addedAt: string;
  scope: CatalogSourceScope;
}

export interface TeamConfig {
  slaminarVersion: string;
  excludeAuthTools: boolean;
  fileCountCap: number;
  approvedTools: string[];
  catalogVersion: string;
  // Legacy (v0.3–v0.7) — read-path still honors these; migrated into `catalogSources` on load.
  catalogUrl: string;
  catalogMode: CatalogMode;
  // v0.8 — takes precedence when non-empty.
  catalogSources?: CatalogSource[];
}

export interface LocalConfig {
  aiMode: 'local' | 'ai' | 'auto';
  personalTools: string[];
}

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
  deprecated?: boolean;
  deprecatedReason?: string;
  lastVerified?: string;
  replacedBy?: string;
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

// ─── Project discovery / batch apply types (v0.7) ─────────

export type DiscoveredStatus = 'new' | 'configured' | 'existing' | 'unsupported';
export type SuggestedAction = 'init' | 'update' | 'init-merge' | 'skip';
export type DiscoverySignature =
  | 'CLAUDE.md'
  | 'claude-dir'
  | 'claude-settings'
  | 'claude-plugins'
  | 'slaminar-config';

export interface DiscoveredProject {
  root: string;
  status: DiscoveredStatus;
  signatures: DiscoverySignature[];
  language: string | null;
  hasClaudeMd: boolean;
  claudeMdLines: number | null;
  slaminarVersion: string | null;
  suggestedAction: SuggestedAction;
  skipReason?: string;
}

export interface DiscoveryResult {
  roots: string[];
  projects: DiscoveredProject[];
  totalCandidatesChecked: number;
  excludedDirs: number;
  scannedAt: string;
  elapsedMs: number;
  stale?: boolean;
}

export interface DiscoveryCacheEntry {
  version: 1;
  result: DiscoveryResult;
  fetchedAt: string;
}

export interface DiscoverOptions {
  maxDepth?: number;
  excludePatterns?: string[];
  followSymlinks?: boolean;
  signal?: AbortSignal;
}

export interface BatchApplyOptions {
  dryRun?: boolean;
  onlyNew?: boolean;
  catalogUrl?: string;
  catalogMode?: CatalogMode;
}

export interface BatchApplyResult {
  attempted: number;
  succeeded: Array<{ root: string; action: 'init' | 'update'; reportPath?: string }>;
  failed: Array<{ root: string; reason: string }>;
  skipped: Array<{ root: string; reason: string }>;
  elapsedMs: number;
  summaryPath: string | null;
}

// ─── Global setup / defaults / doctor types ───────────────

export type AiMode = 'auto' | 'ai' | 'local';

export interface UserDefaults {
  version: 1;
  savedAt: string;
  defaults: {
    aiMode: AiMode;
    excludeAuthTools: boolean;
    fileCountCap: number;
    verbose: boolean;
  };
  catalog: {
    autoRefreshHours: number;
    // Legacy (v0.3–v0.7) — migrated into `sources` on load when present.
    url: string;
    mode: CatalogMode;
    // v0.8 — takes precedence when non-empty.
    sources?: CatalogSource[];
  };
  discovery: {
    lastRoots: string[];
    excludePatterns: string[];
    maxDepth: number;
  };
  skill: {
    autoInstall: boolean;
    scope: 'global';
  };
  telemetry: {
    optedIn: boolean;
    versionCheck: boolean;
  };
  updateCheck: {
    lastCheckedAt: string | null;
    latestKnownVersion: string | null;
    skipVersions: string[];
  };
}

export type DefaultsSection =
  | 'defaults'
  | 'catalog'
  | 'discovery'
  | 'skill'
  | 'telemetry'
  | 'updateCheck';

export interface DoctorCheck {
  name: string;
  category: string;
  status: 'pass' | 'warn' | 'fail';
  detail: string;
}

export interface DoctorResult {
  checks: DoctorCheck[];
  passCount: number;
  warnCount: number;
  failCount: number;
}

export interface UpdateInfo {
  current: string;
  latest: string;
  message: string;
}

// ─── Skill installation types ──────────────────────────────

export interface SkillInstallResult {
  status: 'installed' | 'updated' | 'unchanged' | 'skipped' | 'failed';
  path: string;
  backupPath?: string;
  reason?: string;
  message?: string;
}

export interface SkillUninstallResult {
  removed: boolean;
  restoredFromBackup: boolean;
  path: string;
  message?: string;
}

export interface SkillStatus {
  installed: boolean;
  path: string;
  contentMatches: boolean;
  bundledAvailable: boolean;
}

// ─── Dynamic Catalog types ─────────────────────────────────

export interface CatalogSuggestion {
  name: string;
  repo: string;
  description: string;
  reason: string;
  addedAt: string;
  matchTags: string[];
  status: 'evaluating' | 'approved' | 'rejected';
}

export interface RemoteCatalog {
  version: string;
  minSlaminarVersion: string;
  updatedAt: string;
  tools: CatalogTool[];
  suggestions: CatalogSuggestion[];
  relations: ToolConflict[];
}

export interface CatalogCacheEntry {
  fetchedAt: string;
  sourceUrl: string;
  etag?: string;
  catalog: RemoteCatalog;
}

export type CatalogFetchState = 'cache' | 'remote' | 'stale' | 'bundled' | 'failed';

export interface CatalogSourceTrace {
  id: string;
  priority: number;
  scope: CatalogSourceScope;
  mode: CatalogMode;
  state: CatalogFetchState;
  uri: string;
}

export interface ResolvedCatalog {
  tools: CatalogTool[];
  relations: ToolConflict[];
  suggestions: CatalogSuggestion[];
  source: 'remote' | 'cache' | 'bundled' | 'merged' | 'multi';
  version: string;
  stale: boolean;
  // v0.8 — populated whenever more than one source contributes, or when the
  // resolver wants to surface which layers participated. Omitted for the
  // single-source path to keep existing tests unchanged.
  sourceTrace?: CatalogSourceTrace[];
}
