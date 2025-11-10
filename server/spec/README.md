App Spec
========

OpenAPI Integration
-------------------

The goal is to integrate with OpenAPI 3.1 with a TypeScript backend.

The reason this is so desireable is that you get a lot "for free" with this approach:

- User friendly API documentation, generated automatically
- Extremely accessible, popular, widely-supported, statically-typed language on both server and client sides
- Generated type-safe client SDKs in any popular programming language
- No need for server-client code sharing, so SDKs are self-contained yet align tightly with the OpenAPI contract
- Automatic server-side validation/coercion of inputs and outputs
- Statically typed controller input and output in the server software, speeding up development
- Documentation at your fingertips-- as you code, you see menus of valid completions and the docs related to it.
- Elimination of enormous categories of bugs and difficulties when developing.
- Single source of truth. You edit the schemas in **one place** and they propagate to the server validation, client code generation, etc.

There are two basic approaches to this:

1. Write OpenAPI spec and generate server code
2. Write server code and generate OpenAPI spec

Unfortunately there exists no good/clean solution to #1. Believe me, I have tried recently and succeeded but never in a type-safe way (specifically referring to controller inputs and outputs being automatically statically typed by the generated code).

With option #2, we can have clean and type-safe code, including request body, query params, response bodies, etc. using fastify + zod. That is the money. From there, we can generate OpenAPI specification and user-friendly API docs. This would be particularly revolutionary for eventual B2B sales of the end product.

Another good side-effect from using fastify is that it can serve ~70k requests per second from a single instance, so it's about 2x as vertically scalable as the typical express server. I like the schema-oriented approach of fastify and it's a good middle-ground.

One potential alternative sticks out, called [Elysia](https://elysiajs.com/), which achieves even better performance and cleanliness than Fastify + Zod, but the technology is new and not yet widely adopted, so it lacks the community support and tooling that Fastify + Zod provide. Also, it does not currently seem to enable a db-first approach to types, as Drizzle + Fastify + Zod do very well.


Evaluator Design
----------------

The `src/eval` contains core functionality of the app -- the heavy lifting via AI.

These functions produce their final artifact, which could be a zip file, json file, or pdf.

The reason we have them do this rather than some intermediate structured format? Because it's very common for AI to fudge any structured output schema. Validating structured output like JSON output from an AI could increase the error rate and decrease the usefulness of the product. For example, if the output is still helpful, but structured slightly incorrectly, that's still potentially very helpful in a human-readable context. Correct output schema takes a back seat for now compared to useful output, until these problems are solved in the core AI models.

Also, tests were preformed to use the `outputSchema` option, and it greatly degraded the output on Gemini Flash 2.0. Maybe Google has big plans for this in 2.5. There is no point to enforce a rigorous output structure to AI at this time, and instead these workers should be responsible for the final human-readable output of their ultimate function.

Individually, evaluators may still validate their AI output and provide retry logic, etc, but each one has total autonomy for now until some meaningful structure can emerge. For now, helpers can be used to streamline common tasks such as retries, batching, region selection, context caching, etc.


See Also
========

OpenAPI
-------

- https://spec.openapis.org/oas/v3.1.0.html
- https://openapi.tools/


OpenAPI Backend
---------------

- https://github.com/openapistack/openapi-backend
- https://github.com/openapistack/openapi-backend/issues/157#issuecomment-923100581


Fastify
-------

- https://github.com/fastify/fastify-swagger
- https://github.com/seriousme/fastify-openapi-glue
- https://github.com/fastify/fastify-multipart
- https://github.com/turkerdev/fastify-type-provider-zod

