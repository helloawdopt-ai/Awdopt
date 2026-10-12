# AWDOPT prototype screens (reference only)

These 13 files are the source of the approved "Sticker Club" clickable prototype. Read them alongside `docs/DESIGN.md`.

**How to read them**
- Each file is one screen. The markup inside `<x-dc>` is the layout, with exact inline styles: px sizes, colours, borders, shadows and copy.
- `{{name}}` placeholders and `<sc-for>` / `<sc-if>` blocks are filled from the `renderVals()` script at the bottom of each file. That script also holds the sample data (dog names, scores, statuses).
- `<a href="X.dc.html">` links show the navigation between screens. DESIGN.md §12 maps each file to its real route.

**Rules**
- These files do not run on their own. They need the design tool's runtime (`support.js`), which is not included.
- Never import them, copy their markup verbatim into components, or ship them. Rebuild each screen with the project's components and tokens.
- Inline hex values here map to the tokens in DESIGN.md §14. Use the tokens.
- Sample data (Bruno, Riya, the counts) is placeholder data, not real data.
- Where these files and DESIGN.md disagree, DESIGN.md wins.

| File | Screen |
|---|---|
| Main.dc.html | 01 Landing |
| Browse.dc.html | 02 Find a Dog |
| Filters.dc.html | 03 Filters sheet |
| Profile.dc.html | 04 Dog profile |
| Quiz.dc.html | 05 Questionnaire, step 3 of 5 |
| Matching.dc.html | 06 Finding matches |
| Results.dc.html | 07 Ranked matches |
| Why.dc.html | 08 Match breakdown |
| Interested.dc.html | 09 I'm Interested form |
| Sent.dc.html | 10 Interest sent |
| ListDog.dc.html | 11 List a Dog, step 2 of 5 |
| ListSent.dc.html | 12 Listing in review |
| Admin.dc.html | 13 Admin overview |
