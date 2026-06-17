#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const options = parseArgs(args);
const requestCache = new Map();
let authToken;
let lastRateLimit = null;
let requestCount = 0;

if (!options.sources.length) {
  usage();
  process.exit(2);
}

const output = await exportFindings(options);
const json = `${JSON.stringify(output, null, 2)}\n`;

if (options.out) {
  const outPath = resolve(options.out);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, json, "utf8");
  console.log(`Wrote ${outPath}`);
} else {
  process.stdout.write(json);
}

function usage() {
  console.error(`Usage:
  node scripts/export-github-actions-findings.mjs <url|run-id|pr-number> [more sources...] [--repo owner/repo] [--out file] [--limit 10] [--include-logs] [--wait-rate-limit]

Supported sources:
  - Pull request URL: https://github.com/OWNER/REPO/pull/3
  - Pull request number with --repo: pr:3 or '#3'
  - Workflow URL: https://github.com/OWNER/REPO/actions/workflows/soc2-readiness-check.yml
  - Run URL: https://github.com/OWNER/REPO/actions/runs/123
  - Job URL: https://github.com/OWNER/REPO/actions/runs/123/job/456
  - Run ID with --repo: 123

Examples:
  node scripts/export-github-actions-findings.mjs https://github.com/OWNER/REPO/pull/3 --out artifacts/security/actions-findings.json
  node scripts/export-github-actions-findings.mjs pr:3 --repo OWNER/REPO --include-logs --out artifacts/security/pr-3-actions-findings.json
  node scripts/export-github-actions-findings.mjs https://github.com/OWNER/REPO/actions/workflows/soc2-readiness-check.yml --limit 5

Authentication:
  For private repositories, log access, or higher rate limits, set GITHUB_TOKEN or GH_TOKEN.
  If neither variable is set, the exporter will try to read a token from 'gh auth token'.
`);
}

function parseArgs(values) {
  const parsed = {
    sources: [],
    repo: process.env.GITHUB_REPOSITORY || "",
    out: "",
    limit: 10,
    includeLogs: false,
    skipArtifacts: false,
    waitRateLimit: false,
    maxWaitSeconds: 300,
    noGhToken: false
  };

  for (let i = 0; i < values.length; i += 1) {
    const value = values[i];
    if (value === "--repo") parsed.repo = values[++i] || "";
    else if (value === "--out") parsed.out = values[++i] || "";
    else if (value === "--limit") parsed.limit = Number(values[++i] || 10);
    else if (value === "--include-logs") parsed.includeLogs = true;
    else if (value === "--skip-artifacts") parsed.skipArtifacts = true;
    else if (value === "--wait-rate-limit") parsed.waitRateLimit = true;
    else if (value === "--max-wait-seconds") parsed.maxWaitSeconds = Number(values[++i] || 300);
    else if (value === "--no-gh-token") parsed.noGhToken = true;
    else parsed.sources.push(value);
  }

  parsed.limit = Number.isFinite(parsed.limit) && parsed.limit > 0 ? Math.floor(parsed.limit) : 10;
  parsed.maxWaitSeconds = Number.isFinite(parsed.maxWaitSeconds) && parsed.maxWaitSeconds >= 0 ? Math.floor(parsed.maxWaitSeconds) : 300;
  return parsed;
}

async function exportFindings(opts) {
  const runsById = new Map();
  const findings = [];
  const sourceErrors = [];
  const repositories = new Set();

  for (const source of opts.sources) {
    let parsed = null;
    try {
      parsed = parseSource(source, opts.repo);
      if (!parsed.repo) throw new Error(`Repository could not be resolved for source: ${source}`);
      repositories.add(parsed.repo);

      if (parsed.type === "pr") {
        const pr = await getPullRequest(parsed.repo, parsed.prNumber);
        const prRuns = await listRunsForHeadSha(parsed.repo, pr.head?.sha, opts.limit);
        for (const run of prRuns.workflow_runs || []) {
          await addRun(parsed.repo, run.id, null, opts, runsById, findings, run);
        }
      } else if (parsed.type === "workflow") {
        const workflowRuns = await listWorkflowRuns(parsed.repo, parsed.workflow, opts.limit);
        for (const run of workflowRuns.workflow_runs || []) {
          await addRun(parsed.repo, run.id, null, opts, runsById, findings, run);
        }
      } else if (parsed.type === "job") {
        await addRun(parsed.repo, parsed.runId, parsed.jobId, opts, runsById, findings);
      } else {
        await addRun(parsed.repo, parsed.runId, null, opts, runsById, findings);
      }
    } catch (error) {
      sourceErrors.push({
        source,
        repository: parsed?.repo || "",
        error: normalizeExportError(error)
      });
    }
  }

  const runs = [...runsById.values()].sort((a, b) => Number(b.id) - Number(a.id));
  const repository = opts.repo || inferRepository(runs) || [...repositories][0] || "";

  return {
    schemaVersion: "github-actions-findings/v1",
    generatedAt: new Date().toISOString(),
    repository,
    sources: opts.sources,
    summary: summarize(runs, findings, sourceErrors),
    requestTelemetry: {
      requestCount,
      cacheEntries: requestCache.size,
      authenticated: Boolean(getAuthToken()),
      rateLimit: lastRateLimit
    },
    findings,
    runs,
    sourceErrors
  };
}

async function addRun(repo, runId, onlyJobId, opts, runsById, findings, runPayload = null) {
  const run = runPayload || await getRun(repo, runId);
  const jobsPayload = await listRunJobs(repo, runId);
  const artifactsPayload = opts.skipArtifacts ? { artifacts: [] } : await listRunArtifacts(repo, runId);
  const artifacts = (artifactsPayload.artifacts || []).map(normalizeArtifact);

  const jobs = [];
  for (const job of jobsPayload.jobs || []) {
    if (onlyJobId && Number(job.id) !== Number(onlyJobId)) continue;
    const normalized = normalizeJob(job);
    if (opts.includeLogs && normalized.conclusion === "failure") {
      normalized.logExcerpt = await fetchLogExcerpt(repo, normalized.id).catch((error) => `Unable to fetch log excerpt: ${normalizeExportError(error)}`);
    }
    jobs.push(normalized);

    if (normalized.conclusion === "failure") {
      findings.push({
        type: "job_failure",
        severity: "high",
        repository: repo,
        runId: Number(runId),
        jobId: normalized.id,
        workflowName: run.name || "",
        jobName: normalized.name,
        message: `Job failed: ${normalized.name}`,
        url: normalized.url
      });
    }

    for (const step of normalized.failedSteps) {
      findings.push({
        type: "step_failure",
        severity: step.conclusion === "failure" ? "high" : "medium",
        repository: repo,
        runId: Number(runId),
        jobId: normalized.id,
        workflowName: run.name || "",
        jobName: normalized.name,
        stepNumber: step.number,
        stepName: step.name,
        conclusion: step.conclusion,
        message: `Step ${step.number} failed: ${step.name}`,
        url: normalized.url
      });
    }
  }

  const normalizedRun = {
    id: run.id,
    name: run.name,
    workflowId: run.workflow_id,
    runNumber: run.run_number,
    event: run.event,
    status: run.status,
    conclusion: run.conclusion,
    branch: run.head_branch,
    headSha: run.head_sha,
    createdAt: run.created_at,
    updatedAt: run.updated_at,
    url: run.html_url,
    apiUrl: run.url,
    jobs,
    artifacts
  };

  runsById.set(Number(runId), normalizedRun);

  for (const artifact of artifacts) {
    findings.push({
      type: "artifact_available",
      severity: "info",
      repository: repo,
      runId: Number(runId),
      artifactId: artifact.id,
      artifactName: artifact.name,
      message: `Artifact available: ${artifact.name}`,
      url: artifact.url,
      expired: artifact.expired
    });
  }
}

function parseSource(source, fallbackRepo) {
  if (/^#\d+$/.test(source)) return { type: "pr", repo: fallbackRepo, prNumber: Number(source.slice(1)) };
  if (/^pr:\d+$/i.test(source)) return { type: "pr", repo: fallbackRepo, prNumber: Number(source.split(":")[1]) };
  if (/^\d+$/.test(source)) return { type: "run", repo: fallbackRepo, runId: Number(source) };

  const url = new URL(source);
  const parts = url.pathname.split("/").filter(Boolean);
  const owner = parts[0];
  const name = parts[1];
  const repo = owner && name ? `${owner}/${name}` : fallbackRepo;
  const pullIndex = parts.indexOf("pull");
  const actionsIndex = parts.indexOf("actions");

  if (pullIndex !== -1) return { type: "pr", repo, prNumber: Number(parts[pullIndex + 1]) };
  if (actionsIndex === -1) throw new Error(`Not a GitHub Actions or pull request URL: ${source}`);

  const kind = parts[actionsIndex + 1];
  if (kind === "runs") {
    const runId = Number(parts[actionsIndex + 2]);
    const jobIndex = parts.indexOf("job");
    if (jobIndex !== -1) return { type: "job", repo, runId, jobId: Number(parts[jobIndex + 1]) };
    return { type: "run", repo, runId };
  }

  if (kind === "workflows") {
    return { type: "workflow", repo, workflow: parts[actionsIndex + 2] };
  }

  throw new Error(`Unsupported GitHub Actions URL: ${source}`);
}

async function getPullRequest(repo, prNumber) {
  return apiGet(`/repos/${repo}/pulls/${prNumber}`);
}

async function getRun(repo, runId) {
  return apiGet(`/repos/${repo}/actions/runs/${runId}`);
}

async function listRunJobs(repo, runId) {
  return apiGet(`/repos/${repo}/actions/runs/${runId}/jobs?per_page=100`);
}

async function listRunArtifacts(repo, runId) {
  return apiGet(`/repos/${repo}/actions/runs/${runId}/artifacts?per_page=100`);
}

async function listWorkflowRuns(repo, workflow, limit) {
  return apiGet(`/repos/${repo}/actions/workflows/${encodeURIComponent(workflow)}/runs?per_page=${limit}`);
}

async function listRunsForHeadSha(repo, headSha, limit) {
  if (!headSha) throw new Error("Pull request head SHA was not returned by GitHub.");
  return apiGet(`/repos/${repo}/actions/runs?head_sha=${encodeURIComponent(headSha)}&per_page=${limit}`);
}

async function fetchLogExcerpt(repo, jobId) {
  const text = await apiText(`/repos/${repo}/actions/jobs/${jobId}/logs`);
  const lines = text.split(/\r?\n/);
  const interesting = lines.filter((line) => /error|failed|failure|exception|fatal/i.test(line)).slice(-40);
  return (interesting.length ? interesting : lines.slice(-40)).join("\n").slice(0, 8000);
}

function normalizeJob(job) {
  const steps = (job.steps || []).map((step) => ({
    name: step.name,
    number: step.number,
    status: step.status,
    conclusion: step.conclusion,
    startedAt: step.started_at,
    completedAt: step.completed_at
  }));
  return {
    id: job.id,
    name: job.name,
    status: job.status,
    conclusion: job.conclusion,
    startedAt: job.started_at,
    completedAt: job.completed_at,
    url: job.html_url,
    runnerName: job.runner_name || "",
    labels: job.labels || [],
    failedSteps: steps.filter((step) => ["failure", "cancelled", "timed_out"].includes(String(step.conclusion || "").toLowerCase())),
    steps
  };
}

function normalizeArtifact(artifact) {
  return {
    id: artifact.id,
    name: artifact.name,
    sizeInBytes: artifact.size_in_bytes,
    expired: artifact.expired,
    createdAt: artifact.created_at,
    expiresAt: artifact.expires_at,
    updatedAt: artifact.updated_at,
    url: artifact.archive_download_url || artifact.url
  };
}

function summarize(runs, findings, sourceErrors) {
  const failedJobs = runs.flatMap((run) => run.jobs).filter((job) => job.conclusion === "failure").length;
  const failedSteps = findings.filter((finding) => finding.type === "step_failure").length;
  const artifacts = runs.reduce((count, run) => count + run.artifacts.length, 0);
  return {
    runs: runs.length,
    failedJobs,
    failedSteps,
    artifacts,
    sourceErrors: sourceErrors.length,
    byWorkflow: Object.fromEntries(runs.map((run) => [run.name || String(run.workflowId), run.conclusion || run.status || "unknown"]))
  };
}

function inferRepository(runs) {
  for (const run of runs) {
    const match = String(run.url || "").match(/^https:\/\/github\.com\/([^/]+\/[^/]+)\//);
    if (match) return match[1];
  }
  return "";
}

async function apiGet(path) {
  const key = `json:${path}`;
  if (requestCache.has(key)) return requestCache.get(key);
  const payload = await apiFetch(path, "json");
  requestCache.set(key, payload);
  return payload;
}

async function apiText(path) {
  const key = `text:${path}`;
  if (requestCache.has(key)) return requestCache.get(key);
  const payload = await apiFetch(path, "text");
  requestCache.set(key, payload);
  return payload;
}

async function apiFetch(path, responseType) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    requestCount += 1;
    const response = await fetch(`https://api.github.com${path}`, { headers: apiHeaders() });
    updateRateLimit(response);

    if (response.ok) return responseType === "text" ? response.text() : response.json();

    const body = await response.text();
    const rateLimited = isRateLimited(response, body);
    if (rateLimited && options.waitRateLimit && attempt === 0) {
      const waitMs = rateLimitWaitMs(response);
      if (waitMs <= options.maxWaitSeconds * 1000) {
        console.error(`[actions-findings] GitHub API rate limit reached; waiting ${Math.ceil(waitMs / 1000)}s before retry.`);
        await sleep(waitMs);
        continue;
      }
    }

    throw apiError(response, body, rateLimited);
  }
  throw new Error(`GitHub API request failed after retry: ${path}`);
}

function updateRateLimit(response) {
  const limit = response.headers.get("x-ratelimit-limit");
  const remaining = response.headers.get("x-ratelimit-remaining");
  const reset = response.headers.get("x-ratelimit-reset");
  const resource = response.headers.get("x-ratelimit-resource");
  if (!limit && !remaining && !reset) return;
  lastRateLimit = {
    limit: limit === null ? null : Number(limit),
    remaining: remaining === null ? null : Number(remaining),
    resetEpochSeconds: reset === null ? null : Number(reset),
    resetAt: reset ? new Date(Number(reset) * 1000).toISOString() : null,
    resource: resource || null
  };
}

function isRateLimited(response, body) {
  return response.status === 403 && (
    response.headers.get("x-ratelimit-remaining") === "0" ||
    /rate limit exceeded/i.test(body)
  );
}

function rateLimitWaitMs(response) {
  const reset = Number(response.headers.get("x-ratelimit-reset") || 0);
  if (!reset) return 60000;
  return Math.max(0, (reset * 1000) - Date.now() + 1500);
}

function apiError(response, body, rateLimited) {
  const authHint = getAuthToken()
    ? "Authenticated GitHub API request was rate-limited or denied."
    : "Unauthenticated GitHub API request was rate-limited. Set GITHUB_TOKEN or GH_TOKEN, or run 'gh auth login'.";
  const resetHint = lastRateLimit?.resetAt ? ` Rate limit resets at ${lastRateLimit.resetAt}.` : "";
  const waitHint = rateLimited ? ` ${authHint}${resetHint} You may also pass --wait-rate-limit.` : "";
  return new Error(`GitHub API ${response.status} ${response.statusText}: ${body}${waitHint}`);
}

function apiHeaders() {
  const token = getAuthToken();
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "dune-actions-findings-exporter"
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function getAuthToken() {
  if (authToken !== undefined) return authToken;
  authToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
  if (!authToken && !options.noGhToken) authToken = readGhAuthToken();
  return authToken;
}

function readGhAuthToken() {
  const result = spawnSync("gh", ["auth", "token"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    timeout: 5000
  });
  return result.status === 0 ? result.stdout.trim() : "";
}

function normalizeExportError(error) {
  return String(error?.message || error);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
