import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

export default defineConfig([
    globalIgnores([".next", "out", "src/components/ui"]),
    ...nextVitals,
    ...nextTs,
    prettier,
    {
        rules: {
            "sort-imports": [
                "warn",
                {
                    ignoreCase: true,
                    ignoreDeclarationSort: true,
                },
            ],
            "react-hooks/incompatible-library": "off",
        },
    },
]);