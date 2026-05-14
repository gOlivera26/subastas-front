export interface OperationResponse<T> {
  success: boolean;
  message: string;
  data: T;
  code: number;
  totalRows?: number;
  exception?: string | null;
  exceptionDetails?: any | null;
}