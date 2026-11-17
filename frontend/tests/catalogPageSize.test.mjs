import { test } from "node:test";
import assert from "node:assert/strict";
import { catalogPageSize } from "../src/catalogPageSize.ts";

test("five-column catalog requests fifteen games instead of leaving three empty slots", () => {
  assert.equal(catalogPageSize(12, 5), 15);
});

test("seven-column catalog fits all fourteen demo games on the first page", () => {
  assert.equal(catalogPageSize(12, 7), 14);
});

test("all selectable sizes end on a full row and stay within the API limit", () => {
  for (const minimum of [12, 24, 48]) {
    for (let columns = 1; columns <= 20; columns++) {
      const size = catalogPageSize(minimum, columns);
      assert.equal(size % columns, 0);
      assert.ok(size >= minimum && size <= 100);
    }
  }
});
