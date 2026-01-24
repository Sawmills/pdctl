import { List, ActionPanel, Action, showToast, Toast, Icon, Color } from "@raycast/api";
import { useState, useEffect } from "react";
import { getPagerDutyClient, formatRelativeTime } from "./api/pagerduty";
import { OnCall } from "./api/types";

export default function OncallStatus() {
  const [oncalls, setOncalls] = useState<OnCall[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    loadOncalls();
  }, []);

  async function loadOncalls() {
    setIsLoading(true);
    try {
      const client = getPagerDutyClient();
      const response = await client.listOncalls(undefined, 100);
      setOncalls(response.oncalls);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load on-call status",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const filteredOncalls = oncalls.filter((oc) => {
    if (!searchText) return true;
    const query = searchText.toLowerCase();
    return (
      oc.user.summary?.toLowerCase().includes(query) ||
      oc.schedule?.summary?.toLowerCase().includes(query) ||
      oc.escalation_policy?.summary?.toLowerCase().includes(query)
    );
  });

  const groupedBySchedule = filteredOncalls.reduce(
    (acc, oc) => {
      const key = oc.schedule?.summary || oc.escalation_policy?.summary || "Other";
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(oc);
      return acc;
    },
    {} as Record<string, OnCall[]>,
  );

  const scheduleNames = Object.keys(groupedBySchedule).sort();

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search on-call users..."
    >
      {filteredOncalls.length === 0 && !isLoading && (
        <List.EmptyView
          title="No on-call users found"
          description={searchText ? "Try a different search" : "No one is currently on-call"}
          icon={Icon.Person}
        />
      )}

      {scheduleNames.map((scheduleName) => {
        const scheduleOncalls = groupedBySchedule[scheduleName];
        const sortedOncalls = [...scheduleOncalls].sort((a, b) => a.escalation_level - b.escalation_level);

        return (
          <List.Section key={scheduleName} title={scheduleName} subtitle={`${sortedOncalls.length} on-call`}>
            {sortedOncalls.map((oc, index) => (
              <OncallListItem key={`${oc.user.id}-${oc.schedule?.id || index}`} oncall={oc} />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}

function OncallListItem({ oncall }: { oncall: OnCall }) {
  const userName = oncall.user.summary || oncall.user.id;
  const policyName = oncall.escalation_policy?.summary;

  const accessories: List.Item.Accessory[] = [];

  accessories.push({
    tag: {
      value: `Level ${oncall.escalation_level}`,
      color: oncall.escalation_level === 1 ? Color.Red : Color.Orange,
    },
  });

  if (oncall.start && oncall.end) {
    const endTime = formatRelativeTime(oncall.end);
    accessories.push({ text: `Until ${endTime}` });
  }

  if (policyName && !oncall.schedule) {
    accessories.push({ text: policyName });
  }

  return (
    <List.Item
      title={userName}
      subtitle={oncall.schedule?.summary || policyName}
      icon={{ source: Icon.Person, tintColor: oncall.escalation_level === 1 ? Color.Green : Color.SecondaryText }}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy User Id" content={oncall.user.id} />
          {oncall.schedule && <Action.CopyToClipboard title="Copy Schedule Id" content={oncall.schedule.id} />}
        </ActionPanel>
      }
    />
  );
}
