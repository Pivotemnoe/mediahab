import Link from "next/link";
import {
  ArrowLeft,
  Blocks,
  CheckCircle2,
  CopyPlus,
  FileJson,
  FolderPlus,
  type LucideIcon,
  WandSparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const projectSteps = [
  "Identity",
  "Audience",
  "Voice",
  "Platforms",
  "Examples",
  "Rubrics",
];

const projectEntryPoints: Array<[string, string, LucideIcon]> = [
  ["From scratch", "Create a reusable project without preset data.", FolderPlus],
  ["From preset", "Import a supported preset idempotently.", CopyPlus],
  ["Import package", "Validate project/rubric JSON before activation.", FileJson],
];

export function ProjectIndexShell() {
  return (
    <main className="min-h-screen bg-surface">
      <BuilderHeader title="Projects" />
      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Badge tone="success">Phase 03</Badge>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal text-ink">
              Project constructor
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Projects are stable identities with immutable configuration
              versions. Presets import as data, not code branches.
            </p>
          </div>
          <Button asChild>
            <Link href="/app/projects/new">
              <FolderPlus size={16} />
              New project
            </Link>
          </Button>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {projectEntryPoints.map(([title, text, Icon]) => (
            <Card className="grid gap-3" key={title}>
              <Icon className="text-accent" size={20} />
              <div>
                <div className="text-sm font-semibold">{title}</div>
                <div className="mt-1 text-sm leading-6 text-muted">{text}</div>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}

export function NewProjectShell() {
  return (
    <main className="min-h-screen bg-surface">
      <BuilderHeader title="New project" />
      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-6 lg:grid-cols-[260px_1fr]">
        <Card className="grid content-start gap-2">
          {projectSteps.map((step, index) => (
            <div
              className="flex items-center gap-2 rounded-md border border-line p-3 text-sm"
              key={step}
            >
              <CheckCircle2 size={16} className={index === 0 ? "text-success" : "text-muted"} />
              <span className={index === 0 ? "font-medium text-ink" : "text-muted"}>
                {step}
              </span>
            </div>
          ))}
        </Card>
        <Card className="grid gap-4">
          <div>
            <Badge>Wizard</Badge>
            <h1 className="mt-3 text-2xl font-semibold tracking-normal text-ink">
              Create from scratch, preset, clone, or import
            </h1>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {["Project name", "Slug", "Content domain", "Primary language"].map((label) => (
              <label className="grid gap-1 text-sm" key={label}>
                <span className="font-medium text-ink">{label}</span>
                <input className="h-10 rounded-md border border-line px-3 outline-none focus:border-accent" />
              </label>
            ))}
          </div>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-ink">Voice and tone</span>
            <textarea className="min-h-28 rounded-md border border-line px-3 py-2 outline-none focus:border-accent" />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="button">
              <FolderPlus size={16} />
              Save draft project
            </Button>
            <Button type="button" variant="secondary">
              <CopyPlus size={16} />
              Import preset
            </Button>
            <Button type="button" variant="secondary">
              <FileJson size={16} />
              Validate package
            </Button>
          </div>
        </Card>
      </section>
    </main>
  );
}

export function ProjectDetailShell({ projectId }: { projectId: string }) {
  return (
    <main className="min-h-screen bg-surface">
      <BuilderHeader title="Project" />
      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Badge>Project ID</Badge>
            <h1 className="mt-3 break-all text-3xl font-semibold tracking-normal text-ink">
              {projectId}
            </h1>
            <p className="mt-2 text-sm text-muted">
              Stable identity with active configuration version.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="secondary">
              <Link href={`/app/projects/${projectId}/builder`}>
                <WandSparkles size={16} />
                Builder
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/app/projects/${projectId}/rubrics`}>
                <Blocks size={16} />
                Rubrics
              </Link>
            </Button>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {["Versions", "Rubrics", "Preset import"].map((title) => (
            <Card key={title}>
              <div className="text-sm font-semibold">{title}</div>
              <div className="mt-2 text-sm leading-6 text-muted">
                Managed through Phase 03 API and immutable rows.
              </div>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}

export function ProjectBuilderShell({ projectId }: { projectId: string }) {
  return (
    <main className="min-h-screen bg-surface">
      <BuilderHeader title="Project builder" />
      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-6 lg:grid-cols-[260px_1fr]">
        <Card className="grid content-start gap-2">
          {projectSteps.map((step) => (
            <button
              className="h-10 rounded-md px-3 text-left text-sm text-muted hover:bg-surface hover:text-ink"
              key={step}
            >
              {step}
            </button>
          ))}
        </Card>
        <Card className="grid gap-4">
          <Badge>Versioned config</Badge>
          <h1 className="text-2xl font-semibold tracking-normal text-ink">
            Builder for {projectId}
          </h1>
          <div className="grid gap-3 md:grid-cols-2">
            {["Name", "Description", "AI mode", "Character policy"].map((label) => (
              <div className="rounded-md border border-line p-3" key={label}>
                <div className="text-sm font-medium">{label}</div>
                <div className="mt-1 text-sm text-muted">
                  Saved changes create a new project version.
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </main>
  );
}

export function RubricBuilderShell({ projectId }: { projectId: string }) {
  const palette = ["Short text", "Long text", "Money", "Rating", "Media", "Repeatable group", "Custom block"];
  const fields = ["venue_name", "atmosphere", "dishes[]", "conclusion", "media[]"];
  return (
    <main className="min-h-screen bg-surface">
      <BuilderHeader title="Rubric builder" />
      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-6">
        <div>
          <Badge>Project {projectId}</Badge>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-ink">
            Field palette, form canvas, inspector
          </h1>
        </div>
        <div className="grid gap-4 lg:grid-cols-[240px_1fr_280px]">
          <Card className="grid content-start gap-2">
            <div className="text-sm font-semibold">Field palette</div>
            {palette.map((item) => (
              <button
                className="h-9 rounded-md border border-line px-3 text-left text-sm hover:bg-surface"
                key={item}
              >
                {item}
              </button>
            ))}
          </Card>
          <Card className="grid content-start gap-3">
            <div className="text-sm font-semibold">Form canvas</div>
            {fields.map((field) => (
              <div className="rounded-md border border-line p-3" key={field}>
                <div className="text-sm font-medium">{field}</div>
                <div className="mt-1 text-sm text-muted">
                  Order, required state, source, and lock metadata persist in JSON Schema.
                </div>
              </div>
            ))}
          </Card>
          <Card className="grid content-start gap-3">
            <div className="text-sm font-semibold">Inspector</div>
            {["Required", "Fact locked", "Generated", "Min/max items", "Editorial limits"].map((item) => (
              <label className="flex items-center gap-2 text-sm" key={item}>
                <input type="checkbox" />
                {item}
              </label>
            ))}
            <Button type="button">
              <WandSparkles size={16} />
              Save new version
            </Button>
          </Card>
        </div>
      </section>
    </main>
  );
}

function BuilderHeader({ title }: { title: string }) {
  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
        <div>
          <div className="text-sm font-semibold">{title}</div>
          <div className="text-xs text-muted">Phase 03 technical builder</div>
        </div>
        <Button asChild variant="ghost">
          <Link href="/app">
            <ArrowLeft size={16} />
            Cabinet
          </Link>
        </Button>
      </div>
    </header>
  );
}
