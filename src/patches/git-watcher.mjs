const MARKER = "/* chatgpt-linux: validate-git-marker */";
const METHOD =
  /async checkForGitDirectory\(([A-Za-z_$][\w$]*)\)\{if\(!this\.disposed\)\{try\{await this\.options\.host\.stat\(\1,\{bypassCache:!0\}\)\}catch\{return\}this\.disposed\|\|\(this\.dispose\(\),this\.options\.onGitInit\(\)\)\}\}/u;

export function gitMarkerHelperSource() {
  return [
    MARKER,
    "async function chatgptLinuxGitMarkerReady(host,marker){try{",
    "let entry=await host.stat(marker,{bypassCache:!0});",
    "if(entry.isDirectory()){let paths=await host.platformPath();await host.stat(paths.join(marker,`HEAD`),{bypassCache:!0})}",
    "return!0}catch{return!1}}",
  ].join("");
}

export function applyGitWatcherPatch(source) {
  if (source.includes(MARKER)) return source;
  const match = source.match(METHOD);
  if (!match) throw new Error("unsupported Git watcher source");
  const marker = match[1];
  const method =
    `async checkForGitDirectory(${marker}){` +
    `if(!this.disposed&&await chatgptLinuxGitMarkerReady(this.options.host,${marker}))` +
    "this.disposed||(this.dispose(),this.options.onGitInit())}";
  return `${gitMarkerHelperSource()}${source.replace(METHOD, method)}`;
}
