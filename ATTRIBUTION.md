# Attribution

This project is maintained as Junle Chen's personal research homepage. It also keeps clear credit for runtime services, libraries, templates, and external data sources that make the site easier to build, cite, and reuse.

## Project

- Site: [junle.site](https://junle.site)
- Repository: [junle-chen/ac-homepage](https://github.com/junle-chen/ac-homepage)
- Author: Junle Chen
- Citation metadata: `CITATION.cff`
- Code license: `LGPL-3.0-only`
- Notices: `NOTICE.md`
- Personal content license boundary: `CONTENT_LICENSE.md`

## Runtime Services

| Website or service | How it is used |
| --- | --- |
| [GitHub Pages](https://pages.github.com/) | Static site hosting and custom domain deployment. |
| [GitHub](https://github.com/) | Source hosting, Discussions, OAuth App setup, and repository citation UI. |
| [Giscus](https://giscus.app/) | Comment widget backed by GitHub Discussions. |
| [Supabase](https://supabase.com/) | Realtime database and GitHub-authenticated owner writes for memos, stars, and archive state. |
| [arXiv](https://arxiv.org/) | Paper metadata and paper links for Daily Paper and Paper List content. |
| [Zotero](https://www.zotero.org/) | Local paper library export path for `zotero-paper-list.json`. |

## Frontend Libraries And CDNs

| Website or project | How it is used |
| --- | --- |
| [jsDelivr](https://www.jsdelivr.com/) | CDN for frontend libraries loaded at runtime. |
| [anime.js](https://animejs.com/) | Homepage animation timing and transitions. |
| [MathJax](https://www.mathjax.org/) | LaTeX rendering in notes and paper details. |
| [Supabase JS](https://supabase.com/docs/reference/javascript/introduction) | Browser client for Supabase auth and realtime state. |
| [Alibaba Iconfont](https://www.iconfont.cn/) | Icon font used by the homepage link buttons. |

## Adapted Or Referenced Code

| Project | Credit |
| --- | --- |
| [SimonAKing/HomePage](https://github.com/SimonAKing/HomePage) | Original homepage structure and intro style. The source-code portion of this repository keeps the upstream LGPL-3.0-only license and credit while being maintained as Junle Chen's independent personal homepage. |
| [WebGL Fluid Simulation](https://github.com/PavelDoGreat/WebGL-Fluid-Simulation/) | MIT-licensed WebGL fluid background implementation adapted in `src/js/background.js`. |
| [Beautiful Jekyll](https://github.com/daattali/beautiful-jekyll) | Some archived/imported content assets from the earlier personal notes site still carry Beautiful Jekyll lineage and are credited here. |
| [bootstrap-social](https://github.com/lipis/bootstrap-social) | Historical imported CSS asset under the notes content tree. |

## Operational References

- [GitHub Docs: Duplicating a repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/duplicating-a-repository)
- [GitHub Docs: Configuring a publishing source for GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [GitHub Docs: About CITATION files](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-citation-files)

## Reuse Notes

If you reuse this project, keep project-specific secrets out of the repository. The Supabase anon key is intentionally public, but OAuth client secrets, deployment tokens, and private paper-library exports should stay outside Git.

When citing the website or repository, prefer `CITATION.cff` so GitHub can render APA and BibTeX automatically.

The Git history may be compacted so the GitHub Contributors widget only reflects maintainers of this repository. That UI change does not remove upstream credit: keep `LICENSE`, `NOTICE.md`, this attribution file, and `CONTENT_LICENSE.md` when redistributing the code.
