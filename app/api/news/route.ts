import { NextResponse } from "next/server";
import type { NewsData, NewsItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const idsRes = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json", {
      cache: "no-store",
    });
    if (!idsRes.ok) throw new Error("failed to list stories");
    const ids: number[] = await idsRes.json();
    const topIds = ids.slice(0, 8);

    const items = await Promise.all(
      topIds.map(async (id): Promise<NewsItem | null> => {
        try {
          const res = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, {
            cache: "no-store",
          });
          if (!res.ok) return null;
          const item = await res.json();
          return {
            id,
            title: item.title ?? "Untitled",
            url: item.url ?? `https://news.ycombinator.com/item?id=${id}`,
            score: item.score ?? 0,
            time: item.time ?? 0,
          };
        } catch {
          return null;
        }
      })
    );

    const data: NewsData = { available: true, items: items.filter((i): i is NewsItem => i !== null) };
    return NextResponse.json(data);
  } catch {
    const data: NewsData = {
      available: false,
      items: [],
      note: "Couldn't reach Hacker News. Showing no headlines.",
    };
    return NextResponse.json(data);
  }
}
