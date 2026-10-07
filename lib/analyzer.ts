export type Requirement = { text: string; kind: 'must' | 'bonus' | 'stack' | 'risk'; matched: boolean; evidence: string };
export type Analysis = { title: string; score: number; verdict: string; requirements: Requirement[]; strengths: string[]; gaps: string[]; opener: string; questions: { question: string; answer: string }[]; method: string };

const STOP = /^(岗位职责|任职要求|职位要求|岗位要求|我们希望|工作内容|加分项|福利待遇|岗位介绍|职位描述|要求|职责|福利|薪资待遇|关于我们|你将负责|我们提供)[:：]?$/;
const MUST = /必须|必备|要求|熟悉|掌握|需要|能够|具备|至少|学历|经验|must|required|proficient/i;
const BONUS = /加分|优先|更佳|bonus|plus|preferred/i;
const RISK = /本科|大专|硕士|博士|[1-9一二三四五]年.{0,5}经验|经验.{0,4}[1-9一二三四五]年|全日制|统招|付费|押金|培训费|押证|身份证原件|担保|先交/i;
const TECH = /Python|JavaScript|TypeScript|React|Vue|Next\.js|Node(?:\.js)?|GitHub|Git|SQL|PostgreSQL|SQLite|Excel|API|Agent|RAG|AI|大模型|自动化|爬虫|远程连接|Docker|Linux|部署|Vercel|数据分析/i;
const TERMS = ['Python','JavaScript','TypeScript','React','Vue','Next.js','Node.js','GitHub','Git','SQL','PostgreSQL','SQLite','Excel','API','Agent','RAG','AI','大模型','自动化','爬虫','远程连接','Docker','Linux','部署','Vercel','数据分析','客服','销售','运营','沟通','文档','测试','英语','项目'];

function pieces(text: string) {
  return text.replace(/\r/g,'\n').split(/\n|[。；;]/).map(s => s.trim().replace(/^[•·\-*\d.、）)\s]+/, '').replace(/[，,\s]+$/, '')).filter(s => s.length >= 5 && s.length <= 280 && !STOP.test(s));
}
function evidenceFor(line: string, profile: string) {
  const hits = TERMS.filter(t => new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i').test(line) && new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i').test(profile));
  if (hits.length) return `资料中提及：${hits.slice(0,3).join('、')}`;
  const words = line.match(/[\u4e00-\u9fa5]{2,6}/g) || [];
  const overlap = words.find(w => !/负责|相关|工作|能力|经验|熟悉|优先|岗位|要求|具有|能够|使用|参与/.test(w) && profile.includes(w));
  return overlap ? `资料中提及：${overlap}` : '';
}
export function analyze(jd: string, profile: string): Analysis {
  const lines = pieces(jd).slice(0,50);
  const title = (jd.match(/(?:招聘|岗位|职位)[：:\s]*([^\n，,。]{2,30})/)?.[1] || lines[0] || '目标岗位').slice(0,32);
  const reqs = lines.filter(s => MUST.test(s) || BONUS.test(s) || RISK.test(s) || TECH.test(s)).slice(0,18);
  const selected = reqs.length ? reqs : lines.slice(0,8);
  const requirements = selected.map(text => {
    const kind: Requirement['kind'] = RISK.test(text) ? 'risk' : BONUS.test(text) ? 'bonus' : TECH.test(text) ? 'stack' : 'must';
    const evidence = evidenceFor(text, profile);
    return { text, kind, matched: !!evidence && kind !== 'risk', evidence };
  });
  const evaluated = requirements.filter(r => r.kind !== 'risk');
  const score = evaluated.length ? Math.round(100 * evaluated.reduce((a,r) => a + (r.matched ? (r.kind === 'bonus' ? .5 : 1) : 0),0) / evaluated.reduce((a,r) => a + (r.kind === 'bonus' ? .5 : 1),0)) : 0;
  const strengths = requirements.filter(r => r.matched).map(r => r.evidence).filter((x,i,a) => a.indexOf(x) === i).slice(0,4);
  const gaps = requirements.filter(r => !r.matched && r.kind !== 'risk').map(r => r.text).slice(0,5);
  const risks = requirements.filter(r => r.kind === 'risk').map(r => r.text);
  const verdict = risks.length ? '请先核实硬性门槛，再决定是否投递' : score >= 65 ? '值得优先了解与投递' : score >= 30 ? '可以投递，重点解释能力缺口' : '资料不足或匹配较弱，先补充证据';
  const first = strengths[0] ? `我有与岗位相关的实践，${strengths[0]}。` : '我对这个岗位很感兴趣，正在结合要求准备相关作品。';
  const opener = `您好，我看到了贵公司的${title}岗位。${first}${profile.includes('github.com') || profile.includes('GitHub') ? '我可以提供项目代码供您查看。' : ''}如果方便，想进一步了解这个岗位的实际工作内容，也愿意根据要求展示一项具体成果。`;
  const questions = [
    { question: '请介绍一个与你申请岗位最相关的项目。', answer: '按“目标—你做了什么—结果—你如何验证”四步回答。只说自己真实完成的部分，并现场打开作品演示。' },
    { question: gaps[0] ? `你如何补足「${gaps[0].slice(0,50)}」这项要求？` : '你为什么想申请这个岗位？', answer: gaps[0] ? '先承认目前掌握程度，再说明已做过的相近任务、学习步骤和能交付的小样；不要声称自己已熟练。' : '结合岗位职责讲具体兴趣和可展示的证据，避免泛泛谈“学习能力强”。' },
    { question: '如果需要你独立完成一项不熟悉的任务，你会怎么做？', answer: '说明如何澄清验收标准、拆分最小可运行版本、验证结果并及时反馈阻碍。' },
  ];
  return { title, score, verdict, requirements, strengths, gaps, opener, questions, method: '从 JD 中按句提取要求，标识学历与经验风险；用你提供的文字作关键词交叉匹配。分数仅代表文本覆盖度，不代表录用概率，也不推断未写出的经验。' };
}
