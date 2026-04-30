import { randomUUID } from "node:crypto";
import type { IdGenerator } from "../application/listWriteUseCases";

export class NodeIdGenerator implements IdGenerator {
  randomId(): string {
    return randomUUID();
  }
}
