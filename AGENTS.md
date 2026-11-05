# AGENTS.md

Guidance for coding agents working in this repository.

## Status

Tauri 2 desktop and mobile todo app: SvelteKit (Svelte 5, TypeScript, adapter-static, `ssr = false`) frontend in `src/`, Rust core in `src-tauri/`. Tooling: ESLint + Prettier + svelte-check, Vitest (`src/**/*.test.ts`), Playwright (`e2e/`, chromium/webkit/mobile/tablet), WebdriverIO + tauri-driver (`e2e-native/`, own package.json), rustfmt + clippy + `cargo test`.

Run everything through make (each target runs in the container):

- `make install` / `make lint` / `make test` / `make e2e` (Playwright, fake IPC) / `make e2e-native` (tauri-driver against the real app and SQLite)
- `make dev` (desktop app with hot reload; Vite also on http://localhost:1420), `make build` (Linux bundles), `make android-build` (APK/AAB)

## Dev environment

All development runs in Docker (`docker/Dockerfile`, `compose.yaml`); `make help` lists the wrappers.

- `dev` service (stage `base`): Rust, Node, WebKitGTK 4.1. Desktop dev, tests and Linux bundles. GUI goes through the host X server, so run `make x11` once per session.
- `android` service (stage `android`): adds JDK 21, Android SDK and NDK, and the Rust Android targets.
- `make doctor` prints the toolchain versions in both containers.
- On this machine the active docker context is a dead podman socket: prefix commands with `DOCKER_CONTEXT=default`.
- macOS, Windows and iOS bundles cannot be built in a Linux container; they come from GitHub Actions runners.

## Git

This is a personal repo on the `henryust12` GitHub account, while the machine's global git config belongs to a different (work) account. The correct identity is set in the repo's local config. Do not override it:

- Remote uses the SSH alias `git-henry:henryust12/tauri-todo-fullstack.git`.
- Commits and tags must be GPG-signed with key `22BF9EF3326A5F60` (`commit.gpgsign` and `tag.gpgsign` are on) and use the email `28552725+henryust12@users.noreply.github.com`. That combination is what makes commits show as Verified on GitHub.
- For `gh` operations, the active account must be `henryust12` (`gh auth switch -u henryust12`).
