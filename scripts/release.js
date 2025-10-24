// Copyright 2021-2025 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { execSync } from "node:child_process";

/*
 * Publish protobuf-es
 *
 * Recommended procedure:
 * 1. Set a new version with `npm run setversion 1.2.3`
 * 2. Commit and push all changes to a PR, wait for approval.
 * 3. Login with `npm login`
 * 4. Publish to npmjs.com with `npm run release`
 * 5. Merge PR and create a release on GitHub
 */

const uncommitted = gitUncommitted();
if (uncommitted.length > 0) {
  throw new Error("Uncommitted changes found: \n" + uncommitted);
}
npmPublish();

/**
 *
 */
function npmPublish() {
  // Only publish protoc-gen-es package
  const command = `npm publish --workspace packages/protoc-gen-es`;
  execSync(command, {
    stdio: "inherit",
  });
}

/**
 * @returns {string}
 */
function gitUncommitted() {
  const out = execSync("git status --short", {
    encoding: "utf-8",
  });
  if (out.trim().length === 0) {
    return "";
  }
  return out;
}
