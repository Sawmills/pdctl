import {
  MenuBarExtra,
  open,
  showToast,
  Toast,
  Icon,
  Color,
  launchCommand,
  LaunchType,
  getPreferenceValues,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { getPagerDutyClient } from "./api/pagerduty";
import { Incident } from "./api/types";

interface Preferences {
  subdomain: string;
}

export default function MenuBar() {
  const { subdomain } = getPreferenceValues<Preferences>();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadIncidents();
  }, []);

  async function loadIncidents() {
    setIsLoading(true);
    setError(null);
    try {
      const client = getPagerDutyClient();
      const response = await client.listIncidents(["triggered", "acknowledged"], undefined, undefined, 20);
      setIncidents(response.incidents);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  async function acknowledgeIncident(incident: Incident) {
    try {
      showToast({ style: Toast.Style.Animated, title: "Acknowledging..." });
      const client = getPagerDutyClient();
      await client.acknowledgeIncident(incident.id);
      showToast({ style: Toast.Style.Success, title: "Acknowledged" });
      loadIncidents();
    } catch (err) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  async function resolveIncident(incident: Incident) {
    try {
      showToast({ style: Toast.Style.Animated, title: "Resolving..." });
      const client = getPagerDutyClient();
      await client.resolveIncident(incident.id);
      showToast({ style: Toast.Style.Success, title: "Resolved" });
      loadIncidents();
    } catch (err) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  const triggeredCount = incidents.filter((i) => i.status === "triggered").length;
  const acknowledgedCount = incidents.filter((i) => i.status === "acknowledged").length;
  const totalActive = triggeredCount + acknowledgedCount;

  let iconColor: Color;
  let iconSource: Icon;

  if (error) {
    iconColor = Color.SecondaryText;
    iconSource = Icon.ExclamationMark;
  } else if (triggeredCount > 0) {
    iconColor = Color.Red;
    iconSource = Icon.Bell;
  } else if (acknowledgedCount > 0) {
    iconColor = Color.Orange;
    iconSource = Icon.Bell;
  } else {
    iconColor = Color.Green;
    iconSource = Icon.CheckCircle;
  }

  const title = totalActive > 0 ? `${totalActive}` : undefined;

  const triggeredIncidents = incidents.filter((i) => i.status === "triggered");
  const acknowledgedIncidents = incidents.filter((i) => i.status === "acknowledged");

  return (
    <MenuBarExtra
      icon={{ source: iconSource, tintColor: iconColor }}
      title={title}
      isLoading={isLoading}
      tooltip={error ? `Error: ${error}` : `${totalActive} active incidents`}
    >
      {error ? (
        <MenuBarExtra.Item title={`Error: ${error}`} icon={Icon.ExclamationMark} />
      ) : (
        <>
          <MenuBarExtra.Item
            title="Open Incidents List"
            icon={Icon.List}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
            onAction={() => launchCommand({ name: "list-incidents", type: LaunchType.UserInitiated })}
          />
          <MenuBarExtra.Item
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={loadIncidents}
          />
          <MenuBarExtra.Separator />

          {totalActive === 0 && <MenuBarExtra.Item title="All clear! No active incidents" icon={Icon.CheckCircle} />}

          {triggeredIncidents.length > 0 && (
            <MenuBarExtra.Section title={`🔴 Triggered (${triggeredIncidents.length})`}>
              {triggeredIncidents.slice(0, 5).map((incident) => (
                <MenuBarExtra.Submenu
                  key={incident.id}
                  title={truncate(incident.title, 40)}
                  icon={{ source: Icon.Circle, tintColor: Color.Red }}
                >
                  <MenuBarExtra.Item
                    title="Acknowledge"
                    icon={Icon.CheckCircle}
                    onAction={() => acknowledgeIncident(incident)}
                  />
                  <MenuBarExtra.Item title="Resolve" icon={Icon.Checkmark} onAction={() => resolveIncident(incident)} />
                  <MenuBarExtra.Separator />
                  <MenuBarExtra.Item
                    title="Open in PagerDuty"
                    icon={Icon.Globe}
                    onAction={() => open(`https://${subdomain}.pagerduty.com/incidents/${incident.id}`)}
                  />
                  <MenuBarExtra.Item
                    title={`Service: ${incident.service.summary || incident.service.id}`}
                    icon={Icon.Gear}
                  />
                </MenuBarExtra.Submenu>
              ))}
              {triggeredIncidents.length > 5 && (
                <MenuBarExtra.Item title={`+${triggeredIncidents.length - 5} more...`} />
              )}
            </MenuBarExtra.Section>
          )}

          {acknowledgedIncidents.length > 0 && (
            <MenuBarExtra.Section title={`🟠 Acknowledged (${acknowledgedIncidents.length})`}>
              {acknowledgedIncidents.slice(0, 5).map((incident) => (
                <MenuBarExtra.Submenu
                  key={incident.id}
                  title={truncate(incident.title, 40)}
                  icon={{ source: Icon.Circle, tintColor: Color.Orange }}
                >
                  <MenuBarExtra.Item title="Resolve" icon={Icon.Checkmark} onAction={() => resolveIncident(incident)} />
                  <MenuBarExtra.Separator />
                  <MenuBarExtra.Item
                    title="Open in PagerDuty"
                    icon={Icon.Globe}
                    onAction={() => open(`https://${subdomain}.pagerduty.com/incidents/${incident.id}`)}
                  />
                  <MenuBarExtra.Item
                    title={`Service: ${incident.service.summary || incident.service.id}`}
                    icon={Icon.Gear}
                  />
                </MenuBarExtra.Submenu>
              ))}
              {acknowledgedIncidents.length > 5 && (
                <MenuBarExtra.Item title={`+${acknowledgedIncidents.length - 5} more...`} />
              )}
            </MenuBarExtra.Section>
          )}
        </>
      )}
    </MenuBarExtra>
  );
}

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + "...";
}
