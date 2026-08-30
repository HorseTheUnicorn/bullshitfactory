Arcade Gold 16
==============

This TTF was rebuilt from the supplied/generated gold arcade sprite glyph shapes.
Unlike the earlier version, the counters/holes in letters and numbers are preserved,
so A/B/D/O/P/Q/R/0/4/6/8/9 render as readable characters instead of solid blobs.

Included:
  ArcadeGold16-Regular.ttf
  ArcadeGold16_preview.png
  source_gold_arcade_sprite_sheet.png

The standard TTF stores glyph shapes, not the original yellow/orange/red raster shading.
Tint the font gold/orange in your game engine for the intended look.

For pixel-perfect rendering:
  - use integer font sizes
  - disable font smoothing / anti-aliasing if your engine permits
  - use point/nearest filtering for any generated font atlas
