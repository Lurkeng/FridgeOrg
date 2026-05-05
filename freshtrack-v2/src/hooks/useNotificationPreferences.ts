import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getExpiryReminderPreview,
  getNotificationPreferences,
  saveNotificationPreferences,
} from "@/server/notifications";

export type NotificationPreferencesInput = {
  enabled: boolean;
  daysBefore: number;
  channel: "in_app" | "email_ready";
  digestCadence: "daily" | "weekly";
  quietHoursStart: string;
  quietHoursEnd: string;
};

export function useNotificationPreferences() {
  const queryClient = useQueryClient();

  const preferencesQuery = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: () => getNotificationPreferences(),
  });

  const previewQuery = useQuery({
    queryKey: ["expiry-reminder-preview"],
    queryFn: () => getExpiryReminderPreview(),
  });

  const saveMutation = useMutation({
    mutationFn: (data: NotificationPreferencesInput) => saveNotificationPreferences({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
      queryClient.invalidateQueries({ queryKey: ["expiry-reminder-preview"] });
    },
  });

  return {
    preferences: preferencesQuery.data,
    preview: previewQuery.data,
    isLoading: preferencesQuery.isLoading,
    isPreviewLoading: previewQuery.isLoading,
    savePreferences: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
  };
}
