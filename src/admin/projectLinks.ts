export function projectLinkForCurrentApp(
  projectUrl: string | null,
  currentOrigin: string,
  useLocalApp: boolean,
): string | null {
  if (!projectUrl || !useLocalApp) return projectUrl;
  const url = new URL(projectUrl);
  return `${currentOrigin}${url.pathname}${url.search}${url.hash}`;
}
