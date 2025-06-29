// Custom error class for parsing tasks
export class ParsingTaskError extends Error {
  abort: boolean;
  taskId?: string;

  constructor(message: string, abort = false, taskId?: string) {
    super(message);
    this.name = "ParsingTaskError";
    this.abort = abort;
    this.taskId = taskId;

    Object.setPrototypeOf(this, ParsingTaskError.prototype);
  }
}
