# syntax=docker/dockerfile:1

# base: Rust + Node + Tauri v2 Linux build deps + headless test tooling
FROM rust:1.99-trixie AS base

# Fail a RUN when any command in a pipe fails (checksum checks rely on it).
SHELL ["/bin/bash", "-o", "pipefail", "-c"]

ARG DEBIAN_FRONTEND=noninteractive
ARG TARGETARCH
ARG NODE_VERSION=26.13.0
ARG USER_UID=1000
ARG USER_GID=1000

# Official Tauri v2 prerequisites for Debian, plus xvfb/webkit2gtk-driver for
# headless WebDriver E2E and x11-utils (xdpyinfo) for display checks.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        ca-certificates \
        curl \
        dbus-x11 \
        file \
        fonts-noto-core \
        git \
        libayatana-appindicator3-dev \
        libgtk-3-dev \
        librsvg2-dev \
        libssl-dev \
        libwebkit2gtk-4.1-dev \
        libxdo-dev \
        pkg-config \
        unzip \
        webkit2gtk-driver \
        wget \
        x11-utils \
        xauth \
        xvfb \
        xz-utils \
    && rm -rf /var/lib/apt/lists/*

# Runtime libraries Playwright's chromium/webkit builds need on Debian trixie
# (`npx playwright install-deps` only knows apt names for Ubuntu).
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        fonts-liberation \
        fonts-noto-color-emoji \
        gstreamer1.0-libav \
        gstreamer1.0-plugins-bad \
        libgraphene-1.0-0 \
        libgtk-4-1 \
        libnotify4 \
        libnspr4 \
        libnss3 \
        libwoff1 \
        libx264-164 \
    && rm -rf /var/lib/apt/lists/*

# Node from the official tarball, verified against the published SHA256 list.
RUN case "${TARGETARCH:-amd64}" in \
        amd64) node_arch=x64 ;; \
        arm64) node_arch=arm64 ;; \
        *) echo "unsupported arch: ${TARGETARCH}" >&2; exit 1 ;; \
    esac \
    && file="node-v${NODE_VERSION}-linux-${node_arch}.tar.xz" \
    && curl -fsSLo "/tmp/${file}" "https://nodejs.org/dist/v${NODE_VERSION}/${file}" \
    && curl -fsSLo /tmp/SHASUMS256.txt "https://nodejs.org/dist/v${NODE_VERSION}/SHASUMS256.txt" \
    && echo "$(grep " ${file}\$" /tmp/SHASUMS256.txt | cut -d' ' -f1)  /tmp/${file}" | sha256sum -c - \
    && tar -xJf "/tmp/${file}" -C /usr/local --strip-components=1 --no-same-owner \
    && rm -f "/tmp/${file}" /tmp/SHASUMS256.txt

RUN rustup component add rustfmt clippy

# Non-root user matching the host UID/GID so bind-mounted files keep host
# ownership. Cargo/rustup dirs are chowned so `rustup target add` and
# `cargo install` work as dev; volume mount points are pre-created so named
# volumes initialise dev-owned.
RUN (getent group "${USER_GID}" || groupadd --gid "${USER_GID}" dev) >/dev/null \
    && (getent passwd "${USER_UID}" && userdel -r "$(getent passwd "${USER_UID}" | cut -d: -f1)" || true) >/dev/null \
    && useradd --uid "${USER_UID}" --gid "${USER_GID}" --create-home --shell /bin/bash dev \
    && mkdir -p /usr/local/cargo/registry /usr/local/cargo/git /home/dev/.npm /home/dev/.cache/ms-playwright /home/dev/.gradle /home/dev/.android /workspace \
    && chown -R "${USER_UID}:${USER_GID}" /usr/local/cargo /usr/local/rustup /home/dev /workspace

# WebKitGTK's DMABUF renderer shows a blank window inside containers.
ENV WEBKIT_DISABLE_DMABUF_RENDERER=1 \
    npm_config_cache=/home/dev/.npm

WORKDIR /workspace
USER dev

# Native E2E driver; pairs with webkit2gtk-driver installed above.
RUN cargo install tauri-driver --locked

CMD ["bash"]

# android: base + JDK 21, Android SDK/NDK, Rust Android targets
FROM base AS android

# Inherited from base already; restated so linters see it in this stage.
SHELL ["/bin/bash", "-o", "pipefail", "-c"]

ARG CMDLINE_TOOLS_BUILD=15859902
ARG CMDLINE_TOOLS_SHA256=4e4c464f145a7512b57d088ac6c278c03c9eea610886b35a5e0804e74eedf583
# Match compileSdk/targetSdk in src-tauri/gen/android/app/build.gradle.kts.
ARG PLATFORM_VERSION=37.0
ARG BUILD_TOOLS_VERSION=37.0.0
# The tauri and plugin Android libraries compile against SDK 36 with AGP's
# default build-tools; preinstall them so Gradle does not fetch them per build.
ARG LIB_PLATFORM_VERSION=36
ARG LIB_BUILD_TOOLS_VERSION=36.0.0
ARG NDK_VERSION=29.0.14206865
# ARGs do not carry over between stages; redeclare for the SDK chown below.
ARG USER_UID=1000
ARG USER_GID=1000

USER root

RUN apt-get update \
    && apt-get install -y --no-install-recommends openjdk-21-jdk-headless \
    && rm -rf /var/lib/apt/lists/* \
    # Arch-independent path so JAVA_HOME works on amd64 and arm64.
    && ln -s "$(dirname "$(dirname "$(readlink -f "$(command -v javac)")")")" /usr/lib/jvm/java-21-openjdk

ENV JAVA_HOME=/usr/lib/jvm/java-21-openjdk \
    ANDROID_HOME=/opt/android-sdk \
    ANDROID_SDK_ROOT=/opt/android-sdk \
    NDK_HOME=/opt/android-sdk/ndk/${NDK_VERSION} \
    ANDROID_NDK_HOME=/opt/android-sdk/ndk/${NDK_VERSION}
ENV PATH=${PATH}:/opt/android-sdk/cmdline-tools/latest/bin:/opt/android-sdk/platform-tools

RUN mkdir -p "${ANDROID_HOME}/cmdline-tools" \
    && curl -fsSLo /tmp/cmdline-tools.zip "https://dl.google.com/android/repository/commandlinetools-linux-${CMDLINE_TOOLS_BUILD}_latest.zip" \
    && echo "${CMDLINE_TOOLS_SHA256}  /tmp/cmdline-tools.zip" | sha256sum -c - \
    && unzip -q /tmp/cmdline-tools.zip -d "${ANDROID_HOME}/cmdline-tools" \
    && mv "${ANDROID_HOME}/cmdline-tools/cmdline-tools" "${ANDROID_HOME}/cmdline-tools/latest" \
    && rm /tmp/cmdline-tools.zip \
    && (yes || true) | sdkmanager --licenses >/dev/null \
    && sdkmanager \
        "platform-tools" \
        "platforms;android-${PLATFORM_VERSION}" \
        "build-tools;${BUILD_TOOLS_VERSION}" \
        "platforms;android-${LIB_PLATFORM_VERSION}" \
        "build-tools;${LIB_BUILD_TOOLS_VERSION}" \
        "ndk;${NDK_VERSION}" \
    && chown -R "${USER_UID}:${USER_GID}" "${ANDROID_HOME}"

USER dev

RUN rustup target add \
    aarch64-linux-android \
    armv7-linux-androideabi \
    i686-linux-android \
    x86_64-linux-android
