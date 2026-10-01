# intclass

A minimal, plain-white study website. General subject hub + video lessons library, hosted on GitHub Pages.

**Live site:** https://losdek.github.io/intclass/

## Structure

```
index.html # General part: hero, subjects, how it works
lessons.html # Video lessons library (YouTube embeds)
css/style.css # Styles + animations
js/main.js # Nav, mobile menu, scroll-reveal animations
js/lessons.js # Lesson data, subject filters, lazy YouTube embeds
```

## Add a video lesson

Open `js/lessons.js` and copy an entry in the `LESSONS` array:

```js
{
 title: "My lesson title",
 description: "Short description.",
 subject: "math", // math | physics | chemistry | biology | history | english
 videoId: "WUvTyaaNkzM", // the part after watch?v= in the YouTube URL
},
```

Commit and push — GitHub Pages redeploys automatically.

## Rename the project

The site title is in the `<title>` tags and the `.logo` elements in both HTML files. If you rename the repository on GitHub, the Pages URL changes accordingly (`https://<user>.github.io/<repo>/`).
