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

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Recursively find all package.json files
 */
function findPackageJsonFiles(dir, files = []) {
  const items = readdirSync(dir);
  for (const item of items) {
    const fullPath = join(dir, item);
    if (statSync(fullPath).isDirectory() && item !== "node_modules") {
      findPackageJsonFiles(fullPath, files);
    } else if (item === "package.json") {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * Update internal dependencies to @d0whc3r/protoc-gen-es to the latest version
 */
function updateInternalDeps() {
  const newVersion = process.argv[2];
  if (!newVersion) {
    console.error("Version argument not provided");
    process.exit(1);
  }

  const packageJsonFiles = findPackageJsonFiles(".").filter(
    (file) =>
      !file.includes("node_modules") &&
      file !== "packages/protoc-gen-es/package.json",
  );

  for (const file of packageJsonFiles) {
    const pkg = JSON.parse(readFileSync(file, "utf-8"));
    let updated = false;

    if (pkg.dependencies?.["@d0whc3r/protoc-gen-es"]) {
      pkg.dependencies["@d0whc3r/protoc-gen-es"] = newVersion;
      updated = true;
    }
    if (pkg.devDependencies?.["@d0whc3r/protoc-gen-es"]) {
      pkg.devDependencies["@d0whc3r/protoc-gen-es"] = newVersion;
      updated = true;
    }

    if (updated) {
      writeFileSync(file, JSON.stringify(pkg, null, 2) + "\n");
      console.log(`Updated ${file} to version ${newVersion}`);
    }
  }
}

updateInternalDeps();
