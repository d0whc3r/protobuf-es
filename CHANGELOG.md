# 1.0.0 (2025-10-24)


### Bug Fixes

* add @semantic-release/exec dependency version 7.1.0 to package.json and package-lock.json ([ce77607](https://github.com/d0whc3r/protobuf-es/commit/ce776073e8bbd7fd8813c79d494d05f8ce16b041))
* add diagnostics check to prevent transpilation on non-ignored errors ([026da54](https://github.com/d0whc3r/protobuf-es/commit/026da54a739ad53a1a4b63a1462f703f148d7a32))
* add missing commas in transpile function for improved readability ([eb8d47a](https://github.com/d0whc3r/protobuf-es/commit/eb8d47af736c12736aae2bd84c2b49daefa1d194))
* add noEmitOnError option and improve error messages in transpile function ([8ca3334](https://github.com/d0whc3r/protobuf-es/commit/8ca333410d809b65fb9d523aa8f8e1b6479ec8d3))
* arbitrary imports ([#254](https://github.com/d0whc3r/protobuf-es/issues/254)) ([5490fef](https://github.com/d0whc3r/protobuf-es/commit/5490fef984969ea66e8ec6ced41b33097691b14a))
* correct formatting in function parameters and error messages ([b977075](https://github.com/d0whc3r/protobuf-es/commit/b9770758bab3a357da4bde93d0a93787b33edd4e))
* update Node.js version in release workflow from 20 to 22 ([6a38870](https://github.com/d0whc3r/protobuf-es/commit/6a38870aaf0d4ff251a23dc0d80a70304cb7557c))
* update transpile function to use verbatimModuleSyntax for improved module handling ([1c3e07f](https://github.com/d0whc3r/protobuf-es/commit/1c3e07f6aabbc5832e2e815cec7083814fededff))
* update transpile options to disable noEmitOnError and verbatimModuleSyntax, and add non-ignored diagnostics check ([477505a](https://github.com/d0whc3r/protobuf-es/commit/477505a82c26c59c16c46c3a6c1e7552158c56bf))


### Features

* add CEL expression parser for buf.validate.message constraints ([f484a1b](https://github.com/d0whc3r/protobuf-es/commit/f484a1b1de6c94a35387fdc3ca0cdd0f91f27ec4))
* add optional dependency for @biomejs/cli-linux-x64 version 1.9.4 ([a0b8d41](https://github.com/d0whc3r/protobuf-es/commit/a0b8d410f37701ecfc839dfc7e10a50c77a919fe))
* enhance CEL expression parsing and field name validation ([bd3bfa5](https://github.com/d0whc3r/protobuf-es/commit/bd3bfa5d796fca8f9deaf5cee1e0b0f6e0959100))
* rename protoc-gen-es package to @d0whc3r/protoc-gen-es ([c5b5ac4](https://github.com/d0whc3r/protobuf-es/commit/c5b5ac492e4597bf5d1f15c0a93dac8195cf35f2))
* setup semantic-release for protoc-gen-es publishing ([0b4e28c](https://github.com/d0whc3r/protobuf-es/commit/0b4e28cfe852f6d5bdf6dad4214ff854a954e19d))
