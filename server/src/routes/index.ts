import { App } from "../app";
import { withAuth } from "./withAuth";
import { withV1 as withV1Handlers } from "./withV1";

export function withV1Auth(app: App) {
  withAuth(app);
}

export function withV1Routes(app: App) {
  withV1Auth(app);
  withV1Handlers(app);
}
