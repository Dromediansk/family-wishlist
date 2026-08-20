import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  /*
   * The read side of tenant isolation has no database backstop: service_role
   * bypasses RLS, and the privacy rule forbids policies. The whole guarantee is
   * that every query goes through src/lib/data/, where it is handed a Viewer or
   * a GroupContext. These two rules are what keeps that true.
   * docs/content/privacy-rule.md#where-the-rule-is-enforced
   *
   * src/app/actions/** is exempt for writes only: Server Actions are the
   * sanctioned write surface and already carry ownership/group scope in their
   * WHERE clause under the five-step rule. A read added inline in an action is
   * not covered by that exemption's intent and is not caught by these rules —
   * reads belong in src/lib/data/, which is exactly why they were moved there.
   */
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: [
      "src/lib/data/**",
      "src/lib/supabase.ts",
      "src/lib/photos.ts",
      "src/lib/realtime.ts",
      "src/app/actions/**",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/supabase",
              importNames: ["getSupabase"],
              message:
                "Table access belongs in src/lib/data/, where a Viewer or GroupContext scopes it.",
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.property.name='from']:not([callee.object.name='Array'])",
          message:
            "Query only from src/lib/data/ — see the tenant isolation note in eslint.config.mjs.",
        },
      ],
    },
  },
]);

export default eslintConfig;
