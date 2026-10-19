# Glass design layer (iteration 2)

Elsewhere keeps the editorial Index layout but renders it as **clear, softly frosted glass floating over each theme's artwork**.

## Balance
- About 75% **glassmorphism**: every panel is clear glass with ~14px backdrop blur. Day fill is ~25–46% white, tuned per artwork; night is a ~26% dark tint. Panels have reflective rims, a soft inset highlight and gentle shadows.
- About 25% **Liquid Glass**: stronger highlights and saturation, used only for navigation, key buttons, active tabs/chips and small controls.
- The goal is more clear glass and less frost than before, without looking milky, opaque, over-blurred or distorted. Text-dense areas get local extra frost so they stay readable.
- The percentages describe an aesthetic balance, not a measurement of screen area.

## Artwork
Each theme changes the actual background image (`src/assets/backgrounds/<theme>.jpg`, the owner's chosen artwork):

| Theme | Artwork |
|---|---|
| Vermilion | red blossoms on an orange-red sun |
| Cobalt | blue and white blossoms on deep blue |
| Plum | pink blossoms, pagodas, misty mountains |
| Graphite | illustrated grey street under blue sky |

- **Layer:** the art sits in a fixed `.scene` layer rendered by `App.tsx`. It is cropped responsively with `cover` on phones. On wide screens the whole portrait image is shown uncropped over a blurred extension of itself.
- **Night:** a veil (`--scene-veil`) darkens the art without hiding it.
- **Fallback:** when backdrop blur is unsupported, or when transparency is reduced (by the device setting or Settings → Appearance), every panel switches to an opaque `--glass-solid`.

## Rules for screens
1. **No text may sit directly on the artwork.** Every heading, paragraph, label, caption, stat line or helper text must be inside a glass panel (`.card`, `.list`, `.glass`, `.glass-strong`, `.large-title`, `.empty`, `.banner`, `.sheet`) or carry a local backing (`.on-art` pill for short labels).
2. **Use the classes and tokens; never hard-code colours or opaque backgrounds.**
   - `.glass` is a main panel. `.glass-strong` is a text-dense panel. `.glass-inner` is for things nested inside a panel (no second blur). `.liquid` is a small interactive control.
   - Tokens: `--glass-fill`, `--glass-strong`, `--glass-inner`, `--glass-border`, `--glass-edge`, `--glass-sheen`, `--glass-shadow`, `--glass-blur`.
   - `--surface` and `--surface-2` are now translucent. A *top-level* element (sitting on the artwork) that uses them must also get the blur. The simplest fix is to add `.glass` to that element.
3. **Panels must actually be glass.** That covers headings and intros, cards, settings panels and theme selectors, reflections, collections, tools, dialogs and overlays, sidebar, header, tabs, notices, empty states and map panels.
4. **Avoid a milky look.**
   - Don't stack blurred panels inside blurred panels; use `.glass-inner` for nested items.
   - Don't use big opaque fills.
5. **Contrast targets.** Ink colours are tuned for glass: `--ink-2` and `--ink-3` are darker in day mode and lighter at night.
   - Body text needs ≥ 4.5:1 against the *blended* panel colour over the art.
   - Large display text needs ≥ 3:1.
   - Verify with screenshots in all 4 themes × day/night.
6. **Motion stays restrained.**
   - Use gentle hover lift on pointer devices and a press scale of about .97.
   - Reduced motion is honoured globally (`html[data-motion='reduce']`).
7. **Touch targets are ≥ 44px.** Every gesture also has a button or keyboard alternative.

## Shared pieces
- `src/styles/glass.css`: the material layer, loaded after `base.css`.
- `src/components/GlassArt.tsx`: deterministic sculptural glass objects for discovery cards (`<GlassArt seed format size />`). `ExperienceCard` already uses it.
- `THEMES[].art` / `THEMES[].artNote` (`src/lib/theme.ts`): artwork thumbnails for theme selectors.
- `settings.reduceTransparency`: an optional boolean that switches all panels to opaque glass.
