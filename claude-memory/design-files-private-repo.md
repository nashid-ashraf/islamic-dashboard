---
name: design-files-private-repo
description: Design deliverables (wireframes, hi-fi prototypes, design briefs) live in a separate private repo, symlinked into this working tree — not tracked here.
metadata:
  type: project
---

`islamic-dashboard` is a **public** GitHub repo. On 2026-07-05, all design deliverables were
moved out to a separate **private** repo, `nashid-ashraf/islamic-dashboard-design`, because the
user doesn't want design work-in-progress publicly visible. The moved paths — `design-briefs/`,
`hi-fi-designs/`, `prototypes/`, `WIREFRAMES.md`, `WIREFRAMES_TODO.md`,
`HOWTO_DESIGN_PIPELINE.md`, `islamic_dashboard.html`, `claude-memory/hifi-design-pipeline.md`,
`claude-memory/wireframes-visual-spec.md` — were also **purged from this repo's git history**
(via `git filter-repo` + force-push), since they'd already been pushed publicly and a plain
delete-commit would leave them recoverable from old commit SHAs.

On disk, these paths now exist as **symlinks** into `~/claude/islamic-dashboard-design/` (a
sibling clone of the private repo), same pattern as this `claude-memory/` symlink setup. They're
listed in `.gitignore` here so git never tries to track them. Diagrams/reference screenshots
(architecture-diagram.png, sequence-diagram.png, reference-*.png, non-heic.png) were intentionally
**not** moved — they stayed in the public repo.

**Why:** public repo, but design iteration needed to stay private and still be usable across the
user's two Macs without a cloud-sync service (iCloud was explicitly rejected).

**How to apply:** if `prototypes/`, `hi-fi-designs/`, etc. appear missing or as broken symlinks in
a fresh session, that's expected — they resolve only once `~/claude/islamic-dashboard-design/`
is cloned alongside this repo (a replication runbook was given to the user for their second Mac).
Don't try to "fix" this by re-adding these paths to the public repo. Editing these files is
still just editing the symlinked path directly; committing them requires `cd
~/claude/islamic-dashboard-design && git add -A && git commit && git push` — a separate repo
and commit history from `islamic-dashboard` itself.
