import { PERMISSIONS, ROLE_PERMISSIONS, ROLES, getUserRole } from "./auth/permissions";

test("operators can use AI analysis and keep their default role mapping", () => {
  expect(getUserRole()).toBe(ROLES.OPERATOR);
  expect(ROLE_PERMISSIONS[ROLES.OPERATOR]).toContain(PERMISSIONS.USE_AI_ANALYSIS);
});
