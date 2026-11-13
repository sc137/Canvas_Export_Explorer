# Canvas Export Explorer

## [View this Project](https://sc137.github.io/Canvas_Export_Explorer/)

Open **index.html** in a current Chrome, Edge, Firefox, or Safari browser. No installation, server, account, or internet connection is needed. The HTML file can be copied to another computer and used on its own.

Drag a Canvas `.imscc` export onto the window, or choose **Open export**. A ZIP containing an unmodified Canvas export also works.

- Browse modules, pages, assignments, discussions, announcements, quizzes, question banks, external resources, syllabus content, and course settings
- Use **All files** to inspect every exported file, including content the viewer does not recognize
- Search within the selected category by title, path, or indexed course text
- Select an item for its preview, original source, metadata, and associated files
- Copy readable text, HTML bodies, or original text source; a manual copy dialog appears if the browser denies clipboard access
- Download individual files, selected items, the current filtered view, or the complete archive as a ZIP
- Switch between light and dark themes

Selection and view ZIP downloads preserve original paths and remove duplicate files. **All files ZIP** downloads the original archive with a `.zip` extension. Copy and download operations do not alter the source export.

Course data stays in the browser's memory. Only the theme preference is saved. Previews remove scripts, forms, and external styling, and do not load remote images or embedded websites. External links open when selected and require an internet connection.

## Preview coverage

Canvas HTML content is shown in a consistent, readable theme. Quiz previews include exported questions, choices, feedback, metadata, and answer/scoring rules. Questions absent from an export cannot be recovered by this viewer.

Images, audio, and video use local files when their format is supported by the browser. Word and PowerPoint files have text previews; download the originals for complete formatting, images, and layout. PDFs, spreadsheets, and other binary formats remain available for download in their original form. Canvas services, LTI tools, and other external content are represented by their exported configuration and links.

ZIP64 input is supported. Individual file extraction is limited to 512 MB, and text source previews are limited to 8 MB. Selection ZIPs use ZIP32 and must fit within 4 GB and 65,534 files. The complete original archive can still be downloaded using **All files ZIP**. Very large exports and Office previews depend on available browser memory.
