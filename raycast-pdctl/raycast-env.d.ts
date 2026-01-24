/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** PagerDuty API Token - Your PagerDuty API token (get it from https://support.pagerduty.com/docs/api-access-keys) */
  "apiToken": string,
  /** PagerDuty Subdomain - Your PagerDuty subdomain (e.g., 'mycompany' for mycompany.pagerduty.com) */
  "subdomain": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `list-incidents` command */
  export type ListIncidents = ExtensionPreferences & {}
  /** Preferences accessible in the `oncall-status` command */
  export type OncallStatus = ExtensionPreferences & {}
  /** Preferences accessible in the `menu-bar` command */
  export type MenuBar = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `list-incidents` command */
  export type ListIncidents = {}
  /** Arguments passed to the `oncall-status` command */
  export type OncallStatus = {}
  /** Arguments passed to the `menu-bar` command */
  export type MenuBar = {}
}

