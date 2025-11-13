import { App } from "../app";
import { v1Meta } from "./v1Meta";
import { v1Auth } from "./v1Auth";
import { v1App } from "./v1App";
import { v1Items } from "./v1Items";

export async function v1(app: App) {
  await app.register(v1Auth);
  await app.register(v1Meta);
  await app.register(v1App);
  await app.register(v1Items);
}
