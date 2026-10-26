import { isDevMode } from "@angular/core";
import { firstValueFrom, isObservable } from "rxjs";
import { AteImageSrcResolver } from "../models/ate-image.model";

export async function ateResolveImageSrc(
  resolver: AteImageSrcResolver | null | undefined,
  src: string
): Promise<string> {
  if (!resolver || !src) {
    return src;
  }
  try {
    const result = resolver(src);
    const resolved = isObservable(result) ? await firstValueFrom(result) : await result;
    if (typeof resolved === "string" && resolved) {
      return resolved;
    }
  } catch (error) {
    if (isDevMode()) {
      console.warn("[ATE] imageSrcResolver failed, showing the original src instead.", src, error);
    }
  }
  return src;
}
