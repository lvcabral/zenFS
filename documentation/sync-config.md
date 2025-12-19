# ZenFS Sync Configuration Enhancements

## Overview

The latest round of changes adds full support for configuring ZenFS backends in purely synchronous JavaScript runtimes. Historically, mounting or reconfiguring a backend required awaiting `configure()` or `configureSingle()`. We now expose synchronous equivalents, enforce deterministic readiness across file systems, and document/test the new flow end-to-end.

---

## Key Additions

- **Synchronous configuration APIs**
    - `configureSync()` mirrors `configure()` and accepts the same shape. It validates that every backend involved is synchronously constructible and mounted.
    - `configureSingleSync()` mirrors `configureSingle()` for the common single-mount use case.
    - `resolveMountConfigSync()` performs backend resolution without promises and rejects configurations that would require async work (e.g., async `isAvailable()` checks or `create()` implementations that return promises).

- **FileSystem readiness contract**
    - New helper `ensureReadySync()` lives in `src/internal/filesystem.ts`. It invokes an optional `readySync()` hook on file systems and throws when the instance can only be prepared asynchronously.
    - `StoreFS`, `CopyOnWriteFS`, and the `Mutexed` mixin now implement `readySync()`, unlocking synchronous initialization for every backend layered on top of them (e.g., `InMemory`, `SingleBuffer`, and CoW compositions).

- **Synchronous mounting utilities**
    - `mountWithMkdirSync()` mirrors the async helper, ensuring mount points exist (creating directories synchronously when missing) before `mount()` is invoked.
    - Device injection honors synchronous semantics. When `addDevices` is enabled, the DeviceFS instance is initialized via `ensureReadySync()`.

---

## Updated Backends & Mixins

- **InMemory / SingleBuffer**: both still wrap `StoreFS`, so once `StoreFS.readySync()` became available the backends worked automatically with the new APIs.
- **CopyOnWrite**: now ensures both readable and writable layers are synchronously ready.
- **Mutexed**: delegates `readySync()` to the wrapped file system, keeping mutex-wrapped instances compatible with synchronous configuration paths.

---

## Developer Guidance

1. Prefer `configureSync()` / `configureSingleSync()` only when your environment cannot await promises (e.g., kernel bootstrap or embedders that expect immediate mounting).
2. Backends that perform network IO, rely on async `isAvailable()` checks, or defer initialization will throw `ENOTSUP` when used with the sync APIs. Stick with the async configuration path in those scenarios.
3. When authoring new backends:
    - Keep `create()` synchronous if you want compatibility with `configureSync()`.
    - If extra initialization time is needed, implement both `ready()` and `readySync()` (the latter should throw when truly impossible).
    - Ensure any nested mount configuration that might be synchronous also calls `ensureReadySync()` once constructed.

---

## Testing & Documentation

- Added `tests/common/config.test.ts` covering `configureSync`, `configureSingleSync`, and backend compatibility (including rejection of async backends).
- Extended `documentation/configuration.md` with examples for `configureSync()` / `configureSingleSync()` and guidance on using `resolveMountConfigSync()`.

These improvements collectively let synchronous runtimes opt into ZenFS without rewriting application initialization, while keeping asynchronous setups unchanged.
