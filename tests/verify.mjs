// Usage: node tests/verify.mjs /path/to/course.imscc /path/to/linkedom/worker.js
// The optional DOM harness is only for verification; index.html has no dependencies.
import fs from "node:fs/promises";
import vm from "node:vm";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
const [sample, domModule] = process.argv.slice(2);
if (!sample || !domModule)
  throw Error("Supply a Canvas export and a linkedom worker module path.");
const { DOMParser: BaseParser } = await import(pathToFileURL(domModule));
class DOMParser extends BaseParser {
  parseFromString(s, type) {
    return super.parseFromString(
      type === "text/html" && !/<html[\s>]/i.test(s)
        ? "<html><head></head><body>" + s + "</body></html>"
        : s,
      type,
    );
  }
}
const html = await fs.readFile(
  new URL("../index.html", import.meta.url),
  "utf8",
);
const source = html.match(/<script>([\s\S]*)<\/script>/)[1];
const document = new DOMParser().parseFromString(html, "text/html");
const context = vm.createContext({
  document,
  DOMParser,
  TextEncoder,
  TextDecoder,
  Blob,
  File,
  Response,
  DecompressionStream,
  URL,
  Uint8Array,
  Uint32Array,
  DataView,
  Map,
  Set,
  console,
  setTimeout: () => 0,
  clearTimeout: () => {},
  navigator: {},
  matchMedia: () => ({ matches: false }),
  XMLSerializer: class {
    serializeToString(n) {
      return n.toString();
    }
  },
  localStorage: { getItem: () => null, setItem: () => {} },
  sampleFile: new File([await fs.readFile(sample)], "sample.imscc"),
});
vm.runInContext(source, context);
const run = (code) => vm.runInContext(`(async()=>{${code}})()`, context);
const checks = [];
async function check(name, code) {
  await run(code);
  checks.push(name);
  console.log("PASS", name);
}
context.assert = assert;
await check(
  "Open and index sample Canvas export",
  `state=await build(await Archive.open(sampleFile),sampleFile);assert.equal(state.title,'CISN-71-01-20347.202620');assert.equal(state.archive.entries.length,159);assert.equal(state.warnings.length,0);`,
);
await check(
  "Every file appears once in All files",
  `assert.equal(state.fileRecords.length,159);assert.equal(new Set(state.fileRecords.map(r=>r.path)).size,159);`,
);
await check(
  "Course categories and 60 bank questions",
  `assert.equal(itemsFor('Modules').length,9);assert.equal(itemsFor('Pages').length,30);assert.equal(itemsFor('Assignments').length,10);assert.equal(itemsFor('Quizzes & question banks').length,4);assert.equal(itemsFor('Quizzes & question banks').reduce((n,r)=>n+all(r.questionDoc||r.doc,'item').length,0),60);`,
);
await check(
  "Readable discussion and assignment bodies",
  `assert(itemsFor('Discussions & announcements').some(r=>r.body.includes('Introduce yourself')));assert(itemsFor('Assignments').some(r=>r.body.includes('<html>')));`,
);
await check(
  "Stored and deflated files pass CRC checks",
  `for(const p of ['imsmanifest.xml','web_resources/Uploaded Media/image.png','course_settings/canvas_export.txt']){const b=await state.archive.read(p);assert.equal(b.length,state.archive.map.get(p).size)}`,
);
await check(
  "Bulk ZIP round trip preserves paths and bytes",
  `const paths=['imsmanifest.xml','web_resources/Uploaded Media/image.png','wiki_content/academic-honesty.html'];const blob=await state.archive.zip(paths);const zip=await Archive.open(new File([blob],'test.zip'));assert.deepEqual(zip.entries.map(e=>e.path),paths);for(const p of paths)assert.deepEqual(await zip.read(p),await state.archive.read(p));globalThis.roundTripZIP=blob;`,
);
await fs.writeFile(
  "/private/tmp/canvas-explorer-roundtrip.zip",
  new Uint8Array(await context.roundTripZIP.arrayBuffer()),
);
await check(
  "ZIP path traversal and invalid files rejected",
  `assert.throws(()=>safePath('../escape.txt'));assert.throws(()=>safePath('/escape.txt'));assert.throws(()=>safePath('x/../escape.txt'));await assert.rejects(()=>Archive.open(new File(['invalid'],'bad.imscc')));`,
);
await check(
  "Preview sanitization removes executable and remote content",
  `const node=await cleanHTML('<script>alert(1)</script><style>body{display:none}</style><img src="https://example.org/x" onerror="alert(1)"><a href="javascript:alert(1)">bad</a><iframe src="https://example.org/embed"></iframe><p style="background:url(https://example.org/x)" onclick="alert(1)">Text</p>','wiki_content/test.html');assert.equal(node.querySelectorAll('script,style,iframe,[onclick],[onerror],[style]').length,0);assert.equal(node.querySelectorAll('[src]').length,0);assert.equal(node.querySelectorAll('a[href^="javascript:"]').length,0);assert(node.textContent.includes('Text'));`,
);
await check(
  "Canvas embedded files resolve locally",
  `assert.equal(resolvePath('$IMS-CC-FILEBASE$/Uploaded%20Media/image.png?download=1','wiki_content/test.html'),'web_resources/Uploaded Media/image.png');assert.equal(resolvePath('../web_resources/lab-template.html','wiki_content/test.html'),'web_resources/lab-template.html');`,
);
await check(
  "Course list and full text search render",
  `renderNav();renderList();assert(document.getElementById('list').children.length>100);category='Pages';document.getElementById('search').value='integrity';renderList();assert(visible.some(r=>r.title==='Academic Honesty'));document.getElementById('search').value='';`,
);
await check(
  "Question bank preview shows prompts and scoring",
  `const r=itemsFor('Quizzes & question banks').find(r=>all(r.doc,'item').length===33);const s=await quizHTML(r);assert(s.includes('Questions (33)'));assert(s.includes('infrastructure as a service'));assert(s.includes('Answer and scoring rules'));`,
);
await check(
  "Details, source, and preview render safely",
  `const r=itemsFor('Pages').find(r=>r.title==='Academic Honesty');current=r;for(const t of ['details','source','preview']){tab=t;await renderDetail();assert(document.getElementById('content').textContent.trim().length>30)}`,
);
await check(
  "Stored ZIP entries, Unicode paths, and corruption checks",
  `const data=encode.encode('Readable stored content');const e={path:'folder/Café notes.txt',size:data.length,compressed:data.length,method:0,crc:crc32(data),time:0,date:0,offset:0};const seed=new Archive(new File([],'seed'),[e]);seed.packed=async()=>new Blob([data]);const blob=await seed.zip([e.path]);const zip=await Archive.open(new File([blob],'stored.zip'));assert.equal(await zip.text(e.path),'Readable stored content');const corrupt=new Uint8Array(await blob.arrayBuffer());corrupt[30+encode.encode(e.path).length]^=1;const broken=await Archive.open(new File([corrupt],'broken.zip'));await assert.rejects(()=>broken.read(e.path));`,
);
await check(
  "PowerPoint attachment and inner ZIP extraction",
  `const path='web_resources/00_Course_Introduction.pptx';const data=await state.archive.read(path);const office=await Archive.open(new File([data],'slides.pptx'));const slide=office.entries.find(e=>e.path==='ppt/slides/slide1.xml');assert(slide);assert((await office.text(slide.path)).includes('Course'));`,
);
await check(
  "Complete selection ZIP preserves every archive file",
  `globalThis.completeZIP=await state.archive.zip(state.archive.entries.map(e=>e.path));const zip=await Archive.open(new File([completeZIP],'complete.zip'));assert.equal(zip.entries.length,159);assert.deepEqual(zip.entries.map(e=>[e.path,e.size,e.crc]),state.archive.entries.map(e=>[e.path,e.size,e.crc]));`,
);
await fs.writeFile(
  "/private/tmp/canvas-explorer-complete.zip",
  new Uint8Array(await context.completeZIP.arrayBuffer()),
);
console.log(checks.length + " checks passed");
