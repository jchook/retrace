import { reset, seed } from "drizzle-seed";
import { db } from ".";
import * as schema from "./schema";

async function seedDb() {
  const s = { ...schema };
  await reset(db, s);
  await seed(db, s).refine((f) => ({
    items: {
      columns: {
        title: f.valuesFromArray({
          values: [
            "First Item",
            "Second Item",
            "Third Item",
            "Fourth Item",
            "Fifth Item",
          ],
        }),
        description: f.loremIpsum({ sentencesCount: 1 }),
      },
    },
    documents: { count: 0 },
  }));
}

await seedDb();
