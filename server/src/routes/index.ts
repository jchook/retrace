import { App } from "../app";
import { withAuth } from "./withAuth";
import { withDemo } from "./withDemo";

export { withAuth } from "./withAuth";
export { withDemo } from "./withDemo";

export function withV1(app: App) {
  withAuth(app);
  withDemo(app);
}
