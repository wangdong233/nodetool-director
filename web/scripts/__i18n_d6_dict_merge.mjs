// Merge additions JSON {dict: {section: {key: [en, zh]}}} into en + zh-CN dictionaries.
// Appends at section end (insertion-order convention). Fails if key already exists.
import { readFileSync, writeFileSync } from "node:fs";
const additions = JSON.parse(readFileSync(process.argv[2], "utf8"));
let added = 0;
for (const [dict, sections] of Object.entries(additions)) {
  for (const lang of ["en", "zh-CN"]) {
    const idx = lang === "en" ? 0 : 1;
    const path = `src/i18n/locales/${lang}/${dict}.json`;
    const j = JSON.parse(readFileSync(path, "utf8"));
    for (const [section, pairs] of Object.entries(sections)) {
      if (!(section in j)) {
        console.error(`FAIL: ${path} has no section "${section}"`);
        process.exit(1);
      }
      for (const [key, [en, zh]] of Object.entries(pairs)) {
        if (key in j[section]) {
          console.error(`FAIL: ${path} ${section}.${key} already exists`);
          process.exit(1);
        }
        j[section][key] = idx === 0 ? en : zh;
        if (idx === 1) added++;
      }
    }
    writeFileSync(path, JSON.stringify(j, null, 2) + "\n");
  }
}
console.log(`dictionary merge OK (${added} zh pairs added; en mirrored)`);
