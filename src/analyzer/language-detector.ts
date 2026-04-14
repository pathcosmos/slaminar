import type { ProjectSnapshot, LanguageProfile } from '../types/index.js';

// ─── Extension → Language mapping ─────────────────────────

const EXT_TO_LANG: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.py': 'python',
  '.rs': 'rust',
  '.go': 'go',
  '.java': 'java',
  '.kt': 'kotlin',
  '.rb': 'ruby',
  '.php': 'php',
  '.cs': 'csharp',
  '.cpp': 'cpp',
  '.c': 'c',
  '.swift': 'swift',
};

const SECONDARY_EXTS: Record<string, string> = {
  '.css': 'css',
  '.scss': 'scss',
  '.sass': 'sass',
  '.less': 'less',
  '.html': 'html',
  '.vue': 'vue',
  '.svelte': 'svelte',
};

// ─── Dependency → Framework mapping ───────────────────────

const DEP_TO_FRAMEWORK: Record<string, string> = {
  'react': 'react',
  'react-dom': 'react',
  'vue': 'vue',
  'nuxt': 'nuxt',
  '@angular/core': 'angular',
  'svelte': 'svelte',
  'next': 'next',
  'express': 'express',
  'fastify': 'fastify',
  'nestjs': 'nestjs',
  '@nestjs/core': 'nestjs',
  'django': 'django',
  'flask': 'flask',
  'actix-web': 'actix',
  'axum': 'axum',
};

// ─── Config type → Build tool mapping ─────────────────────

const CONFIG_TO_BUILD: Record<string, string> = {
  'vite': 'vite',
  'webpack': 'webpack',
  'rollup': 'rollup',
  'esbuild': 'esbuild',
  'turbo': 'turbo',
  'tsup': 'tsup',
};

// ─── Language → Runtime mapping ───────────────────────────

const LANG_TO_RUNTIME: Record<string, string> = {
  'typescript': 'node',
  'javascript': 'node',
  'python': 'python3',
  'rust': 'cargo',
  'go': 'go',
  'java': 'jvm',
  'kotlin': 'jvm',
  'ruby': 'ruby',
  'php': 'php',
  'csharp': 'dotnet',
  'swift': 'swift',
};

// ─── Detector ─────────────────────────────────────────────

export function detectLanguage(snapshot: ProjectSnapshot): LanguageProfile {
  const { fileStats, packages, configs } = snapshot;

  // Tally file counts per language
  const langCounts: Record<string, number> = {};
  const secondarySet = new Set<string>();

  for (const [ext, count] of Object.entries(fileStats)) {
    const lang = EXT_TO_LANG[ext];
    if (lang) {
      langCounts[lang] = (langCounts[lang] ?? 0) + count;
    }
    const sec = SECONDARY_EXTS[ext];
    if (sec) {
      secondarySet.add(sec);
    }
  }

  // Determine primary language
  const sorted = Object.entries(langCounts).sort((a, b) => b[1] - a[1]);
  const primary = sorted.length > 0 ? sorted[0][0] : 'unknown';

  // Detect framework from dependencies
  let framework: string | null = null;
  for (const pkg of packages) {
    const allDeps = [...pkg.dependencies, ...pkg.devDependencies];
    for (const dep of allDeps) {
      if (DEP_TO_FRAMEWORK[dep]) {
        framework = DEP_TO_FRAMEWORK[dep];
        break;
      }
    }
    if (framework) break;
  }

  // Detect build tool from configs
  let buildTool: string | null = null;
  for (const cfg of configs) {
    if (CONFIG_TO_BUILD[cfg.type]) {
      buildTool = CONFIG_TO_BUILD[cfg.type];
      break;
    }
  }

  // Runtime from primary language
  const runtime = primary !== 'unknown' ? (LANG_TO_RUNTIME[primary] ?? null) : null;

  return {
    primary,
    secondary: [...secondarySet],
    framework,
    runtime,
    buildTool,
  };
}
