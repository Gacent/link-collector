interface SenseNovaResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export async function callSenseNova(
  apiKey: string,
  systemPrompt: string,
  userContent: string
): Promise<string> {
  const response = await fetch("https://token.sensenova.cn/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "sensenova-6.7-flash-lite",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      temperature: 0.3,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SenseNova API error: ${response.status} ${error}`);
  }

  const data = (await response.json()) as SenseNovaResponse;
  return data.choices[0].message.content;
}

export const LINK_EXTRACT_PROMPT = `你是一个信息整理助手。根据提供的网页内容，提取：
1. 一段简洁的中文摘要（50字以内）
2. 3-5个中文标签（从以下类别中匹配：技术、AI、商业、产品、设计、生活、开源、教程、新闻、观点、工具、资源、阅读、其它）

只返回 JSON 格式，不要包含任何其他内容：
{"summary": "...", "tags": ["...", "..."]}`;

export const NOTE_EXTRACT_PROMPT = `根据提供的文字内容，生成：
1. 一个简洁的标题（15字以内）
2. 3-5个中文分类标签（从以下类别中匹配：技术、AI、商业、产品、设计、生活、开源、教程、新闻、观点、工具、资源、阅读、其它）

只返回 JSON 格式，不要包含任何其他内容：
{"title": "...", "tags": ["...", "..."]}`;