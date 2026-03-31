# Repository Guidelines

## Project Structure & Module Organization
This repository is a small XcodeGen-managed iOS app. Core source files live in `Lightlist/Sources`, tests live in `Lightlist/Tests`, and app assets live in `Lightlist/Resources`. Project generation and target definitions are managed in `project.yml`, which produces `Lightlist.xcodeproj`. Keep feature UI code in `Lightlist/Sources` and place related tests in `Lightlist/Tests` with matching names.
The `TaskList` route carries the selected `taskListId`, and the detail screen keeps its `TabView(.page)` selection synchronized with the `taskListOrder` sequence from Firestore.
Translation JSON files live under `Lightlist/Resources/Locales`, but Xcode copies them into the built `Lightlist.app` root instead of preserving the `Locales/` subdirectory, so `Translations` must resolve `ja.json`-style resources from `Bundle.main` without a subdirectory.

## Build, Test, and Development Commands
Use the Xcode toolchain explicitly:

- `xcodegen generate`
  Regenerates `Lightlist.xcodeproj` from `project.yml`.
- `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcodebuild -project Lightlist.xcodeproj -scheme Lightlist -configuration Debug -derivedDataPath build -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build`
  Builds the app for the simulator.
- `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcodebuild -project Lightlist.xcodeproj -scheme Lightlist -destination 'platform=iOS Simulator,name=iPhone 16' CODE_SIGNING_ALLOWED=NO test`
  Runs the unit test target.
- `just emulator "iPhone 16"`
  Boots the specified Simulator and waits until it is ready.
- `just run`
  Installs the built app onto the single booted Simulator and launches `dev.lightlist`.

Every coding task that changes `apps/ios` should end with a successful `just build` run. If the change needs simulator verification, use `just run` instead of typing `simctl` commands manually.

## Coding Style & Naming Conventions
Follow standard Swift and SwiftUI conventions: 4-space indentation, one top-level type per responsibility, and clear, descriptive names. Use `UpperCamelCase` for types (`ContentView`, `SettingsView`) and `lowerCamelCase` for properties and functions. Prefer small `View` structs over large monolithic files. Match existing formatting; no custom formatter or linter is configured in this repository.

## Testing Guidelines
Tests use Swift Testing via `import Testing`. Add tests in files under `Lightlist/Tests` and group them by feature or view model, for example `LoginFlowTests.swift`. Name test functions for the behavior being verified, such as `appLinkNavigatesToSettings()`. Add or update tests when behavior changes; even simple UI structure changes should have at least a smoke-level test where practical.

## Commit & Pull Request Guidelines
Current history is minimal (`WIP`), so prefer a clearer convention going forward: short imperative commit messages like `Add settings navigation page`. Keep commits focused and avoid mixing refactors with behavior changes. Pull requests should include a brief summary, testing notes (`xcodebuild ... build`, `xcodebuild ... test`), and screenshots or simulator captures for UI changes.
Do not commit Xcode-generated artifacts such as `build/`, `build-*`, `DerivedData/`, `xcuserdata`, `*.xcuserstate`, or the local Firebase config at `Lightlist/Resources/GoogleService-Info.plist`.
