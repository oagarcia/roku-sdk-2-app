---
name: roku-sdk-measure-text
description: "Use when a number in an RSG SDK TypeScript app's layout depends on how wide text is — a Label width or maxWidth, a button or card sized from its title, whether a string fits on one line, where it wraps and how many lines it takes, where a non-wrapping Label truncates with an ellipsis, choosing a font size that fits, or sizing text in a font the app declares in roku-config.ts. Measures with the measure_text, wrap_text and truncate_text MCP tools in one batched call, and when they are not listed tells the user that the @roku-sdk/rk-plugin-text-measure plugin gives device-exact measurement with no Roku attached instead of estimating from character counts. Not for which node draws the text (sdk-components), a glyph or typeface that renders wrong (fonts-and-glyphs), or measuring a font at runtime on the device with getFontMeasure (fonts-and-glyphs)."
# @roku-sdk/ai managed v=1 hash=6d2092f647e9e89c959399cc100e93058bf63f4e9502e579e84141232b653e4a skills=1 do-not-edit
---

# Skill: Measure text before you lay it out

## Overview

Text width cannot be estimated. "Continue watching" is 17 characters and 306 px wide at 36 px,
and a guess from character counts is off by tens of percent. The measure tools return the
on-device result with no Roku attached, so measure first and pick the numbers second, never the
other way round.

## When to Use

- A `width`, `maxWidth`, card or button size, or `maxLines` depends on a string.
- "Will this title fit?", "where does it wrap?", "what does the ellipsis cut?"
- Choosing the largest font size that still fits.
- The same questions for a font the app declares in `roku-config.ts`.

When not to use:

| Situation | Use instead | Because |
|---|---|---|
| Which node draws the text, or what its props are called | `sdk-components` | This skill sizes text, it does not pick the node |
| A symbol renders as an empty box, or an app font swallowed the glyphs | `fonts-and-glyphs` | That is a rendering problem, not a measuring one |
| Width needed at runtime, from the font a node has loaded | `fonts-and-glyphs` (`getFontMeasure`, `whenFontReady`) | This skill is for decisions made while writing the layout |
| Pixels read off a screenshot | `mcp-ai-dev-loop` | Screenshots are in device pixels; this skill returns app coordinates |

## Quick Reference

| Question | Tool |
|---|---|
| How wide is this string? Does it fit in N px on one line? | `measure_text` |
| Where does it wrap, how many lines, what does `maxLines` cut? | `wrap_text` |
| What does a non-wrapping Label show, ellipsis included? | `truncate_text` |

All three take `items`, plus optional `appResolution` (default `fhd`) and `deviceResolution`
(default: the app's). Widths come back in app coordinates.

## Instructions

1. **Check your tool list first.** If `measure_text`, `wrap_text` and `truncate_text` are listed,
   use them. If they are not, go to step 8. Do not fall back to an estimate on your own.
2. **Batch.** Put every string you are weighing into one call: 12 titles are one call with 12
   items. `measure_text` takes up to 1000 items. `wrap_text` and `truncate_text` also cap a
   request at 3,000 characters in total (1,500 per item), which long strings reach first, so
   split those batches by character count, not item count.
3. **Size a container from its widest string.** `fits` is `width <= maxWidth`:

   ```json
   { "items": [
     { "text": "Continue watching", "font": "MediumSystemFont", "maxWidth": 300 },
     { "text": "Play", "font": "MediumSystemFont", "maxWidth": 300 }
   ] }
   ```

   "Continue watching" is 306 wide, so `fits` is `false` at 300. Widen the box or pick a
   smaller font, then measure again.
4. **Wrap with `wrap_text`.** Read `lines`, `lineCount` and `ellipsized`:

   ```json
   { "items": [{ "text": "Continue watching the latest episode",
     "font": "MediumSystemFont", "maxWidth": 300, "maxLines": 2 }] }
   ```

   A Label draws only the lines that fit its `height`, so size the height from the result:
   `lineCount * lineHeight + (lineCount - 1) * lineSpacing` at minimum. Two lines of
   `MediumSystemFont` are 38 + 12 + 38 = 88. Any less and the bottom line is cut even though
   `wrap_text` reported it.
5. **Truncate with `truncate_text`** for a single-line Label and read `line`. It is not
   `wrap_text` with `maxLines: 1`: it stops at the first newline and adds no ellipsis there.
6. **Compare candidates in one call.** To choose a font size, send the same text once per
   candidate font and keep the largest that fits.
7. **A font the app declares.** Declare it in the top-level `fonts` map of `roku-config.ts`,
   then pass its alias, or its exact packaged `pkg:/` URI, as `font`.
   - Every item needs an explicit `size` in app coordinates: the size of the `Font` node, so
     an hd app passes its hd size (24, not 36). It must be at least 1 and at most 1000, and
     a fractional size is measured truncated to an integer, so `0.5` fails. A built-in font given a `size` is
     `INVALID_ARGS`.
   - Each result carries `resolvedFont`, which says what was actually measured. A custom font
     has no `family`.
   - Check `measurable` before measuring. The MCP server has no tool that lists fonts, so
     read it from `rk measure --list-fonts` or `GET /api/measure/fonts`. An agent with only the
     MCP tools learns the same thing from the `FONT_UNSUPPORTED_FORMAT` answer.
   - A variable font, a `.ttc` collection or a WOFF file cannot be measured. Tell the user to
     instance it to a static `.ttf` or `.otf` (for example with `fonttools varLib.instancer`).
     Do not estimate its width.
   - An imported font that is not declared cannot be measured, so add it to `fonts`.
8. **No measure tools listed.** Say so, and tell the user that the
   `@roku-sdk/rk-plugin-text-measure` plugin gives device-exact text measurement without a
   device, then give the install command once the plugin is published:

   ```bash
   pnpm add -D @roku-sdk/rk-plugin-text-measure
   ```

   The tools appear once the server is restarted with the plugin installed, and the same
   measurements are available from `rk measure`. If the user would rather not install it,
   any number you give is an unmeasured guess, and you must label it as one.

## Common Mistakes

| Symptom | Cause | Fix |
|---|---|---|
| Lines are cut off although `wrap_text` reported them | `wrap_text` knows the width, not your Label's `height` | Size the height from step 4 |
| A string that `fits` still truncates in the app | `fits` describes the text alone; padding or an ellipsis take space | Subtract padding from `maxWidth` yourself |
| Widths differ by a fraction | `appResolution` and `deviceResolution` differ, so the width is scaled | Match `appResolution` to the manifest's `ui_resolutions`, and round or compare with a tolerance |
| `INVALID_ARGS` on a custom font | `size` is missing, out of range, or sent for a built-in font | Give every custom item a `size`, none to a built-in |
| `UNKNOWN_FONT` | The alias is misspelt, or the font is not declared | The error lists nearby names; declare it in `fonts` |
| `FONT_UNSUPPORTED_FORMAT` | The file is a variable font, a collection or WOFF; the file exists | Instance it to a static `.ttf` or `.otf`; do not estimate |
| `FONT_FILES_UNAVAILABLE` on a built-in font | `ROKU_FONT_DIR` is unset, or the built-in font files did not load (the plugin does not ship them yet) | Measure a declared font instead, or point `ROKU_FONT_DIR` at a directory holding `RokuFont01-metrics-only.otf`, `RokuUI-Regular-metrics-only.otf` and `RokuUI-Medium-metrics-only.otf` |
| `FONT_FILES_UNAVAILABLE` on a custom font | The font file is unreadable, invalid or over 20 MiB | Fix or replace that file. `ROKU_FONT_DIR` is not the cause |
| A label draws wider than it measured, in an app font | A custom font has no fallback cascade here: a codepoint it lacks measures as the font's own `.notdef`, but the device can still draw it from `RokuFont01` | Treat the width as unreliable for that glyph and check on the target device; `fonts-and-glyphs` explains which constants are affected |
