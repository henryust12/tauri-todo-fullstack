# Thin wrappers around docker compose. Set DOCKER_CONTEXT yourself if needed.
DC      := docker compose
DEV     := $(DC) run --rm dev
ANDROID := $(DC) run --rm android

.DEFAULT_GOAL := help
.PHONY: help image image-android shell android-shell install dev android-dev build android-build lint test e2e e2e-native x11 doctor

help: ## Show targets
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  %-14s %s\n", $$1, $$2}'

image: ## Build the dev image
	$(DC) build dev

image-android: ## Build the android image
	$(DC) build android

shell: ## Shell in the dev container
	$(DEV) bash

android-shell: ## Shell in the android container
	$(ANDROID) bash

dev: ## Run the desktop app with hot reload
	$(DC) run --rm --service-ports dev npm run tauri dev

android-dev: ## Run the app on an Android device
	$(ANDROID) npm run tauri android dev

build: ## Build the Linux bundles
	$(DEV) npm run tauri build

android-build: ## Build the Android apk/aab
	$(ANDROID) npm run tauri android build

install: ## Install JS dependencies (npm ci)
	$(DEV) npm ci

lint: ## Run eslint, prettier, svelte-check, rustfmt and clippy
	$(DEV) bash -c 'npm run lint && npm run check && cargo fmt --manifest-path src-tauri/Cargo.toml --check && cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings'

test: ## Run JS and Rust tests
	$(DEV) bash -c 'npm test && cargo test --manifest-path src-tauri/Cargo.toml'

e2e: ## Run Playwright E2E tests
	$(DEV) npm run test:e2e

e2e-native: ## Run native E2E (real app via tauri-driver) under Xvfb
	$(DEV) bash -c 'npm run tauri build -- --debug --no-bundle && cd e2e-native && npm ci && xvfb-run -a npm test'

x11: ## Allow the local user to use the host X server (once per session)
	xhost +SI:localuser:$$(id -un)

doctor: ## Print toolchain versions in both containers
	$(DEV) bash -c 'id; rustc -V; cargo -V; node -v; npm -v; pkg-config --modversion webkit2gtk-4.1'
	$(ANDROID) bash -c 'id -u; java -version 2>&1 | head -1; sdkmanager --list_installed; echo NDK_HOME=$$NDK_HOME; ls -d $$NDK_HOME; rustup target list --installed'
