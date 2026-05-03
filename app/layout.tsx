import type { Metadata } from "next";
import "./globals.css";

const SITE_URL =
  "http://next-redis-cache-staging-alb-1315597713.ap-southeast-2.elb.amazonaws.com";

const TITLE =
  "Next.js 16 + Redis 렌더링 전략 실측 대시보드 — Eddy Lee";
const DESCRIPTION =
  "멀티 인스턴스 캐시 불일치를 Redis 공유 캐시로 해결한 실험 기록. CSR · SSR · ISR · Cache Components · Hybrid · BFF를 같은 AWS ECS 인프라에서 비교한 실측 수치(LCP +83%, origin 호출 1.0회, revalidateTag 6.4ms)와 운영 사고 2건을 한 화면에.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s — Next.js 16 + Redis Lab",
  },
  description: DESCRIPTION,
  keywords: [
    "Next.js 16",
    "Redis",
    "AWS",
    "ECS Fargate",
    "Self-hosting",
    "Cache Components",
    "ISR",
    "CSR",
    "Hybrid",
    "SSR",
    "BFF",
    "Web Performance",
    "k6",
    "Lighthouse",
    "캐시 불일치",
    "멀티 인스턴스",
  ],
  authors: [{ name: "Eddy Lee", url: "https://www.eddy-dev.xyz" }],
  creator: "Eddy Lee",
  publisher: "Eddy Lee",
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: SITE_URL,
    title: TITLE,
    description: DESCRIPTION,
    siteName: "Next.js 16 + Redis Cache Lab",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    creator: "@eddy_lee",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
