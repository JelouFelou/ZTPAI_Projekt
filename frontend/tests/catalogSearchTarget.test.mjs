import { test } from "node:test";
import assert from "node:assert/strict";
import { catalogSearchTarget } from "../src/catalogSearchTarget.ts";

test("global search navigates to catalog and encodes Polish text", () => {
  assert.equal(
    catalogSearchTarget("/loans?page=2", "  Leśna wyprawa  "),
    "/games?q=Le%C5%9Bna+wyprawa",
  );
});

test("catalog search keeps category and selected size but resets pagination", () => {
  const params = new URLSearchParams(
    catalogSearchTarget(
      "/games?categoryId=family&limit=24&page=3&q=old",
      "new",
    ).split("?")[1],
  );
  assert.equal(params.get("categoryId"), "family");
  assert.equal(params.get("limit"), "24");
  assert.equal(params.get("q"), "new");
  assert.equal(params.has("page"), false);
});

test("empty search clears the query and leaves the category selected", () => {
  assert.equal(
    catalogSearchTarget("/games?categoryId=family&q=old", " "),
    "/games?categoryId=family",
  );
});

test("search does not copy admin or authentication parameters into catalog", () => {
  assert.equal(
    catalogSearchTarget(
      "/admin?categoryId=private&limit=24&tab=loans",
      "Chess",
    ),
    "/games?q=Chess",
  );
});
