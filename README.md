# WP-Chrono Timeline Block

Lightweight Gutenberg block for WordPress to build **vertical** (one-sided or alternating) and **horizontal** timelines, with icons, images, lightbox, custom colors and scroll animation. No build step, translation-ready (English / French).

![Timeline example](.github/screenshot-layouts.png)

## Features

- **4 layouts**: vertical alternating, vertical with the line on the left, vertical with the line on the right, horizontal (scrollable, swipe-friendly)
- **Responsive**: the alternating layout automatically switches to one side on mobile
- **Events** with date, title, rich text and optional image
- **Markers**: dot, Dashicon (24 icons) or short text (number, letter, emoji), with a per-event accent color
- **Image click action**: none, full-size lightbox (with previous/next navigation, keyboard and screen-reader support) or open in a new tab
- **Styling**: line, dot, card, title and date colors (uses your theme palette), line thickness, dot size, card radius, spacing, shadow on/off
- **Date position**: opposite the card or above it
- **Scroll animation**, automatically disabled for users who prefer reduced motion
- **Theme-proof**: the timeline line does not rely on `::before`, so aggressive theme CSS can't hide it
- **Translation-ready**: English source strings, French translation included (`fr_FR`), `.pot` template provided

## Requirements

- WordPress 6.3 or later
- PHP 7.4 or later

## Installation

1. Download this repository as a ZIP (**Code → Download ZIP**).
2. In WordPress, go to **Plugins → Add New → Upload Plugin**, choose the ZIP and click **Install Now**, then **Activate**.

You can also copy the folder directly into `wp-content/plugins/`.

## Usage

1. In the block editor, type `/timeline` (or `/frise`) and insert the **Timeline** block.
2. Select an event to edit its date, title and text, add an image from the toolbar, and pick a marker and accent color in the sidebar.
3. Select the parent **Timeline** block (use the "Select parent" button or the List View) to change the layout, colors and dimensions.
4. Click **Add an event** under the timeline to add more steps.

## Translations

The interface follows the site language (or the user's profile language).

| Language | Status |
| --- | --- |
| English | Built-in (source) |
| French (`fr_FR`) | Included |

To add a language, start from `languages/chrono-timeline-block.pot` using Poedit or Loco Translate. JavaScript strings also need a JSON file (`chrono-timeline-block-{locale}-ctb-editor.json`), which `wp i18n make-json` can generate.

## File structure

```
chrono-timeline-block.php   Plugin bootstrap (registers scripts, styles, blocks, translations)
blocks/timeline/            Parent block metadata (block.json)
blocks/timeline-item/       Event block metadata (block.json)
assets/editor.js            Editor UI for both blocks (no build step required)
assets/editor.css           Editor-only styles
assets/style.css            Front-end and editor styles
assets/view.js              Front-end scroll animation and lightbox
languages/                  .pot template and French translation (.po, .mo, .json)
```

## Changelog

### 1.2.0
- Bilingual interface: English source strings with bundled French translation

### 1.1.1
- Fix: timeline line hidden by some themes
- Fix: white gap around the card arrow

### 1.1.0
- Image click action: lightbox or open in a new tab

### 1.0.0
- Initial release

## License

GPL-2.0-or-later. See [LICENSE](LICENSE).
