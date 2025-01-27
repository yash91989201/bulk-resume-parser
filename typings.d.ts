type ProcedureStatusType<T> =
  | { status: "SUCCESS"; message: string; data: T }
  | { status: "FAILED"; message: string };
