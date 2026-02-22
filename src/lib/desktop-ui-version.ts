export const DESKTOP_UI_VERSION_COOKIE = "kk_desktop_ui_version"
export const DESKTOP_UI_VERSION_QUERY_PARAM = "ui"

export type DesktopUiVersion = "v1" | "v2"

const ALLOWED_VERSIONS: DesktopUiVersion[] = ["v1", "v2"]

export function parseDesktopUiVersion(value: string | null | undefined): DesktopUiVersion | null {
  if (!value) return null
  const normalized = value.trim().toLowerCase()
  return ALLOWED_VERSIONS.includes(normalized as DesktopUiVersion)
    ? (normalized as DesktopUiVersion)
    : null
}

export function getDefaultDesktopUiVersion(): DesktopUiVersion {
  const configured = parseDesktopUiVersion(process.env.NEXT_PUBLIC_DESKTOP_UI_VERSION_DEFAULT)
  return configured ?? "v1"
}

export function isDesktopUiOverrideEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_UI_VERSION_OVERRIDE !== "false"
}
