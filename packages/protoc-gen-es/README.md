# @bufbuild/protoc-gen-es

The code generator plugin for Protocol Buffers for ECMAScript. Learn more about the project at
[github.com/bufbuild/protobuf-es](https://github.com/bufbuild/protobuf-es).

## Installation

`protoc-gen-es` generates base types—messages and enumerations—from your Protocol Buffer
schema. The generated code requires the runtime library [@bufbuild/protobuf](https://www.npmjs.com/package/@bufbuild/protobuf).
It's compatible with Protocol Buffer compilers like [buf](https://github.com/bufbuild/buf) and [protoc](https://github.com/protocolbuffers/protobuf/releases).

To install the runtime library and the plugin, run:

```shell
npm install @bufbuild/protobuf
npm install --save-dev @bufbuild/protoc-gen-es
```

## Generating code

### With buf

```bash
npm install --save-dev @bufbuild/buf
```

Add a new `buf.gen.yaml` configuration file:

```yaml
# Learn more: https://buf.build/docs/configuration/v2/buf-gen-yaml
version: v2
plugins:
  # This will invoke protoc-gen-es and write output to src/gen
  - local: protoc-gen-es
    out: src/gen
    opt:
      # Add more plugin options here
      - target=ts
```

To generate code for all Protobuf files within your project, run:

```bash
npx buf generate
```

Note that `buf` can generate from various [inputs](https://buf.build/docs/reference/inputs),
not just local Protobuf files.

### With `protoc`

```bash
PATH=$PATH:$(pwd)/node_modules/.bin \
  protoc -I . \
  --es_out src/gen \
  --es_opt target=ts \
  a.proto b.proto c.proto
```

Note that `node_modules/.bin` needs to be added to the `$PATH` so that the Protobuf compiler can find the plugin. This
happens automatically with npm scripts.

If you use Yarn, versions v2 and above don't use a `node_modules` directory, so you need to change the variable a
bit:

```shellsession
PATH=$(dirname $(yarn bin protoc-gen-es)):$PATH
```

## Plugin options

### `target`

This option controls whether the plugin generates JavaScript, TypeScript, or TypeScript declaration files. Possible
values:

- `target=js`: Generates a `_pb.js` file for every `.proto` input file.
- `target=ts`: Generates a `_pb.ts` file for every `.proto` input file.
- `target=dts`: Generates a `_pb.d.ts` file for every `.proto` input file.

You can pass multiple values by separating them with `+`—for example, `target=js+dts`.

By default, it generates JavaScript and TypeScript declaration files, which produces the smallest code size and is the
most compatible with various bundler configurations. If you prefer to generate TypeScript, use `target=ts`.

### `import_extension`

By default, `protoc-gen-es` doesn't add file extensions to import paths. However, some
environments require an import extension. For example, using ECMAScript modules in Node.js
requires the `.js` extension, and Deno requires `.ts`. With this plugin option, you can add `.js`/`.ts` extensions in
import paths with the given value. Possible values:

- `import_extension=none`: Doesn't add an extension. (Default)
- `import_extension=js`: Adds the `.js` extension.
- `import_extension=ts`. Adds the `.ts` extension.

### `js_import_style`

By default, `protoc-gen-es` generates ECMAScript `import` and `export` statements. For use cases where CommonJS is
difficult to avoid, this option can be used to generate CommonJS `require()` calls. Possible values:

- `js_import_style=module`: Generates ECMAScript `import`/`export` statements. (Default)
- `js_import_style=legacy_commonjs`: Generates CommonJS `require()` calls.

### `keep_empty_files=true`

By default, `protoc-gen-es` omits empty files from the plugin output. This option disables pruning of empty files to
allow for smooth interoperation with Bazel and similar tooling that requires all output files to be declared ahead of
time. Unless you use Bazel, you probably don't need this option.

### `ts_nocheck=true`

`protoc-gen-es` generates valid TypeScript for current versions of the TypeScript compiler with standard settings.
If you use compiler settings that yield an error for generated code, setting this option generates an annotation at
the top of each file to skip type checks: `// @ts-nocheck`.

### `json_types=true`

Generates JSON types for every Protobuf message and enumeration. Calling `toJson()` automatically returns the JSON type
if available. Learn more about [JSON types](https://github.com/bufbuild/protobuf-es/blob/main/MANUAL.md#json-types).

### `valid_types` (experimental)

Generates a Valid type for every Protobuf message. Possible values:

- `valid_types=legacy_required`: Message fields with the `required` label, or the Edition feature
  `features.field_presence=LEGACY_REQUIRED`, are generated as non-optional properties.
- `valid_types=protovalidate_required`: Message fields with protovalidate's [`required` rule](https://buf.build/docs/reference/protovalidate/rules/field_rules/#required)
  rule are generated as non-optional properties.

You can combine both options with `+`—for example, `valid_types=legacy_required+protovalidate_required`.

Learn more about [Valid types](https://github.com/bufbuild/protobuf-es/blob/main/MANUAL.md#valid-types).

### `buf_validate` (experimental)

Analyzes CEL (Common Expression Language) constraints from buf.validate message-level rules and modifies the generated
TypeScript types to reflect read-only patterns. When enabled, `protoc-gen-es` detects specific CEL patterns that
indicate fields should not be set by client code, and applies `Omit<>` type transformations to exclude those fields
from the generated message types.

To enable this feature, set the option to `true`:

```yaml
# buf.gen.yaml
version: v2
plugins:
  - local: protoc-gen-es
    out: src/gen
    opt:
      - target=ts
      - buf_validate=true
```

Or with `protoc`:

```bash
protoc --es_out=. --es_opt=buf_validate=true *.proto
```

#### Supported CEL patterns

The `buf_validate` option recognizes and processes the following CEL constraint patterns:

**1. Field equality checks (`==`)**

When a CEL constraint requires a field to equal a specific value (empty string, zero, false), that field is omitted:

```protobuf
message Example {
  option (buf.validate.message).cel = {
    id: "readonly_name",
    message: "name must be empty",
    expression: "this.name == ''"
  };

  string name = 1;      // Omitted from generated type
  string other = 2;     // Available
}
```

**2. Field presence checks (`!has()`)**

Fields that must not be set according to `!has()` constraints are omitted:

```protobuf
message Example {
  option (buf.validate.message).cel = {
    id: "not_has_field",
    message: "optional_field must not be set",
    expression: "!has(this.optional_field)"
  };

  string optional_field = 1;  // Omitted from generated type
  string other = 2;           // Available
}
```

**3. Nested field constraints (2 levels)**

Constraints on nested fields apply `Omit<>` to the nested message type:

```protobuf
message Parent {
  option (buf.validate.message).cel = {
    id: "nested_constraint",
    message: "child.name must be empty",
    expression: "this.child.name == ''"
  };

  Child child = 1;  // Type: Omit<Child, "name"> | undefined
  string other = 2;
}

message Child {
  string name = 1;   // Omitted in Parent's child field
  int32 age = 2;     // Available in Parent's child field
}
```

**4. Logical AND constraints (`&&`)**

Fields combined with `&&` are all omitted:

```protobuf
message Example {
  option (buf.validate.message).cel = {
    id: "and_constraint",
    message: "field1 and field2 must be empty",
    expression: "this.field1 == '' && this.field2 == ''"
  };

  string field1 = 1;  // Omitted
  string field2 = 2;  // Omitted
  string field3 = 3;  // Available
}
```

**5. Multiple CEL rules**

You can apply multiple independent constraints:

```protobuf
message Example {
  option (buf.validate.message).cel = {
    id: "rule1",
    message: "field1 must be empty",
    expression: "this.field1 == ''"
  };
  option (buf.validate.message).cel = {
    id: "rule2",
    message: "field2 must not be set",
    expression: "!has(this.field2)"
  };

  string field1 = 1;  // Omitted by rule1
  string field2 = 2;  // Omitted by rule2
  string field3 = 3;  // Available
}
```

#### Patterns that DO NOT cause omissions

The following CEL patterns are validated at runtime but do NOT modify the TypeScript types:

- **Inequality checks** (`!=`): `this.name != 'admin'` - name is still available
- **Comparison operators** (`<`, `>`, `<=`, `>=`): `this.age > 18` - age is still available
- **Logical OR** (`||`): `this.field1 == '' || this.field2 == ''` - both fields still available
- **Size constraints**: `size(this.items) == 0` - items is still available
- **Complex conditions**: Any condition that doesn't strictly require a field to be unset/empty

#### Benefits

Using `buf_validate=true` provides several advantages:

1. **Type safety**: The TypeScript compiler prevents setting fields that should remain read-only according to your
   validation rules.

2. **Self-documenting code**: The generated types clearly indicate which fields are constrained.

3. **Catch errors early**: Invalid field access is caught at compile-time rather than runtime.

4. **Consistency**: Ensures that CEL validation rules and TypeScript types are in sync.

#### Example

Given this proto file:

```protobuf
syntax = "proto3";

import "buf/validate/validate.proto";

message UserProfile {
  option (buf.validate.message).cel = {
    id: "system_fields",
    message: "system fields must be empty",
    expression: "this.id == '' && this.created_at == ''"
  };
  option (buf.validate.message).cel = {
    id: "internal_flag",
    message: "internal flag must not be set",
    expression: "!has(this.internal_flag)"
  };

  string id = 1;
  string created_at = 2;
  string internal_flag = 3;
  string name = 4;
  string email = 5;
}
```

The generated TypeScript type with `buf_validate=true` will be:

```typescript
export type UserProfile = Message<"UserProfile"> &
  Omit<
    {
      id: string;
      createdAt: string;
      internalFlag: string;
      name: string;
      email: string;
    },
    "id" | "createdAt" | "internalFlag"
  >;

// Effectively:
export type UserProfile = Message<"UserProfile"> & {
  // id: omitted
  // createdAt: omitted
  // internalFlag: omitted
  name: string;
  email: string;
};
```

When creating instances:

```typescript
const profile = create(UserProfileSchema, {
  name: "John Doe",
  email: "john@example.com",
  // TypeScript error: id, createdAt, and internalFlag cannot be set
});
```

#### Combining with other options

`buf_validate` works alongside other plugin options:

```yaml
# buf.gen.yaml
version: v2
plugins:
  - local: protoc-gen-es
    out: src/gen
    opt:
      - target=ts
      - import_extension=js
      - buf_validate=true
      - json_types=true
```

#### Limitations

- This is an **experimental feature** and may change in future versions
- Only message-level CEL constraints (`buf.validate.message`) are analyzed
- Field-level constraints (`buf.validate.field`) are not processed (except for `required` when used with `valid_types`)
- Complex CEL expressions beyond the supported patterns are ignored
- The feature does not validate CEL syntax—invalid expressions are skipped silently
- **Multi-level nested constraints**: For constraints on deeply nested fields (e.g., `this.parent.child.grandchild`),
  the generated type omits the immediate child field (`child`) from the parent. This is a pragmatic simplification
  due to TypeScript type system limitations. For example:

  ```protobuf
  message Example {
    option (buf.validate.message).cel = {
      expression: "this.parent.child.grandchild == ''"
    };
    Parent parent = 1;  // Generated as: parent?: Omit<Parent, 'child'>
  }
  ```

  For precise control over deeply nested fields, consider using multiple constraints at different levels or
  restructuring your message definitions.

Learn more about [buf.validate and protovalidate](https://github.com/bufbuild/protovalidate).
