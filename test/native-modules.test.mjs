import assert from "node:assert/strict";
import test from "node:test";

import { patchBetterSqlite3Sources } from "../src/native-modules.mjs";

const sources = {
  helpers: `recv->InstanceTemplate()->SetNativeDataProperty(
\t\tInternalizedFromLatin1(isolate, name),
\t\tfunc,
\t\t0,
\t\tdata
\t);`,
  macros: `#define EasyIsolate v8::Isolate* isolate = v8::Isolate::GetCurrent()
#define OnlyIsolate info.GetIsolate()
#define OnlyContext isolate->GetCurrentContext()
#define OnlyAddon static_cast<Addon*>(info.Data().As<v8::External>()->Value())`,
  main: "v8::Local<v8::External> data = v8::External::New(isolate, addon);",
};

test("patchBetterSqlite3Sources adapts the Electron 42 V8 API", () => {
  const patched = patchBetterSqlite3Sources(sources);

  assert.match(patched.main, /BETTER_SQLITE3_EXTERNAL_NEW\(isolate, addon\)/);
  assert.match(patched.macros, /v8::kExternalPointerTypeTagDefault/);
  assert.match(patched.macros, /BETTER_SQLITE3_EXTERNAL_VALUE/);
  assert.match(patched.helpers, /\t\tnullptr,\n\t\tdata/);
});

test("patchBetterSqlite3Sources is idempotent", () => {
  const once = patchBetterSqlite3Sources(sources);
  assert.deepEqual(patchBetterSqlite3Sources(once), once);
});

test("patchBetterSqlite3Sources rejects unexpected source drift", () => {
  assert.throws(
    () => patchBetterSqlite3Sources({ ...sources, main: "changed upstream" }),
    /better-sqlite3 main source is unsupported/,
  );
});
