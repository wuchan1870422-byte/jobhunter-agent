import { env } from 'cloudflare:workers';
import { analyzeWithAgent } from '@/lib/agent';

function owner(request: Request) { return request.headers.get('oai-authenticated-user-id'); }
function fail(message: string, status: number) { return Response.json({error:message},{status}); }

export async function GET(request: Request) {
  const user = owner(request);
  if (!user) return Response.json({items: [],saved:false});
  if (!env.DB) return fail('历史记录暂时不可用。',503);
  try {
    const rows = await env.DB.prepare('SELECT id, created_at, result FROM analyses WHERE owner_id = ? ORDER BY created_at DESC LIMIT 30').bind(user).all();
    return Response.json({items: rows.results.map((entry) => { const row = entry as {id:string;created_at:number;result:string}; return {id:row.id, createdAt:row.created_at, result:JSON.parse(row.result)}; }),saved:true});
  } catch { return fail('历史记录暂时不可用，请稍后重试。',503); }
}

export async function POST(request: Request) {
  const user = owner(request);
  let body: {jd?:unknown;profile?:unknown};
  try { const input: unknown = await request.json(); if (!input || typeof input !== 'object') return fail('请求格式不正确。',400); body = input as {jd?:unknown;profile?:unknown}; } catch { return fail('请求格式不正确。',400); }
  const jd = typeof body.jd === 'string' ? body.jd.trim() : '';
  const profile = typeof body.profile === 'string' ? body.profile.trim() : '';
  if (jd.length < 20 || profile.length < 15 || jd.length > 15000 || profile.length > 10000) return fail('JD 至少 20 字、个人资料至少 15 字，且请勿超过输入上限。',400);
  const result = await analyzeWithAgent(jd,profile,env.OPENAI_API_KEY,env.OPENAI_MODEL);
  const id = crypto.randomUUID();
  const createdAt = Date.now();
  if (!user) return Response.json({item:{id,createdAt,result},saved:false});
  if (!env.DB) return fail('分析服务暂时不可用。',503);
  try {
    await env.DB.prepare('INSERT INTO analyses (id, owner_id, created_at, jd, profile, result) VALUES (?, ?, ?, ?, ?, ?)').bind(id,user,createdAt,jd,profile,JSON.stringify(result)).run();
    return Response.json({item:{id,createdAt,result},saved:true});
  } catch { return fail('分析未能保存，请稍后重试；输入内容还留在页面上。',503); }
}

export async function DELETE(request: Request) {
  const user = owner(request);
  if (!user) return fail('请登录后删除记录。',401);
  if (!env.DB) return fail('删除服务暂时不可用。',503);
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return fail('缺少记录 ID。',400);
  try { await env.DB.prepare('DELETE FROM analyses WHERE id = ? AND owner_id = ?').bind(id,user).run(); return Response.json({ok:true}); }
  catch { return fail('删除失败，请稍后重试。',503); }
}

