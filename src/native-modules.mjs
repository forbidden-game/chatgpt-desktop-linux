import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const EXTERNAL_NEW = "v8::Local<v8::External> data = v8::External::New(isolate, addon);";
const EXTERNAL_NEW_PATCHED =
  "v8::Local<v8::External> data = BETTER_SQLITE3_EXTERNAL_NEW(isolate, addon);";
const MACROS = `#define EasyIsolate v8::Isolate* isolate = v8::Isolate::GetCurrent()
#define OnlyIsolate info.GetIsolate()
#define OnlyContext isolate->GetCurrentContext()
#define OnlyAddon static_cast<Addon*>(info.Data().As<v8::External>()->Value())`;
const MACROS_PATCHED = `#if defined(V8_MAJOR_VERSION) && V8_MAJOR_VERSION >= 14
#define BETTER_SQLITE3_EXTERNAL_POINTER_TAG v8::kExternalPointerTypeTagDefault
#define BETTER_SQLITE3_EXTERNAL_NEW(isolate, value) v8::External::New((isolate), (value), BETTER_SQLITE3_EXTERNAL_POINTER_TAG)
#define BETTER_SQLITE3_EXTERNAL_VALUE(external) ((external)->Value(BETTER_SQLITE3_EXTERNAL_POINTER_TAG))
#else
#define BETTER_SQLITE3_EXTERNAL_NEW(isolate, value) v8::External::New((isolate), (value))
#define BETTER_SQLITE3_EXTERNAL_VALUE(external) ((external)->Value())
#endif

#define EasyIsolate v8::Isolate* isolate = v8::Isolate::GetCurrent()
#define OnlyIsolate info.GetIsolate()
#define OnlyContext isolate->GetCurrentContext()
#define OnlyAddon static_cast<Addon*>(BETTER_SQLITE3_EXTERNAL_VALUE(info.Data().As<v8::External>()))`;
const NULL_SETTER = "\t\tfunc,\n\t\t0,\n\t\tdata";
const NULL_SETTER_PATCHED = "\t\tfunc,\n\t\tnullptr,\n\t\tdata";

function replaceRequired(source, original, replacement, label) {
  if (source.includes(replacement)) return source;
  if (!source.includes(original)) {
    throw new Error(`better-sqlite3 ${label} source is unsupported`);
  }
  return source.replace(original, replacement);
}

export function patchBetterSqlite3Sources(sources) {
  return {
    helpers: replaceRequired(
      sources.helpers,
      NULL_SETTER,
      NULL_SETTER_PATCHED,
      "helpers",
    ),
    macros: replaceRequired(sources.macros, MACROS, MACROS_PATCHED, "macros"),
    main: replaceRequired(sources.main, EXTERNAL_NEW, EXTERNAL_NEW_PATCHED, "main"),
  };
}

export async function patchBetterSqlite3Directory(moduleDir) {
  const files = {
    helpers: join(moduleDir, "src", "util", "helpers.cpp"),
    macros: join(moduleDir, "src", "util", "macros.cpp"),
    main: join(moduleDir, "src", "better_sqlite3.cpp"),
  };
  const sources = Object.fromEntries(await Promise.all(
    Object.entries(files).map(async ([name, path]) => [name, await readFile(path, "utf8")]),
  ));
  const patched = patchBetterSqlite3Sources(sources);
  let changed = 0;
  for (const [name, path] of Object.entries(files)) {
    if (patched[name] === sources[name]) continue;
    await writeFile(path, patched[name]);
    changed += 1;
  }
  return { changed };
}
