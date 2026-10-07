export type GithubEvidence = { repository: string; url: string; description: string; languages: string[]; readme: string };

export function publicGithubRepo(input: string): string | null {
  try {
    const url = new URL(input);
    if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== 'github.com' || url.username || url.password || url.port) return null;
    const parts = url.pathname.replace(/\/$/, '').split('/').filter(Boolean);
    if (parts.length !== 2 || !parts.every(part => /^[a-z\d_.-]{1,100}$/i.test(part))) return null;
    return `${parts[0]}/${parts[1].replace(/\.git$/i, '')}`;
  } catch { return null; }
}

export function githubRepos(profile: string): string[] {
  const urls = profile.match(/https:\/\/github\.com\/[\w.-]+\/[\w.-]+/gi) ?? [];
  return [...new Set(urls.map(publicGithubRepo).filter((repo): repo is string => !!repo))].slice(0, 2);
}

export async function readPublicGithub(repo: string, signal?: AbortSignal): Promise<GithubEvidence> {
  if (!/^[a-z\d_.-]{1,100}\/[a-z\d_.-]{1,100}$/i.test(repo)) throw new Error('无效的公开仓库路径');
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'JobHunter-Agent' };
  const base = `https://api.github.com/repos/${repo}`;
  const metadata = await fetch(base, { headers, signal });
  if (!metadata.ok) throw new Error(`GitHub 返回 ${metadata.status}`);
  const info = await metadata.json() as { private?: boolean; description?: string; html_url?: string; language?: string };
  if (info.private) throw new Error('仅支持公开仓库');
  const readme = await fetch(`${base}/readme`, { headers: { ...headers, Accept: 'application/vnd.github.raw+json' }, signal });
  const text = readme.ok ? (await readme.text()).slice(0, 15000) : '';
  return { repository: repo, url: `https://github.com/${repo}`, description: (info.description ?? '').slice(0, 300), languages: info.language ? [info.language] : [], readme: text };
}

