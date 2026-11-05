# tauri-todo-fullstack

A todo app for desktop and mobile built with Tauri 2, SvelteKit (Svelte 5) and a Rust core
that stores data in SQLite on the device. No account and no network: your todos stay in the
app's data folder.

- Add, edit (double-click or the pencil button), complete, delete and filter tasks; clear all
  completed tasks at once.
- Layout adapts from phones (bottom input, compact filters) to tablets and desktops (filter
  sidebar from 1024px wide). Light and dark themes follow the system.
- Targets: Linux, Windows, macOS, Android phones and tablets, iPhone and iPad.

## Development

Everything runs in Docker; the host only needs Docker, `make` and an X server (Linux).

```sh
cp .env.example .env      # set USER_UID/USER_GID to `id -u` / `id -g`
make image                # desktop toolchain (Rust, Node, WebKitGTK)
make install              # npm ci inside the container
make x11                  # once per login session, lets the container open windows
make dev                  # app with hot reload; the UI is also on http://localhost:1420
```

| Command                                    | What it does                                                                |
| ------------------------------------------ | --------------------------------------------------------------------------- |
| `make lint`                                | ESLint, Prettier, svelte-check, rustfmt, clippy                             |
| `make test`                                | Vitest component and store tests, Rust unit tests                           |
| `make e2e`                                 | Playwright against the UI with a fake IPC (Chromium, WebKit, phone, tablet) |
| `make e2e-native`                          | WebDriver tests against the real app and SQLite (tauri-driver, xvfb)        |
| `make build`                               | Linux bundles (.deb, .rpm, AppImage)                                        |
| `make image-android`, `make android-build` | Android image (JDK, SDK, NDK) and APK/AAB                                   |
| `make android-dev`                         | Run on a device; see the adb notes in `compose.yaml`                        |
| `make doctor`                              | Toolchain versions in both containers                                       |

If `docker` talks to a stopped Podman socket, prefix commands with `DOCKER_CONTEXT=default`.

Layout: `src/` is the SvelteKit frontend (`src/lib/api.ts` is the only IPC boundary),
`src-tauri/src/` the Rust core (`commands.rs`, `repository.rs`), `e2e/` and `e2e-native/`
the end-to-end suites, `docker/` and `compose.yaml` the dev environment.

## CI and releases

GitHub Actions runs on every push and pull request:

- `ci.yml`: lint, debug builds on Linux, Windows and macOS, a Fedora 43 rpm installed with
  `dnf`, Android debug APK, iOS simulator build, Docker images.
- `test.yml`: Rust tests on three OSes and Vitest.
- `e2e.yml`: Playwright on three OSes and the native WebDriver suite on Linux.
- `security.yml`: cargo-audit, cargo-deny, npm audit, dependency review, hadolint (also weekly).

Pushing a tag such as `v0.1.0` runs `release.yml`. The tag must match `version` in
`src-tauri/tauri.conf.json`. It creates a draft GitHub release with .deb, .rpm, AppImage,
.msi, NSIS .exe, .dmg/.app (Apple Silicon and Intel), plus Android .apk and .aab. The
Fedora rpm (`*.fc43.x86_64.rpm`) is built in a Fedora 43 container and install-tested with
`dnf`; the plain .rpm is the generic build for other rpm distros.

```sh
git tag -s v0.1.0 -m "v0.1.0" && git push origin v0.1.0
```

### Signing

Android APK and AAB are signed with the upload key in the `ANDROID_*` secrets (since v0.1.3).
The macOS, Windows and iOS artifacts stay unsigned until their secrets are added; they still
build without them.

| Platform           | Secrets                                                                                                                    |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| macOS              | `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID` |
| Updater signatures | `TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`                                                          |
| Android            | `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`                        |
| iOS / iPadOS       | set the repository variable `ENABLE_IOS=true` and the secrets listed above the `ios` job in `release.yml`                  |

### Installing unsigned builds

- macOS: the first launch is blocked by Gatekeeper. Right-click the app, choose Open, then
  Open again; or run `xattr -dr com.apple.quarantine "/Applications/Tauri Todo.app"`.
- Windows: SmartScreen shows "Windows protected your PC". Choose More info, then Run anyway.
- Android: the APK is signed, but sideloading still needs "install unknown apps" allowed for
  the app you open it with.
- iOS and iPadOS need a signed build; there is no unsigned install path.
