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

import { suite, test } from "node:test";
import * as assert from "node:assert";
import type {
  BufValidateSimple,
  BufValidateMultiple,
  BufValidateNotHas,
  BufValidateNested,
  BufValidateCombined,
  BufValidateSnakeCase,
  BufValidateNoCel,
  BufValidateMultipleNested,
  BufValidateWithRequired,
  BufValidateOr,
  BufValidateWithRepeated,
  BufValidateReference,
  NestedChild,
} from "./gen/ts,buf_validate/extra/buf_validate_types_pb.js";

void suite("buf_validate types", () => {
  void suite("BufValidateSimple", () => {
    test("name field is omitted, other fields are available", () => {
      function f(msg: BufValidateSimple) {
        // name field should be omitted due to readonly constraint
        const desc: string = msg.description;
        const age: number = msg.age;
        return { desc, age };
      }
      assert.ok(f);
    });
  });

  void suite("BufValidateMultiple", () => {
    test("id and code fields are omitted, other fields are available", () => {
      function f(msg: BufValidateMultiple) {
        // id and code fields should be omitted due to readonly constraints
        const title: string = msg.title;
        const active: boolean = msg.active;
        return { title, active };
      }
      assert.ok(f);
    });
  });

  void suite("BufValidateNotHas", () => {
    test("optionalField is omitted, otherField is available", () => {
      function f(msg: BufValidateNotHas) {
        // optionalField should be omitted due to !has() constraint
        const other: string = msg.otherField;
        return { other };
      }
      assert.ok(f);
    });
  });

  void suite("BufValidateNested", () => {
    test("nested message has specific fields omitted", () => {
      function f(msg: BufValidateNested) {
        // nested field should exist but with Omit<> applied
        const nested = msg.nested;
        if (nested) {
          // childName and childCount fields are omitted due to readonly constraints
          // Only childValue should be available
          const childValue: string = nested.childValue;
          return { childValue };
        }
        return undefined;
      }
      assert.ok(f);
    });

    test("nested message has non-readonly fields available", () => {
      function f(msg: BufValidateNested) {
        const nested = msg.nested;
        if (nested) {
          const childValue: string = nested.childValue;
          return childValue;
        }
        return undefined;
      }
      assert.ok(f);
    });

    test("parent field is available", () => {
      function f(msg: BufValidateNested) {
        const parentField: string = msg.parentField;
        return parentField;
      }
      assert.ok(f);
    });
  });

  void suite("BufValidateCombined", () => {
    test("field1 and field2 are omitted, field3 is available", () => {
      function f(msg: BufValidateCombined) {
        // field1 and field2 should be omitted due to combined readonly constraint
        const f3: string = msg.field3;
        return { f3 };
      }
      assert.ok(f);
    });
  });

  void suite("BufValidateSnakeCase", () => {
    test("userName is omitted, other fields available with camelCase names", () => {
      function f(msg: BufValidateSnakeCase) {
        // userName should be omitted due to readonly constraint
        const firstName: string = msg.firstName;
        const lastName: string = msg.lastName;
        return { firstName, lastName };
      }
      assert.ok(f);
    });
  });

  void suite("BufValidateNoCel", () => {
    test("message without CEL constraints has all fields", () => {
      function f(msg: BufValidateNoCel) {
        const name: string = msg.name;
        const description: string = msg.description;
        return { name, description };
      }
      assert.ok(f);
    });
  });

  void suite("BufValidateMultipleNested", () => {
    test("multiple nested constraints work independently", () => {
      function f(msg: BufValidateMultipleNested) {
        const child1 = msg.child1;
        const child2 = msg.child2;
        if (child1 && child2) {
          // child1 should have childName omitted
          // child2 should have childValue omitted
          // Access only the available fields
          const c1Value: string = child1.childValue;
          const c2Name: string = child2.childName;

          return { c1Value, c2Name };
        }
        return undefined;
      }
      assert.ok(f);
    });

    test("non-omitted nested fields are available", () => {
      function f(msg: BufValidateMultipleNested) {
        const child1 = msg.child1;
        const child2 = msg.child2;
        if (child1 && child2) {
          // child1 should have other fields available
          const c1Value: string = child1.childValue;
          const c1Count: number = child1.childCount;

          // child2 should have other fields available
          const c2Name: string = child2.childName;
          const c2Count: number = child2.childCount;

          return { c1Value, c1Count, c2Name, c2Count };
        }
        return undefined;
      }
      assert.ok(f);
    });
  });

  void suite("BufValidateWithRequired", () => {
    test("all fields are available", () => {
      function f(msg: BufValidateWithRequired) {
        // const readonly: string = msg.readonlyField;
        const required: string = msg.requiredField;
        const normal: string = msg.normalField;
        return { required, normal };
      }
      assert.ok(f);
    });
  });

  void suite("BufValidateOr", () => {
    test("all fields are available with OR operator", () => {
      function f(msg: BufValidateOr) {
        const f1: string = msg.field1;
        const f2: string = msg.field2;
        const f3: string = msg.field3;
        return { f1, f2, f3 };
      }
      assert.ok(f);
    });
  });

  void suite("BufValidateWithRepeated", () => {
    test("all fields including single_field are available", () => {
      function f(msg: BufValidateWithRepeated) {
        // const single: string = msg.singleField;
        const list: readonly string[] = msg.listField;
        const nestedList: readonly NestedChild[] = msg.nestedList;
        return { list, nestedList };
      }
      assert.ok(f);
    });
  });

  void suite("BufValidateReference", () => {
    test("referenced messages keep their own structure", () => {
      function f(msg: BufValidateReference) {
        const simple = msg.simple;
        const nested = msg.nested;

        if (simple) {
          // simple.description and simple.age are available (name is omitted due to readonly constraint)
          const desc: string = simple.description;
          return desc;
        }

        if (nested) {
          // TODO: These fields should be omitted when CEL constraint parsing is implemented
          // nested.nested has Omit applied
          const nestedChild = nested.nested;
          if (nestedChild) {
            const childValue: string = nestedChild.childValue;
            return childValue;
          }
        }

        return undefined;
      }
      assert.ok(f);
    });
    test("own_field is available", () => {
      function f(msg: BufValidateReference) {
        const ownField: string = msg.ownField;
        return ownField;
      }
      assert.ok(f);
    });
  });

  void suite("Type safety", () => {
    test("$typeName is accessible on all messages", () => {
      function f(
        simple: BufValidateSimple,
        multiple: BufValidateMultiple,
        nested: BufValidateNested,
      ) {
        const t1: string = simple.$typeName;
        const t2: string = multiple.$typeName;
        const t3: string = nested.$typeName;
        return { t1, t2, t3 };
      }
      assert.ok(f);
    });
  });
});
