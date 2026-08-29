export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    requestId?: string;
    details?: Record<string, unknown>;
  };
}

export interface ApiSuccessMeta {
  requestId?: string;
}

export type ApiResponse<T> =
  | { data: T; meta?: ApiSuccessMeta }
  | ApiErrorBody;

export function isApiError(response: unknown): response is ApiErrorBody {
  return (
    typeof response === "object" &&
    response !== null &&
    "error" in response &&
    typeof (response as ApiErrorBody).error?.code === "string"
  );
}
