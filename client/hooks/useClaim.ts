import { useQuery } from "@tanstack/react-query";
import { fetchClaim } from "@/api/claims";

export const useClaim = (id: string | undefined) => {
  return useQuery({
    queryKey: ["claim", id],
    queryFn: () => {
      if (!id) throw new Error("Claim ID is required");
      return fetchClaim(id);
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};
