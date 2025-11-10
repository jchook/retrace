import { lazy } from "react";

export const LazyFilePond = lazy(async () => {
  const mod = await import("react-filepond");
  return { default: mod.FilePond };
});

