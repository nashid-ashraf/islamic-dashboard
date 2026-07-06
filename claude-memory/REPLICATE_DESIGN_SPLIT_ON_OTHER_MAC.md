# Replicating the design-file split on your other Mac

Run these once on the other Mac to get the same setup (private design repo + symlinks).
Background/why: see [design-files-private-repo](design-files-private-repo.md).

## 1. Sync the public repo (history was rewritten — old clone will diverge)
If you already have a clone of `islamic-dashboard` there, your local `main` has old commit
hashes that no longer exist on GitHub. Easiest fix is to re-clone fresh:

```bash
cd ~/claude   # or wherever your clones live
mv islamic-dashboard islamic-dashboard.old-backup   # keep the old one just in case
git clone https://github.com/nashid-ashraf/islamic-dashboard.git
```

(Once you've confirmed the new clone is fine, you can delete `islamic-dashboard.old-backup`.)

## 2. Clone the new private design repo as a sibling folder

```bash
cd ~/claude
git clone https://github.com/nashid-ashraf/islamic-dashboard-design.git
```

## 3. Recreate the symlinks in the app repo

```bash
cd ~/claude/islamic-dashboard
ln -s ~/claude/islamic-dashboard-design/design-briefs design-briefs
ln -s ~/claude/islamic-dashboard-design/hi-fi-designs hi-fi-designs
ln -s ~/claude/islamic-dashboard-design/prototypes prototypes
ln -s ~/claude/islamic-dashboard-design/WIREFRAMES.md WIREFRAMES.md
ln -s ~/claude/islamic-dashboard-design/WIREFRAMES_TODO.md WIREFRAMES_TODO.md
ln -s ~/claude/islamic-dashboard-design/HOWTO_DESIGN_PIPELINE.md HOWTO_DESIGN_PIPELINE.md
ln -s ~/claude/islamic-dashboard-design/islamic_dashboard.html islamic_dashboard.html
ln -s ~/claude/islamic-dashboard-design/claude-memory/hifi-design-pipeline.md claude-memory/hifi-design-pipeline.md
ln -s ~/claude/islamic-dashboard-design/claude-memory/wireframes-visual-spec.md claude-memory/wireframes-visual-spec.md
```

## 4. Also recreate the memory symlink (per standing cross-machine convention)

```bash
rm -rf ~/.claude/projects/-Users-aa116564-claude-islamic-dashboard/memory
ln -s ~/claude/islamic-dashboard/claude-memory ~/.claude/projects/-Users-aa116564-claude-islamic-dashboard/memory
```

## 5. Verify

```bash
cd ~/claude/islamic-dashboard
git status   # should be clean — .gitignore already excludes the symlinked design paths
ls -la design-briefs hi-fi-designs prototypes   # should show -> arrows to the design repo
```

## Ongoing workflow
Edit design files at their normal paths (the symlinks make this transparent). To save/sync:

```bash
cd ~/claude/islamic-dashboard-design
git pull            # before starting work
# ...edit files...
git add -A && git commit -m "..." && git push
```

This is separate from committing to `islamic-dashboard` itself — two independent repos, two independent commit histories.
