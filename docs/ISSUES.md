# #2


# #1 CodeGen doesn't do discriminatedUnion properly

**Update**: Turns out it does just fine. The issue was with how I defined my
discriminated unions.

You _MUST_ have specific properties such as openapi "ref" on each schema (or
branded types, etc), or it will not discriminate the union.

fastify-zod-api --> zod-openapi (zero dependencies)

Check out `src/create/schema/parsers/discriminatedUnion.test.ts` in
`zod-openapi` for the expected behavior, e.g.
[here](https://github.com/samchungy/zod-openapi/blob/480dd3f5b16b4bcb430bfa484fa9a519f88583c4/src/create/schema/parsers/discriminatedUnion.test.ts#L54).

---

Original issue:

Examining support for each part of the tree:

- ✅ zod https://zod.dev/?id=discriminated-unions
- ✅ fastify-zod-openapi (I think) https://github.com/samchungy/fastify-zod-openapi/blob/32e9336b823ad70fc1c99cf6993664a4b4931f96/src/serializerCompiler.test.ts#L272
-❔ @fastify/swagger
- ✅ kubb

Current theory: @fastify/swagger does not properly support it.

Potentially related:

Openapi-codegen doesn’t handle discriminated union properly
https://github.com/reduxjs/redux-toolkit/issues/3369
