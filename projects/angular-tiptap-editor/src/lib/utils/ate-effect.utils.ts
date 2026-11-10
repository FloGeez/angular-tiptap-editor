import { CreateEffectOptions, VERSION } from "@angular/core";

/**
 * Options for the library's `effect()` calls that write signals.
 *
 * Angular 18 throws when an effect writes a signal unless `allowSignalWrites` is set.
 * From Angular 19 on, writes are always allowed and the flag only logs a deprecation
 * warning, so it is passed on Angular 18 alone.
 */
export const ATE_EFFECT_OPTIONS: CreateEffectOptions | undefined =
  Number(VERSION.major) < 19 ? { allowSignalWrites: true } : undefined;
