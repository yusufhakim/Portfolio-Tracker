// Best-effort background refresh via expo-background-task + expo-task-manager.
// Android controls the actual cadence (~15 min minimum, not guaranteed).
// Gated by a user setting; fully functional in the built APK (limited in Expo Go).
import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";

import { getSetting, setSetting } from "@/db";

import { refreshAll } from "./prices";

export const BG_TASK = "portfolio-refresh";
const SETTING_KEY = "background_enabled";
const MIN_INTERVAL_MINUTES = 15;

// Must be defined at module scope so the OS can find it on a cold background launch.
TaskManager.defineTask(BG_TASK, async () => {
  try {
    await refreshAll();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function isBackgroundEnabled(): Promise<boolean> {
  return (await getSetting(SETTING_KEY)) === "1";
}

export async function setBackgroundEnabled(enabled: boolean): Promise<void> {
  await setSetting(SETTING_KEY, enabled ? "1" : "0");
  try {
    if (enabled) {
      await BackgroundTask.registerTaskAsync(BG_TASK, {
        minimumInterval: MIN_INTERVAL_MINUTES,
      });
    } else {
      await unregisterSafely();
    }
  } catch {
    // Background tasks aren't available in some contexts (e.g. Expo Go) — ignore.
  }
}

/** On app start, align OS registration with the saved preference. */
export async function syncBackgroundRegistration(): Promise<void> {
  try {
    const enabled = await isBackgroundEnabled();
    const registered = await TaskManager.isTaskRegisteredAsync(BG_TASK);
    if (enabled && !registered) {
      await BackgroundTask.registerTaskAsync(BG_TASK, {
        minimumInterval: MIN_INTERVAL_MINUTES,
      });
    } else if (!enabled && registered) {
      await unregisterSafely();
    }
  } catch {
    // ignore
  }
}

async function unregisterSafely(): Promise<void> {
  if (await TaskManager.isTaskRegisteredAsync(BG_TASK)) {
    await BackgroundTask.unregisterTaskAsync(BG_TASK);
  }
}
