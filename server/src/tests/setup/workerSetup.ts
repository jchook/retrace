import { beforeAll, beforeEach } from "vitest";
import { app } from "../../app";
import { resetDatabase } from "../utils/database";
import { initTestContext } from "../utils/testContext";
import { clearCapturedOtps, createTestMailer } from "../utils/mailer";
import { resetQueues } from "../utils/queues";

beforeAll(async () => {
  const context = await initTestContext();
  app.mailer = createTestMailer(context);
  await app.ready();
});

beforeEach(async () => {
  await resetQueues();
  await resetDatabase();
  clearCapturedOtps();
});
