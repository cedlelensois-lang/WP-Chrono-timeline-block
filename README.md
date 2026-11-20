# WP Chrono timeline block

Lightweight Gutenberg block for WordPress to build **vertical** (one-sided or alternating), **horizontal** and **tabbed** timelines, with 7 themes, ready-made templates, icons, images, lightbox, custom colors and scroll animation. No build step, translation-ready (English / French).

![Timeline example](.github/screenshot-layouts.png)

![Themes and tabs layout](.github/screenshot-themes.png)

## Features

- **5 layouts**: vertical alternating, vertical with the line on the left, vertical with the line on the right, horizontal (scrollable, swipe-friendly) and **tabs** (clickable date bar showing one event at a time, keyboard accessible)
- **Responsive**: the alternating layout automatically switches to one side on mobile
- **Dual orientation**: horizontal and tabbed timelines can switch to a vertical layout on phones
- **7 themes**: Default, Minimal, Classic, Modern, Elegant, Dark and Bold — each works with every layout, and your own colors override the theme
- **Templates**: preconfigured layout + theme combinations available straight from the block inserter (e.g. "Timeline – Elegant, alternating", "Timeline – Bold, tabs")
- **Events** with date, title, rich text, optional image and optional **"Read more" button** (link to a page, a family record…, optionally in a new tab)
- **Sort by date** in one click (oldest or newest first); understands `1906`, `20 mai 1906`, `May 20, 1906`, `1906-05-20`, `20/05/1906`
- **Navigation arrows** for horizontal timelines (can be turned off), plus keyboard scrolling
- **Markers**: dot, Dashicon (24 icons) or short text (number, letter, emoji), with a per-event accent color
- **Image click action**: none, full-size lightbox (with previous/next navigation, keyboard and screen-reader support) or open in a new tab
- **Styling**: line, dot, card, title and date colors (uses your theme palette), line thickness, dot size, card radius, spacing, shadow on/off
- **Date position**: opposite the card or above it
- **Scroll animation**, automatically disabled for users who prefer reduced motion
- **Theme-proof**: the timeline line does not rely on `::before`, so aggressive theme CSS can't hide it
- **Automatic updates from GitHub**: new releases show up in **Dashboard → Updates** like any other plugin, with one-click and auto-update support
- **Translation-ready**: English source strings, French translation included (`fr_FR`), `.pot` template provided

## Requirements

- WordPress 6.3 or later — tested up to **WordPress 7.1.5**
- PHP 7.4 or later — tested with PHP 8.3

## Installation

1. Download `chrono-timeline-block.zip` from the [latest release](https://github.com/cedlelensois-lang/WP-Chrono-timeline-block/releases/latest) (not the "Source code" archive).
2. In WordPress, go to **Plugins → Add New → Upload Plugin**, choose the ZIP and click **Install Now**, then **Activate**.

You can also copy the folder directly into `wp-content/plugins/`.

## Updates

The plugin checks this repository's [releases](https://github.com/cedlelensois-lang/WP-Chrono-timeline-block/releases) twice a day (results are cached for 6 hours) and offers the update in WordPress like any plugin from WordPress.org. You can also click **Check for updates** under the plugin name on the Plugins screen to check immediately, and enable **auto-updates** there.

**Publishing a new version:**

1. Bump `Version:` and `CTB_VERSION` in `chrono-timeline-block.php`, and add a `### x.y.z` entry to the changelog below.
2. Commit and push.
3. Push a tag with the version number (e.g. `v1.4.2` or `1.4.2`).

The **Release** GitHub Action (`.github/workflows/release.yml`) then checks that the tag matches the plugin version, builds `chrono-timeline-block.zip` (plugin files only), and publishes the GitHub release with the zip attached and the changelog entry as release notes.

Pre-releases and drafts are ignored. The `Update URI` header guarantees WordPress.org is never queried for this plugin.

## Usage

1. In the block editor, type `/timeline` (or `/frise`) and insert the **Timeline** block.
2. Select an event to edit its date, title and text, add an image from the toolbar, and pick a marker and accent color in the sidebar.
3. Select the parent **Timeline** block (use the "Select parent" button or the List View) to pick a theme and change the layout, colors and dimensions.
   Tip: search for "Timeline –" in the inserter to start from a ready-made template.
4. Click **Add an event** under the timeline to add more steps.
5. To add a button to an event, select it and fill in **Button / link** in the sidebar; the button text can also be edited directly on the card.
6. To reorder events chronologically, select the Timeline block and use **Sort by date** in the sidebar (undo with Ctrl+Z / Cmd+Z).

## Translations

The interface follows the site language (or the user's profile language).

| Language | Status |
| --- | --- |
| English | Built-in (source) |
| French (`fr_FR`) | Included |

To add a language, start from `languages/chrono-timeline-block.pot` with Poedit or Loco Translate and save `chrono-timeline-block-{locale}.po` / `.mo` in `languages/`. Editor strings also need a JSON file: run `wp i18n make-json languages --no-purge`, or name it `chrono-timeline-block-{locale}-ctb-editor.json`.

## File structure

```
chrono-timeline-block.php       Plugin bootstrap (scripts, styles, blocks, translations)
includes/class-ctb-updater.php  Updates from GitHub releases
uninstall.php                   Cleanup when the plugin is deleted
blocks/timeline/                Parent block metadata (block.json)
blocks/timeline-item/           Event block metadata (block.json)
assets/editor.js                Editor UI for both blocks (no build step required)
assets/editor.css               Editor-only styles
assets/style.css                Front-end and editor styles
assets/view.js                  Front-end: tabs, arrows, scroll animation, lightbox
languages/                      .pot template and French translation (.po, .mo, .json)
.github/workflows/release.yml   Builds the zip and publishes a release on each tag
```

## Security

- No database tables, options or settings pages; nothing is stored except a 6-hour cache of the latest GitHub release (removed on uninstall).
- Saved markup only uses attributes allowed by WordPress for all roles, so Authors and Contributors can edit timelines safely.
- Event button links are limited to `http(s)`, `mailto:`, `tel:`, relative links and anchors; `javascript:` and `data:` links are refused.
- Updates are only downloaded over HTTPS from `github.com` / `api.github.com` / `codeload.github.com`. Keep two-factor authentication enabled on the GitHub account that publishes releases.
- Report a vulnerability privately via GitHub's **Security → Report a vulnerability** on this repository.

## Uninstall

Deleting the plugin from **Plugins** removes its cached data. Timelines already published stay in your pages as static HTML, but they lose their styling until the plugin is reinstalled.

## Changelog

### 1.5.0
- New: "Read more" button per event (link, custom text, new tab option)
- New: navigation arrows for horizontal timelines, keyboard-scrollable area
- New: sort events by date (oldest / newest first)
- Fix: horizontal timelines edited by Authors or Contributors no longer show "This block contains unexpected content" (existing timelines are migrated automatically)
- Security: updater only accepts HTTPS downloads from GitHub, sanitizes version numbers; multisite-aware "Check for updates"
- Performance: Dashicons are only loaded on the site when an event uses an icon
- Added uninstall cleanup, Plugin URI / Author URI headers
- Tested with WordPress 7.1.5; French typography fixes


### 1.4.3
- Releases are now built and published automatically by a GitHub Action when a version tag is pushed (plugin zip attached)

### 1.4.1
- Plugin renamed to "WP Chrono timeline block" in the WordPress admin


### 1.4.0
- Automatic updates from GitHub releases (with "Check for updates" link, release notes in "View details", auto-update support)


### 1.3.0
- New tabs layout (one event at a time, with clickable date bar)
- Dual orientation option: horizontal / tabs on desktop, vertical on mobile
- 7 themes (Default, Minimal, Classic, Modern, Elegant, Dark, Bold) with a visual picker
- 7 ready-made templates in the block inserter


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
