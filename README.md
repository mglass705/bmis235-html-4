# HTML-4: Behind the Sound + the Fix-It Lab
**By:** Matthew Glass (mglass2)
**Live site:** [TO FILL IN: Cloudflare .pages.dev link]

## My path
Path 2 · Full build: Claude Code connected to this GitHub repo, deployed through Cloudflare.

[TO FILL IN: Matthew, 1 to 3 sentences on why you picked Path 2, in your own words.]

## By hand vs by AI
**I made:**
- **Starting point:** my HTML-3 site, "Behind the Sound," an archive of five underground rap producers (Ginseng, MISOGI, Skai, CXO, Art Dealer). I copied it into this repo with GitHub's import tool, so the HTML-3 commit history is still here.
- **HTML-3 work:** [TO FILL IN: which parts of HTML-3 you made or chose yourself (for example the producer picks, write-ups, track lists, Excel menu buttons), and which parts AI helped with and which tool.]
- **HTML-4 decisions:**
  - I picked Path 2.
  - I chose the "Fix the Broken Website" idea and its three topics, all from bugs I ran into in earlier assignments.
  - I asked for the lab to keep my site's pink noise look.
  - I approved the plan before the build.
- **HTML-4 setup I did myself:** created this repo by importing HTML-3 and gave Claude Code access to it. [TO FILL IN: add "connected the repo to Cloudflare" once that's done.]
- **Classmate test:** [TO FILL IN after the test: I ran the test with a Path 1 classmate and decided what to change from their feedback (see "My learning tool" below).]

**AI made:** Claude Code (Anthropic's Claude, used on the web at claude.ai with access to this repo) did the following. You can see every change in the commit history.
- Wrote the learning tool: `lab.html`, `lab.js`, and the "Fix-It Lab" section at the bottom of `styles.css`.
- Wrote all of the lab's explanations, hints, and wrong-answer messages.
- Made the `img/lab.png` menu button. It copies the frame of my Excel-made buttons and adds the new label in a similar pink font.
- Added the lab button to the menu on every page, added the homepage card, and updated the author comments and footers to HTML-4.
- Wrote the first draft of this README. [TO FILL IN: what you rewrote or changed in it.]

**I checked it by:**
- [TO FILL IN: what you checked yourself. For example: I did all three repairs on my phone and laptop, typed wrong answers on purpose to read the feedback, checked the explanations against my HTML-1 to HTML-3 notes, and clicked every link on every page of the live Cloudflare site.]
- Claude also ran automated checks in a real browser before I tested:
  - All 7 pages load, with the same 7-button menu, the stylesheet, author tags, and a footer. Every image loads and has alt text. Every internal link and jump link works.
  - Every lab step was tested with right and wrong answers (around 60 different answers), plus hints, "show me the answer," resets, and keyboard-only use.
  - No sideways scrolling at phone width.

## My learning tool
**Concept it teaches:** **Paths and links, the "it's spelled exactly right or it's broken" rules from HTML-1 to HTML-3.** The [Fix-It Lab](lab.html) has three repairs:
1. **Image paths:** an image `src` is directions from the page to the file (`img/ginseng.png`). Folder, slash, name, capitals, and extension all have to match. Capital letters often work on your own laptop but break on a real web server.
2. **Jump links:** `href="#tracks"` only works if something on the page has `id="tracks"`, matched exactly.
3. **The stylesheet:** `<link rel="stylesheet" href="styles.css">` connects a page to the shared CSS file. One file styles every linked page, and a wrong `href` leaves that page plain.

Each repair goes **Spot it → Fix it → Why it works → Practice**. Wrong answers get a specific reason, and there are two hints plus a "show me the answer" button so nobody gets stuck.

**Built for how I learn because:** [TO FILL IN: Matthew, check this draft and rewrite it in your own words.] *Draft from what I told Claude:* I learn best by seeing what one line of code does and testing it myself, not by reading a list of rules. These three bugs are ones I actually ran into in HTML-1 to HTML-3, like `Huberman.jpg` vs `huberman.jpg` and a jump link that didn't match its id. So the lab starts with something visibly broken. I change one small piece of code and see the result right away. If I'm wrong, it tells me why instead of just "incorrect." It also uses the "I expected ___, but I see ___" sentence from class.

**Tested by:** [TO FILL IN: classmate's first name] **What I changed:** [TO FILL IN: the change you made from their feedback, and the commit that made it]

### Classmate test notes
- **Tester:** [TO FILL IN: first name], Path 1
- **What they did:** [TO FILL IN]
- **What worked / what taught them something:** [TO FILL IN]
- **What confused them or what they suggested:** [TO FILL IN]
- **What I changed because of it:** [TO FILL IN]

## How the lab checks answers (so it teaches correctly)
- It doesn't just compare your answer to one right string. For paths, it acts out what a browser does: start in the page's folder, then follow each folder and file name exactly, with capitals counting. That's how it can say *where* a path broke, for example "img/ was fine, but there's no Ginseng.png in it."
- It accepts other correct answers too, like `./img/ginseng.png`, fixing the id instead of the link, and a `<link>` tag with its attributes in a different order or with single quotes.
- The previews are acted out on the page, not real network requests, so the lab works the same on Cloudflare, GitHub Pages, or your laptop.
- Plain HTML, CSS, and JavaScript. No frameworks, no build step, nothing to install.
