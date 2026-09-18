import { createGlobalState, useIntervalFn, useDocumentVisibility } from "@vueuse/core";

// createGlobalState runs the factory in a detached effect scope, so the
// interval below survives navigating away from whichever page first calls
// useNow() (TimerBar/WeekCalendar are per-page and unmount on route change;
// a plain composable-level singleton would have its interval torn down by
// vueuse's auto-cleanup the first time its owning component unmounts).
export const useNow = createGlobalState(() => {
  const now = ref(new Date());
  const visibility = useDocumentVisibility();

  const { pause, resume } = useIntervalFn(() => {
    now.value = new Date();
  }, 1000);

  watch(visibility, (value) => {
    if (value === "visible") {
      now.value = new Date();
      resume();
    } else {
      pause();
    }
  }, { immediate: true });

  return now;
});
