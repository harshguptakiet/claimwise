import { useQuery } from "@tanstack/react-query";
import { fetchClaims } from "@/api/claims";

export const useClaims = () => {
  return useQuery({
    queryKey: ["claims"],
    queryFn: () => fetchClaims(),
    staleTime: 5 * 60 * 1000,
  });
};
