import { test } from "node:test";
import assert from "node:assert/strict";
import { gameCopyStatus } from "../src/gameCopyStatus.ts";

for (const [status, isBorrowed, label] of [
  ["AVAILABLE", false, "Dostępny"],
  ["AVAILABLE", true, "Wypożyczony"],
  ["MAINTENANCE", false, "W naprawie"],
  ["RETIRED", false, "Wycofany"],
  ["MAINTENANCE", true, "Wypożyczony — wymaga naprawy"],
  ["RETIRED", true, "Wypożyczony — wycofany"],
]) {
  test(`${status}, borrowed=${isBorrowed}: ${label}`, () => {
    assert.equal(gameCopyStatus({ status, isBorrowed }), label);
  });
}
