import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMyHousehold,
  createHousehold,
  joinHousehold,
  getHouseholdMembers,
  regenerateInviteCode,
} from "@/server/households";

const HOUSEHOLD_KEY = ["household"] as const;
const MEMBERS_KEY   = ["householdMembers"] as const;

export function useHousehold() {
  return useQuery({
    queryKey: HOUSEHOLD_KEY,
    queryFn:  () => getMyHousehold(),
    staleTime: 5 * 60_000,
  });
}

export function useHouseholdMembers() {
  return useQuery({
    queryKey: MEMBERS_KEY,
    queryFn:  () => getHouseholdMembers(),
    staleTime: 60_000,
  });
}

export function useCreateHousehold() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string }) => createHousehold({ data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: HOUSEHOLD_KEY }),
  });
}

export function useJoinHousehold() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { inviteCode: string }) => joinHousehold({ data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: HOUSEHOLD_KEY }),
  });
}

export function useRegenerateInviteCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => regenerateInviteCode(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: HOUSEHOLD_KEY }),
  });
}
