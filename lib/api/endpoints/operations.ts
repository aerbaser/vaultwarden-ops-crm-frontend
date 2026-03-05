import { apiRequest } from "@/lib/api/client";
import { OperationItem } from "@/lib/api/types";

export type OperationsResponse = {
  items: OperationItem[];
};

export const fetchOperations = () =>
  apiRequest<OperationsResponse>("/api/operations", {
    method: "GET"
  });
